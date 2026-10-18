// Temas de cores para o editor CodeMirror, mapeados dos temas do site.
// O tema do editor segue o tema escolhido no painel ♿ Acessibilidade.

export const TEMAS_EDITOR = {
  claro: {
    background: '#ffffff',
    foreground: '#24292e',
    selection: '#c8c8fa',
    cursor: '#24292e',
    gutterBackground: '#f6f8fa',
    gutterForeground: '#6a737d',
    activeLine: '#fffbdd',
    matchingBracket: '#34d058',
  },
  escuro: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    selection: '#264f78',
    cursor: '#d4d4d4',
    gutterBackground: '#252526',
    gutterForeground: '#858585',
    activeLine: '#2a2d2e',
    matchingBracket: '#87d7cf',
  },
  'alto-contraste': {
    background: '#000000',
    foreground: '#ffffff',
    selection: '#ffff00',
    cursor: '#ffff00',
    gutterBackground: '#000000',
    gutterForeground: '#ffffff',
    activeLine: '#1a1a1a',
    matchingBracket: '#00ff00',
  },
};

/** Retorna o objeto de tema do editor correspondente ao nome do tema do site. */
export function temaEditorPara(nomeTema) {
  return TEMAS_EDITOR[nomeTema] || TEMAS_EDITOR.claro;
}