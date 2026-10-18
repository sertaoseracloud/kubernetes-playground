// Editor de código YAML/Markdown para Kubernetes Playground.
// Usa CodeMirror 6 com suporte a YAML, Markdown e atalhos de teclado.
import { EditorView, basicSetup } from 'codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { markdown } from '@codemirror/lang-markdown';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { $ } from './util.js';

export function criarEditor(container, { linguagem = 'yaml', inicial = '', onChange } = {}) {
  const extensoes = [
    basicSetup,
    keymap.of([indentWithTab]),
    linguagem === 'markdown' ? markdown() : yaml(),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && onChange) {
        onChange(update.state.doc.toString());
      }
    }),
    EditorView.theme({
      '&': { height: '100%' },
      '.cm-scroller': { overflow: 'auto' },
    }),
  ];

  const view = new EditorView({
    doc: inicial,
    extensions: extensoes,
    parent: container,
  });

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