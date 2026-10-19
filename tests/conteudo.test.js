// @vitest-environment happy-dom
// O conteúdo da trilha contra o simulador: a solução de referência de cada exercício passa em
// todos os casos de teste, o esqueleto inicial não passa, e cada item tem o que a tela precisa.
import { describe, it, expect, beforeEach } from 'vitest';
import { problemas, itens, modulos } from '../src/conteudo/trilha.js';
import { aplicarYaml, verificarRegra, resetarEstado, descreverRegra, definirDiffUsado } from '../src/k8s/simulador.js';
import { ESQUELETO } from '../src/ui/item.js';

const passa = (codigo, testes, existentes) => {
  resetarEstado();
  definirDiffUsado(true); // o exercício do Diff pede o botão antes do apply (a tela marca isso)
  if (existentes) expect(aplicarYaml(existentes).ok).toBe(true);
  const r = aplicarYaml(codigo);
  if (!r.ok) return { ok: false, motivo: r.mensagem };
  const falhas = testes.flatMap((t) => (t.regras || []).map((regra) => ({ regra, v: verificarRegra(regra) }))).filter((x) => !x.v.ok);
  return { ok: falhas.length === 0, motivo: falhas.map((f) => `${JSON.stringify(f.regra)}: ${f.v.mensagem}`).join('; ') };
};

describe('conteúdo da trilha', () => {
  beforeEach(() => localStorage.clear());

  it.each(problemas.map((p) => [p.id, p]))('%s: a solução de referência passa em todos os casos', (_id, p) => {
    expect(p.solucao, 'exercício sem solução').toBeTruthy();
    expect(p.testes?.length, 'exercício sem testes').toBeGreaterThan(0);
    const r = passa(p.solucao, p.testes, p.existentes);
    expect(r.motivo).toBe('');
    expect(r.ok).toBe(true);
  });

  it('o esqueleto inicial não resolve nenhum exercício', () => {
    for (const p of problemas) expect(passa(ESQUELETO, p.testes, p.existentes).ok, p.id).toBe(false);
  });

  it('toda regra de teste tem descrição em português para a aba Testes', () => {
    for (const p of problemas) {
      for (const t of p.testes) for (const regra of t.regras || []) expect(descreverRegra(regra), `${p.id} ${regra.tipo}`).toBeTruthy();
    }
  });

  it('todo item tem id único, título, dificuldade e módulo; lições têm texto', () => {
    expect(new Set(itens.map((i) => i.id)).size).toBe(itens.length);
    for (const i of itens) {
      expect(i.titulo, i.id).toBeTruthy();
      expect(['facil', 'medio', 'dificil'], i.id).toContain(i.dificuldade);
      expect(modulos.some((m) => m.id === i.modulo), i.id).toBe(true);
      if (i.tipo === 'licao') expect(i.resumo, i.id).toBeTruthy();
    }
  });
});
