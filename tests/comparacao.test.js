import { describe, it, expect } from 'vitest';
import { comparacao } from '../src/conteudo/comparacao.js';

describe('módulo comparacao', () => {
  it('exporta estrutura válida com id e titulo', () => {
    expect(comparacao.id).toBe('comparacao');
    expect(comparacao.titulo).toContain('Terraform');
    expect(comparacao.titulo).toContain('Kubernetes');
  });

  it('contém lições conceituais e o quiz de revisão (uma lição com as respostas escondidas)', () => {
    const licoes = comparacao.itens.filter((i) => i.tipo === 'licao' && i.id !== 'comp-quiz');
    expect(licoes.length).toBeGreaterThanOrEqual(7);
    const quiz = comparacao.itens.find((i) => i.id === 'comp-quiz');
    // Não há YAML para testar num quiz: antes era um "exercício" impossível de resolver.
    expect(quiz.tipo).toBe('licao');
    expect(quiz.resumo).toMatch(/<details><summary>Ver respostas<\/summary>/);
  });

  it('é um módulo extra (sem certificado próprio)', () => {
    expect(comparacao.extra).toBe(true);
  });

  it('todas as lições possuem resumo com tabela comparativa', () => {
    const licoes = comparacao.itens.filter((i) => i.tipo === 'licao' && i.id !== 'comp-quiz');
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