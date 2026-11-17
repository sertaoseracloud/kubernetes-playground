// O simulador de kubectl atrás do contrato Motor (npm run test:contrato). Critério da fase 1:
// o contrato cobre o Kubernetes sem exceção. A suíte genérica roda inteira (só o tempo esgotado é
// pulado: o simulador é síncrono, limiteMsPadrao = null) e os testes abaixo cobrem o que só o
// Kubernetes tem: existentes, diff, comandos do terminal, gravação do cluster e as regras `tipo:`.
import { describe, expect, it, vi } from 'vitest';
import { corrigir } from '../../src/pacote/motor/corretor.ts';
import type { ArmazenamentoEstado, CasoDeTeste, ContextoComando, LinhaTerminal } from '../../src/pacote/motor/tipos.ts';
import { criarMotorK8s, diagnosticosDoK8s, type DetalhesK8s } from '../../src/k8s/motor-k8s.ts';
import { criarRegrasK8s } from '../../src/k8s/regras-k8s.ts';
import { testarContratoDoMotor } from '../pacote/contrato-do-motor.ts';

const pod = (restartPolicy: string, nome = 'job-pod') => `apiVersion: v1
kind: Pod
metadata:
  name: ${nome}
spec:
  restartPolicy: ${restartPolicy}
  containers:
    - name: worker
      image: busybox:1.36
`;

const TESTES: readonly CasoDeTeste[] = [
  { descricao: 'o Pod existe', regras: [{ tipo: 'campo', kind: 'Pod', nome: 'job-pod', caminho: 'metadata.name', valor: 'job-pod' }] },
  {
    descricao: 'reinicia só em falha',
    dica: 'A restartPolicy fica no spec do Pod.',
    regras: [{ tipo: 'campo', kind: 'Pod', nome: 'job-pod', caminho: 'spec.restartPolicy', valor: 'OnFailure' }],
  },
];

function armazenamentoEmMemoria(): ArmazenamentoEstado & { dados: Map<string, unknown> } {
  const dados = new Map<string, unknown>();
  return { dados, ler: (c) => dados.get(c) ?? null, gravar: (c, v) => { dados.set(c, structuredClone(v)); }, apagar: (c) => { dados.delete(c); } };
}

const criar = () => criarMotorK8s({ armazenamento: armazenamentoEmMemoria() });
const regras = criarRegrasK8s();

testarContratoDoMotor(criar, {
  valido: { 'manifest.yaml': pod('Never') },
  saidaEsperada: /pod\/job-pod created/,
  invalido: { 'manifest.yaml': 'apiVersion: v1\nkind: Pod\nmetadata: [isto não é um objeto\n' },
  regras: regras,
  testes: TESTES,
  aprovado: { 'manifest.yaml': pod('OnFailure') },
  reprovado: { 'manifest.yaml': pod('Always') },
});

function contextoDeComando(arquivos: Record<string, string>) {
  const linhas: LinhaTerminal[] = [];
  const sinalizar = vi.fn();
  const ctx: ContextoComando = {
    arquivos: () => arquivos,
    saida: {
      escrever: (texto, estilo) => { linhas.push({ texto, ...(estilo ? { estilo } : {}) }); },
      mostrar: (novas) => { linhas.push(...novas); return Promise.resolve(); },
      limpar: () => { linhas.length = 0; },
    },
    perguntar: () => Promise.resolve(null),
    sinal: new AbortController().signal,
    sinalizar,
  };
  return { ctx, linhas, sinalizar };
}

