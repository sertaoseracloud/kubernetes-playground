// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { EditorView } from 'codemirror';
import { criarTelaItem, codigoInicial } from '../src/ui/item.js';
import { problemas, buscarItem } from '../src/conteudo/trilha.js';
import { lerRascunho } from '../src/progresso.js';

const html = readFileSync('index.html', 'utf8');
const corpo = html.slice(html.indexOf('<body'), html.lastIndexOf('</body>')).replace(/<script[\s\S]*?<\/script>/g, '');
describe('proteção do rascunho na tela', () => {
  let tela, view;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', new window.Storage());
    document.body.innerHTML = corpo;
    tela = criarTelaItem({ layout: { aplicar() {}, mostrarDescricao() {} }, definirStatus() {}, aoMudarProgresso() {} });
    tela.abrir('livre');
    view = EditorView.findFromDOM(document.querySelector('.cm-content'));
  });
  afterEach(() => { view.destroy(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  const editar = (texto) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: texto } });
  it('salva antes da transição rápida e isola os exercícios', () => {
    editar('rascunho A');
    vi.advanceTimersByTime(100);
    tela.abrir(problemas[0].id);
    expect(lerRascunho('livre')).toBe('rascunho A');
    editar('rascunho B');
    vi.advanceTimersByTime(300);
    expect(lerRascunho(problemas[0].id)).toBe('rascunho B');
    tela.abrir('livre');
    expect(view.state.doc.toString()).toBe('rascunho A');
  });
  it('restaurar invalida a gravação pendente', () => {
    vi.stubGlobal('confirm', () => true);
    editar('descartado');
    vi.advanceTimersByTime(299);
    document.getElementById('btn-restaurar').click();
    vi.advanceTimersByTime(500);
    expect(lerRascunho('livre')).toBeNull();
    tela.abrir('livre');
    expect(view.state.doc.toString()).toBe(codigoInicial(buscarItem('livre')));
  });
  it.each(['pagehide', 'hashchange'])('%s descarrega sem esperar debounce', (evento) => {
    editar('última edição');
    window.dispatchEvent(new Event(evento));
    expect(lerRascunho('livre')).toBe('última edição');
  });
  it('quota exibe aviso sem perder o código', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    editar('meu código');
    vi.advanceTimersByTime(300);
    expect(view.state.doc.toString()).toBe('meu código');
    expect(document.getElementById('aviso-armazenamento').hidden).toBe(false);
  });
});
