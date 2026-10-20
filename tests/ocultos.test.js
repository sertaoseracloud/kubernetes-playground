// Casos ocultos: todo exercício tem pelo menos um, para não dar para passar só decorando os casos
// visíveis. Que a solução de referência passa em todos (visíveis e ocultos) já é conferido em
// conteudo.test.js.
import { describe, it, expect } from 'vitest';
import { problemas } from '../src/conteudo/trilha.js';

const exercicios = problemas.filter((p) => p.tipo === 'exercicio');

describe('casos ocultos', () => {
  it('todo exercício tem pelo menos um caso oculto', () => {
    const sem = exercicios.filter((p) => !p.testes.some((t) => t.oculto)).map((p) => p.id);
    expect(sem).toEqual([]);
  });

  it('todo caso oculto tem dica e pelo menos uma regra', () => {
    for (const p of exercicios) {
      for (const t of p.testes.filter((x) => x.oculto)) {
        expect(t.dica, p.id).toBeTruthy();
        expect(t.regras.length, p.id).toBeGreaterThan(0);
      }
    }
  });

  it('a dica do caso oculto não mostra o caminho técnico do campo', () => {
    const tecnicas = exercicios.flatMap((p) => p.testes.filter((t) => t.oculto && /→|spec\.|\[name=/.test(t.dica)).map(() => p.id));
    expect(tecnicas).toEqual([]);
  });
});
