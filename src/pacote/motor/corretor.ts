// O corretor único (contrato, seção 3.6): junta os quatro corrigir.js e o validarNoCluster do
// Kubernetes. Para cada caso, roda os passos no contexto 'testes' e aplica as regras pelo registro.
import type {
  Arquivos,
  CasoDeTeste,
  ContextoRegra,
  DesfechoExecucao,
  Motor,
  OpcoesCorrecao,
  Passo,
  PedidoExecucao,
  RegistroRegras,
  RegraBase,
  Relatorio,
  RelatorioCaso,
  ResultadoExecucao,
  ResultadoRegra,
  VerificadorRegra,
} from './tipos.ts';

/** Desfechos em que as regras nem rodam: o caso falha com o diagnóstico. */
const SEM_REGRAS: ReadonlySet<DesfechoExecucao> = new Set(['erro-compilacao', 'tempo-esgotado', 'cancelado', 'falha-motor']);
const GRAVIDADE: Readonly<Record<DesfechoExecucao, number>> = {
  ok: 0, 'erro-execucao': 1, 'erro-compilacao': 2, 'tempo-esgotado': 3, cancelado: 4, 'falha-motor': 5,
};

export function criarRegistroRegras<Detalhes = unknown>(): RegistroRegras<Detalhes> {
  const verificadores: VerificadorRegra<RegraBase, Detalhes>[] = [];
  const registro: RegistroRegras<Detalhes> = {
    registrar(...novos) {
      verificadores.push(...novos);
      return registro;
    },
    achar(regra) {
      const achado = verificadores.find((v) => (v.casa ? v.casa(regra) : v.chave in regra));
      if (!achado) throw new Error(`Regra desconhecida: ${JSON.stringify(regra)}`);
      return achado;
    },
  };
  return registro;
}

export interface ItemCorrigivel<Regra extends RegraBase, Extra> {
  readonly testes: readonly CasoDeTeste<Regra, Extra>[];
  readonly dados?: Arquivos;
  readonly inicial?: unknown;
}

const juntarCodigo = (arquivos: Arquivos): string => Object.values(arquivos).join('\n');

/** Põe a dica do caso na primeira regra que falhou. */
function comDica(resultados: readonly ResultadoRegra[], dica: string | undefined): readonly ResultadoRegra[] {
  const i = dica === undefined ? -1 : resultados.findIndex((r) => !r.ok);
  return i < 0 || dica === undefined ? resultados : resultados.map((r, j) => (j === i ? { ...r, dica } : r));
}

interface Execucao<Detalhes> {
  readonly resultado: ResultadoExecucao<Detalhes>;
  readonly estado: unknown;
}

/** Executa um passo, reaproveitando execuções iguais quando o motor é determinístico. */
async function executarPasso<Extra, Detalhes>(
  motor: Motor<Extra, Detalhes>,
  pedido: PedidoExecucao<Extra>,
  memo: Map<string, Execucao<Detalhes>>,
): Promise<Execucao<Detalhes>> {
  const chave = motor.capacidades.deterministico && !pedido.continuar
    ? JSON.stringify([pedido.arquivos, pedido.entrada ?? null, pedido.extra ?? null])
    : null;
  const pronto = chave === null ? undefined : memo.get(chave);
  if (pronto) return pronto;
  const resultado = await motor.executar(pedido);
  const execucao = { resultado, estado: motor.estado?.instantaneo('testes') };
  if (chave !== null) memo.set(chave, execucao);
  return execucao;
}

function aplicarRegras<Detalhes>(
  regras: readonly RegraBase[],
  registro: RegistroRegras<Detalhes>,
  ctx: ContextoRegra<Detalhes>,
): ResultadoRegra[] {
  return regras.map((regra) => {
    const verificador = registro.achar(regra);
    return verificador.verificar(regra, ctx);
  });
}

