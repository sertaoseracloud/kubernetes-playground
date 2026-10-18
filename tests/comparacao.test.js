import { describe, it, expect } from 'vitest';
import { comparacao } from '../src/conteudo/comparacao.js';

describe('módulo comparacao', () => {
  it('exporta estrutura válida com id e titulo', () => {
    expect(comparacao.id).toBe('comparacao');
    expect(comparacao.titulo).toContain('Terraform');
    expect(comparacao.titulo).toContain('Kubernetes');
  });

  it('contém lições conceituais e quiz', () => {
    const licoes = comparacao.itens.filter((i) => i.tipo === 'licao');
    const exercicios = comparacao.itens.filter((i) => i.tipo === 'exercicio');
    expect(licoes.length).toBeGreaterThanOrEqual(7);
    expect(exercicios.length).toBeGreaterThanOrEqual(1);
  });

  it('quiz possui regras de teste do tipo quiz-conceitual', () => {
    const quiz = comparacao.itens.find((i) => i.id === 'comp-quiz');
    expect(quiz).toBeDefined();
    expect(quiz.tipo).toBe('exercicio');
    expect(quiz.testes).toBeDefined();
    expect(quiz.testes.length).toBeGreaterThanOrEqual(1);
    const regra = quiz.testes[0].regras.find((r) => r.tipo === 'quiz-conceitual');
    expect(regra).toBeDefined();
    expect(regra.modulo).toBe('comparacao');
  });

  it('todas as lições possuem resumo com tabela comparativa', () => {
    const licoes = comparacao.itens.filter((i) => i.tipo === 'licao');
    for (const licao of licoes) {
      expect(licao.resumo).toContain('<table>');
      expect(licao.resumo).toContain('Terraform');
      expect(licao.resumo).toContain('Kubernetes');
    }
  });

  it('todos os itens possuem xp e dificuldade definidos', () => {
    for (const item of comparacao.itens) {
      expect(item.xp).toBeGreaterThan(0);
      expect(['facil', 'medio', 'dificil']).toContain(item.dificuldade);
    }
  });
});