// Adaptador do CodeMirror em hook (plano, seção 6): o único lugar da tela com acesso imperativo
// ao DOM. O componente só passa o texto inicial e recebe as mudanças.
import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { yaml } from '@codemirror/lang-yaml';
import { temaEditor } from '../ui/tema-editor.js';

export interface OpcoesDoEditor {
  readonly texto: string;
  /** Muda quando o texto é trocado de fora (restaurar): o editor recarrega. */
  readonly versao: number;
  readonly rotulo: string;
  readonly aoMudar: (texto: string) => void;
  readonly aoExecutar: () => void;
  readonly aoEnviar: () => void;
}

export function useEditor(opcoes: OpcoesDoEditor) {
  const elemento = useRef<HTMLDivElement>(null);
  const vista = useRef<EditorView | null>(null);
  // Os callbacks mudam a cada render; o editor lê sempre os mais novos.
  const atuais = useRef(opcoes);
  atuais.current = opcoes;

  useEffect(() => {
    const pai = elemento.current;
    if (!pai) return;
    const view = new EditorView({
      parent: pai,
      state: EditorState.create({
        doc: atuais.current.texto,
        extensions: [
          basicSetup,
          temaEditor,
          yaml(),
          EditorView.lineWrapping,
          EditorState.tabSize.of(2),
          EditorView.contentAttributes.of({ 'aria-label': atuais.current.rotulo }),
          Prec.highest(keymap.of([
            { key: 'Mod-Enter', run: () => { atuais.current.aoExecutar(); return true; } },
            { key: 'Mod-Shift-Enter', run: () => { atuais.current.aoEnviar(); return true; } },
          ])),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) atuais.current.aoMudar(u.state.doc.toString());
          }),
        ],
      }),
    });
    vista.current = view;
    return () => {
      view.destroy();
      vista.current = null;
    };
  }, []);

  // Texto trocado de fora (restaurar o código original).
  useEffect(() => {
    const view = vista.current;
    if (!view || opcoes.versao === 0) return;
    const atual = view.state.doc.toString();
    if (atual !== opcoes.texto) view.dispatch({ changes: { from: 0, to: atual.length, insert: opcoes.texto } });
    // Só a versão dispara: o texto muda a cada tecla e não deve recarregar o editor.
  }, [opcoes.versao]);

  return elemento;
}
