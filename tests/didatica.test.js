// @vitest-environment happy-dom
// O padrão didático (docs/didatica.md) conferido em todo o conteúdo revisado, e a tela que o
// mostra: exemplo comentado na lição, palavras técnicas, dicas progressivas e "como corrigir"
// no caso de teste que falhou (também no que o leitor de tela fala).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { itens, modulos, porId } from '../src/conteudo/trilha.js';
import { GLOSSARIO, termosDoTexto, termosVistosAntes, MAX_TERMOS } from '../src/conteudo/glossario.js';
import { licao, exercicio, teste, yaml } from '../src/conteudo/util.js';
import { kindsDoYaml } from '../src/k8s/comandos.js';
import { criarTelaItem, listaDeDicas, comoCorrigir } from '../src/ui/item.js';
import { falaDosTestes } from '../src/ui/anuncios.js';
import { caminhoLegivel, explicarCampo, aplicarYaml, resetarEstado, verificarRegra } from '../src/k8s/simulador.js';

// Os módulos (ou tópicos de um módulo) já revisados no padrão. Módulo novo entra aqui quando
// seguir docs/didatica.md.
const REVISADOS = ['fundamentos', 'avancados', 'aws', 'azure'];
const revisado = (i) => REVISADOS.includes(i.modulo) || REVISADOS.includes(i.grupo);

const texto = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const revisados = itens.filter(revisado);
const exercicios = revisados.filter((i) => i.tipo === 'exercicio');

