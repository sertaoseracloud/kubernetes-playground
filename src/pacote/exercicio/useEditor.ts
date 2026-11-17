// Adaptador do CodeMirror em hook (plano, seção 6): o único lugar da ilha com acesso imperativo
// ao DOM. A linguagem e o tema chegam do repositório (extensões), para a ilha servir aos cinco.
import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Prec, type Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';

export interface OpcoesDoEditor {
  readonly texto: string;
  /** Muda quando o texto é trocado de fora (restaurar): o editor recarrega. */
  readonly versao: number;
  readonly rotulo: string;
  readonly extensoes: readonly Extension[];
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
          ...atuais.current.extensoes,
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

  // Texto trocado de fora (restaurar o código original). Só a versão dispara: o texto muda a
  // cada tecla e não deve recarregar o editor.
  useEffect(() => {
    const view = vista.current;
    if (!view || opcoes.versao === 0) return;
    const atual = view.state.doc.toString();
    if (atual !== atuais.current.texto) view.dispatch({ changes: { from: 0, to: atual.length, insert: atuais.current.texto } });
  }, [opcoes.versao]);

  return elemento;
}
