import { describe, it, expect } from 'vitest';
import { BADGES, svgBadge, svgCartao, svgIcone } from '../src/badges.js';
import { CERTIFICADOS, EMISSOR, ORDEM } from '../src/certificados.js';

describe('badges', () => {
  it('cada certificado tem um badge correspondente', () => {
    const idsCertificados = Object.keys(CERTIFICADOS).sort();
    const idsBadges = Object.keys(BADGES).sort();
    expect(idsBadges).toEqual(idsCertificados);
  });

  it('gera SVG com ids únicos a cada desenho (evita conflito de gradientes)', () => {
    const a = svgBadge('fundamentos');
    const b = svgBadge('fundamentos');
    const id = (svg) => svg.match(/id="([^"]+)fundo"/)?.[1];
    expect(id(a)).not.toBe(id(b));
  });

  it('svgBadge produz SVG válido com role="img" e aria-label', () => {
    const svg = svgBadge('avancados');
    expect(svg).toContain('<svg');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="Badge:');
    expect(svg).toContain(CERTIFICADOS.avancados.titulo);
  });

  it('svgCartao gera cartão 1200×627 para LinkedIn', () => {
    const cartao = svgCartao('final');
    expect(cartao).toContain('viewBox="0 0 1200 627"');
    expect(cartao).toContain('CERTIFICADO DE CONCLUSÃO');
    expect(cartao).toContain(EMISSOR.organizacao);
  });

  it('svgCartao de módulo não-final diz "BADGE CONQUISTADO"', () => {
    const cartao = svgCartao('aws');
    expect(cartao).toContain('BADGE CONQUISTADO');
    expect(cartao).not.toContain('CERTIFICADO DE CONCLUSÃO');
  });

  it.each(ORDEM)('%s: badge contém símbolo e faixa esperados', (id) => {
    const svg = svgBadge(id);
    expect(svg).toContain(BADGES[id].simbolo);
    expect(svg).toContain(BADGES[id].faixa);
  });

  it('svgIcone gera ícone k8s com cores do tema Dracula', () => {
    const icone = svgIcone();
    expect(icone).toContain('viewBox="0 0 512 512"');
    expect(icone).toContain('k8s');
    expect(icone).toContain('#bd93f9'); // roxo Dracula
  });
});

describe('cartão do badge (prévia do post)', () => {
  it('o nome do curso cabe no cartão: nenhuma linha passa de 44 caracteres', () => {
    for (const id of ORDEM) {
      const linhas = [...svgCartao(id).matchAll(/<text [^>]*font-size="52"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
      for (const l of linhas) expect(l.length).toBeLessThanOrEqual(44);
    }
  });
});