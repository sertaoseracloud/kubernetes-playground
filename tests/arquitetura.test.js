// @vitest-environment happy-dom
// Aba 🏛️ Arquitetura: o fluxo é HTML do próprio site, sem script de terceiros, e lido em ordem.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderArquitetura, ETAPAS, DIAGRAMA_MERMAID } from '../src/ui/arquitetura.js';

describe('renderArquitetura', () => {
  it('desenha o fluxo como lista ordenada, com todas as etapas na ordem', async () => {
    document.body.innerHTML = await renderArquitetura();
    const etapas = [...document.querySelectorAll('.arquitetura-fluxo li b')].map((b) => b.textContent);
    expect(etapas).toEqual(ETAPAS.map(([titulo]) => titulo));
    expect(document.querySelector('section[aria-labelledby="arquitetura-titulo"] h2').textContent).toContain('simulador');
  });

  it('não carrega nada de fora (sem CDN, sem <script>), e não usa role="img" com controles dentro', async () => {
    const html = await renderArquitetura();
    expect(html).not.toMatch(/<script|https?:\/\//);
    expect(html).not.toContain('role="img"');
    expect(readFileSync(resolve(process.cwd(), 'src/ui/arquitetura.js'), 'utf8')).not.toMatch(/cdn\.|createElement\('script'\)/);
  });

  it('oferece o código Mermaid equivalente, escapado', async () => {
    document.body.innerHTML = await renderArquitetura();
    const codigo = document.querySelector('.arquitetura-detalhes pre').textContent;
    expect(codigo).toBe(DIAGRAMA_MERMAID);
    expect(codigo).toContain('-->');
  });
});
