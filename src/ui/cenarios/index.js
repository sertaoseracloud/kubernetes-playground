// Renderização dos cenários visuais da trilha (cluster com nós, pods e serviços).
// Cada módulo tem um cenário que evolui conforme o aluno resolve exercícios. É decorativo
// (aria-hidden, como no terraform-playground): fica atrás do caminho, no canto de baixo do
// módulo, sem cobrir o cabeçalho; o progresso de verdade está no anel e na contagem.
import { esc } from '../util.js';

/**
 * Gera o HTML do cenário para um módulo específico, baseado no número de exercícios resolvidos.
 * @param {Object} cenario - Definição do cenário (de src/conteudo/cenarios.js)
 * @param {string} moduloId - ID do módulo
 * @param {number} feitos - Número de exercícios resolvidos no módulo
 */
export function htmlDoCenario(cenario, moduloId, feitos) {
  if (!cenario) return '';

  // Encontra o estágio atual baseado no número de exercícios feitos
  const estagio = [...cenario.estagios]
    .sort((a, b) => b.feitos - a.feitos)
    .find((e) => feitos >= e.feitos) ?? cenario.estagios[0];

  if (!estagio || estagio.elementos.length === 0) {
    return `
      <div class="cenario cenario-k8s" aria-hidden="true" data-modulo="${esc(moduloId)}"><div class="cenario-palco">
        <p class="cenario-vazio">${esc(estagio?.descricao ?? 'Cluster vazio')}</p>
      </div></div>`;
  }

  const elementosHtml = estagio.elementos.map((el) => {
    const classes = ['cenario-elemento', `tipo-${el.tipo}`, `status-${el.status?.toLowerCase() ?? 'ativo'}`];
    let conteudo;
    let titulo;

    switch (el.tipo) {
      case 'no':
        conteudo = `<span class="icone-no" aria-hidden="true">🖥️</span><span class="nome">${esc(el.nome)}</span>`;
        titulo = `Nó ${el.nome} (${el.status})`;
        break;
      case 'pod':
        conteudo = `<span class="icone-pod" aria-hidden="true">📦</span><span class="nome">${esc(el.nome)}</span>`;
        titulo = `Pod ${el.nome} em ${el.no} (${el.status})`;
        break;
      case 'service':
        conteudo = `<span class="icone-svc" aria-hidden="true">🔗</span><span class="nome">${esc(el.nome)}</span>`;
        titulo = `Service ${el.nome} → ${el.alvo}`;
        break;
      default:
        conteudo = `<span class="nome">${esc(el.nome ?? el.tipo)}</span>`;
        titulo = `${el.tipo}: ${el.nome ?? ''}`;
    }

    return `<div class="${classes.join(' ')}" title="${esc(titulo)}">${conteudo}</div>`;
  }).join('');

  return `
    <div class="cenario cenario-k8s" aria-hidden="true" data-modulo="${esc(moduloId)}"><div class="cenario-palco">
      <div class="cenario-elementos">${elementosHtml}</div>
    </div></div>`;
}