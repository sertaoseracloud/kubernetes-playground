// SPIKE: o palco dos cenários com PixiJS v8. Um único canvas WebGL do tamanho da janela, fixo atrás
// da trilha; cada módulo é um Container deslocado pela rolagem. O mapa é feito de pedaços de 16×16
// tiles, criados só quando chegam perto da tela, com as texturas de um atlas (atlas.js). Os
// personagens deslizam entre os tiles com um único Ticker, e o desenho só acontece quando algo mudou.
import { Application, Container, Rectangle, Sprite, Texture, TextureSource } from 'pixi.js';
import { TILE } from './mapa.js';
import { proximoPasso } from './fisica.js';
import { quadrosDoAtlas, posicaoNoAtlas, camadasDoTile, desenharAtlas, tamanhoDoAtlas } from './atlas.js';

const PASSO_MS = 400;
const PEDACO = 16;
const ALTURA_VOO = 8;
/** Orçamento: a animação dos personagens desenha no máximo 30 quadros por segundo (a rolagem, todos). */
const QUADRO_ANIMACAO_MS = 1000 / 30;

function atlasDoCenario(cen, contorno) {
  const { largura, altura } = tamanhoDoAtlas(cen);
  const folha = document.createElement('canvas');
  folha.width = largura;
  folha.height = altura;
  desenharAtlas(folha.getContext('2d'), cen, { contorno });
  const fonte = Texture.from(folha).source;
  fonte.scaleMode = 'nearest';
  const quadros = new Map();
  quadrosDoAtlas(cen).forEach(({ nome }, i) => {
    const { x, y } = posicaoNoAtlas(i);
    quadros.set(nome, new Texture({ source: fonte, frame: new Rectangle(x, y, TILE, TILE) }));
  });
  return { fonte, quadros };
}

function criarPedaco(plano, atlas, pc, pl) {
  const { mapa, cen } = plano;
  const pedaco = new Container();
  const ate = Math.min(mapa.linhas, (pl + 1) * PEDACO);
  for (let l = pl * PEDACO; l < ate; l++) {
    for (let c = pc * PEDACO; c < Math.min(mapa.colunas, (pc + 1) * PEDACO); c++) {
      for (const nome of camadasDoTile(mapa, c, l)) {
        const s = new Sprite(atlas.quadros.get(nome));
        s.position.set(c * TILE, l * TILE);
        pedaco.addChild(s);
      }
    }
    // Meio-fio: uma linha escura de cada lado da estrada.
    const [de, fim] = mapa.estrada[l];
    for (const x of [de * TILE, (fim + 1) * TILE - 2]) {
      if (x < pc * PEDACO * TILE || x >= (pc + 1) * PEDACO * TILE) continue;
      const m = new Sprite(Texture.WHITE);
      m.tint = cen.estrada.cores[1];
      m.position.set(x, l * TILE);
      m.width = 2;
      m.height = TILE;
      pedaco.addChild(m);
    }
  }
  return pedaco;
}

/** Quem rola a trilha: a própria tela (overflow: auto) ou, se ela não rolar, o documento. */
function acharRolador(raiz) {
  for (let el = raiz; el && el !== document.body; el = el.parentElement) {
    if (['auto', 'scroll'].includes(getComputedStyle(el).overflowY)) return el;
  }
  return document.scrollingElement ?? document.documentElement;
}

/**
 * Liga o palco Pixi para os `planos` (planejar() de palco.js). Devolve { desligar, replanejar }
 * ou lança erro se não houver WebGL nem canvas (quem chama volta para o desenho 2D).
 */
