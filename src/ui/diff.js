// Painel de Diff: exibe o resultado de simularApply() no estilo Terraform plan.
// Verde para criar, amarelo para atualizar, vermelho para destruir.
import { esc } from './util.js';

/**
 * Renderiza o resultado de uma simulação de apply como HTML.
 * @param {{ok: boolean, diff: {criar: object[], atualizar: object[], destruir: object[]}, mensagem: string}} resultado
 * @returns {string} HTML do painel de diff.
 */
export function renderDiff(resultado) {
  if (!resultado) {
    return `<div class="diff-vazio" role="status">
      <p>Clique em 🔍 Diff para prever as mudanças antes de aplicar.</p>
    </div>`;
  }

  if (!resultado.ok) {
    return `<div class="diff-erro" role="alert">
      <p class="diff-mensagem-erro">❌ ${esc(resultado.mensagem)}</p>
    </div>`;
  }

  const { criar, atualizar, destruir } = resultado.diff;
  const total = criar.length + atualizar.length + destruir.length;

  if (total === 0) {
    return `<div class="diff-vazio" role="status">
      <p>✅ Nenhuma mudança detectada. O estado já corresponde ao manifesto.</p>
    </div>`;
  }

  let html = `<div class="diff-container" aria-label="Plano de mudanças">`;

  // Resumo estilo Terraform
  html += `<div class="diff-resumo" role="status" aria-live="polite">
    <span class="diff-badge diff-criar" aria-label="${criar.length} a criar">+ ${criar.length} to create</span>
    <span class="diff-badge diff-atualizar" aria-label="${atualizar.length} a atualizar">~ ${atualizar.length} to update</span>
    <span class="diff-badge diff-destruir" aria-label="${destruir.length} a destruir">- ${destruir.length} to destroy</span>
  </div>`;

  // Lista de mudanças
  html += `<ul class="diff-lista">`;

  for (const item of criar) {
    html += `<li class="diff-item diff-criar">
      <span class="diff-marca" aria-hidden="true">+</span>
      <span class="sr">Criar:</span>
      <code class="diff-recurso">${esc(item.kind)}/${esc(item.nome)}</code>
      <span class="diff-detalhes">${esc(item.detalhes)}</span>
    </li>`;
  }

  for (const item of atualizar) {
    html += `<li class="diff-item diff-atualizar">
      <span class="diff-marca" aria-hidden="true">~</span>
      <span class="sr">Atualizar:</span>
      <code class="diff-recurso">${esc(item.kind)}/${esc(item.nome)}</code>
      <span class="diff-detalhes">${esc(item.detalhes)}</span>
    </li>`;
  }

  for (const item of destruir) {
    html += `<li class="diff-item diff-destruir">
      <span class="diff-marca" aria-hidden="true">-</span>
      <span class="sr">Destruir:</span>
      <code class="diff-recurso">${esc(item.kind)}/${esc(item.nome)}</code>
      <span class="diff-detalhes">${esc(item.detalhes)}</span>
    </li>`;
  }

  html += `</ul></div>`;
  return html;
}