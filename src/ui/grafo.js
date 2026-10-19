// Grafo de dependências (aba 🕸️ Grafo), desenhado como no DivergeTerraform: cada coluna é um
// nível; quem é usado fica à esquerda e quem usa, à direita. A seta vai de quem usa para quem é
// usado (Deployment → ConfigMap). A mesma informação vem numa lista em texto, para o leitor de tela.
import { esc } from './util.js';
import { grafoDoYaml } from '../k8s/grafo.js';

const COR = { config: 'amarelo', disco: 'laranja', acesso: 'roxo', carga: 'verde', rede: 'ciano', escala: 'rosa', outro: 'rosa' };
const ORDEM = { config: 0, disco: 1, acesso: 2, carga: 3, rede: 4, escala: 5, outro: 6 };

/** Calcula colunas (níveis) e posições. Função pura, testada em tests/grafo.test.js. */
export function layoutGrafo({ nos, arestas }) {
  const deps = new Map(nos.map((n) => [n.id, []]));
  for (const a of arestas) deps.get(a.de)?.push(a.para);
  const nivel = new Map();
  const visitando = new Set();
  const calcular = (id) => {
    if (nivel.has(id)) return nivel.get(id);
    if (visitando.has(id)) return 0; // ciclo: desenha mesmo assim
    visitando.add(id);
    const n = Math.max(-1, ...(deps.get(id) ?? []).map(calcular)) + 1;
    visitando.delete(id);
    nivel.set(id, n);
    return n;
  };
  nos.forEach((n) => calcular(n.id));
  const colunas = [];
  for (const n of nos) (colunas[nivel.get(n.id)] ??= []).push(n);
  colunas.forEach((c) => c.sort((a, b) => (ORDEM[a.grupo] ?? 9) - (ORDEM[b.grupo] ?? 9) || a.id.localeCompare(b.id)));
  const LARGURA = 220;
  const ALTURA = 46;
  const GAP_X = 60;
  const GAP_Y = 14;
  const pos = new Map();
  colunas.forEach((coluna, i) => coluna.forEach((n, j) => pos.set(n.id, { x: 10 + i * (LARGURA + GAP_X), y: 10 + j * (ALTURA + GAP_Y) })));
  const largura = 20 + colunas.length * (LARGURA + GAP_X) - GAP_X;
  const altura = 20 + Math.max(1, ...colunas.map((c) => c.length)) * (ALTURA + GAP_Y) - GAP_Y;
  return { pos, largura, altura, LARGURA, ALTURA, niveis: colunas.length };
}

/** Desenha em `el` o grafo do YAML `texto`. */
export function desenharGrafo(el, texto) {
  const g = grafoDoYaml(texto);
  if (g.erro) {
    el.innerHTML = `<p class="vazio">${esc(g.erro)} Corrija o YAML para ver o grafo.</p>`;
    return;
  }
  const { nos, arestas, avisos } = g;
  if (!nos.length) {
    el.innerHTML = '<p class="vazio">Ainda não há recursos para desenhar. Escreva um manifesto com kind e metadata.name.</p>';
    return;
  }
  const { pos, largura, altura, LARGURA, ALTURA } = layoutGrafo({ nos, arestas });
  const linhas = arestas.map((a) => {
    const de = pos.get(a.de);
    const para = pos.get(a.para);
    if (!de || !para) return '';
    const x1 = de.x;
    const y1 = de.y + ALTURA / 2;
    const x2 = para.x + LARGURA;
    const y2 = para.y + ALTURA / 2;
    const meio = (x1 + x2) / 2;
    return `<path d="M${x1},${y1} C${meio},${y1} ${meio},${y2} ${x2},${y2}" class="aresta" marker-end="url(#seta)"/>`;
  }).join('');
  const caixas = nos.map((n) => {
    const p = pos.get(n.id);
    const nome = n.id.slice(n.kind.length + 1);
    const titulo = nome.length > 28 ? `${nome.slice(0, 27)}…` : nome;
    return `<g class="no-grafo cor-${COR[n.grupo]}" transform="translate(${p.x},${p.y})">
      <title>${esc(n.rotulo)}</title>
      <rect width="${LARGURA}" height="${ALTURA}" rx="8"/>
      <text x="10" y="18" class="tipo-no">${esc(n.kind)}</text>
      <text x="10" y="35" class="nome-no">${esc(titulo)}</text>
    </g>`;
  }).join('');
  el.innerHTML = `
    <p class="legenda-grafo">A seta vai de quem <b>usa</b> para quem <b>é usado</b>. O Kubernetes liga os recursos pelo
      <b>nome</b> (configMapRef, secretName, scaleTargetRef) e pelos <b>rótulos</b> (o selector escolhe os Pods com aqueles labels).</p>
    <div class="area-grafo">
      <svg viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}" role="img" aria-label="Grafo de dependências com ${nos.length} recursos. A mesma informação está na lista em texto logo abaixo.">
        <defs><marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>
        ${linhas}${caixas}
      </svg>
    </div>
    <details class="lista-grafo" ${document.documentElement.classList.contains('a11y-leitor-tela') ? 'open' : ''}><summary>Lista de dependências (texto)</summary>
      <ul>${arestas.map((a) => `<li><code>${esc(a.de)}</code> usa <code>${esc(a.para)}</code> <small>(${esc(a.motivo)})</small></li>`).join('') || '<li>Nenhum recurso depende de outro.</li>'}</ul>
    </details>
    ${avisos.length ? `<div class="avisos-grafo" role="note"><p><b>⚠️ Ligações que não acharam ninguém</b></p><ul>${avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}`;
}