describe('padrão didático do conteúdo', () => {
  it('a lista de módulos revisados só tem módulos que existem', () => {
    for (const id of REVISADOS) expect(modulos.some((m) => m.id === id || m.grupos?.some((g) => g.id === id)), id).toBe(true);
    expect(exercicios.length).toBeGreaterThan(0);
  });

  it('todo exercício revisado tem enunciado em passos numerados e diz o que acontece no cluster', () => {
    for (const e of exercicios) {
      expect(e.resumo, e.id).toMatch(/<ol>/);
      expect(e.resumo, e.id).toMatch(/<b>(No cluster|Por que isso importa):<\/b>/);
    }
  });

  it('todo exercício revisado abre com um esqueleto comentado (nunca vazio, nunca a resposta)', () => {
    for (const e of exercicios) {
      expect(e.inicial, e.id).toMatch(/#/);
      expect(e.inicial.trim(), e.id).not.toBe(e.solucao.trim());
    }
  });

  it('todo exercício revisado tem dicas progressivas e todo caso de teste diz o que corrigir', () => {
    for (const e of exercicios) {
      expect(Array.isArray(e.dica) && e.dica.length >= 2, e.id).toBe(true);
      for (const t of e.testes) expect(t.dica?.length, `${e.id}: ${t.descricao}`).toBeGreaterThan(10);
    }
  });

  it('nenhum exercício usa um tipo de recurso que nenhuma lição anterior apresentou', () => {
    let visto = '';
    const faltando = [];
    for (const i of itens) {
      if (i.tipo === 'licao') {
        visto += ` ${i.resumo} ${i.inicial ?? ''}`;
        continue;
      }
      if (!revisado(i)) continue;
      for (const kind of kindsDoYaml(i.solucao)) {
        if (!new RegExp(`(^|[^A-Za-z])${kind}([^A-Za-z]|$)`).test(visto)) faltando.push(`${i.id}: ${kind}`);
      }
    }
    expect(faltando).toEqual([]);
  });

  it('toda lição revisada com exemplo tem comentários no YAML', () => {
    for (const l of revisados.filter((i) => i.tipo === 'licao' && i.inicial)) expect(l.inicial, l.id).toMatch(/#/);
  });

  it(`todo item revisado mostra pelo menos uma palavra técnica explicada (no máximo ${MAX_TERMOS})`, () => {
    const semTermos = revisados.filter((i) => termosDoTexto(texto(`${i.titulo} ${i.resumo}`), { modulo: i.modulo }).length === 0);
    expect(semTermos.map((i) => i.id)).toEqual([]);
  });

  it('os termos básicos do primeiro manifesto estão no glossário', () => {
    const ids = termosDoTexto('apiVersion kind metadata spec containerPort selector', { max: 10 }).map((t) => t.id);
    expect(ids).toEqual(['apiversion', 'kind', 'metadata', 'spec', 'containerport', 'selector']);
  });
});

describe('glossário', () => {
  it('cada termo tem id único, nível, definição e analogia', () => {
    expect(new Set(GLOSSARIO.map((t) => t.id)).size).toBe(GLOSSARIO.length);
    for (const t of GLOSSARIO) {
      expect(['fundamentos', 'avancados', 'aws', 'azure'], t.id).toContain(t.nivel);
      expect(t.definicao.length, t.id).toBeGreaterThan(20);
      expect(t.analogia.length, t.id).toBeGreaterThan(20);
    }
  });

  it('acha termos com acento, na ordem em que aparecem, sem confundir palavras parecidas', () => {
    expect(termosDoTexto('Crie um Namespace, depois um Pod com réplicas').map((t) => t.id)).toEqual(['namespace', 'pod', 'replica']);
    expect(termosDoTexto('O ServiceAccount do PodSpec').map((t) => t.id)).toEqual(['serviceaccount']);
    expect(termosDoTexto('nada técnico aqui')).toEqual([]);
  });

  it('com termos demais, os do nível do módulo vêm primeiro', () => {
    const frase = 'Pod, Service, Deployment, ConfigMap, Namespace, label, selector e por fim IRSA no EKS';
    expect(termosDoTexto(frase, { modulo: 'fundamentos', max: 6 }).map((t) => t.id)).not.toContain('irsa');
    expect(termosDoTexto(frase, { modulo: 'aws', max: 6 }).map((t) => t.id)).toEqual(expect.arrayContaining(['irsa', 'eks']));
  });

  it('o termo ainda não visto na trilha vem antes do já visto (glossário no primeiro uso)', () => {
    const frase = 'Pod, Service, Deployment e ConfigMap';
    const vistos = new Set(['pod', 'service', 'deployment']);
    expect(termosDoTexto(frase, { max: 1, modulo: 'fundamentos', vistos }).map((t) => t.id)).toEqual(['configmap']);
    const antes = termosVistosAntes(itens);
    expect(antes.get(itens[0].id).size).toBe(0);
    expect(antes.get('k8s-primeiro-yaml').has('apiversion')).toBe(true);
    expect(antes.get('basico-anatomia-manifesto').has('apiversion')).toBe(false);
  });
});

describe('atalhos do conteúdo', () => {
  it('yaml tira o recuo comum e termina com uma quebra de linha', () => {
    expect(yaml('\n    a: 1\n    b:\n      c: 2\n  ')).toBe('a: 1\nb:\n  c: 2\n');
    expect(yaml('a: 1')).toBe('a: 1\n');
    expect(yaml(undefined)).toBeUndefined();
  });

  it('licao com código vira o exemplo do editor; teste aceita a dica de como corrigir', () => {
    expect(licao('l', 'L', 'facil', '<p>x</p>', '\n  # oi\n  a: 1\n').inicial).toBe('# oi\na: 1\n');
    expect(licao('l', 'L', 'facil', '<p>x</p>').inicial).toBeUndefined();
    expect(teste({ descricao: 'd', dica: 'faça x' }, { tipo: 'diff-usado' })).toEqual({ descricao: 'd', dica: 'faça x', regras: [{ tipo: 'diff-usado' }] });
    const e = exercicio({ id: 'e', titulo: 'E', dificuldade: 'medio', resumo: '', solucao: 'a: 1', testes: [], dica: ['1', '2'], inicial: '  # TODO\n' });
    expect(e).toMatchObject({ xp: 15, dica: ['1', '2'], inicial: '# TODO\n', solucao: 'a: 1\n' });
  });

  it('dicas como lista e "como corrigir" só na primeira verificação que falhou', () => {
    expect(listaDeDicas({ dica: 'uma' })).toEqual(['uma']);
    expect(listaDeDicas({ dica: ['a', 'b'] })).toEqual(['a', 'b']);
    expect(listaDeDicas({})).toEqual([]);
    const v = [{ ok: true }, { ok: false }, { ok: false }];
    expect(comoCorrigir(v, 'mude x').map((x) => x.dica)).toEqual([undefined, 'mude x', undefined]);
    expect(comoCorrigir(v, undefined)).toBe(v);
    expect(comoCorrigir([{ ok: true }], 'mude x')).toEqual([{ ok: true }]);
  });

  it('o leitor de tela fala o "como corrigir"', () => {
    const fala = falaDosTestes({ aprovado: false, relatorio: [{ ok: false, resultados: [{ ok: false, mensagem: 'Porta 80 exposta', dica: 'Use containerPort: 80' }] }] });
    expect(fala).toContain('Dica: Use containerPort: 80.');
  });
});

describe('mensagens de erro em linguagem simples', () => {
  it('o caminho do campo aparece como no YAML', () => {
    expect(caminhoLegivel('rules[*].verbs')).toBe('rules → verbs');
    expect(caminhoLegivel('spec.containers[name=web].securityContext.capabilities.drop')).toBe('spec → containers (web) → securityContext → capabilities → drop');
    expect(caminhoLegivel('metadata.annotations["service.kubernetes.io/topology-mode"]')).toBe('metadata → annotations → service.kubernetes.io/topology-mode');
    expect(caminhoLegivel('spec.ports[0].targetPort')).toBe('spec → ports → targetPort');
  });

  it('cada condição diz o que fazer', () => {
    const r = { kind: 'Role', nome: 'leitor', caminho: 'rules[*].verbs' };
    expect(explicarCampo({ ...r, contem: 'watch' }, ['*'])).toBe('Em Role "leitor", rules → verbs ainda não tem watch. Inclua watch.');
    expect(explicarCampo({ ...r, naoContem: '*' }, ['*'])).toContain('curinga *');
    expect(explicarCampo({ ...r, naoContem: 'delete' }, ['delete'])).toContain('Tire delete.');
    expect(explicarCampo({ ...r, contem: 'get' }, undefined)).toContain('falta rules → verbs');
    expect(explicarCampo({ ...r, valor: 'x' }, undefined)).toContain('Escreva o valor x');
    expect(explicarCampo({ ...r, valor: 'x' }, 'y')).toContain('está y, mas deveria ser x');
    expect(explicarCampo({ ...r, ausente: true }, 'y')).toContain('Apague essa linha');
    expect(explicarCampo({ ...r, minimo: 2 }, 1)).toContain('pelo menos 2');
    expect(explicarCampo({ ...r, maximo: 2 }, 3)).toContain('no máximo 2');
    expect(explicarCampo(r, undefined)).toContain('Confira o nome e a indentação');
    expect(explicarCampo(r, '')).toContain('Preencha esse campo');
  });

  it('a verificação que falha traz a explicação e, à parte, o detalhe técnico', () => {
    resetarEstado();
    aplicarYaml(['apiVersion: v1', 'kind: Pod', 'metadata:', '  name: p', 'spec:', '  containers:', '    - name: c', '      image: nginx:1.25'].join('\n'));
    const v = verificarRegra({ tipo: 'campo', kind: 'Pod', nome: 'p', caminho: 'spec.restartPolicy', valor: 'OnFailure' });
    expect(v.ok).toBe(false);
    expect(v.detalhe).toBe('Em Pod "p", falta spec → restartPolicy. Escreva o valor OnFailure.');
    expect(v.tecnico).toContain('spec.restartPolicy: esperado que é OnFailure');
  });
});

describe('tela da lição e do exercício', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  const corpo = html.slice(html.indexOf('>', html.indexOf('<body')) + 1, html.lastIndexOf('</body>')).replace(/<script[\s\S]*?<\/script>/g, '');
  const ate = async (cond, ms = 3000) => {
    const fim = Date.now() + ms;
    while (!cond()) {
      if (Date.now() > fim) throw new Error('não aconteceu a tempo');
      await new Promise((r) => setTimeout(r, 10));
    }
  };
  const prompt = () => document.getElementById('prompt-terminal').textContent;
  const enunciado = () => document.getElementById('desc-enunciado');
  let tela;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'pt-BR';
    document.documentElement.classList.add('a11y-sem-movimento');
    document.body.innerHTML = corpo;
    tela = criarTelaItem({ layout: { aplicar() {}, mostrarDescricao() {} }, definirStatus: () => {}, aoMudarProgresso: () => {} });
  });
  afterEach(() => document.documentElement.classList.remove('a11y-sem-movimento'));

  it('a lição mostra o exemplo comentado (também no editor) e as palavras técnicas', async () => {
    const l = porId['basico-anatomia-manifesto'];
    tela.abrir(l.id);
    await ate(() => prompt().includes(l.id));
    expect(tela.editor().getValue()).toBe(l.inicial);
    expect(enunciado().querySelector('.exemplo-licao pre code').textContent).toBe(l.inicial);
    const termos = [...enunciado().querySelectorAll('.glossario .termo summary b')].map((b) => b.textContent);
    expect(termos).toEqual(expect.arrayContaining(['apiVersion', 'kind', 'spec', 'containerPort']));
  });

  it('o exercício mostra os passos, as dicas uma de cada vez e o esqueleto com # TODO', async () => {
    const e = porId['k8s-primeiro-yaml'];
    tela.abrir(e.id);
    await ate(() => prompt().includes(e.id));
    expect(tela.editor().getValue()).toContain('# TODO');
    expect(enunciado().querySelectorAll('.secao-fazer ol li').length).toBeGreaterThanOrEqual(5);
    const dicas = [...enunciado().querySelectorAll('.dicas details.dica-exercicio')];
    expect(dicas).toHaveLength(e.dica.length);
    expect(dicas.every((d) => !d.open)).toBe(true);
    expect(dicas[0].querySelector('summary').textContent).toBe(`Dica 1 de ${e.dica.length}: um empurrãozinho`);
    expect(dicas.at(-1).querySelector('summary').textContent).toContain('quase a resposta');
  });

  it('o caso que falha diz como corrigir', async () => {
    const e = porId['k8s-primeiro-yaml'];
    tela.abrir(e.id);
    await ate(() => prompt().includes(e.id));
    tela.editor().setValue(e.solucao.replace('nginx:1.25', 'nginx:1.24'));
    document.getElementById('btn-executar').click();
    await ate(() => document.querySelector('#saida-testes .caso.falha'));
    const falha = document.querySelector('#saida-testes .caso.falha .dica').textContent;
    expect(falha).toBe(`🔧 Como corrigir: ${e.testes[1].dica}`);
  });

  it('lição com exemplo e exercício com dicas: sem violações de acessibilidade (WCAG 2.2 AA)', async () => {
    for (const id of ['basico-anatomia-manifesto', 'k8s-primeiro-yaml']) {
      tela.abrir(id);
      await ate(() => prompt().includes(id));
      document.querySelectorAll('main[id^="tela-"]').forEach((t) => { if (t.id === 'tela-item') t.hidden = false; else t.hidden = true; });
      const { violations } = await axe.run(document.getElementById('desc-enunciado'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      });
      expect(violations.map((v) => `${id} ${v.id}`)).toEqual([]);
    }
  });
});
