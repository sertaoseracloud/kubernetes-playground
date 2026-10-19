// @vitest-environment happy-dom
// A trilha: nenhum item repetido, cada módulo com o troféu do próprio certificado, e o
// módulo extra (comparação com o Terraform) fora da conta do certificado final.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { modulos, itens } from '../src/conteudo/trilha.js';
import { ORDEM } from '../src/certificados.js';
import { calcularJornada } from '../src/gamificacao.js';

describe('trilha', () => {
  it('nenhum item aparece duas vezes', () => {
    const ids = itens.map((i) => i.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('os módulos com certificado seguem a ordem da cadeia de certificados', () => {
    const certificaveis = modulos.filter((m) => !m.extra).map((m) => m.id);
    expect(certificaveis).toEqual(ORDEM.filter((id) => id !== 'final'));
  });

  it('o módulo extra não segura o certificado final', () => {
    const resolvido = new Set(modulos.filter((m) => !m.extra).flatMap((m) => m.itens.map((i) => i.id)));
    const j = calcularJornada({ modulos, statusDe: (id) => (resolvido.has(id) ? 'resolvido' : undefined), dataDe: () => '2026-10-19' });
    expect(j.modulos.find((m) => m.extra).concluido).toBe(false);
    expect(j.final).toEqual({ concluido: true, concluidoEm: '2026-10-19' });
  });
});

describe('tela da trilha', () => {
  beforeAll(() => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    document.body.innerHTML = html.slice(html.indexOf('<body'), html.lastIndexOf('</body>')).replace(/^<body[^>]*>/, '').replace(/<script[\s\S]*?<\/script>/g, '');
    localStorage.clear();
  });

  it('desenha sem erro, com o troféu de cada módulo apontando para o certificado dele', async () => {
    const { renderInicio } = await import('../src/ui/inicio.js');
    const tela = document.getElementById('tela-inicio');
    expect(() => renderInicio(tela)).not.toThrow();
    const trofeus = [...tela.querySelectorAll('.trofeu [data-certificado]')].map((b) => b.dataset.certificado);
    expect(trofeus).toEqual(modulos.filter((m) => !m.extra).map((m) => m.id));
    expect(tela.querySelector('#unidade-comparacao .unidade-numero').textContent).toBe('Módulo extra');
  });
});
