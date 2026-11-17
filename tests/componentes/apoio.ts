// Apoio dos testes de componente: axe com 0 violações e um Motor falso programável
// (plano, seção 7.4, I1: casos de uso com Motor falso).
import axe from 'axe-core';
import { expect } from 'vitest';
import { criarRegistroRegras } from '../../src/pacote/motor/corretor.ts';
import type { Motor, PedidoExecucao, ResultadoExecucao, ResultadoRegra, SituacaoMotor, VerificadorRegra } from '../../src/pacote/motor/tipos.ts';

export async function semViolacoes(elemento: Element): Promise<void> {
  // As regras da WCAG 2.2 AA. As de página inteira (landmarks, um h1 por página) ficam para o
  // axe do E2E, que abre a página de verdade.
  const { violations } = await axe.run(elemento, {
    resultTypes: ['violations'],
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  });
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

export const execucao = (extra: Partial<ResultadoExecucao> = {}): ResultadoExecucao => ({
  desfecho: 'ok', stdout: 'pod/job-pod created', stderr: '', codigoSaida: 0, ms: 1, diagnosticos: [], detalhes: null, ...extra,
});

export interface MotorFalso extends Motor {
  /** Resposta do ▶ no contexto do aluno. */
  respostaAluno: ResultadoExecucao;
  /** Resposta no contexto 'testes' (a correção). */
  respostaTestes: ResultadoExecucao;
  readonly pedidos: PedidoExecucao[];
  segurarPreparo(): () => void;
}

export function criarMotorFalso(): MotorFalso {
  let segurar: Promise<void> | null = null;
  let situacao: SituacaoMotor = { fase: 'ocioso' };
  const motor: MotorFalso = {
    capacidades: {
      id: 'kubernetes', rotulo: 'falso', natureza: 'simulador', compilacaoSeparada: false, entrada: 'nenhum', entradaInterativa: false,
      streaming: false, cancelavel: false, limiteMsPadrao: null, saida: 'texto', estadoPersistente: false, deterministico: false,
    },
    respostaAluno: execucao(),
    respostaTestes: execucao(),
    pedidos: [],
    segurarPreparo() {
      let liberar = () => {};
      segurar = new Promise((r) => { liberar = r; });
      return () => { liberar(); };
    },
    situacao: () => situacao,
    aoMudarSituacao: () => () => {},
    async preparar() { await segurar; situacao = { fase: 'pronto' }; },
    executar(pedido) {
      motor.pedidos.push(pedido);
      return Promise.resolve(pedido.contexto === 'testes' ? motor.respostaTestes : motor.respostaAluno);
    },
    cancelar: () => {},
    comandos: {
      prompt: () => '$ ', completar: () => [], rodar: () => Promise.resolve({}), ajuda: '', comandoDoExecutar: () => 'kubectl apply -f .',
    },
    descartar: () => {},
  };
  return motor;
}

/** Regra de teste: `{ passa: true|false, msg }`, com dica opcional. */
const passa: VerificadorRegra = {
  chave: 'passa',
  categoria: 'Teste',
  descrever: (r) => r.msg ?? 'confere',
  verificar: (r): ResultadoRegra => ({ ok: r.passa === true, mensagem: r.msg ?? 'confere', categoria: 'Teste', ...(r.passa === true ? {} : { detalhe: 'Obtido: Always' }) }),
};

export const regrasFalsas = () => criarRegistroRegras().registrar(passa);
