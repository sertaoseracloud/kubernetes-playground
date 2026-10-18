// Painel de Estado: exibe o JSON do cluster simulado com diff entre applies.
// Verde para recursos adicionados, vermelho para removidos, amarelo para alterados.
import { esc } from './util.js';

/**
 * Formata um valor como JSON legível com indentação.
 * @param {*} valor - Valor a serializar.
 * @returns {string} JSON formatado.
 */
export function formatarJson(valor) {
  try {
    return JSON.stringify(valor, null, 2);
  } catch {
    return String(valor);
  }
}

/**
 * Renderiza o painel de estado do cluster com highlight de mudanças.
 * @param {object} estadoAtual - Estado retornado por obterEstado().
 * @param {{adicionados: object[], removidos: object[], alterados: object[]}} [diff] - Resultado de compararEstados().
 * @returns {string} HTML do painel de estado.
 */
export function renderEstado(estadoAtual, diff) {
  if (!estadoAtual || typeof estadoAtual !== 'object') {
    return `<div class="estado-vazio" role="status">
      <p>Cluster vazio. Aplique um manifesto YAML para ver o estado aqui.</p>
    </div>`;
  }

  const temDiff = diff && (diff.adicionados.length || diff.removidos.length || diff.alterados.length);

  let html = `<div class="estado-container" aria-label="Estado do cluster">`;

  // Resumo das mudanças
  if (temDiff) {
    html += `<div class="estado-resumo" role="status" aria-live="polite">
      <span class="estado-badge estado-adicionado" aria-label="${diff.adicionados.length} adicionados">+${diff.adicionados.length}</span>
      <span class="estado-badge estado-removido" aria-label="${diff.removidos.length} removidos">-${diff.removidos.length}</span>
      <span class="estado-badge estado-alterado" aria-label="${diff.alterados.length} alterados">~${diff.alterados.length}</span>
    </div>`;
  }

  // Lista de mudanças recentes
  if (temDiff) {
    html += `<details class="estado-mudancas" open>
      <summary>Mudanças recentes</summary>
      <ul class="estado-lista-mudancas">`;

    for (const item of diff.adicionados) {
      html += `<li class="estado-item estado-adicionado">
        <span class="estado-marca" aria-hidden="true">+</span>
        <span class="sr">Adicionado:</span> ${esc(item.tipo)}/${esc(item.nome)}
      </li>`;
    }
    for (const item of diff.removidos) {
      html += `<li class="estado-item estado-removido">
        <span class="estado-marca" aria-hidden="true">-</span>
        <span class="sr">Removido:</span> ${esc(item.tipo)}/${esc(item.nome)}
      </li>`;
    }
    for (const item of diff.alterados) {
      html += `<li class="estado-item estado-alterado">
        <span class="estado-marca" aria-hidden="true">~</span>
        <span class="sr">Alterado:</span> ${esc(item.tipo)}/${esc(item.nome)}
      </li>`;
    }

    html += `</ul></details>`;
  }

  // JSON completo do estado
  html += `<details class="estado-json" open>
    <summary>Estado completo (JSON)</summary>
    <pre class="estado-codigo"><code>${esc(formatarJson(estadoAtual))}</code></pre>
  </details>`;

  html += `</div>`;
  return html;
}