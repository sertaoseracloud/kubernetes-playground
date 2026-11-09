// Apoio dos testes de componente: axe com 0 violações e um Motor falso programável
// (plano, seção 7.4, I1: casos de uso com Motor falso).
import axe from 'axe-core';
import { expect } from 'vitest';
import type { Arquivos, Correcao, Execucao, Motor, Resultado } from '../../src/exercicio/motor.ts';
import type { TesteK8s } from '../../src/exercicio/motor-k8s.ts';

export async function semViolacoes(elemento: Element): Promise<void> {
  // As regras da WCAG 2.2 AA. As de página inteira (landmarks, um h1 por página) ficam para o
  // axe do E2E, que abre a página de verdade.
  const { violations } = await axe.run(elemento, {
    resultTypes: ['violations'],
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  });
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

export interface MotorFalso extends Motor<TesteK8s> {
  proximaExecucao: Resultado<Execucao>;
  proximaCorrecao: Resultado<Correcao>;
  readonly chamadas: { metodo: 'executar' | 'corrigir'; arquivos: Arquivos; testes?: readonly TesteK8s[] }[];
  /** Segura o preparar até chamar liberar(): para ver o estado "carregando". */
  segurarPreparo(): () => void;
}

export const APROVADO: Correcao = { aprovado: true, casos: [{ ok: true, verificacoes: [{ ok: true, mensagem: 'O Pod existe' }] }, { ok: true, verificacoes: [{ ok: true, mensagem: 'restartPolicy confere' }] }] };
export const REPROVADO: Correcao = {
  aprovado: false,
  casos: [
    { ok: true, verificacoes: [{ ok: true, mensagem: 'O Pod existe' }] },
    { ok: false, verificacoes: [{ ok: false, mensagem: 'restartPolicy é OnFailure', detalhe: 'Obtido: Always', dica: 'Fica no spec do Pod.' }] },
  ],
};

export function criarMotorFalso(): MotorFalso {
  let segurar: Promise<void> | null = null;
  const motor: MotorFalso = {
    nome: 'falso',
    capacidades: { stdin: false, tempoLimite: false },
    proximaExecucao: { ok: true, valor: { saida: [{ texto: '$ kubectl apply -f .', tipo: 'comando' }, { texto: 'pod/job-pod created', tipo: 'sucesso' }] } },
    proximaCorrecao: { ok: true, valor: APROVADO },
    chamadas: [],
    segurarPreparo() {
      let liberar = () => {};
      segurar = new Promise((r) => { liberar = r; });
      return () => { liberar(); };
    },
    async preparar() { await segurar; },
    executar(arquivos) {
      motor.chamadas.push({ metodo: 'executar', arquivos });
      return Promise.resolve(motor.proximaExecucao);
    },
    corrigir(arquivos, testes) {
      motor.chamadas.push({ metodo: 'corrigir', arquivos, testes });
      return Promise.resolve(motor.proximaCorrecao);
    },
  };
  return motor;
}
