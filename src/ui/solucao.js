// Painel de solução: mostra a resposta esperada quando o aluno desiste ou erra
// muitas vezes. A solução fica oculta até ser pedida; depois aparece com destaque.
import { $ } from './util.js';

export function criarSolucao(container, obterSolucao) {
  const btn = container.querySelector('[data-acao="mostrar-solucao"]');
  const area = container.querySelector('.solucao-conteudo');
  if (!btn || !area) return;

  let visivel = false;

  btn.addEventListener('click', () => {
    if (visivel) return;
    visivel = true;
    area.innerHTML = `<pre><code>${obterSolucao()}</code></pre>`;
    area.hidden = false;
    btn.disabled = true;
    btn.textContent = 'Solução exibida';
    area.scrollIntoView({ block: 'nearest' });
  });
}

export function iniciarSolucao(idContainer, opts) {
  const container = $(idContainer);
  if (!container) return null;
  return criarSolucao(container, opts);
}