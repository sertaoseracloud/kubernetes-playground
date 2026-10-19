// @vitest-environment happy-dom
// O cenário de cada módulo (o cluster que cresce): decorativo, atrás do caminho e sem rótulos
// soltos para o leitor de tela; o estágio acompanha os exercícios resolvidos.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { htmlDoCenario } from '../src/ui/cenarios/index.js';
import { CENARIO_DO_MODULO } from '../src/conteudo/cenarios.js';
import { modulos } from '../src/conteudo/trilha.js';

describe('cenários da trilha', () => {
  it('todo cenário é decorativo (aria-hidden) e não usa aria-label sem papel', () => {
    for (const m of modulos) {
      const html = htmlDoCenario(CENARIO_DO_MODULO[m.id], m.id, 0);
      if (!html) continue;
      document.body.innerHTML = html;
      expect(document.querySelector('.cenario').getAttribute('aria-hidden'), m.id).toBe('true');
      expect(html, m.id).not.toContain('aria-label');
    }
  });

  it('o cluster cresce com os exercícios resolvidos', () => {
    const id = modulos.find((m) => CENARIO_DO_MODULO[m.id]?.estagios?.length > 1)?.id;
    const cen = CENARIO_DO_MODULO[id];
    const ultimo = Math.max(...cen.estagios.map((e) => e.feitos));
    document.body.innerHTML = htmlDoCenario(cen, id, ultimo);
    const depois = document.querySelectorAll('.cenario-elemento').length;
    document.body.innerHTML = htmlDoCenario(cen, id, 0);
    expect(depois).toBeGreaterThanOrEqual(document.querySelectorAll('.cenario-elemento').length);
  });

  it('sem cenário, nada é desenhado', () => {
    expect(htmlDoCenario(undefined, 'x', 0)).toBe('');
  });

  it('o cenário fica atrás do caminho (z-index -1) e não recebe clique', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/cenarios.css'), 'utf8');
    expect(css).toMatch(/\.cenario \{[^}]*z-index: -1;[^}]*pointer-events: none;/s);
  });
});
