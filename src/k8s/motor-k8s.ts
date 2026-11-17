// Adaptador do simulador de kubectl para o contrato Motor (contrato-motor.md, seção 4.5).
//
// - Um cluster por contexto ('aluno', 'testes'...). Enquanto o simulador tiver estado global
//   (fase −1, item 4), o adaptador troca o global pelo cluster do contexto em volta de cada chamada.
// - Quem grava o cluster do aluno é o adaptador, pelo ArmazenamentoEstado (as mesmas chaves).
// - Erro do aluno e falha do simulador viram desfecho: executar nunca rejeita.
// - As regras `tipo:` entram no registro com `casa: r.tipo === chave`; 'diff-usado' lê os sinais.
import type {
  ArmazenamentoEstado, Arquivos, Capacidades, Contexto, ContextoComando, Diagnostico, EstadoDoMotor,
  InterpretadorComandos, LinhaTerminal, Motor, PedidoExecucao, ResultadoComando, ResultadoExecucao, SituacaoMotor,
} from '../pacote/motor/tipos.ts';
import { completarKubectl, interpretar, type AcaoK8s, type LinhaK8s } from './comandos.js';
import {
  aplicarYaml, estadoVazio, obterEstado, removerRecurso, simularApply, trocarEstado,
  type DiffK8s, type EstadoCluster, type ResultadoApply,
} from './simulador.js';

export interface ExtraK8s {
  readonly acao?: 'apply' | 'diff';
  /** YAML dos recursos que já existem no cluster (item.existentes). */
  readonly inicial?: string;
}

export interface DetalhesK8s {
  readonly cluster: EstadoCluster;
  readonly diff?: DiffK8s;
}

export const CAPACIDADES_K8S: Capacidades = {
  id: 'kubernetes',
  rotulo: 'kubectl (simulado)',
  natureza: 'simulador',
  compilacaoSeparada: false,
  entrada: 'nenhum',
  entradaInterativa: false,
  streaming: false,
  cancelavel: false,
  limiteMsPadrao: null,
  saida: 'texto',
  estadoPersistente: true,
  deterministico: true,
};

const PRONTO: SituacaoMotor = { fase: 'pronto' };
const proximaVolta = (): Promise<void> => new Promise((r) => { setTimeout(r, 0); });
const linhasDe = (texto: string): string[] => texto.split(/\n|; /).map((l) => l.trim()).filter(Boolean);

/** As mensagens do simulador ("arq: msg", YAMLException "(L:C)", 'Missing required argument "x"') como diagnósticos. */
export function diagnosticosDoK8s(mensagem: string): Diagnostico[] {
  const yaml = /^Erro ao processar YAML: /.exec(mensagem);
  if (yaml) {
    const posicao = /\((\d+):(\d+)\)/.exec(mensagem);
    const arquivo = /in "([^"]+)"/.exec(mensagem)?.[1];
    return [{
      gravidade: 'erro', fase: 'compilacao', codigo: 'YAMLException', bruto: mensagem,
      mensagem: (mensagem.slice(yaml[0].length).split('\n')[0] ?? '').replace(/\s*in "[^"]+".*$/, '').replace(/\s*\(\d+:\d+\)$/, ''),
      ...(arquivo === undefined ? {} : { arquivo }),
      ...(posicao ? { linha: Number(posicao[1]), coluna: Number(posicao[2]) } : {}),
    }];
  }
  return linhasDe(mensagem).map((linha) => {
    const comArquivo = /^([\w./-]+\.(?:ya?ml|json)): (.*)$/.exec(linha);
    const texto = comArquivo?.[2] ?? linha;
    const campo = /(?:Missing required argument|Unknown field) "([^"]+)"/.exec(texto)?.[1];
    return {
      gravidade: 'erro', fase: 'validacao', mensagem: texto, bruto: linha,
      ...(comArquivo?.[1] === undefined ? {} : { arquivo: comArquivo[1] }),
      ...(campo === undefined ? {} : { codigo: campo }),
    } satisfies Diagnostico;
  });
}

function desfechoDe(r: ResultadoApply, diagnosticos: readonly Diagnostico[]): ResultadoExecucao['desfecho'] {
  if (r.ok) return 'ok';
  const semDocumento = r.mensagem.startsWith('Nenhum documento');
  return semDocumento || diagnosticos.some((d) => d.codigo === 'YAMLException') ? 'erro-compilacao' : 'erro-execucao';
}

function resultadoVazio(desfecho: 'cancelado' | 'falha-motor', mensagem: string, cluster: EstadoCluster): ResultadoExecucao<DetalhesK8s> {
  return {
    desfecho, stdout: '', stderr: mensagem, codigoSaida: null, ms: 0,
    diagnosticos: desfecho === 'falha-motor' ? [{ gravidade: 'erro', fase: 'execucao', mensagem }] : [],
    detalhes: { cluster },
  };
}

