// Máquina de estados da ilha Exercicio (plano, seção 6): união discriminada + reducer puro.
// Fala só a língua do contrato Motor: o desfecho da execução decide o próximo estado.
//
//   carregandoRuntime → ocioso → executando → corrigindo → resultado
//          ↓                         │
//     falhaCarga                     └→ erroCompilacao | tempoEsgotado | erroInterno | ocioso (cancelado)
//
// Editar durante a execução ou depois do resultado marca o resultado como desatualizado.
import type { Diagnostico, Relatorio, ResultadoExecucao } from '../motor/tipos.ts';

/** ▶ Executar roda os casos visíveis; ⬆ Enviar roda todos e marca o progresso. */
export type Modo = 'executar' | 'enviar';

export type EstadoExercicio =
  | { readonly tipo: 'carregandoRuntime' }
  | { readonly tipo: 'falhaCarga'; readonly erro: string; readonly recuperavel: boolean }
  | { readonly tipo: 'ocioso' }
  | { readonly tipo: 'executando'; readonly modo: Modo; readonly editadoDurante: boolean }
  | { readonly tipo: 'corrigindo'; readonly modo: Modo; readonly editadoDurante: boolean }
  | { readonly tipo: 'resultado'; readonly modo: Modo; readonly relatorio: Relatorio; readonly desatualizado: boolean }
  | { readonly tipo: 'erroCompilacao'; readonly modo: Modo; readonly diagnosticos: readonly Diagnostico[]; readonly stderr: string; readonly desatualizado: boolean }
  | { readonly tipo: 'tempoEsgotado'; readonly modo: Modo; readonly desatualizado: boolean }
  | { readonly tipo: 'erroInterno'; readonly mensagem: string };

export type EventoExercicio =
  | { readonly tipo: 'RUNTIME_PRONTO' }
  | { readonly tipo: 'RUNTIME_FALHOU'; readonly erro: string; readonly recuperavel: boolean }
  | { readonly tipo: 'EXECUTAR'; readonly modo: Modo }
  | { readonly tipo: 'EXECUTOU'; readonly resultado: ResultadoExecucao }
  | { readonly tipo: 'CORRIGIU'; readonly relatorio: Relatorio }
  | { readonly tipo: 'CORRECAO_FALHOU'; readonly mensagem: string }
  | { readonly tipo: 'EDITOU' }
  | { readonly tipo: 'REINICIAR' };

export const ESTADO_INICIAL: EstadoExercicio = { tipo: 'carregandoRuntime' };

const PARADOS: ReadonlySet<EstadoExercicio['tipo']> = new Set(['carregandoRuntime', 'falhaCarga', 'executando', 'corrigindo']);

/** Pode começar uma execução? Uma de cada vez, e só com o motor pronto. */
export const podeExecutar = (estado: EstadoExercicio): boolean => !PARADOS.has(estado.tipo);

export const ocupado = (estado: EstadoExercicio): boolean => estado.tipo === 'executando' || estado.tipo === 'corrigindo';

/** O desfecho do ▶ decide se a correção roda ('ok' e 'erro-execucao') ou se para aqui. */
function aoExecutar(estado: Extract<EstadoExercicio, { tipo: 'executando' }>, r: ResultadoExecucao): EstadoExercicio {
  const base = { modo: estado.modo, desatualizado: estado.editadoDurante };
  switch (r.desfecho) {
    case 'ok':
    case 'erro-execucao': return { tipo: 'corrigindo', modo: estado.modo, editadoDurante: estado.editadoDurante };
    case 'erro-compilacao': return { tipo: 'erroCompilacao', ...base, diagnosticos: r.diagnosticos, stderr: r.stderr };
    case 'tempo-esgotado': return { tipo: 'tempoEsgotado', ...base };
    case 'cancelado': return { tipo: 'ocioso' };
    case 'falha-motor': return { tipo: 'erroInterno', mensagem: r.diagnosticos[0]?.mensagem ?? (r.stderr || 'O motor parou.') };
  }
}