describe('motor do kubectl: o que é só dele', () => {
  it('o cluster do aluno é gravado pelo adaptador, com a chave do exercício, e volta ao abrir', async () => {
    const armazenamento = armazenamentoEmMemoria();
    const motor = criarMotorK8s({ armazenamento });
    await motor.estado?.abrir('pods-restart-policy');
    await motor.executar({ arquivos: { 'manifest.yaml': pod('Never') }, contexto: 'aluno', continuar: true });
    expect(Object.keys((armazenamento.dados.get('pods-restart-policy') as DetalhesK8s['cluster']).manifestos)).toEqual(['Pod/job-pod']);
    const outro = criarMotorK8s({ armazenamento });
    await outro.estado?.abrir('pods-restart-policy');
    expect(Object.keys((outro.estado?.instantaneo('aluno') as DetalhesK8s['cluster']).manifestos)).toEqual(['Pod/job-pod']);
  });

  it('o contexto "testes" não grava nem mexe no cluster do aluno', async () => {
    const armazenamento = armazenamentoEmMemoria();
    const motor = criarMotorK8s({ armazenamento });
    await motor.estado?.abrir('x');
    await motor.executar({ arquivos: { 'manifest.yaml': pod('Never', 'outro') }, contexto: 'testes' });
    expect(armazenamento.dados.size).toBe(0);
    expect(Object.keys((motor.estado?.instantaneo('aluno') as DetalhesK8s['cluster']).manifestos)).toEqual([]);
  });

  it('os existentes entram antes do aluno e também na correção (extra.inicial / item.inicial)', async () => {
    const existentes = 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: config\ndata:\n  modo: prod\n';
    const motor = criar();
    const relatorio = await corrigir(
      { testes: [{ regras: [{ tipo: 'campo', kind: 'ConfigMap', nome: 'config', caminho: 'data.modo', valor: 'prod' }] }], inicial: existentes },
      { 'manifest.yaml': pod('OnFailure') }, motor, regras, { incluirOcultos: true },
    );
    expect(relatorio.aprovado).toBe(true);
  });

  it('a dica do caso vai na primeira regra que falhou', async () => {
    const r = await corrigir({ testes: TESTES }, { 'manifest.yaml': pod('Always') }, criar(), regras, { incluirOcultos: true });
    expect(r.casos[1]?.resultados[0]?.dica).toBe('A restartPolicy fica no spec do Pod.');
  });

  it('YAML inválido: cada caso falha com o seu diagnóstico (o defeito do item.js:551 some)', async () => {
    const r = await corrigir({ testes: TESTES }, { 'manifest.yaml': 'kind: [x' }, criar(), regras, { incluirOcultos: true });
    expect(r.casos).toHaveLength(2);
    expect(r.casos.map((c) => c.erroExecucao?.codigo)).toEqual(['YAMLException', 'YAMLException']);
  });

  it('campo obrigatório faltando: erro de execução (apply recusado) com o campo no diagnóstico', async () => {
    const motor = criar();
    const r = await motor.executar({ arquivos: { 'manifest.yaml': 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: sem-spec\n' } });
    expect(r.desfecho).toBe('erro-execucao');
    expect(r.stderr).toMatch(/^error: /);
    expect(r.diagnosticos.length).toBeGreaterThan(0);
  });

  it('diagnosticosDoK8s: arquivo, linha e coluna da YAMLException; campo dos erros de validação', () => {
    const [yaml] = diagnosticosDoK8s('Erro ao processar YAML: unexpected end of the stream within a flow collection in "manifest.yaml" (4:1)\n\n 1 | x');
    expect(yaml).toMatchObject({ codigo: 'YAMLException', fase: 'compilacao', arquivo: 'manifest.yaml', linha: 4, coluna: 1 });
    const [campo] = diagnosticosDoK8s('pod.yaml: Missing required argument "spec.containers"');
    expect(campo).toMatchObject({ arquivo: 'pod.yaml', codigo: 'spec.containers', fase: 'validacao' });
  });

  it('kubectl diff: prevê sem aplicar e liga o sinal diff-usado, que a regra lê', async () => {
    const motor = criar();
    await motor.estado?.abrir('diff');
    const { ctx, sinalizar } = contextoDeComando({ 'manifest.yaml': pod('Never') });
    const r = await motor.comandos?.rodar('kubectl diff -f manifest.yaml', ctx);
    expect(r?.execucao?.detalhes.diff?.criar).toHaveLength(1);
    expect(sinalizar).toHaveBeenCalledWith('diff-usado', true);
    expect(Object.keys((motor.estado?.instantaneo('aluno') as DetalhesK8s['cluster']).manifestos)).toEqual([]);
    const relatorio = await corrigir({ testes: [{ regras: [{ tipo: 'diff-usado' }] }] }, { 'manifest.yaml': pod('Never') }, motor, regras, { incluirOcultos: true, sinais: { 'diff-usado': true } });
    expect(relatorio.aprovado).toBe(true);
  });

  it('kubectl apply, get e delete pelo terminal mudam o cluster do aluno', async () => {
    const motor = criar();
    await motor.estado?.abrir('terminal');
    const { ctx, linhas } = contextoDeComando({ 'manifest.yaml': pod('Never') });
    const apply = await motor.comandos?.rodar('kubectl apply -f manifest.yaml', ctx);
    expect(apply?.execucao?.desfecho).toBe('ok');
    expect(apply?.efeitos).toEqual([{ tipo: 'estado-mudou' }]);
    await motor.comandos?.rodar('kubectl get pods', ctx);
    expect(linhas.map((l) => l.texto).join('\n')).toContain('job-pod');
    await motor.comandos?.rodar('kubectl delete pod job-pod', ctx);
    expect(linhas.at(-1)).toEqual({ texto: 'pod "job-pod" deleted', estilo: 'sucesso' });
    expect(Object.keys((motor.estado?.instantaneo('aluno') as DetalhesK8s['cluster']).manifestos)).toEqual([]);
    await motor.comandos?.rodar('kubectl delete pod nao-existe', ctx);
    expect(linhas.at(-1)?.estilo).toBe('erro');
  });

  it('kubectl delete -f, drift e clear', async () => {
    const motor = criar();
    await motor.estado?.abrir('terminal-2');
    const { ctx, linhas } = contextoDeComando({ 'manifest.yaml': pod('Never') });
    await motor.comandos?.rodar('kubectl apply -f manifest.yaml', ctx);
    await motor.comandos?.rodar('kubectl delete -f manifest.yaml', ctx);
    expect(linhas.at(-1)).toEqual({ texto: 'pod "job-pod" deleted', estilo: 'sucesso' });
    expect(await motor.comandos?.rodar('drift', ctx)).toEqual({ efeitos: [{ tipo: 'abrir-painel', painel: 'drift' }] });
    await motor.comandos?.rodar('clear', ctx);
    expect(linhas).toEqual([]);
    expect(motor.comandos?.comandoDoExecutar?.('manifest.yaml')).toBe('kubectl apply -f .');
    expect(motor.comandos?.completar('kub', ctx).length).toBeGreaterThan(0);
  });

  it('uma regra sem verificador lança "Regra desconhecida" no registro', () => {
    expect(() => regras.achar({ coisaQueNaoExiste: 1 })).toThrow(/Regra desconhecida/);
  });
});
