// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderLanding, numerosDaTrilha } from '../src/ui/landing.js';
import { modulos, problemas, contarProjetos } from '../src/conteudo/trilha.js';
import { ORDEM } from '../src/certificados.js';

describe('landing page', () => {
  beforeEach(() => localStorage.clear());

  it('os números vêm do conteúdo da trilha', () => {
    const n = numerosDaTrilha();
    expect(n.exercicios).toBe(problemas.length);
    expect(n.modulos).toBe(modulos.length);
    expect(n.projetos).toBe(contarProjetos());
    expect(n.projetos).toBe(10); // microserviços, multi-cloud e os 8 do módulo de projetos práticos
    expect(n.certificados).toBe(ORDEM.length);
  });

  it('mostra todos os módulos, os badges e leva para a trilha', () => {
    const el = document.createElement('main');
    renderLanding(el);
    expect(el.querySelectorAll('.modulo-card')).toHaveLength(modulos.length);
    expect(el.querySelectorAll('.vitrine-badges svg')).toHaveLength(ORDEM.length);
    expect(el.querySelector('.hero-acoes a').getAttribute('href')).toBe('#/trilha');
    expect(el.querySelector('a[href="#/privacidade"]')).not.toBeNull();
  });

  it('quem já começou vê "Continuar"', () => {
    localStorage.setItem('kubernetes-playground:progresso', JSON.stringify({ [problemas[0].id]: 'resolvido' }));
    const el = document.createElement('main');
    renderLanding(el);
    expect(el.querySelector('.hero-acoes a').textContent).toContain('Continuar');
  });
});

describe('contagem do progresso', () => {
  beforeEach(() => localStorage.clear());

  it('conta exercícios e lições separados, como o caminho mostra', async () => {
    const { resumoProgresso } = await import('../src/ui/inicio.js');
    const { itens } = await import('../src/conteudo/trilha.js');
    const licao = itens.find((i) => i.tipo === 'licao');
    const exercicios = itens.filter((i) => i.tipo === 'exercicio').slice(0, 2);
    const prog = Object.fromEntries([licao, ...exercicios].map((i) => [i.id, 'resolvido']));
    localStorage.setItem('kubernetes-playground:progresso', JSON.stringify(prog));
    expect(resumoProgresso()).toMatchObject({ resolvidos: 2, licoesLidas: 1 });
  });
});

describe('certificados na trilha (regra da cadeia)', () => {
  beforeEach(() => localStorage.clear());

  it('módulo concluído sem o certificado anterior fica em espera', async () => {
    const { certificadosDaJornada } = await import('../src/ui/inicio.js');
    const { modulos } = await import('../src/conteudo/trilha.js');
    // Recursos Avançados completo, Fundamentos não: o certificado de Avançados espera o de Fundamentos.
    const w3 = modulos.find((m) => m.id === 'avancados');
    const prog = Object.fromEntries(w3.itens.filter((i) => i.tipo === 'exercicio').map((i) => [i.id, 'resolvido']));
    localStorage.setItem('kubernetes-playground:progresso', JSON.stringify(prog));
    const certs = certificadosDaJornada();
    const cw3 = certs.find((c) => c.id === 'avancados');
    expect(cw3).toMatchObject({ concluido: true, liberado: false, falta: 'fundamentos' });
    expect(certs.find((c) => c.id === 'fundamentos').liberado).toBe(false);
  });

  it('com Fundamentos e Avançados concluídos, os dois saem, e o de Avançados leva a data de Fundamentos', async () => {
    const { certificadosDaJornada } = await import('../src/ui/inicio.js');
    const { modulos } = await import('../src/conteudo/trilha.js');
    const ids = modulos.filter((m) => ['fundamentos', 'avancados'].includes(m.id))
      .flatMap((m) => m.itens.filter((i) => i.tipo === 'exercicio').map((i) => i.id));
    localStorage.setItem('kubernetes-playground:progresso', JSON.stringify(Object.fromEntries(ids.map((id) => [id, 'resolvido']))));
    const certs = certificadosDaJornada();
    const [html, w3] = certs;
    expect(html.liberado && w3.liberado).toBe(true);
    expect(w3.cadeia).toEqual([html.data]);
  });
});
