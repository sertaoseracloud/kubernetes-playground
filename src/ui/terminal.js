// Terminal simulado para Kubernetes Playground.
// Exibe saída de comandos kubectl e permite interação básica.
export function criarTerminal(container, opcoes = {}) {
  const { aoMudar, campo, historico = [], aoMudarHistorico, completar } = opcoes;
  let animando = false;
  let indiceHistorico = -1;

  function escrever(texto, classe = '') {
    const linha = document.createElement('div');
    linha.className = `linha-terminal ${classe}`.trim();
    linha.textContent = texto;
    container.appendChild(linha);
    container.scrollTop = container.scrollHeight;
    if (aoMudar) aoMudar(animando);
  }

  function limpar() {
    container.innerHTML = '';
    if (aoMudar) aoMudar(false);
  }

  function pular() {
    animando = false;
    if (aoMudar) aoMudar(false);
  }

  if (campo) {
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = campo.value.trim();
        if (!cmd) return;
        escrever(`$ ${cmd}`, 'comando');
        historico.push(cmd);
        if (aoMudarHistorico) aoMudarHistorico(historico);
        indiceHistorico = historico.length;
        campo.value = '';
        // Simula resposta do kubectl
        setTimeout(() => escrever(`kubectl: comando "${cmd}" executado (simulado)`), 100);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (indiceHistorico > 0) {
          indiceHistorico--;
          campo.value = historico[indiceHistorico] || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (indiceHistorico < historico.length - 1) {
          indiceHistorico++;
          campo.value = historico[indiceHistorico] || '';
        } else {
          indiceHistorico = historico.length;
          campo.value = '';
        }
      } else if (e.key === 'Tab' && completar) {
        e.preventDefault();
        const sugestoes = completar(campo.value);
        if (sugestoes.length === 1) campo.value = sugestoes[0];
      }
    });
  }

  return { escrever, limpar, pular };
}