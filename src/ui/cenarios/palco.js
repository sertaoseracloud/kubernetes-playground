// Animação e interatividade dos cenários visuais da trilha.
// No Kubernetes, o cenário é estático (renderizado via HTML em src/ui/cenarios/index.js),
// mas esta função existe para manter a paridade de API com os outros playgrounds
// (onde o cenário pode ter animações ou interações mais complexas).

/**
 * Inicializa o palco de cenários dentro de um elemento raiz.
 * @param {HTMLElement} el - Elemento raiz que contém os cenários
 * @returns {{ desligar: () => void }} Objeto com função de cleanup
 */
export function ligarCenarios(el) {
  // Por enquanto, os cenários de Kubernetes são puramente visuais e estáticos.
  // Esta função retorna um no-op para manter a consistência da API.
  // Futuramente, pode-se adicionar tooltips interativos, zoom ou filtros aqui.

  const desligar = () => {
    // Cleanup: remover event listeners se fossem adicionados
  };

  return { desligar };
}