interface Ambiente<Regra extends RegraBase, Extra, Detalhes> {
  readonly item: ItemCorrigivel<Regra, Extra>;
  readonly arquivos: Arquivos;
  readonly motor: Motor<Extra, Detalhes>;
  readonly registro: RegistroRegras<Detalhes>;
  readonly opcoes: OpcoesCorrecao;
  readonly memo: Map<string, Execucao<Detalhes>>;
}

function pedidoDoPasso<Regra extends RegraBase, Extra, Detalhes>(
  amb: Ambiente<Regra, Extra, Detalhes>, caso: CasoDeTeste<Regra, Extra>, passo: Passo<Regra, Extra>, indice: number,
): PedidoExecucao<Extra> {
  const inicial = caso.inicial ?? amb.item.inicial;
  const extra = { ...(caso.extra ?? {}), ...(passo.extra ?? {}), ...(inicial === undefined ? {} : { inicial }) } as Extra;
  return {
    arquivos: { ...amb.arquivos, ...amb.item.dados, ...caso.dados, ...passo.arquivos },
    contexto: 'testes',
    continuar: indice > 0,
    extra,
    ...(passo.entrada === undefined ? {} : { entrada: passo.entrada }),
    ...(passo.argv === undefined ? {} : { argv: passo.argv }),
    ...(amb.opcoes.sinal === undefined ? {} : { sinal: amb.opcoes.sinal }),
  };
}

async function corrigirCaso<Regra extends RegraBase, Extra, Detalhes>(
  amb: Ambiente<Regra, Extra, Detalhes>, caso: CasoDeTeste<Regra, Extra>,
): Promise<RelatorioCaso> {
  const passos = caso.passos ?? [caso];
  const resultados: ResultadoRegra[] = [];
  let desfecho: DesfechoExecucao = 'ok';
  let erroExecucao: RelatorioCaso['erroExecucao'];
  let ms = 0;
  for (const [indice, passo] of passos.entries()) {
    const pedido = pedidoDoPasso(amb, caso, passo, indice);
    const { resultado, estado } = await executarPasso(amb.motor, pedido, amb.memo);
    ms += resultado.ms;
    if (GRAVIDADE[resultado.desfecho] > GRAVIDADE[desfecho]) desfecho = resultado.desfecho;
    erroExecucao ??= resultado.diagnosticos.find((d) => d.gravidade === 'erro');
    if (SEM_REGRAS.has(resultado.desfecho)) break;
    resultados.push(...aplicarRegras(passo.regras ?? [], amb.registro, {
      execucao: resultado, codigo: juntarCodigo(pedido.arquivos), arquivos: pedido.arquivos, sinais: amb.opcoes.sinais ?? {}, estado,
    }));
  }
  const rodou = !SEM_REGRAS.has(desfecho);
  return {
    oculto: caso.oculto === true,
    ok: rodou && resultados.every((r) => r.ok),
    resultados: comDica(resultados, caso.dica),
    cenario: [],
    desfecho,
    ms,
    ...(caso.descricao === undefined ? {} : { descricao: caso.descricao }),
    ...(erroExecucao === undefined ? {} : { erroExecucao }),
  };
}

/** Corrige os casos do item (os ocultos só com `incluirOcultos`). Nunca rejeita por erro do aluno. */
export async function corrigir<Regra extends RegraBase, Extra, Detalhes>(
  item: ItemCorrigivel<Regra, Extra>,
  arquivos: Arquivos,
  motor: Motor<Extra, Detalhes>,
  registro: RegistroRegras<Detalhes>,
  opcoes: OpcoesCorrecao,
): Promise<Relatorio> {
  const amb: Ambiente<Regra, Extra, Detalhes> = { item, arquivos, motor, registro, opcoes, memo: new Map() };
  const casos: RelatorioCaso[] = [];
  for (const caso of item.testes.filter((t) => opcoes.incluirOcultos || !t.oculto)) {
    casos.push(await corrigirCaso(amb, caso));
  }
  return { aprovado: casos.length > 0 && casos.every((c) => c.ok), casos };
}