const ESTILO: Readonly<Record<string, LinhaTerminal['estilo']>> = {
  erro: 'erro', sucesso: 'sucesso', aviso: 'aviso', comentario: 'comentario', explicacao: 'comentario', forte: 'forte', comando: 'comando',
};
const paraTerminal = (linhas: readonly LinhaK8s[]): LinhaTerminal[] => linhas.map((l) => {
  const estilo = l.classe === undefined ? undefined : ESTILO[l.classe];
  return estilo === undefined ? { texto: l.texto } : { texto: l.texto, estilo };
});

export interface OpcoesMotorK8s {
  readonly armazenamento: ArmazenamentoEstado;
}

/** Um cluster por contexto, o do aluno gravado no armazenamento, e quem ouve as mudanças. */
function criarClusters(armazenamento: ArmazenamentoEstado) {
  const clusters = new Map<Contexto, EstadoCluster>();
  const ouvintes = new Set<(c: Contexto) => void>();
  let chaveDoAluno: string | null = null;

  const avisar = (contexto: Contexto) => { for (const o of ouvintes) o(contexto); };

  /** Roda `fazer` com o cluster do contexto no lugar do global e guarda o cluster resultante. */
  function noCluster<T>(contexto: Contexto, base: EstadoCluster, fazer: () => T): T {
    const anterior = trocarEstado(base);
    try {
      const r = fazer();
      clusters.set(contexto, obterEstado());
      return r;
    } finally {
      trocarEstado(anterior);
    }
  }

  function clusterInicial(inicial: string | undefined): EstadoCluster {
    if (!inicial) return estadoVazio();
    const anterior = trocarEstado(null);
    try {
      aplicarYaml(inicial);
      return obterEstado();
    } finally {
      trocarEstado(anterior);
    }
  }

  function gravarAluno(contexto: Contexto) {
    const cluster = clusters.get(contexto);
    if (contexto === 'aluno' && chaveDoAluno !== null && cluster) armazenamento.gravar(chaveDoAluno, cluster);
  }

  const estado: EstadoDoMotor<EstadoCluster> = {
    abrir(chave) {
      chaveDoAluno = chave;
      const salvo = armazenamento.ler(chave);
      if (salvo && typeof salvo === 'object') clusters.set('aluno', { ...estadoVazio(), ...(salvo as EstadoCluster) });
      else clusters.delete('aluno');
      avisar('aluno');
      return Promise.resolve();
    },
    instantaneo: (contexto = 'aluno') => structuredClone(clusters.get(contexto) ?? estadoVazio()),
    zerar(contexto = 'aluno') {
      clusters.delete(contexto);
      if (contexto === 'aluno' && chaveDoAluno !== null) armazenamento.apagar(chaveDoAluno);
      avisar(contexto);
      return Promise.resolve();
    },
    aoMudar(ouvinte) {
      ouvintes.add(ouvinte);
      return () => { ouvintes.delete(ouvinte); };
    },
  };

  return { clusters, ouvintes, avisar, noCluster, clusterInicial, gravarAluno, estado };
}

export function criarMotorK8s({ armazenamento }: OpcoesMotorK8s): Motor<ExtraK8s, DetalhesK8s> {
  const { clusters, ouvintes, avisar, noCluster, clusterInicial, gravarAluno, estado } = criarClusters(armazenamento);

  function rodar(pedido: PedidoExecucao<ExtraK8s>): ResultadoExecucao<DetalhesK8s> {
    const contexto = pedido.contexto ?? 'aluno';
    const existente = pedido.continuar ? clusters.get(contexto) : undefined;
    const base = existente ?? clusterInicial(pedido.extra?.inicial);
    const t0 = performance.now();
    const diff = pedido.extra?.acao === 'diff';
    const r = noCluster(contexto, base, () => (diff ? simularApply(pedido.arquivos) : aplicarYaml(pedido.arquivos)));
    if (r.ok && !diff) gravarAluno(contexto);
    const diagnosticos = r.ok ? [] : diagnosticosDoK8s(r.mensagem);
    return {
      desfecho: desfechoDe(r, diagnosticos),
      stdout: r.ok ? r.mensagem : '',
      stderr: r.ok ? '' : linhasDe(r.mensagem).map((l) => `error: ${l}`).join('\n'),
      codigoSaida: r.ok ? 0 : 1,
      ms: Math.round(performance.now() - t0),
      diagnosticos,
      detalhes: { cluster: clusters.get(contexto) ?? base, ...('diff' in r ? { diff: (r as { diff: DiffK8s }).diff } : {}) },
    };
  }

  const motor: Motor<ExtraK8s, DetalhesK8s> = {
    capacidades: CAPACIDADES_K8S,
    situacao: () => PRONTO,
    aoMudarSituacao: () => () => {},
    preparar: () => Promise.resolve(),
    async executar(pedido) {
      const atual = clusters.get(pedido.contexto ?? 'aluno') ?? estadoVazio();
      if (pedido.sinal?.aborted) return resultadoVazio('cancelado', '', atual);
      await proximaVolta(); // deixa a interface mostrar "executando" antes do trabalho síncrono
      if (pedido.sinal?.aborted) return resultadoVazio('cancelado', '', atual);
      try {
        const resultado = rodar(pedido);
        avisar(pedido.contexto ?? 'aluno');
        return resultado;
      } catch (erro) {
        return resultadoVazio('falha-motor', `Erro interno do simulador: ${erro instanceof Error ? erro.message : String(erro)}`, atual);
      }
    },
    cancelar() { /* síncrono: não há o que interromper (capacidades.cancelavel = false) */ },
    estado,
    comandos: criarComandosK8s(() => motor, estado, (contexto, fazer) => {
      const r = noCluster(contexto, clusters.get(contexto) ?? estadoVazio(), fazer);
      gravarAluno(contexto);
      avisar(contexto);
      return r;
    }),
    descartar() { clusters.clear(); ouvintes.clear(); },
  };
  return motor;
}