export async function ligarPalcoPixi(raiz, planos, { janela = window, movimento = () => true, contorno = null } = {}) {
  TextureSource.defaultOptions.scaleMode = 'nearest';
  const app = new Application();
  await app.init({
    preference: ['webgl', 'canvas'],
    backgroundAlpha: 0,
    antialias: false,
    autoStart: false,
    sharedTicker: false,
    resolution: Math.min(janela.devicePixelRatio || 1, 2),
    autoDensity: true,
    roundPixels: true,
    // O canvas é decorativo: o Pixi não pode criar a camada de acessibilidade dele ao apertar Tab.
    accessibilityOptions: { enabledByDefault: false, activateOnTab: false },
  });
  app.stage.eventMode = 'none';
  const canvas = app.canvas;
  canvas.className = 'cenario-pixi';
  canvas.setAttribute('aria-hidden', 'true');
  raiz.classList.add('com-pixi');
  raiz.prepend(canvas);
  const rolador = acharRolador(raiz);
  const doDocumento = rolador === document.scrollingElement || rolador === document.documentElement;
  // O canvas cobre só a caixa de quem rola (abaixo do cabeçalho), do tamanho dela.
  let caixa = { top: 0, left: 0, width: 0, height: 0 };
  const ajustarCanvas = () => {
    caixa = doDocumento ? { top: 0, left: 0, width: janela.innerWidth, height: janela.innerHeight } : rolador.getBoundingClientRect();
    Object.assign(canvas.style, { top: `${caixa.top}px`, left: `${caixa.left}px` });
    app.renderer.resize(Math.max(1, caixa.width), Math.max(1, caixa.height));
  };
  ajustarCanvas();

  const atlas = new Map();
  const atlasDe = (cen) => {
    if (!atlas.has(cen.id)) atlas.set(cen.id, atlasDoCenario(cen, contorno));
    return atlas.get(cen.id);
  };

  let modulos = [];
  const montar = (lista) => {
    const inicio = performance.now();
    for (const m of modulos) m.raiz.destroy({ children: true });
    modulos = lista.map((plano) => {
      const raizModulo = new Container();
      const chao = new Container();
      chao.alpha = 0.45;
      const gente = new Container();
      raizModulo.addChild(chao, gente);
      if (plano.bloqueado) raizModulo.alpha = 0.2;
      app.stage.addChild(raizModulo);
      const a = atlasDe(plano.cen);
      const personagens = plano.posicoes.map((estado, i) => {
        if (!estado) return null;
        const def = plano.defs[i];
        const s = new Sprite(a.quadros.get(`per-${def.id}-0`));
        s.anchor.set(0.5, 1);
        gente.addChild(s);
        return { def, s, estado: { ...estado, olhaEsquerda: false }, de: { c: estado.c, l: estado.l }, t0: 0 };
      }).filter(Boolean);
      return { plano, atlas: a, raiz: raizModulo, chao, pedacos: new Map(), personagens, topo: 0, esquerda: 0 };
    });
    medirGeometria();
    try { performance.measure('cenarios:montar', { start: inicio, end: performance.now() }); } catch { /* sem User Timing */ }
  };

  // Onde cada módulo está na página (em coordenadas do documento): só muda ao redimensionar.
  const medirGeometria = () => {
    for (const m of modulos) {
      const r = m.plano.camada.querySelector('.cenario-palco').getBoundingClientRect();
      m.topo = r.top - caixa.top + rolador.scrollTop;
      m.esquerda = r.left - caixa.left + m.plano.esquerdaDoMundo;
      m.altura = r.height;
    }
  };

  const posicionar = (p, agora) => {
    const k = Math.min(1, (agora - p.t0) / PASSO_MS);
    const c = p.de.c + (p.estado.c - p.de.c) * k;
    const l = p.de.l + (p.estado.l - p.de.l) * k;
    const meia = p.def.pequeno ? 0.5 : 1;
    p.s.scale.set((p.estado.olhaEsquerda ? -1 : 1) * meia, meia);
    p.s.position.set(c * TILE + TILE / 2, l * TILE + TILE - (p.def.movimento === 'voar' ? ALTURA_VOO : 0));
    return k < 1;
  };

  let ultimoY = null;
  let ultimoDesenho = 0;
  let proximoPassoEm = 0;
  let animando = false;
  const quadro = () => {
    const inicio = performance.now();
    try { quadroSemMedir(); } finally { globalThis.__custoCenarios = (globalThis.__custoCenarios ?? 0) + performance.now() - inicio; }
  };
  const quadroSemMedir = () => {
    const agora = performance.now();
    const y = rolador.scrollTop;
    const altura = caixa.height;
    const rolou = y !== ultimoY;
    const anda = movimento() && !document.hidden;
    if (anda && agora >= proximoPassoEm) {
      proximoPassoEm = agora + PASSO_MS;
      for (const m of modulos) {
        if (m.plano.bloqueado || m.topo - y > altura || m.topo + m.altura - y < 0) continue;
        for (const p of m.personagens) {
          // Só quem está perto da tela anda (culling): os outros ficam onde estão.
          const telaY = m.topo + p.estado.l * TILE - y;
          if (telaY < -TILE * 2 || telaY > altura + TILE * 2) continue;
          const novo = proximoPasso(p.estado, m.plano.mapa, m.plano.sortear);
          if (!novo.parado && novo.direcao[0]) novo.olhaEsquerda = novo.direcao[0] < 0;
          p.de = { c: p.estado.c, l: p.estado.l };
          p.t0 = agora;
          p.estado = novo;
          p.s.texture = m.atlas.quadros.get(`per-${p.def.id}-${novo.quadro}`);
        }
      }
      animando = true;
    }
    if (!rolou && !(animando && agora - ultimoDesenho >= QUADRO_ANIMACAO_MS)) return;
    ultimoY = y;
    ultimoDesenho = agora;
    animando = false;
    for (const m of modulos) {
      const visivel = m.topo - y < altura && m.topo + m.altura - y > 0;
      m.raiz.visible = visivel;
      if (!visivel) continue;
      m.raiz.position.set(Math.round(m.esquerda), Math.round(m.topo - y));
      // Pedaços do mapa: cria os que chegaram perto da tela e esconde os outros.
      const { colunas, linhas } = m.plano.mapa;
      const de = Math.max(0, Math.floor((y - m.topo) / (PEDACO * TILE)) - 1);
      const ate = Math.min(Math.ceil(linhas / PEDACO) - 1, Math.floor((y + altura - m.topo) / (PEDACO * TILE)) + 1);
      for (const pedaco of m.pedacos.values()) pedaco.visible = pedaco.linha >= de && pedaco.linha <= ate;
      for (let pl = de; pl <= ate; pl++) {
        for (let pc = 0; pc < Math.ceil(colunas / PEDACO); pc++) {
          const chave = `${pc},${pl}`;
          if (m.pedacos.has(chave)) continue;
          const pedaco = criarPedaco(m.plano, m.atlas, pc, pl);
          pedaco.linha = pl;
          m.chao.addChild(pedaco);
          m.pedacos.set(chave, pedaco);
        }
      }
      for (const p of m.personagens) if (posicionar(p, agora)) animando = true;
    }
    app.renderer.render(app.stage);
  };

  janela.__pixi = { app, modulos: () => modulos }; // SPIKE: inspeção nas medições
  app.ticker.add(quadro);
  app.ticker.start();
  montar(planos);

  const aoRedimensionar = () => { ajustarCanvas(); medirGeometria(); ultimoY = null; };
  janela.addEventListener('resize', aoRedimensionar);

  let desligado = false;
  return {
    renderizador: app.renderer.name,
    personagens: () => modulos.reduce((s, m) => s + m.personagens.length, 0),
    replanejar(lista) { montar(lista); ultimoY = null; },
    redesenhar() { ultimoY = null; },
    desligar() {
      if (desligado) return;
      desligado = true;
      janela.removeEventListener('resize', aoRedimensionar);
      app.ticker.stop();
      // Devolve o contexto WebGL na hora: o navegador só deixa uns 16 abertos ao mesmo tempo.
      const gl = app.renderer.gl;
      app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      raiz.classList.remove('com-pixi');
    },
  };
}
