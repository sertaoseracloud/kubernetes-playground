// @vitest-environment happy-dom
// O terminal na tela do exercício, com o simulador de verdade: o prompt digitável com kubectl,
// o botão ▶ Apply (aplica e roda os casos visíveis) e o ⬆ Enviar (marca como resolvido).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { criarTelaItem, ESQUELETO } from '../src/ui/item.js';
import { problemas, LIVRE } from '../src/conteudo/trilha.js';
import { statusDe } from '../src/progresso.js';
import { interpretar, completarKubectl, tipoPorNome, kindsDoYaml, explicarKind } from '../src/k8s/comandos.js';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const corpo = html.slice(html.indexOf('>', html.indexOf('<body')) + 1, html.lastIndexOf('</body>')).replace(/<script[\s\S]*?<\/script>/g, '');
const saida = () => document.getElementById('saida-terminal').textContent;
const prompt = () => document.getElementById('prompt-terminal').textContent;
const campo = () => document.getElementById('campo-terminal');
const PRIMEIRO = problemas[0];

async function ate(condicao, ms = 3000) {
  const fim = Date.now() + ms;
  while (!condicao()) {
    if (Date.now() > fim) throw new Error(`não aconteceu a tempo; saída:\n${saida()}\nprompt: ${prompt()}`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

function digitar(texto) {
  campo().value = texto;
  campo().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

const falas = [];
function montar() {
  document.body.innerHTML = corpo;
  window.confirm = () => true;
  falas.length = 0;
  return criarTelaItem({
    layout: { aplicar() {}, mostrarDescricao() {} },
    definirStatus: (texto, { falar = texto } = {}) => { if (falar) falas.push(falar); },
    aoMudarProgresso: () => {},
  });
}

const noPrompt = (id) => () => prompt() === `aluno@sertao:~/k8s/${id}$ `;

describe('terminal na tela do exercício', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.add('a11y-sem-movimento');
  });
  afterEach(() => document.documentElement.classList.remove('a11y-sem-movimento'));

  it('o playground livre abre com um exemplo, e o exercício com um esqueleto (nunca com a resposta)', async () => {
    const tela = montar();
    expect(tela.abrir('livre')).toBe(true);
    await ate(noPrompt('livre'));
    expect(tela.editor().getValue()).toBe(LIVRE.inicial);
    tela.abrir(PRIMEIRO.id);
    await ate(noPrompt(PRIMEIRO.id));
    expect(tela.editor().getValue()).toBe(ESQUELETO);
    expect(tela.editor().getValue()).not.toBe(PRIMEIRO.solucao);
    expect(falas).toEqual([]); // abrir não fala nada: só o que a pessoa pede
    // A aba 📘 Docs mostra os kinds do exercício, com link que abre em outra aba de forma segura.
    expect(document.getElementById('aba-docs').hidden).toBe(false);
    expect(document.querySelector('#desc-docs .docs-kinds dt').textContent).toBe('Pod');
    expect(document.querySelector('#desc-docs a').getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('kubectl apply, get, describe e delete no prompt', async () => {
    const tela = montar();
    tela.abrir('livre');
    await ate(noPrompt('livre'));
    digitar('kubectl apply -f manifest.yaml');
    await ate(() => saida().includes('pod/nginx-demo created'));
    expect(saida()).toContain('aluno@sertao:~/k8s/livre$ kubectl apply -f manifest.yaml');
    await ate(noPrompt('livre'));
    digitar('kubectl get pods');
    await ate(() => /nginx-demo\s+1\/1\s+Running/.test(saida()));
    digitar('kubectl describe pod nginx-demo');
    await ate(() => saida().includes('Image:        nginx:1.25'));
    digitar('kubectl delete pod nginx-demo');
    await ate(() => saida().includes('pod "nginx-demo" deleted'));
    digitar('kubectl get po');
    await ate(() => saida().includes('No resources found in default namespace.'));
    digitar('terraform plan');
    await ate(() => saida().includes('terraform: command not found'));
  });

  it('▶ Apply com a solução: os casos visíveis passam; ⬆ Enviar marca como resolvido', async () => {
    const tela = montar();
    tela.abrir(PRIMEIRO.id);
    await ate(noPrompt(PRIMEIRO.id));
    tela.editor().setValue(PRIMEIRO.solucao);
    document.getElementById('btn-executar').click();
    await ate(() => saida().includes('casos visíveis passaram'));
    expect(document.getElementById('saida-testes').textContent).toContain('Casos visíveis passaram');
    expect(falas.at(-1)).toMatch(/visíve(l|is) passaram/);
    document.getElementById('btn-enviar').click();
    await ate(() => statusDe(PRIMEIRO.id) === 'resolvido');
    expect(document.getElementById('saida-testes').textContent).toContain('Aceito');
  });

  it('▶ Apply com erro no YAML mostra o erro na aba Testes e no terminal', async () => {
    const tela = montar();
    tela.abrir(PRIMEIRO.id);
    await ate(noPrompt(PRIMEIRO.id));
    tela.editor().setValue('apiVersion: v1\nkind: Pod\nmetadata:\n  name: x\nspec:\n  containerz: []\n');
    document.getElementById('btn-executar').click();
    await ate(() => document.querySelector('#saida-testes .erro-yaml'));
    expect(saida()).toContain('error:');
    expect(statusDe(PRIMEIRO.id)).toBeUndefined();
  });
});

describe('comandos do kubectl (src/k8s/comandos.js)', () => {
  const vazio = { pods: [], services: [], deployments: [{ nome: 'web', replicas: 2, containers: [{}] }], configmaps: [], secrets: [], nos: [] };
  const texto = (r) => r.linhas.map((l) => l.texto).join('\n');

  it('apelidos do kubectl', () => {
    expect(tipoPorNome('po')).toBe('pods');
    expect(tipoPorNome('svc')).toBe('services');
    expect(tipoPorNome('deployment.apps')).toBe('deployments');
    expect(tipoPorNome('xyz')).toBeNull();
  });

  it('get pods mostra as réplicas dos Deployments; get all agrupa', () => {
    expect(texto(interpretar('kubectl get pods', vazio)).match(/^web-/gm)).toHaveLength(2);
    expect(texto(interpretar('kubectl get all', vazio))).toContain('deployment.apps/web');
    expect(texto(interpretar('kubectl get nodes', vazio))).toContain('node-1');
  });

  it('ações para a tela, erros e ajuda', () => {
    expect(interpretar('kubectl apply -f manifest.yaml', vazio).acao).toBe('apply');
    expect(interpretar('k diff -f manifest.yaml', vazio).acao).toBe('diff');
    expect(interpretar('kubectl apply', vazio).linhas[0].classe).toBe('erro');
    expect(interpretar('kubectl delete svc a b', vazio).acao.apagar.map((a) => a.nome)).toEqual(['a', 'b']);
    expect(texto(interpretar('kubectl frobnicate', vazio))).toContain('unknown command "frobnicate"');
    expect(texto(interpretar('help', vazio))).toContain('kubectl get <tipo>');
    expect(texto(interpretar('kubectl explain svc', vazio))).toContain('Service');
    expect(interpretar('clear', vazio).acao).toBe('clear');
    expect(interpretar('   ', vazio).linhas).toEqual([]);
  });

  it('kinds de um manifesto (aba Docs) e explicação de cada um', () => {
    expect(kindsDoYaml('kind: Deployment\n---\nkind: Service\n---\nkind: Service')).toEqual(['Deployment', 'Service']);
    expect(explicarKind('Service')).toContain('ClusterIP');
    expect(explicarKind('Inventado')).toBeNull();
  });

  it('Tab completa os comandos', () => {
    expect(completarKubectl('kubectl get p')).toEqual(['kubectl get pods']);
    expect(completarKubectl('')).toContain('kubectl');
  });
});