type NoCluster = <T>(contexto: Contexto, fazer: () => T) => T;

/** O terminal: `interpretar` decide; o adaptador executa a ação que antes ficava na UI (item.js:120-163). */
function criarComandosK8s(
  motor: () => Motor<ExtraK8s, DetalhesK8s>, estado: EstadoDoMotor<EstadoCluster>, noCluster: NoCluster,
): InterpretadorComandos<DetalhesK8s> {
  async function aplicar(arquivos: Arquivos, acao: 'apply' | 'diff', ctx: ContextoComando): Promise<ResultadoComando<DetalhesK8s>> {
    const execucao = await motor().executar({ arquivos, contexto: 'aluno', continuar: true, extra: { acao } });
    if (acao === 'diff') ctx.sinalizar('diff-usado', true);
    for (const l of linhasDe(execucao.stdout)) ctx.saida.escrever(l, 'sucesso');
    for (const l of execucao.stderr.split('\n').filter(Boolean)) ctx.saida.escrever(l, 'erro');
    return { execucao, efeitos: acao === 'diff' ? [{ tipo: 'abrir-painel', painel: 'diff' }] : [{ tipo: 'estado-mudou' }] };
  }

  function apagar(alvos: readonly { kind: string; nome: string; prefixo: string; tipo: string }[], ctx: ContextoComando): ResultadoComando<DetalhesK8s> {
    for (const { kind, nome, prefixo, tipo } of alvos) {
      if (noCluster('aluno', () => removerRecurso(kind, nome))) ctx.saida.escrever(`${prefixo} "${nome}" deleted`, 'sucesso');
      else ctx.saida.escrever(`Error from server (NotFound): ${tipo} "${nome}" not found`, 'erro');
    }
    return { efeitos: [{ tipo: 'estado-mudou' }] };
  }

  async function executarAcao(acao: AcaoK8s, arquivos: Arquivos, ctx: ContextoComando): Promise<ResultadoComando<DetalhesK8s>> {
    if (acao === 'clear') { ctx.saida.limpar(); return {}; }
    if (acao === 'apply' || acao === 'diff') return aplicar(arquivos, acao, ctx);
    if (acao === 'drift') return { efeitos: [{ tipo: 'abrir-painel', painel: 'drift' }] };
    if (acao === 'delete-arquivo') {
      const r = noCluster('aluno', () => simularApply(arquivos));
      if (!r.ok) { ctx.saida.escrever(`error: ${r.mensagem}`, 'erro'); return {}; }
      const alvos = (r.recursos ?? []) as readonly { kind?: string; nome: string }[];
      return apagar(alvos.filter((a) => a.kind).map((a) => ({ kind: a.kind ?? '', nome: a.nome, prefixo: (a.kind ?? '').toLowerCase(), tipo: a.kind ?? '' })), ctx);
    }
    return apagar(acao.apagar, ctx);
  }

  return {
    prompt: ({ pasta }) => `aluno@sertao:~/${pasta}$ `,
    completar: (texto, ctx) => completarKubectl(texto, Object.keys(ctx.arquivos())),
    async rodar(linha, ctx) {
      const { linhas, acao, arquivos } = interpretar(linha, estado.instantaneo('aluno'), ctx.arquivos());
      if (linhas.length) await ctx.saida.mostrar(paraTerminal(linhas), { animar: false });
      return acao === undefined ? {} : executarAcao(acao, arquivos ?? ctx.arquivos(), ctx);
    },
    comandoDoExecutar: () => 'kubectl apply -f .',
    ajuda: 'kubectl apply, diff, get, describe, delete e explain; ls, cat, clear e drift.',
  };
}
