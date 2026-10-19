// @vitest-environment happy-dom
// Carga horária: cada certificado vale as horas das atividades do módulo (mínimo 1 hora)
// e aparece no certificado, no post, no XML, no validador e na página do badge.
import { describe, it, expect } from 'vitest';
import { modulos } from '../src/conteudo/trilha.js';
import { CERTIFICADOS, ORDEM } from '../src/certificados.js';
import { CARGA_MINIMA_HORAS, MINUTOS_POR_ATIVIDADE, horasDosItens, minutosDoItem, textoHoras } from '../src/cargaHoraria.js';

const MODULOS = ORDEM.filter((id) => id !== 'final');

describe('carga horária', () => {
  it('estimativa por atividade: lição e exercícios por dificuldade', () => {
    expect(minutosDoItem({ tipo: 'licao' })).toBe(MINUTOS_POR_ATIVIDADE.licao);
    expect(minutosDoItem({ tipo: 'exercicio', dificuldade: 'dificil' })).toBe(MINUTOS_POR_ATIVIDADE.dificil);
    expect(minutosDoItem({ tipo: 'exercicio', dificuldade: 'medio' })).toBe(MINUTOS_POR_ATIVIDADE.medio);
    expect(minutosDoItem({ tipo: 'exercicio', dificuldade: 'facil' })).toBe(MINUTOS_POR_ATIVIDADE.facil);
    expect(minutosDoItem({ tipo: 'livre' })).toBe(0);
    expect(minutosDoItem(null)).toBe(0);
  });

  it('nenhuma atividade certificada vale menos de 1 hora', () => {
    expect(CARGA_MINIMA_HORAS).toBe(1);
    expect(horasDosItens([])).toBe(1);
    expect(horasDosItens([{ tipo: 'licao' }])).toBe(1);
    expect(horasDosItens(Array.from({ length: 5 }, () => ({ tipo: 'exercicio', dificuldade: 'medio' })))).toBe(3); // 150 min
    for (const id of ORDEM) expect(CERTIFICADOS[id].cargaHoraria).toBeGreaterThanOrEqual(1);
  });

  it.each(MODULOS)('%s: a carga do certificado bate com as atividades do módulo', (id) => {
    const modulo = modulos.find((m) => m.id === id);
    if (!modulo) return; // alguns certificados podem não ter módulo direto
    // Se o conteúdo mudou, revise a cargaHoraria em src/certificados.js.
    expect(CERTIFICADOS[id].cargaHoraria).toBe(horasDosItens(modulo.itens));
  });

  it('o certificado final soma todos os módulos', () => {
    const somaModulos = MODULOS.reduce((s, id) => s + CERTIFICADOS[id].cargaHoraria, 0);
    expect(CERTIFICADOS.final.cargaHoraria).toBe(somaModulos);
  });

  it('texto em horas', () => {
    expect(textoHoras(1)).toBe('1 hora');
    expect(textoHoras(23)).toBe('23 horas');
    expect(textoHoras(0)).toBe('0 horas');
  });
});