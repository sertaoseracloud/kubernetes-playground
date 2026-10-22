// @vitest-environment happy-dom
// Editor com abas de arquivos (como no DivergeTerraform): o apply junta os manifestos, o rascunho
// de um arquivo só continua como texto, o link compartilhado leva as abas e o terminal tem ls e cat.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EditorArquivos, juntarArquivos, normalizarArquivos, formaDeGuardar, ARQUIVO_PRINCIPAL } from '../src/ui/editor.js';
import { criarTelaItem } from '../src/ui/item.js';
import { linkCompartilhado, lerRota } from '../src/compartilhar.js';
import { interpretar, completarKubectl } from '../src/k8s/comandos.js';
import { problemas } from '../src/conteudo/trilha.js';
import { lerRascunho, gravarRascunho } from '../src/progresso.js';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const corpo = html.slice(html.indexOf('>', html.indexOf('<body')) + 1, html.lastIndexOf('</body>')).replace(/<script[\s\S]*?<\/script>/g, '');
const POD = 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: web\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25\n';
const SVC = 'apiVersion: v1\nkind: Service\nmetadata:\n  name: web\nspec:\n  selector:\n    app: web\n  ports:\n    - port: 80\n';

describe('arquivos do editor (funções puras)', () => {
  it('junta só os manifestos, na ordem das abas, separados por ---', () => {
    expect(juntarArquivos({ 'manifest.yaml': POD })).toBe(POD);
    const junto = juntarArquivos({ 'manifest.yaml': POD, 'service.yaml': SVC, 'README.md': '# notas' });
    expect(junto.split('\n---\n')).toHaveLength(2);
    expect(junto).not.toContain('# notas');
    expect(juntarArquivos({})).toBe('');
  });

  it('rascunho antigo (texto) vira manifest.yaml; um arquivo só volta a ser texto', () => {
    expect(normalizarArquivos(POD)).toEqual({ [ARQUIVO_PRINCIPAL]: POD });
    expect(normalizarArquivos(null)).toBeNull();
    expect(normalizarArquivos({ a: 1 })).toBeNull();
    expect(formaDeGuardar({ [ARQUIVO_PRINCIPAL]: POD })).toBe(POD);
    expect(formaDeGuardar({ [ARQUIVO_PRINCIPAL]: POD, 'service.yaml': SVC })).toEqual({ [ARQUIVO_PRINCIPAL]: POD, 'service.yaml': SVC });
  });
});

describe('abas do editor', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="abas"></div><div id="ed"></div>';
  });
  const novo = () => new EditorArquivos({ abas: document.getElementById('abas'), editor: document.getElementById('ed') });

  it('atalhos preservam os modificadores antes do tratamento de Enter do Android', () => {
    let execucoes = 0;
    let envios = 0;
    const ed = new EditorArquivos({
      abas: document.getElementById('abas'),
      editor: document.getElementById('ed'),
      aoExecutar: () => { execucoes++; },
      aoEnviar: () => { envios++; },
    });
    ed.carregar(POD);
    // Ctrl+Enter e Meta+Enter devem ser interceptados e prevenidos pelo handler DOM
    for (const mod of ['ctrlKey', 'metaKey']) {
      const ev = new KeyboardEvent('keydown', {
        key: 'Enter', [mod]: true, shiftKey: false, bubbles: true, cancelable: true,
      });
      ed.view.contentDOM.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    }
    // Ctrl+Shift+Enter e Meta+Shift+Enter também devem ser prevenidos
    for (const mod of ['ctrlKey', 'metaKey']) {
      const ev = new KeyboardEvent('keydown', {
        key: 'Enter', [mod]: true, shiftKey: true, bubbles: true, cancelable: true,
      });
      ed.view.contentDOM.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    }
    // O handler DOM deve ter disparado ao menos as execuções/envios esperados
    expect(execucoes).toBeGreaterThanOrEqual(2);
    expect(envios).toBeGreaterThanOrEqual(2);
    expect(ed.getValue()).toBe(POD);
    ed.destroy();
  });

  it('+ cria um arquivo, × apaga (menos o principal), e o nome precisa ser válido', () => {
    const ed = novo();
    ed.carregar(POD);
    const botoes = () => [...document.querySelectorAll('#abas button')].map((b) => b.getAttribute('aria-label') ?? b.textContent);
    expect(botoes()).toEqual(['manifest.yaml', 'Novo arquivo']);
    window.prompt = () => 'service.yaml';
    document.querySelector('#abas [aria-label="Novo arquivo"]').click();
    expect(Object.keys(ed.arquivos)).toEqual(['manifest.yaml', 'service.yaml']);
    expect(document.querySelector('#abas [aria-current="true"]').textContent).toBe('service.yaml');
    window.alert = () => {};
    window.prompt = () => '../fora.yaml';
    document.querySelector('#abas [aria-label="Novo arquivo"]').click();
    expect(Object.keys(ed.arquivos)).toHaveLength(2);
    window.confirm = () => true;
    document.querySelector('#abas [aria-label="Excluir service.yaml"]').click();
    expect(Object.keys(ed.arquivos)).toEqual(['manifest.yaml']);
    expect(document.querySelector('#abas [aria-label="Excluir manifest.yaml"]')).toBeNull();
    expect(document.activeElement).toBe(ed.view.contentDOM);
    expect(ed.view.contentDOM.getAttribute('aria-label')).toContain('manifest.yaml');
    ed.destroy();
  });

  it('modo e rótulo acompanham a aba e preservam a seleção', () => {
    const ed = novo();
    ed.carregar({ 'manifest.yaml': POD, 'notas.md': '# notas', 'dados.json': '{}' });
    ed.view.dispatch({ selection: { anchor: 3 } });
    ed.abrir('notas.md');
    expect(ed.view.contentDOM.getAttribute('aria-label')).toContain('notas.md — Markdown');
    ed.abrir('dados.json');
    expect(ed.view.contentDOM.getAttribute('aria-label')).toContain('dados.json — texto simples');
    ed.abrir('manifest.yaml');
    expect(ed.view.state.selection.main.anchor).toBe(3);
    expect(ed.view.contentDOM.getAttribute('aria-label')).toContain('YAML');
    ed.destroy();
  });
});

