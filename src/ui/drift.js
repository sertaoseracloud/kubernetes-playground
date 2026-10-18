// Componente de Relatório de Drift: exibe divergências entre YAML e estado do cluster.
// Ícones: ⚠️ modificado, ➕ será criado, ➖ será destruído.
import { esc } from './util.js';

const ICONE_DRIFT = {
  modificado: '⚠️',
  adicionado: '➕',
  removido: '➖',
};

const CLASSE_DRIFT = {
  modificado: 'drift-modificado',
  adicionado: 'drift-adicionado',
  removido: 'drift-removido',
};

const ROTULO_DRIFT = {
  modificado: 'Modificado',
  adicionado: 'Será criado',
  removido: 'Será destruído',
};

/**
 * Renderiza o relatório de drift como HTML.
 * @param {{drifts: Array<{tipo: string, kind: string, nome: string, detalhes: string}>, temDrift: boolean}} relatorio
 * @returns {string} HTML do relatório de drift.
 */
export function renderDrift(relatorio) {
  if (!relatorio || !relatorio.temDrift) {
    return `<div class="drift-container drift-sincronizado" role="status">
      <h2 class="drift-titulo">🔎 Relatório de Drift</h2>
      <p class="drift-resumo drift-ok">✅ Cluster e YAML estão sincronizados. Nenhuma divergência detectada.</p>
    </div>`;
  }

  const total = relatorio.drifts.length;
  const itens = relatorio.drifts.map((d) => {
    const icone = ICONE_DRIFT[d.tipo] || '❓';
    const classe = CLASSE_DRIFT[d.tipo] || '';
    const rotulo = ROTULO_DRIFT[d.tipo] || d.tipo;
    return `<li class="drift-item ${classe}" role="listitem">
      <span class="drift-icone" aria-hidden="true">${icone}</span>
      <div class="drift-conteudo">
        <span class="drift-rotulo sr">${esc(rotulo)}:</span>
        <strong>${esc(d.kind)}/${esc(d.nome)}</strong>
        <span class="drift-detalhes"> — ${esc(d.detalhes)}</span>
      </div>
    </li>`;
  }).join('');

  return `<div class="drift-container" role="status" aria-live="polite">
    <h2 class="drift-titulo">🔎 Relatório de Drift</h2>
    <p class="drift-resumo">${total} recurso${total > 1 ? 's' : ''} fora de sincronia</p>
    <ul class="drift-lista" role="list">${itens}</ul>
    <button class="btn btn-roxo drift-corrigir" id="btn-drift-corrigir" aria-label="Aplicar YAML para corrigir as divergências">
      🔧 Aplicar para corrigir
    </button>
  </div>`;
}