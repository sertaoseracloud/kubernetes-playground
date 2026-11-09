// Máquina de estados da tela do exercício (plano, seção 6): uma união discriminada e um
// reducer puro, usado com useReducer. Cada estado é tratado na interface: o TypeScript reclama
// se faltar um. Foi um estado esquecido ("erro de compilação" deixava os testes pendentes)
// que motivou isto no DivergeGo.
//
//   carregandoRuntime → ocioso → executando → corrigindo → resultado
//                                    │             └──────→ erroCompilacao | tempoEsgotado
//                                    └──────────────────→ erroCompilacao | tempoEsgotado | erroInterno
//
// Editar o código durante a execução ou depois do resultado marca o resultado como desatualizado.
import type { Correcao, FalhaDoMotor, LinhaSaida } from './motor.ts';

/** ▶ Apply roda os casos visíveis; ⬆ Enviar roda todos e marca o progresso. */
export type Modo = 'apply' | 'enviar';

export type EstadoExercicio =
  | { readonly tipo: 'carregandoRuntime' }
  | { readonly tipo: 'ocioso' }
  | { readonly tipo: 'executando'; readonly modo: Modo; readonly editadoDurante: boolean }
  | { readonly tipo: 'corrigindo'; readonly modo: Modo; readonly saida: readonly LinhaSaida[]; readonly editadoDurante: boolean }
  | { readonly tipo: 'resultado'; readonly modo: Modo; readonly correcao: Correcao; readonly saida: readonly LinhaSaida[]; readonly desatualizado: boolean }
  | { readonly tipo: 'erroCompilacao'; readonly modo: Modo; readonly mensagem: string; readonly saida: readonly LinhaSaida[]; readonly desatualizado: boolean }
  | { readonly tipo: 'tempoEsgotado'; readonly modo: Modo; readonly limiteMs: number; readonly desatualizado: boolean }
  | { readonly tipo: 'erroInterno'; readonly mensagem: string };

export type EventoExercicio =
  | { readonly tipo: 'RUNTIME_PRONTO' }
  | { readonly tipo: 'EXECUTAR'; readonly modo: Modo }
  | { readonly tipo: 'EXECUTOU'; readonly saida: readonly LinhaSaida[] }
  | { readonly tipo: 'CORRIGIU'; readonly correcao: Correcao }
  | { readonly tipo: 'FALHOU'; readonly erro: FalhaDoMotor; readonly saida: readonly LinhaSaida[] }
  | { readonly tipo: 'EDITOU' }
  | { readonly tipo: 'REINICIAR' };

export const ESTADO_INICIAL: EstadoExercicio = { tipo: 'carregandoRuntime' };

/** Pode começar uma execução? (Uma de cada vez: o antigo estado.ocupado.) */
export const podeExecutar = (estado: EstadoExercicio): boolean =>
  !['carregandoRuntime', 'executando', 'corrigindo'].includes(estado.tipo);

export const ocupado = (estado: EstadoExercicio): boolean =>
  estado.tipo === 'executando' || estado.tipo === 'corrigindo';

function aoFalhar(estado: EstadoExercicio & { modo: Modo; editadoDurante: boolean }, erro: FalhaDoMotor, saida: readonly LinhaSaida[]): EstadoExercicio {
  const base = { modo: estado.modo, desatualizado: estado.editadoDurante };
  switch (erro.tipo) {
    case 'compilacao': return { tipo: 'erroCompilacao', ...base, mensagem: erro.mensagem, saida };
    case 'tempo': return { tipo: 'tempoEsgotado', ...base, limiteMs: erro.limiteMs };
    case 'cancelado': return { tipo: 'ocioso' };
    case 'interno': return { tipo: 'erroInterno', mensagem: erro.mensagem };
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
    case 'ocioso':
    case 'erroInterno':
      return estado;
  }
}

/** ⬆ Enviar corrige direto (sem executar); ▶ Apply corrige depois de executar. */
function aoCorrigir(estado: EstadoExercicio, correcao: Correcao): EstadoExercicio {
  if (estado.tipo !== 'corrigindo' && estado.tipo !== 'executando') return estado;
  return {
    tipo: 'resultado',
    modo: estado.modo,
    correcao,
    saida: estado.tipo === 'corrigindo' ? estado.saida : [],
    desatualizado: estado.editadoDurante,
  };
}

/** Transições que não existem devolvem o mesmo estado (o evento é ignorado). */
export function reduzirExercicio(estado: EstadoExercicio, evento: EventoExercicio): EstadoExercicio {
  switch (evento.tipo) {
    case 'RUNTIME_PRONTO':
      return estado.tipo === 'carregandoRuntime' ? { tipo: 'ocioso' } : estado;
    case 'EXECUTAR':
      return podeExecutar(estado) ? { tipo: 'executando', modo: evento.modo, editadoDurante: false } : estado;
    case 'EXECUTOU':
      return estado.tipo === 'executando'
        ? { tipo: 'corrigindo', modo: estado.modo, saida: evento.saida, editadoDurante: estado.editadoDurante }
        : estado;
    case 'CORRIGIU':
      return aoCorrigir(estado, evento.correcao);
    case 'FALHOU':
      return estado.tipo === 'executando' || estado.tipo === 'corrigindo' ? aoFalhar(estado, evento.erro, evento.saida) : estado;
    case 'EDITOU':
      return aoEditar(estado);
    case 'REINICIAR':
      return estado.tipo === 'carregandoRuntime' ? estado : { tipo: 'ocioso' };
  }
}

/** Resumo curto para a aba Testes e o anúncio (aria-live). */
export function resumoDoEstado(estado: EstadoExercicio, totalDeCasos: number): string {
  switch (estado.tipo) {
    case 'carregandoRuntime': return 'preparando o cluster simulado…';
    case 'ocioso': return `${String(totalDeCasos)} casos · aguardando`;
    case 'executando': return estado.modo === 'enviar' ? 'rodando todos os casos…' : 'aplicando o YAML…';
    case 'corrigindo': return 'conferindo os casos…';
    case 'resultado': {
      if (estado.desatualizado) return 'código alterado · execute novamente';
      const passaram = estado.correcao.casos.filter((c) => c.ok).length;
      const total = estado.correcao.casos.length;
      const quais = estado.modo === 'enviar' ? 'casos (todos)' : 'casos visíveis';
      return `${estado.correcao.aprovado ? '✅' : '❌'} ${String(passaram)}/${String(total)} ${quais}`;
    }
    case 'erroCompilacao': return estado.desatualizado ? 'código alterado · execute novamente' : '❌ o YAML não pôde ser aplicado';
    case 'tempoEsgotado': return `❌ tempo esgotado (${String(Math.round(estado.limiteMs / 1000))} s)`;
    case 'erroInterno': return `erro: ${estado.mensagem}`;
  }
}