describe('na tela do exercício', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = corpo;
    window.confirm = () => true;
  });
  const montar = () => criarTelaItem({ layout: { aplicar() {}, mostrarDescricao() {} }, definirStatus: () => {}, aoMudarProgresso: () => {} });

  it('rascunho com vários arquivos abre com as mesmas abas, e o apply usa todos', () => {
    const id = problemas[0].id;
    gravarRascunho(id, { 'manifest.yaml': POD, 'service.yaml': SVC });
    const tela = montar();
    tela.abrir(id);
    expect([...document.querySelectorAll('#abas-arquivos .aba-arquivo .aba')].map((b) => b.textContent)).toEqual(['manifest.yaml', 'service.yaml']);
    expect(tela.editor().getValue()).toContain('kind: Service');
    expect(lerRascunho(id)).toEqual({ 'manifest.yaml': POD, 'service.yaml': SVC });
  });

  it('o link compartilhado leva os arquivos e abre o exercício com eles', () => {
    const id = problemas[0].id;
    const rota = lerRota(new URL(linkCompartilhado({ item: id, arquivos: { 'manifest.yaml': POD, 'service.yaml': SVC } }), 'http://localhost'));
    expect(rota).toMatchObject({ tela: 'item', id });
    const tela = montar();
    tela.abrir(rota.id, rota.arquivos);
    expect(tela.editor().arquivos).toEqual({ 'manifest.yaml': POD, 'service.yaml': SVC });
  });
});

describe('ls e cat no terminal', () => {
  const texto = (r) => r.linhas.map((l) => l.texto).join('\n');
  const arquivos = { 'manifest.yaml': POD, 'service.yaml': SVC };

  it('ls lista os arquivos e cat mostra um deles', () => {
    expect(texto(interpretar('ls', {}, arquivos))).toBe('manifest.yaml  service.yaml');
    expect(texto(interpretar('cat service.yaml', {}, arquivos))).toContain('kind: Service');
    expect(interpretar('cat nada.yaml', {}, arquivos).linhas[0]).toMatchObject({ classe: 'erro', texto: 'cat: nada.yaml: No such file or directory' });
    expect(interpretar('cat', {}, arquivos).linhas[0].classe).toBe('erro');
  });

  it('Tab completa o nome do arquivo depois do cat', () => {
    expect(completarKubectl('cat se', Object.keys(arquivos))).toEqual(['cat service.yaml']);
    expect(completarKubectl('')).toContain('ls');
  });
});
