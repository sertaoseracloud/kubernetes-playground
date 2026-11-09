// Orçamento de JavaScript por página (plano de migração, seção 10), depois do build:
//   node scripts/orcamento-js.mjs [dist]
// Para cada página medida, soma o JavaScript que o navegador baixa ao abrir (os <script>
// do HTML, as ilhas do Astro e os imports estáticos de cada arquivo, sem os import()
// dinâmicos), em bytes e em gzip. Regra do spike: a tela do exercício em React não pode
// passar de +15% do JavaScript da tela de sempre (/p/<id>/).
import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const dist = process.argv[2] ?? 'dist';
const BASE = '/kubernetes-playground/';
const PAGINAS = {
  landing: 'index.html',
  trilha: 'trilha/index.html',
  exercicio: 'p/pods-restart-policy/index.html',
  'exercicio (React, spike)': 'spike/exercicio/pods-restart-policy/index.html',
};
const FOLGA_DO_SPIKE = 1.15;

const IMPORT_ESTATICO = /(?:^|[;\s}])(?:import|export)\s*(?:[\w$*{}\s,]+?\s*from\s*)?["']([^"']+\.m?js)["']/g;

/** Caminho no site (/kubernetes-playground/assets/x.js) → arquivo no dist. */
function arquivoDe(url) {
  const semBase = url.startsWith(BASE) ? url.slice(BASE.length) : url.replace(/^\/+/, '');
  return join(dist, semBase.split('?')[0]);
}

/** Os arquivos JS que a página carrega e os trechos inline. */
function entradas(html) {
  const urls = new Set();
  for (const m of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) urls.add(m[1]);
  for (const m of html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)) urls.add(m[1]);
  for (const m of html.matchAll(/(?:component-url|renderer-url)="([^"]+)"/g)) urls.add(m[1]);
  const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .filter((m) => !/type="application\/(?:ld\+)?json"/.test(m[0]))
    .map((m) => m[1]);
  return { urls: [...urls], inline };
}

/** Fecha o grafo de imports estáticos a partir das entradas. */
function grafo(urls) {
  const vistos = new Set();
  const fila = [...urls];
  while (fila.length) {
    const url = fila.pop();
    if (vistos.has(url)) continue;
    const arquivo = arquivoDe(url);
    if (!existsSync(arquivo)) continue;
    vistos.add(url);
    const codigo = readFileSync(arquivo, 'utf8');
    for (const [, alvo] of codigo.matchAll(IMPORT_ESTATICO)) {
      if (alvo.startsWith('.') || alvo.startsWith('/')) fila.push(alvo.startsWith('/') ? alvo : posix.join(posix.dirname(url), alvo));
    }
  }
  return [...vistos];
}

export function medirPagina(caminho) {
  const html = readFileSync(join(dist, caminho), 'utf8');
  const { urls, inline } = entradas(html);
  const arquivos = grafo(urls);
  const conteudos = [...arquivos.map((u) => readFileSync(arquivoDe(u))), ...inline.map((t) => Buffer.from(t))];
  const bytes = conteudos.reduce((s, c) => s + c.length, 0);
  const gzip = conteudos.reduce((s, c) => s + gzipSync(c, { level: 9 }).length, 0);
  return { arquivos: arquivos.length, bytes, gzip };
}

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

function principal() {
  const medidas = {};
  for (const [nome, caminho] of Object.entries(PAGINAS)) {
    if (!existsSync(join(dist, caminho))) continue;
    medidas[nome] = medirPagina(caminho);
  }
  console.log('orcamento-js: JavaScript ao abrir cada página (sem import() dinâmico)');
  for (const [nome, m] of Object.entries(medidas)) {
    console.log(`  ${nome.padEnd(26)} ${String(m.arquivos).padStart(3)} arquivos  ${kb(m.bytes).padStart(10)}  gzip ${kb(m.gzip).padStart(9)}`);
  }
  const antes = medidas.exercicio;
  const spike = medidas['exercicio (React, spike)'];
  if (antes && spike) {
    const razao = spike.gzip / antes.gzip;
    console.log(`  spike / tela de sempre (gzip): ${(razao * 100).toFixed(0)}% (limite ${(FOLGA_DO_SPIKE * 100).toFixed(0)}%)`);
    if (razao > FOLGA_DO_SPIKE) {
      console.error('orcamento-js: a tela do exercício em React passou do orçamento (plano, seção 10).');
      process.exit(1);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal();
