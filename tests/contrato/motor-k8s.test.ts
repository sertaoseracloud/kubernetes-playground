// A suíte de contrato do Motor contra o simulador de kubectl (npm run test:contrato).
// O simulador é síncrono e não executa código: não tem stdin nem laço infinito, então o teste
// de tempo esgotado é pulado (Capacidades.tempoLimite = false).
import { describe, expect, it } from 'vitest';
import { comDica, criarMotorK8s, type TesteK8s } from '../../src/exercicio/motor-k8s.ts';
import { testarContratoDoMotor } from './contrato-do-motor.ts';

const pod = (restartPolicy: string) => `apiVersion: v1
kind: Pod
metadata:
  name: job-pod
spec:
  restartPolicy: ${restartPolicy}
  containers:
    - name: worker
      image: busybox:1.36
`;

const TESTES: readonly TesteK8s[] = [
  { descricao: 'o Pod existe', regras: [{ tipo: 'campo', kind: 'Pod', nome: 'job-pod', caminho: 'metadata.name', valor: 'job-pod' }] },
  {
    descricao: 'reinicia só em falha',
    dica: 'A restartPolicy fica no spec do Pod.',
    regras: [{ tipo: 'campo', kind: 'Pod', nome: 'job-pod', caminho: 'spec.restartPolicy', valor: 'OnFailure' }],
  },
];

testarContratoDoMotor(criarMotorK8s, {
  contexto: { chave: 'contrato-a' },
  outroContexto: { chave: 'contrato-b' },
  valido: { 'manifest.yaml': pod('Never') },
  saidaEsperada: /pod\/job-pod created/,
  invalido: { 'manifest.yaml': 'apiVersion: v1\nkind: Pod\nmetadata: [isto não é um objeto\n' },
  testes: TESTES,
  aprovado: { 'manifest.yaml': pod('OnFailure') },
  reprovado: { 'manifest.yaml': pod('Always') },
});

describe('motor do kubectl: o que é só dele', () => {
  it('a dica do caso vai na primeira verificação que falhou', async () => {
    const motor = criarMotorK8s();
    await motor.preparar({ chave: 'contrato-dica' });
    const r = await motor.corrigir({ 'manifest.yaml': pod('Always') }, TESTES);
    expect(r.ok && r.valor.casos[1]?.verificacoes[0]?.dica).toBe('A restartPolicy fica no spec do Pod.');
  });

  it('comDica não mexe quando tudo passou ou não há dica', () => {
    const tudoOk = [{ ok: true, mensagem: 'a' }];
    expect(comDica(tudoOk, 'dica')).toBe(tudoOk);
    const falhou = [{ ok: false, mensagem: 'a' }];
    expect(comDica(falhou, undefined)).toBe(falhou);
  });

  it('o recurso "existentes" do exercício entra antes do aluno e também na correção', async () => {
    const existentes = 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: config\ndata:\n  modo: prod\n';
    const motor = criarMotorK8s();
    await motor.preparar({ chave: 'contrato-existentes', existentes });
    const r = await motor.corrigir({ 'manifest.yaml': pod('OnFailure') }, [
      { regras: [{ tipo: 'campo', kind: 'ConfigMap', nome: 'config', caminho: 'data.modo', valor: 'prod' }] },
    ]);
    expect(r.ok && r.valor.aprovado).toBe(true);
  });

  it('o apply aparece no terminal como um comando digitado', async () => {
    const motor = criarMotorK8s();
    await motor.preparar({ chave: 'contrato-saida' });
    const r = await motor.executar({ 'manifest.yaml': pod('Never') });
    expect(r.ok && r.valor.saida[0]).toEqual({ texto: '$ kubectl apply -f .', tipo: 'comando' });
  });
});