function aoEditar(estado: EstadoExercicio): EstadoExercicio {
  switch (estado.tipo) {
    case 'executando':
    case 'corrigindo':
      return estado.editadoDurante ? estado : { ...estado, editadoDurante: true };
    case 'resultado':
    case 'erroCompilacao':
    case 'tempoEsgotado':
      return estado.desatualizado ? estado : { ...estado, desatualizado: true };
    case 'carregandoRuntime':
    case 'falhaCarga':
    case 'ocioso':
    case 'erroInterno':
      return estado;
  }
}

/** ⬆ Enviar corrige direto (sem executar); ▶ Executar corrige depois de executar. */
function aoCorrigir(estado: EstadoExercicio, relatorio: Relatorio): EstadoExercicio {
  if (estado.tipo !== 'corrigindo' && estado.tipo !== 'executando') return estado;
  return { tipo: 'resultado', modo: estado.modo, relatorio, desatualizado: estado.editadoDurante };
}

/** Carga do motor: pronto (também depois de uma falha recuperável) ou falha. */
function aoCarregar(estado: EstadoExercicio, evento: Extract<EventoExercicio, { tipo: 'RUNTIME_PRONTO' | 'RUNTIME_FALHOU' }>): EstadoExercicio {
  if (evento.tipo === 'RUNTIME_PRONTO') return estado.tipo === 'carregandoRuntime' || estado.tipo === 'falhaCarga' ? { tipo: 'ocioso' } : estado;
  return estado.tipo === 'carregandoRuntime' ? { tipo: 'falhaCarga', erro: evento.erro, recuperavel: evento.recuperavel } : estado;
}

/** Transições que não existem devolvem o mesmo estado (o evento é ignorado). */
export function reduzirExercicio(estado: EstadoExercicio, evento: EventoExercicio): EstadoExercicio {
  switch (evento.tipo) {
    case 'RUNTIME_PRONTO':
    case 'RUNTIME_FALHOU':
      return aoCarregar(estado, evento);
    case 'EXECUTAR':
      return podeExecutar(estado) ? { tipo: 'executando', modo: evento.modo, editadoDurante: false } : estado;
    case 'EXECUTOU':
      return estado.tipo === 'executando' ? aoExecutar(estado, evento.resultado) : estado;
    case 'CORRIGIU':
      return aoCorrigir(estado, evento.relatorio);
    case 'CORRECAO_FALHOU':
      return ocupado(estado) ? { tipo: 'erroInterno', mensagem: evento.mensagem } : estado;
    case 'EDITOU':
      return aoEditar(estado);
    case 'REINICIAR':
      return estado.tipo === 'carregandoRuntime' || estado.tipo === 'falhaCarga' ? estado : { tipo: 'ocioso' };
  }
}

const placar = (r: Relatorio): string => `${String(r.casos.filter((c) => c.ok).length)}/${String(r.casos.length)}`;
const ALTERADO = 'código alterado · execute novamente';

function resumoDoResultado(estado: Extract<EstadoExercicio, { tipo: 'resultado' }>): string {
  if (estado.desatualizado) return ALTERADO;
  return `${estado.relatorio.aprovado ? '✅' : '❌'} ${placar(estado.relatorio)} ${estado.modo === 'enviar' ? 'casos (todos)' : 'casos visíveis'}`;
}

/** Resumo curto para a aba Testes e o anúncio (aria-live). */
export function resumoDoEstado(estado: EstadoExercicio, totalDeCasos: number): string {
  switch (estado.tipo) {
    case 'carregandoRuntime': return 'preparando…';
    case 'falhaCarga': return `não carregou: ${estado.erro}`;
    case 'ocioso': return `${String(totalDeCasos)} casos · aguardando`;
    case 'executando': return estado.modo === 'enviar' ? 'rodando todos os casos…' : 'executando…';
    case 'corrigindo': return 'conferindo os casos…';
    case 'resultado': return resumoDoResultado(estado);
    case 'erroCompilacao': return estado.desatualizado ? ALTERADO : '❌ não compilou';
    case 'tempoEsgotado': return estado.desatualizado ? ALTERADO : '❌ tempo esgotado';
    case 'erroInterno': return `erro: ${estado.mensagem}`;
  }
}
