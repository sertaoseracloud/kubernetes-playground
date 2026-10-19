// Editor de código YAML/Markdown do Kubernetes Playground (CodeMirror 6).
// Como no terraform-playground: as cores vêm do tema do site (tema-editor.js), o leitor de
// tela ouve o nome do editor e os atalhos (#ajuda-editor), Ctrl+Enter roda e Ctrl+Shift+Enter
// envia. O Tab não fica preso aqui dentro: ele sai do editor (recuar a linha é Ctrl+[).
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { yaml } from '@codemirror/lang-yaml';
import { markdown } from '@codemirror/lang-markdown';
import { temaEditor } from './tema-editor.js';
import { $ } from './util.js';

const ROTULO = { yaml: 'Editor de código YAML (Kubernetes)', markdown: 'Editor de texto Markdown' };

export function criarEditor(container, { linguagem = 'yaml', inicial = '', onChange, aoExecutar, aoEnviar } = {}) {
  const extensoes = [
    basicSetup,
    linguagem === 'markdown' ? markdown() : yaml(),
    temaEditor,
    EditorView.lineWrapping,
    EditorState.tabSize.of(2),
    Prec.highest(keymap.of([
      { key: 'Mod-Enter', run: () => { aoExecutar?.(); return Boolean(aoExecutar); } },
      { key: 'Mod-Shift-Enter', run: () => { aoEnviar?.(); return Boolean(aoEnviar); } },
    ])),
    EditorView.contentAttributes.of({ 'aria-label': ROTULO[linguagem] ?? ROTULO.yaml, tabindex: '0', 'aria-describedby': 'ajuda-editor' }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && onChange) onChange(update.state.doc.toString());
    }),
  ];

  const view = new EditorView({ doc: inicial, extensions: extensoes, parent: container });

  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue: (v) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } }),
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}

export function iniciarEditorYAML(idContainer, opts) {
  const container = $(idContainer);
  if (!container) return null;
  return criarEditor(container, { linguagem: 'yaml', ...opts });
}

export function iniciarEditorMarkdown(idContainer, opts) {
  const container = $(idContainer);
  if (!container) return null;
  return criarEditor(container, { linguagem: 'markdown', ...opts });
}
