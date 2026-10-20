// SPIKE: o palco 2D otimizado (o caminho híbrido, sem PixiJS). O mapa continua dentro de cada módulo
// e rola com a página (nada de canvas fixo), mas em pedaços de 16 linhas: cada pedaço é desenhado
// quando chega perto da tela, copiando tiles do atlas (atlas.js), e devolve a memória quando fica
// longe. Os personagens não têm canvas próprio: são o atlas como imagem de fundo, e o deslize entre
// os tiles fica com a transição do CSS (no compositor). Um laço de requestAnimationFrame dá o passo.
import { TILE } from './mapa.js';
import { proximoPasso } from './fisica.js';
import { quadrosDoAtlas, posicaoNoAtlas, camadasDoTile, desenharAtlas, tamanhoDoAtlas } from './atlas.js';

const PASSO_MS = 400;
const PEDACO = 16;
const ALTURA_VOO = 8;

function folhaDoCenario(cen, contorno) {
  const { largura, altura } = tamanhoDoAtlas(cen);
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext?.('2d');
  if (ctx) desenharAtlas(ctx, cen, { contorno });
  const indice = new Map(quadrosDoAtlas(cen).map(({ nome }, i) => [nome, posicaoNoAtlas(i)]));
  let url = '';
  try { url = ctx ? canvas.toDataURL() : ''; } catch { /* sem canvas */ }
  return { canvas, ctx, indice, url, largura, altura };
}

function desenharPedaco(tela, plano, folha, pl, contorno) {
  const ctx = tela.getContext?.('2d');
  if (!ctx || !folha.ctx) return;
  const { mapa, cen } = plano;
  const inicio = performance.now();
  tela.width = mapa.colunas * TILE;
  tela.height = Math.min(PEDACO, mapa.linhas - pl * PEDACO) * TILE;
  ctx.imageSmoothingEnabled = false;
  for (let l = pl * PEDACO; l < Math.min(mapa.linhas, (pl + 1) * PEDACO); l++) {
    const y = (l - pl * PEDACO) * TILE;
    for (let c = 0; c < mapa.colunas; c++) {
      for (const nome of camadasDoTile(mapa, c, l)) {
        const { x, y: sy } = folha.indice.get(nome);
        ctx.drawImage(folha.canvas, x, sy, TILE, TILE, c * TILE, y, TILE, TILE);
      }
    }
    const [de, ate] = mapa.estrada[l];
    ctx.fillStyle = contorno ?? cen.estrada.cores[1];
    ctx.fillRect(de * TILE, y, 2, TILE);
    ctx.fillRect((ate + 1) * TILE - 2, y, 2, TILE);
  }
  globalThis.__custoCenarios = (globalThis.__custoCenarios ?? 0) + performance.now() - inicio;
}

function posicionar(p) {
  const { el, def, estado, folha } = p;
  const { x, y } = folha.indice.get(`per-${def.id}-${estado.quadro}`);
  const escala = def.pequeno ? 0.5 : 1;
  el.firstElementChild.style.backgroundPosition = `${-x * escala}px ${-y * escala}px`;
  el.classList.toggle('olha-esquerda', Boolean(estado.olhaEsquerda));
  const sobe = def.movimento === 'voar' ? ALTURA_VOO : 0;
  el.style.transform = `translate(${estado.c * TILE}px, ${estado.l * TILE - sobe}px)`;
}

/** Monta um módulo a partir do plano (planejar() de palco.js), sem desenhar o mapa ainda. */
export function montarLeve(plano, { contorno = null, folhas = new Map() } = {}) {
  const inicio = performance.now();
  const { camada, cen, mapa, defs, posicoes, esquerdaDoMundo } = plano;
  const chave = `${cen.id}:${contorno ?? ''}`;
  if (!folhas.has(chave)) folhas.set(chave, folhaDoCenario(cen, contorno));
  const folha = folhas.get(chave);
  const palco = camada.querySelector('.cenario-palco');
  palco.replaceChildren();
  const mundo = document.createElement('div');
  mundo.className = 'cenario-mundo';
  mundo.style.left = `${esquerdaDoMundo}px`;
  const pedacos = [];
  for (let pl = 0; pl * PEDACO < mapa.linhas; pl++) {
    const tela = document.createElement('canvas');
    tela.className = 'cenario-mapa cenario-pedaco';
    tela.width = 0;
    tela.height = 0;
    tela.style.top = `${pl * PEDACO * TILE}px`;
    tela.style.width = `${mapa.colunas * TILE}px`;
    tela.style.height = `${Math.min(PEDACO, mapa.linhas - pl * PEDACO) * TILE}px`;
    tela.dataset.pedaco = String(pl);
    mundo.append(tela);
    pedacos.push(tela);
  }
  const personagens = posicoes.map((estado, i) => {
    if (!estado) return null;
    const def = defs[i];
    const el = document.createElement('span');
    el.className = `personagem personagem-leve mov-${def.movimento}${def.pequeno ? ' pequeno' : ''}`;
    const corpo = document.createElement('i');
    const escala = def.pequeno ? 0.5 : 1;
    corpo.style.backgroundImage = folha.url ? `url(${folha.url})` : '';
    corpo.style.backgroundSize = `${folha.largura * escala}px ${folha.altura * escala}px`;
    el.append(corpo);
    mundo.append(el);
    const p = { def, el, folha, estado: { ...estado, olhaEsquerda: false } };
    posicionar(p);
    return p;
  }).filter(Boolean);
  palco.append(mundo);
  try { performance.measure('cenarios:montar', { start: inicio, end: performance.now() }); } catch { /* sem User Timing */ }
  return { plano, folha, pedacos, personagens, mundo, contorno };
}

/**
 * Liga o laço de animação e os observadores dos módulos montados. `movimento()` diz se pode andar
 * agora (reduzir movimento, alto contraste). Devolve { desligar }.
 */
export function animarLeve(modulos, { janela = window, movimento = () => true } = {}) {
  const Observador = janela.IntersectionObserver;
  // Pedaços do mapa: desenha ao chegar perto (1 tela e meia) e devolve a memória ao ficar longe.
  const pedacos = Observador ? new Observador((entradas) => {
    for (const e of entradas) {
      const m = modulos.find((x) => x.pedacos.includes(e.target));
      if (!m) continue;
      if (e.isIntersecting) desenharPedaco(e.target, m.plano, m.folha, Number(e.target.dataset.pedaco), m.contorno);
      else { e.target.width = 0; e.target.height = 0; }
    }
  }, { rootMargin: '150% 0px' }) : null;
  for (const m of modulos) for (const t of m.pedacos) {
    if (pedacos) pedacos.observe(t);
    else desenharPedaco(t, m.plano, m.folha, Number(t.dataset.pedaco), m.contorno);
  }

  // Um passo a cada 0,4 s, sempre no começo de um quadro (rAF): sem acordar a cada quadro à toa,
  // e o navegador pausa sozinho numa aba oculta.
  let espera = null;
  let quadro = null;
  const agendar = () => { espera = janela.setTimeout(() => { quadro = janela.requestAnimationFrame(passo); }, PASSO_MS); };
  const passo = () => {
    agendar();
    if (document.hidden || !movimento()) return;
    const inicio = performance.now();
    try { andar(); } finally { globalThis.__custoCenarios = (globalThis.__custoCenarios ?? 0) + performance.now() - inicio; }
  };
  const andar = () => {
    const altura = janela.innerHeight;
    for (const m of modulos) {
      if (m.plano.bloqueado) continue;
      const topo = m.mundo.getBoundingClientRect().top;
      if (topo > altura || topo + m.plano.mapa.linhas * TILE < 0) continue;
      for (const p of m.personagens) {
        // Só quem está perto da tela anda (culling).
        const y = topo + p.estado.l * TILE;
        if (y < -TILE * 2 || y > altura + TILE * 2) continue;
        const novo = proximoPasso(p.estado, m.plano.mapa, m.plano.sortear);
        if (!novo.parado && novo.direcao[0]) novo.olhaEsquerda = novo.direcao[0] < 0;
        p.estado = novo;
        posicionar(p);
      }
    }
  };
  if (janela.requestAnimationFrame) agendar();

  return {
    desligar() {
      janela.clearTimeout(espera);
      if (quadro !== null) janela.cancelAnimationFrame(quadro);
      pedacos?.disconnect();
    },
  };
}
