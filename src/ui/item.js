// Tela de uma lição, exercício ou do playground livre de Kubernetes.
// Adaptado do terraform-playground: usa editor CodeMirror (YAML) e terminal simulado.
// O simulador de kubectl é mínimo por enquanto; os testes validam o YAML diretamente.
import { minutosDoItem } from '../cargaHoraria.js';
import { buscarItem, itens, modulos, vizinhos, DIFICULDADES } from '../conteudo/trilha.js';
import { linkItem, linkCompartilhado } from '../compartilhar.js';
import { statusDe, marcar, lerRascunho, gravarRascunho, apagarRascunho, lerHistorico, gravarHistorico } from '../progresso.js';
import { criarEditor } from './editor.js';
import { iniciarLeitura } from './acessibilidade.js';
import { aplicarChecklist } from './neuro.js';
import { criarTerminal } from './terminal.js';
import { jornadaAtual, certificadosDaJornada } from './inicio.js';
import { CERTIFICADOS } from '../certificados.js';
import { anunciar, falaDosTestes, leitorDeTela } from './anuncios.js';
import { solucaoLiberada, minutosQueFaltam, criarCronometro } from './solucao.js';
import { LIMITE_DESBLOQUEIO } from '../gamificacao.js';
import { $, esc } from './util.js';
import { interpretar, completarKubectl, kindsDoYaml, explicarKind } from '../k8s/comandos.js';
import { aplicarYaml, verificarRegra, descreverRegra, resetarEstado, carregarEstado, removerRecurso, obterEstado, compararEstados, detectarDrift, simularApply, definirDiffUsado } from '../k8s/simulador.js';
import { renderEstado } from './estado.js';
import { renderDrift } from './drift.js';
import { renderDiff } from './diff.js';
import { renderArquitetura } from './arquitetura.js';
import { termosDoTexto, termosVistosAntes } from '../conteudo/glossario.js';

const semPressao = () => document.documentElement.classList.contains('a11y-sem-pressao');
const esperar = () => new Promise((r) => setTimeout(r, 0));

/** O relatório sem as tags HTML do erro de YAML (para o leitor de tela). */
const semHtml = ({ aprovado, relatorio }) => ({
  aprovado,
  relatorio: relatorio.map((r) => (r.erroExecucao ? { ...r, erroExecucao: r.erroExecucao.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"') } : r)),
});

// Os termos que o aluno já viu antes de cada item (calculado uma vez, na primeira tela).
let vistosAntes = null;
const termosVistos = (id) => (vistosAntes ??= termosVistosAntes(itens)).get(id);

/** A dica do exercício como lista (aceita um texto ou uma lista de dicas progressivas). */
export const listaDeDicas = (item) => [].concat(item?.dica ?? []).filter(Boolean);

/** Põe a dica de "como corrigir" do caso na primeira verificação que falhou. */
export function comoCorrigir(verificacoes, dica) {
  const i = dica ? verificacoes.findIndex((v) => !v.ok) : -1;
  return i < 0 ? verificacoes : verificacoes.map((v, j) => (j === i ? { ...v, dica } : v));
}

/** O exercício começa com um esqueleto, nunca com a resposta; o livre começa com um exemplo. */
export const ESQUELETO = '# Escreva aqui o manifesto YAML e clique em ▶ Apply.\napiVersion: \nkind: \nmetadata:\n  name: \n';
export const codigoInicial = (item) => item?.inicial ?? (item?.tipo === 'exercicio' ? ESQUELETO : '');

export function criarTelaItem({ layout, definirStatus, aoMudarProgresso }) {
  const el = {
    anterior: $('item-anterior'),
    proximo: $('item-proximo'),
    modulo: $('item-modulo'),
    titulo: $('item-titulo'),
    dificuldade: $('item-dificuldade'),
    status: $('item-status'),
    executar: $('btn-executar'),
    diff: $('btn-diff'),
    enviar: $('btn-enviar'),
    restaurar: $('btn-restaurar'),
    compartilhar: $('btn-compartilhar'),
    abaDocs: $('aba-docs'),
    abaSolucao: $('aba-solucao'),
    abaTestes: $('aba-testes'),
    resumoTestes: $('resumo-testes'),
    enunciado: $('desc-enunciado'),
    docs: $('desc-docs'),
    solucao: $('desc-solucao'),
    testes: $('saida-testes'),
    terminal: $('saida-terminal'),
    janelaTerminal: $('janela-terminal'),
    tituloTerminal: $('titulo-terminal'),
    pular: $('btn-pular'),
    saidaCluster: $('saida-cluster'),
    saidaEstado: $('saida-estado'),
    saidaArquitetura: $('saida-arquitetura'),
  };

  const estado = { item: null, ocupado: false };

  /** Cluster limpo para o apply, com os recursos que o exercício já traz (`existentes`). */
  function prepararCluster(chave) {
    resetarEstado(chave);
    if (estado.item?.existentes) aplicarYaml(estado.item.existentes, chave);
  }

  // Terminal interativo: o prompt lê comandos kubectl (src/k8s/comandos.js) até o exercício mudar.
  const terminal = criarTerminal(el.terminal, {
    aoMudar: (animando) => { el.pular.hidden = !animando; },
    campo: $('campo-terminal'),
    rotulo: $('prompt-terminal'),
    historico: lerHistorico(),
    aoMudarHistorico: gravarHistorico,
    completar: completarKubectl,
  });
  const CLASSE = { info: 'comentario' };
  const pasta = () => `k8s/${estado.item?.id ?? 'livre'}`;
  /** Uma linha na saída; "$ comando" sai com o prompt colorido, como se tivesse sido digitado. */
  function escreverLinha(texto, classe = '') {
    if (classe === 'comando' && texto.startsWith('$ ')) {
      terminal.mostrar([{ texto, classe }], { animar: false, pasta: pasta() });
      return;
    }
    terminal.escrever(`${texto}\n`, CLASSE[classe] ?? classe);
  }
  const shell = { vez: 0 };

  /** Roda uma linha digitada no prompt. */
  async function rodarLinha(texto) {
    const { linhas, acao } = interpretar(texto, obterEstado());
    if (linhas.length) terminal.mostrar(linhas, { animar: false, pasta: pasta() });
    if (acao === 'clear') terminal.limpar();
    else if (acao === 'apply') await executarApply({ digitado: true, falar: true });
    else if (acao === 'diff') executarDiff({ digitado: true });
    else if (acao === 'drift') btnDrift?.click();
    else if (acao === 'delete-arquivo') apagarDoArquivo();
    else if (acao?.apagar) {
      for (const { kind, nome, prefixo, tipo } of acao.apagar) {
        if (removerRecurso(kind, nome, estado.item?.id)) escreverLinha(`${prefixo} "${nome}" deleted`, 'sucesso');
        else escreverLinha(`Error from server (NotFound): ${tipo} "${nome}" not found`, 'erro');
      }
      atualizarPainelEstado();
    }
  }

  /** O prompt: lê e roda comandos até o exercício mudar. */
  async function laco(vez) {
    while (shell.vez === vez) {
      const texto = await terminal.ler({ pasta: pasta(), rotulo: 'Comando do terminal (digite help)' });
      if (shell.vez !== vez) return;
      if (texto === null) continue;
      try {
        await rodarLinha(texto);
      } catch (erro) {
        console.error(erro);
        escreverLinha(`Erro interno do simulador: ${erro.message}`, 'erro');
      }
    }
  }

  function apagarDoArquivo() {
    const r = simularApply(obterCodigo());
    if (!r.ok) {
      escreverLinha(`error: ${r.mensagem}`, 'erro');
      return;
    }
    for (const rec of r.recursos ?? []) {
      const kind = rec.kind ?? rec.recurso?.kind;
      if (kind && removerRecurso(kind, rec.nome, estado.item?.id)) escreverLinha(`${kind.toLowerCase()} "${rec.nome}" deleted`, 'sucesso');
    }
    atualizarPainelEstado();
  }
  el.pular.onclick = () => terminal.pular();

  // Editor CodeMirror (YAML)
  let editorInstance = null;
  let salvarTimer;

  function obterCodigo() {
    return editorInstance ? editorInstance.getValue() : '';
  }

  function definirCodigo(codigo) {
    if (editorInstance) editorInstance.setValue(codigo);
  }

  function iniciarEditor() {
    if (editorInstance) editorInstance.destroy();
    editorInstance = criarEditor($('editor'), {
      linguagem: 'yaml',
      inicial: '',
      aoExecutar: () => executarApply(),
      aoEnviar: () => enviar(),
      onChange: (codigo) => {
        clearTimeout(salvarTimer);
        if (estado.item) {
          salvarTimer = setTimeout(() => gravarRascunho(estado.item.id, codigo), 300);
        }
      },
    });
  }

  // 🔊 Ouvir
  const paineisDesc = { enunciado: el.enunciado, docs: el.docs, solucao: el.solucao, testes: $('desc-testes') };
  const leitura = iniciarLeitura($('btn-ouvir'), () =>
    [el.titulo.textContent, ...Object.values(paineisDesc).filter((p) => !p.hidden).map((p) => p.innerText)].join('. '));

  // ---------- abas descrição ----------
  function mostrarDesc(nome) {
    for (const [chave, painel] of Object.entries(paineisDesc)) painel.hidden = chave !== nome;
    document.querySelectorAll('[data-desc]').forEach((b) => {
      b.classList.toggle('ativa', b.dataset.desc === nome);
      b.setAttribute('aria-selected', String(b.dataset.desc === nome));
    });
  }
  document.querySelectorAll('[data-desc]').forEach((b) => { b.onclick = () => mostrarDesc(b.dataset.desc); });

  // ---------- aba Solução: só depois do tempo estimado e se não resolvido (veja solucao.js) ----------
  function avisoDaSolucao(item) {
    if (item?.tipo !== 'exercicio' || !item.solucao || solucaoLiberada(item) || statusDe(item.id) === 'resolvido') return '';
    const quando = semPressao()
      ? 'depois de um tempo tentando'
      : `depois de ~${minutosDoItem(item)} min tentando (faltam ${minutosQueFaltam(item)} min)`;
    return `<p class="licao-chip aviso-solucao" id="aviso-solucao">🔒 A solução aparece ${quando}. Tentar antes é o que faz aprender.</p>`;
  }

  function atualizarSolucao({ avisar = false } = {}) {
    const item = estado.item;
    if (!item) return;
    const liberada = Boolean(item.solucao) && solucaoLiberada(item);
    const estava = !el.abaSolucao.hidden;
    el.abaSolucao.hidden = !liberada;
    if (!liberada && !paineisDesc.solucao.hidden) mostrarDesc('enunciado');
    const aviso = document.getElementById('aviso-solucao');
    if (aviso) aviso.outerHTML = avisoDaSolucao(item);
    if (liberada && !estava && avisar) anunciar('A solução deste exercício está disponível na aba Solução.');
  }

  // Conta o tempo de tentativa só com a tela do exercício na frente.
  const cronometro = criarCronometro({
    ativo: () => Boolean(estado.item) && !el.titulo.closest('[hidden]'),
    aoMudar: () => atualizarSolucao({ avisar: true }),
  });

  // ---------- abas saída ----------
  const saidas = { terminal: el.janelaTerminal, estado: el.saidaEstado, arquitetura: el.saidaArquitetura };
  let estadoAnterior = null;
  function mostrarSaida(nome) {
    for (const [chave, painel] of Object.entries(saidas)) painel.hidden = chave !== nome;
    document.querySelectorAll('[data-saida]').forEach((b) => {
      b.classList.toggle('ativa', b.dataset.saida === nome);
      b.setAttribute('aria-selected', String(b.dataset.saida === nome));
    });
    if (nome === 'estado') atualizarPainelEstado();
    if (nome === 'arquitetura') {
      renderArquitetura().then((html) => { el.saidaArquitetura.innerHTML = html; });
    }
  }
  document.querySelectorAll('[data-saida]').forEach((b) => { b.onclick = () => mostrarSaida(b.dataset.saida); });

  function atualizarPainelEstado() {
    if (!el.saidaEstado) return;
    const atual = obterEstado();
    const diff = estadoAnterior ? compararEstados(estadoAnterior, atual) : null;
    el.saidaEstado.innerHTML = renderEstado(atual, diff);
    estadoAnterior = structuredClone(atual);
  }

  // ---------- descrição ----------
  function renderDescricao() {
    const item = estado.item;
    if (!item) return;
    const moduloNoCaminho = jornadaAtual().modulos.find((m) => m.id === item.modulo);
    const avisoBloqueio = moduloNoCaminho && !moduloNoCaminho.desbloqueado ? `
      <div class="etapa-info">🔒 Este módulo ainda está bloqueado no caminho: resolva ${LIMITE_DESBLOQUEIO}% do módulo anterior.
        Você pode praticar aqui, mas siga a trilha na ordem para aproveitar melhor.</div>` : '';

    if (item.tipo === 'livre') {
      el.enunciado.innerHTML = avisoBloqueio + (item.resumo || '');
      aplicarChecklist(el.enunciado, item.id);
      return;
    }
    if (item.tipo === 'licao') {
      el.enunciado.innerHTML = avisoBloqueio + (item.resumo || '') + exemploDaLicao(item) + glossario(item, item.titulo, item.resumo, item.inicial ?? "");
      aplicarChecklist(el.enunciado, item.id);
      return;
    }

    // Exercício
    el.enunciado.innerHTML = `
      ${avisoBloqueio}
      <ol class="roteiro" aria-label="Como resolver" tabindex="0">
        <li>Leia o que fazer</li><li>Escreva o YAML</li><li>▶ Apply</li><li>Confira os ✅</li><li>⬆ Enviar</li>
      </ol>
      ${avisoDaSolucao(item)}
      <section class="secao secao-fazer"><h2>🎯 O que fazer</h2>${item.resumo || ''}</section>
      ${glossario(item, item.titulo, item.resumo, ...listaDeDicas(item))}
      ${comoConferir(item.testes)}
      ${dicas(item)}`;
    aplicarChecklist(el.enunciado, item.id);
  }

  /** O exemplo comentado da lição: aparece no texto (para ler e ouvir) e já está no editor. */
  function exemploDaLicao(item) {
    if (!item.inicial) return '';
    return `
      <section class="secao exemplo-licao" aria-labelledby="titulo-exemplo-licao">
        <h2 id="titulo-exemplo-licao">📄 Exemplo comentado</h2>
        <p>Este exemplo também está no editor. Leia os comentários (as linhas com <code>#</code>), clique em
        <b>▶ Apply</b> e veja na aba <b>📦 Estado</b> o que foi criado no cluster. Pode mudar à vontade: aqui nada é corrigido.</p>
        <pre class="trecho" tabindex="0" aria-label="Exemplo de YAML comentado"><code>${esc(item.inicial)}</code></pre>
      </section>`;
  }

  /** Palavras técnicas do texto, cada uma com explicação, analogia e exemplo (veja conteudo/glossario.js). */
  function glossario(item, ...textos) {
    const div = document.createElement('div');
    div.innerHTML = textos.join(' ');
    const termos = termosDoTexto(div.textContent, { modulo: item.modulo, vistos: termosVistos(item.id) });
    if (!termos.length) return '';
    return `
      <section class="secao glossario" aria-labelledby="titulo-glossario">
        <h2 id="titulo-glossario">📚 Palavras técnicas</h2>
        <p class="glossario-ajuda">Toque numa palavra para ver o que ela significa, com uma comparação do dia a dia.</p>
        ${termos.map((t) => `
          <details class="termo">
            <summary><b>${esc(t.termo)}</b><span>${esc(t.definicao)}</span></summary>
            <p class="analogia"><span aria-hidden="true">🧠</span> <b>Pense assim:</b> ${esc(t.analogia)}</p>
            ${t.exemplo ? `<pre class="trecho exemplo-termo"><code>${esc(t.exemplo)}</code></pre>` : ''}
          </details>`).join('')}
      </section>`;
  }

  /**
   * Dicas progressivas: a primeira só aponta o caminho e a última quase dá a resposta.
   * Cada uma fica fechada num <details> (o aluno abre só quando precisa).
   */
  function dicas(item) {
    const lista = listaDeDicas(item);
    if (!lista.length) return '<details class="dica-exercicio"><summary>💡 Dica</summary><p>Revise a lição antes deste exercício e a aba 📘 Docs.</p></details>';
    if (lista.length === 1) return `<details class="dica-exercicio"><summary>💡 Dica</summary><p>${esc(lista[0])}</p></details>`;
    const rotulo = (i) => (i === 0 ? 'um empurrãozinho' : i === lista.length - 1 ? 'quase a resposta' : 'mais detalhes');
    return `
      <section class="secao dicas" aria-labelledby="titulo-dicas">
        <h2 id="titulo-dicas">💡 Dicas</h2>
        <p class="glossario-ajuda">Abra uma de cada vez, só se travar.</p>
        ${lista.map((d, i) => `<details class="dica-exercicio"><summary>Dica ${i + 1} de ${lista.length}: ${rotulo(i)}</summary><p>${esc(d)}</p></details>`).join('')}
      </section>`;
  }

  function comoConferir(testes) {
    if (!testes?.length) return '';
    const blocos = testes.filter((t) => !t.oculto).map((t) => {
      const regras = (t.regras || []).map((r) => descreverRegra(r)).filter(Boolean);
      if (!regras.length) return '';
      return `<p class="caso-exemplo"><span class="rotulo">${esc(t.descricao || 'Ao aplicar')}:</span></p>
        <ul>${regras.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`;
    }).join('');
    return blocos ? `<section class="secao secao-conferir"><h2>✅ Como saber que deu certo</h2>${blocos}</section>` : '';
  }

  // Aba 📘 Docs: os tipos de recurso que o exercício usa, com uma explicação curta e o link da
  // documentação oficial (no terraform-playground, a aba mostra os argumentos de cada recurso).
  function renderDocs() {
    const item = estado.item;
    const kinds = item?.tipo === 'licao' ? [] : kindsDoYaml(item?.solucao ?? item?.inicial ?? '');
    el.abaDocs.hidden = !kinds.length;
    if (!kinds.length) return;
    el.docs.innerHTML = `
      <p>Os tipos de recurso usados aqui. A documentação completa (em inglês) abre em outra aba.</p>
      <dl class="docs-kinds">
        ${kinds.map((k) => `<dt><code>${esc(k)}</code></dt><dd>${esc(explicarKind(k) ?? 'Recurso nativo do Kubernetes.')}
          <a href="https://kubernetes.io/search/?q=${encodeURIComponent(k)}" target="_blank" rel="noopener noreferrer">Documentação de ${esc(k)}</a></dd>`).join('')}
      </dl>
      <p class="caso-exemplo">Dica: no terminal, <code>kubectl explain ${esc(kinds[0].toLowerCase())}</code> também explica o tipo.</p>`;
  }

  function renderSolucao() {
    const item = estado.item;
    if (!item?.solucao || !solucaoLiberada(item)) {
      el.abaSolucao.hidden = true;
      return;
    }
    el.abaSolucao.hidden = false;
    el.solucao.innerHTML = `
      <p>Tente resolver sozinho antes! Se travar, veja a dica na aba Descrição.</p>
      <button class="btn btn-fantasma" id="btn-revelar">👀 Mostrar solução</button>`;
    $('btn-revelar').onclick = () => {
      el.solucao.innerHTML = `
        <h2>manifest.yaml</h2><pre class="codigo-solucao">${esc(item.solucao)}</pre>
        <button class="btn btn-roxo" id="btn-usar-solucao">Copiar para o editor</button>`;
      $('btn-usar-solucao').onclick = () => {
        if (!confirm('Substituir o seu código pela solução?')) return;
        definirCodigo(item.solucao);
        gravarRascunho(item.id, item.solucao);
      };
    };
  }

  function renderCabecalho() {
    const item = estado.item;
    const modulo = modulos.find((m) => m.id === item.modulo);
    el.modulo.textContent = modulo ? `${modulo.icone} ${modulo.titulo}` : '🧪 Livre';
    el.titulo.textContent = item.titulo;
    el.dificuldade.className = item.tipo === 'exercicio' ? `dificuldade ${item.dificuldade}` : 'licao-chip';
    el.dificuldade.textContent = item.tipo === 'exercicio' ? DIFICULDADES[item.dificuldade] : item.tipo === 'licao' ? 'Lição' : '';
    const minutos = minutosDoItem(item);
    if (minutos) el.dificuldade.textContent += ` · ⏱ ~${minutos} min`;
    el.dificuldade.title = minutos ? `Tempo estimado: cerca de ${minutos} minutos` : '';
    const status = statusDe(item.id);
    el.status.textContent = item.tipo === 'exercicio' && status === 'resolvido' ? '✅ Resolvido' : status === 'tentado' ? '◐ Tentado' : '';
    el.status.className = 'chip';
    el.status.hidden = !el.status.textContent;

    const { anterior, proximo } = vizinhos(item.id);
    for (const [botao, alvo] of [[el.anterior, anterior], [el.proximo, proximo]]) {
      botao.classList.toggle('desativado', !alvo);
      botao.href = alvo ? linkItem(alvo.id) : '#';
      botao.title = alvo ? alvo.titulo : '';
    }
  }

  // ---------- abrir ----------
  function abrir(id, compartilhado) {
    const item = buscarItem(id);
    if (!item) return false;
    estado.item = item;

    iniciarEditor();
    // Link compartilhado (#/s/...) traz o código de quem compartilhou; senão, o rascunho salvo.
    const recebido = typeof compartilhado === 'string' ? compartilhado : null;
    definirCodigo(recebido ?? lerRascunho(id) ?? codigoInicial(item));

    renderCabecalho();
    renderDescricao();
    el.enviar.hidden = item.tipo !== 'exercicio';
    el.abaTestes.hidden = item.tipo !== 'exercicio';
    renderSolucao();
    renderDocs();
    cronometro.iniciar(item);
    layout.aplicar();
    leitura.parar();

    if (item.tipo === 'exercicio') renderTestesPendentes();

    el.tituloTerminal.textContent = `aluno@sertao: ~/k8s/${item.id}`;
    mostrarDesc('enunciado');
    mostrarSaida('terminal');
    shell.vez++;
    terminal.cancelarLeitura();
    terminal.limpar();
    carregarEstado(item.id);
    estadoAnterior = null;
    escreverLinha('# kubectl configurado no cluster simulado (namespace default). Digite help para ver os comandos.', 'info');
    laco(shell.vez);

    // Reseta flag de diff para o novo exercício
    diffUsadoNesteExercicio = false;
    definirDiffUsado(false);

    // Lição marca como lida ao abrir
    if (item.tipo === 'licao' && !statusDe(item.id)) {
      marcar(item.id, 'resolvido');
      aoMudarProgresso();
    }

    return true;
  }

  // ---------- execução / testes ----------

  function renderTestesPendentes() {
    const testes = estado.item?.testes || [];
    el.testes.innerHTML = `
      <p class="veredito-sub"><b>▶ Apply</b> valida o YAML. <b>⬆ Enviar</b> roda todos os casos e marca como resolvido.</p>
      <div class="casos">${testes.map((t, i) => cardCasoPendente(t, i)).join('')}</div>`;
    definirResumo(`${testes.length} casos · aguardando`);
  }

  function cardCasoPendente(teste, indice) {
    const oculto = Boolean(teste.oculto);
    const nome = oculto ? `🔒 Oculto ${indice + 1}` : `Caso ${indice + 1}`;
    return `
      <details class="caso pendente">
        <summary>⏳ ${nome}<span class="url">${esc(teste.descricao || 'kubectl apply')}</span></summary>
        <div class="corpo-caso">
          <p class="rotulo-caso">O que este caso confere</p>
          <ul class="verificacoes">${(teste.regras || []).map((r) =>
            `<li class="verificacao pendente"><span class="marca" aria-hidden="true">⏳</span><div>${esc(descreverRegra(r))}</div></li>`
          ).join('')}</ul>
        </div>
      </details>`;
  }

  function definirResumo(texto, classe = '') {
    const curto = texto.match(/^[✅❌]\s*\d+\/\d+/)?.[0] ?? (texto.startsWith('rodando') ? '⏳' : '');
    el.resumoTestes.textContent = curto;
    el.resumoTestes.className = `resumo-testes ${classe}`;
    el.abaTestes.title = `Testes: ${texto}`;
    el.abaTestes.setAttribute('aria-label', `Testes: ${texto}`);
  }

  async function validarYAML(codigo, testes) {
    await esperar();
    const chaveExercicio = estado.item?.id;
    if (chaveExercicio) prepararCluster(chaveExercicio);
    const applyResult = aplicarYaml(codigo, chaveExercicio);
    if (!applyResult.ok) {
      // Formata erros de validação com destaque para campo faltante e sugestão
      const linhas = (applyResult.mensagem || '').split('\n').filter(Boolean);
      const formatado = linhas.map((linha) => {
        const matchCampo = linha.match(/Missing required argument "([^"]+)"/);
        const matchSugestao = linha.match(/Did you mean "([^"]+)"\?/);
        const matchUnknown = linha.match(/Unknown field "([^"]+)"/);
        let html = esc(linha);
        if (matchCampo) {
          html = html.replace(
            `&quot;${esc(matchCampo[1])}&quot;`,
            `<code class="campo-faltante">${esc(matchCampo[1])}</code>`
          );
        }
        if (matchUnknown) {
          html = html.replace(
            `&quot;${esc(matchUnknown[1])}&quot;`,
            `<code class="campo-desconhecido">${esc(matchUnknown[1])}</code>`
          );
        }
        if (matchSugestao) {
          html = html.replace(
            `&quot;${esc(matchSugestao[1])}&quot;?`,
            `<code class="sugestao-campo">${esc(matchSugestao[1])}</code>?`
          );
        }
        return html;
      }).join('<br>');
      return { aprovado: false, relatorio: [{ ok: false, erroExecucao: formatado, resultados: [] }] };
    }
    const resultados = [];
    for (const teste of testes) {
      // A `dica` do caso diz ao aluno o que corrigir; vai na primeira verificação que falhou.
      const verificacoes = comoCorrigir((teste.regras || []).map((regra) => verificarRegra(regra)), teste.dica);
      const ok = verificacoes.every((v) => v.ok);
      resultados.push({ ok, resultados: verificacoes, ms: 1 });
    }
    const aprovado = resultados.every((r) => r.ok);
    return { aprovado, relatorio: resultados };
  }

  /** `envio`: todos os casos (⬆ Enviar); senão, só os visíveis (▶ Apply). */
  function renderTestes(resultado, envio = true) {
    const testes = estado.item.testes || [];
    const rodados = envio ? testes : testes.filter((t) => !t.oculto);
    const { aprovado, relatorio } = resultado;
    const erroYaml = relatorio.find((r) => r.erroExecucao)?.erroExecucao;
    const porTeste = erroYaml ? new Map() : new Map(rodados.map((t, i) => [t, relatorio[i]]));
    const passaram = erroYaml ? 0 : relatorio.filter((r) => r.ok).length;
    const total = rodados.length;

    const cards = testes.map((t, i) => {
      const r = porTeste.get(t);
      if (!r) return cardCasoPendente(t, i);
      const situacao = r.ok ? 'ok' : 'falha';
      const icone = r.ok ? '✅' : '❌';
      const nome = t.oculto ? `🔒 Oculto ${i + 1}` : `Caso ${i + 1}`;
      const verificacoes = (r.resultados || []).map((v) => `
        <li class="verificacao ${v.ok ? 'ok' : 'falha'}">
          <span class="marca" aria-hidden="true">${v.ok ? '✅' : '❌'}</span>
          <div>${esc(v.mensagem)}${v.detalhe ? `<br><span class="detalhe">${esc(v.detalhe)}</span>` : ''}${v.dica ? `<span class="dica">🔧 Como corrigir: ${esc(v.dica)}</span>` : ''}${!v.ok && v.tecnico ? `<details class="detalhe-tecnico"><summary>Detalhe técnico</summary><code>${esc(v.tecnico)}</code></details>` : ''}</div>
        </li>`).join('');
      return `
        <details class="caso ${situacao}" ${situacao === 'falha' ? 'open' : ''}>
          <summary>${icone} ${nome}<span class="url">${esc(t.descricao || 'kubectl apply')}</span></summary>
          <div class="corpo-caso">
            ${verificacoes ? `<ul class="verificacoes">${verificacoes}</ul>` : ''}
          </div>
        </details>`;
    }).join('');

    const gentil = semPressao();
    const titulo = aprovado
      ? (envio ? 'Aceito 🎉 Você acertou a questão!' : 'Casos visíveis passaram')
      : gentil ? 'Ainda não passou, e tudo bem: errar faz parte' : 'Resposta errada';
    const sub = erroYaml
      ? 'O YAML não pôde ser aplicado. Corrija o erro abaixo e rode de novo.'
      : aprovado && !envio
        ? 'Agora clique em ⬆ Enviar para rodar todos os casos e marcar como resolvido.'
        : aprovado ? 'Parabéns! Continue na trilha.'
          : `${passaram} de ${total} casos já funcionam. Abra o caso marcado abaixo para ver o próximo ajuste.`;
    const { proximo } = vizinhos(estado.item.id);

    el.testes.innerHTML = `
      <p class="veredito ${aprovado ? 'ok' : 'falha'}">${titulo}</p>
      <p class="veredito-sub">${sub}
      ${aprovado && envio && proximo ? `<a class="btn btn-roxo btn-pequeno proximo-problema" href="${linkItem(proximo.id)}">Próximo: ${esc(proximo.titulo)} ›</a>` : ''}</p>
      ${erroYaml ? `<div class="erro-yaml" role="note">${erroYaml}</div>` : ''}
      <div class="casos">${cards}</div>`;
    definirResumo(`${aprovado ? '✅' : '❌'} ${passaram}/${total} ${envio ? 'casos (todos)' : 'casos visíveis'}`, aprovado ? 'ok' : 'falha');
  }

  /** Abre a aba 🧪 Testes (e a descrição, se estiver oculta). */
  function abrirAbaTestes() {
    if (estado.item?.tipo !== 'exercicio') return;
    layout.mostrarDescricao?.();
    mostrarDesc('testes');
  }

  // ▶ Apply: aplica o YAML no cluster simulado, mostra a saída do kubectl e roda os casos
  // visíveis (sem marcar como resolvido; quem marca é o ⬆ Enviar, com todos os casos).
  async function executarApply({ digitado = false, falar = false } = {}) {
    if (estado.ocupado || !estado.item) return;
    const codigo = obterCodigo();
    if (!codigo.trim()) {
      escreverLinha('error: nenhum manifesto YAML fornecido', 'erro');
      definirStatus('Erro: YAML vazio', { falar: falar && 'O editor está vazio: escreva o manifesto YAML primeiro.' });
      return;
    }
    if (!digitado) escreverLinha('$ kubectl apply -f manifest.yaml', 'comando');
    await esperar();
    const chave = estado.item.id;
    prepararCluster(chave);
    const resultado = aplicarYaml(codigo, chave);
    const linhas = (resultado.mensagem || '').split('\n').filter(Boolean);
    if (!resultado.ok) {
      for (const linha of linhas) escreverLinha(`error: ${linha}`, 'erro');
      definirStatus('Erro ao aplicar o YAML', { falar: falar && `Erro ao aplicar o YAML: ${linhas.join('. ')}` });
      if (estado.item.tipo === 'exercicio') {
        renderTestes(await validarYAML(codigo, (estado.item.testes || []).filter((t) => !t.oculto)), false);
        abrirAbaTestes();
      }
      return;
    }
    for (const linha of linhas) escreverLinha(linha, 'sucesso');
    atualizarPainelEstado();
    const visiveis = estado.item.tipo === 'exercicio' ? (estado.item.testes || []).filter((t) => !t.oculto) : [];
    if (!visiveis.length) {
      definirStatus(`Apply: ${linhas.length} recurso(s) aplicado(s)`, { falar: falar && `Apply concluído: ${linhas.join('. ')}` });
      return;
    }
    const testados = await validarYAML(codigo, visiveis);
    const passaram = testados.relatorio.filter((r) => r.ok).length;
    escreverLinha(`${testados.aprovado ? '✅' : '❌'} ${passaram}/${visiveis.length} casos visíveis passaram`, testados.aprovado ? 'sucesso' : 'aviso');
    renderTestes(testados, false);
    abrirAbaTestes();
    const nomes = visiveis.map((t) => `Caso ${(estado.item.testes || []).indexOf(t) + 1}`);
    definirStatus(`${passaram}/${visiveis.length} casos visíveis passaram`, {
      falar: falar && falaDosTestes(semHtml(testados), { nomes, gentil: semPressao(), detalhado: leitorDeTela() }),
    });
  }

  async function enviar() {
    if (!estado.item || estado.item.tipo !== 'exercicio' || estado.ocupado) return;
    estado.ocupado = true;
    el.enviar.disabled = true;
    el.testes.innerHTML = '<p class="veredito-sub">Rodando todos os casos de teste…</p>';
    mostrarDesc('testes');
    definirResumo('rodando…');
    definirStatus('Enviando…');
    try {
      const codigo = obterCodigo();
      const resultado = await validarYAML(codigo, estado.item.testes);
      const { aprovado } = resultado;
      marcar(estado.item.id, aprovado ? 'resolvido' : 'tentado');
      renderCabecalho();
      atualizarSolucao();
      aoMudarProgresso();
      renderTestes(resultado, true);
      let conquista = '';
      const jornada = jornadaAtual();
      const modulo = jornada.modulos.find((m) => m.id === estado.item.modulo);
      if (aprovado && modulo?.concluido) {
        const cert = certificadosDaJornada(jornada).find((c) => c.id === modulo.id);
        const aviso = !cert ? 'Este é um módulo extra, sem certificado próprio.'
          : cert.liberado ? 'Seu certificado da Sertão será cloud está liberado.'
            : `Os certificados são liberados na ordem da trilha: conclua também <b>${esc(CERTIFICADOS[cert.falta]?.titulo ?? '')}</b> para receber o seu.`;
        conquista = ` Você concluiu o módulo ${modulo.titulo}! ${aviso.replace(/<[^>]+>/g, '')}`;
        el.testes.insertAdjacentHTML('afterbegin', `
          <div class="comemoracao">🏆 Você concluiu o módulo <b>${esc(modulo.titulo)}</b>!
            ${aviso}
            <a class="btn btn-roxo btn-pequeno" href="#/trilha">Ver no caminho</a></div>`);
      }
      definirStatus(aprovado ? 'Aceito! 🎉' : semPressao() ? 'Ainda não passou: veja o que falta' : 'Resposta errada', {
        falar: aprovado ? `Parabéns! Exercício resolvido.${conquista}`
          : falaDosTestes(semHtml(resultado), { envio: true, nomes: (estado.item.testes || []).map((t, i) => (t.oculto ? `Oculto ${i + 1}` : `Caso ${i + 1}`)), gentil: semPressao(), detalhado: leitorDeTela() }),
      });
    } catch (erro) {
      console.error(erro);
      el.testes.innerHTML = `<p class="veredito falha">Erro</p><p class="veredito-sub">${esc(erro.message)}</p>`;
    } finally {
      estado.ocupado = false;
      el.enviar.disabled = false;
    }
  }

  // ---------- drift ----------
  const btnDrift = $('btn-drift');
  if (btnDrift) {
    btnDrift.onclick = () => {
      const codigo = obterCodigo();
      if (!codigo.trim()) {
        escreverLinha('drift: nenhum manifesto YAML no editor', 'erro');
        return;
      }
      const relatorio = detectarDrift(codigo);
      mostrarSaida('estado');
      el.saidaEstado.innerHTML = renderDrift(relatorio);
      const btnCorrigir = $('btn-drift-corrigir');
      if (btnCorrigir) {
        btnCorrigir.onclick = () => {
          executarApply();
          atualizarPainelEstado();
        };
      }
      escreverLinha(`drift: ${relatorio.temDrift ? relatorio.drifts.length + ' divergência(s)' : 'sincronizado'}`, relatorio.temDrift ? 'aviso' : 'sucesso');
    };
  }

  // ---------- diff (plan) ----------
  let diffUsadoNesteExercicio = false;

  function executarDiff({ digitado = false } = {}) {
    if (!digitado) escreverLinha('$ kubectl diff -f manifest.yaml', 'comando');
    const yamlTexto = obterCodigo();
    if (!yamlTexto.trim()) {
      escreverLinha('diff: editor vazio — escreva um manifesto YAML primeiro.', 'aviso');
      return;
    }
    const resultado = simularApply(yamlTexto);
    mostrarSaida('estado');
    el.saidaEstado.innerHTML = renderDiff(resultado);
    // Resumo no terminal estilo Terraform
    if (resultado.ok) {
      const { criar, atualizar, destruir } = resultado.diff;
      const total = criar.length + atualizar.length + destruir.length;
      if (total === 0) {
        escreverLinha('Plan: No changes. Infrastructure is up-to-date.', 'sucesso');
      } else {
        escreverLinha(`Plan: ${criar.length} to create, ${atualizar.length} to update, ${destruir.length} to destroy.`, 'comando');
        for (const item of criar) escreverLinha(`  + create ${item.kind}/${item.nome}`, 'sucesso');
        for (const item of atualizar) escreverLinha(`  ~ update ${item.kind}/${item.nome}`, 'aviso');
        for (const item of destruir) escreverLinha(`  - destroy ${item.kind}/${item.nome}`, 'erro');
      }
    } else {
      escreverLinha(`diff: ${resultado.mensagem}`, 'erro');
    }
    diffUsadoNesteExercicio = true;
    definirDiffUsado(true);
  }

  // Expõe para testes de exercício verificarem se diff foi usado
  function diffFoiUsado() { return diffUsadoNesteExercicio; }

  // ---------- eventos ----------
  el.diff.onclick = () => executarDiff();
  el.executar.onclick = () => executarApply({ falar: true });
  el.enviar.onclick = () => enviar();
  el.restaurar.onclick = () => {
    if (!confirm('Voltar ao código original? Suas alterações serão perdidas.')) return;
    apagarRascunho(estado.item.id);
    definirCodigo(codigoInicial(estado.item));
    executarApply();
  };
  el.compartilhar.onclick = async () => {
    const link = `${location.origin}${location.pathname}${linkCompartilhado({ item: estado.item.id, arquivos: obterCodigo() })}`;
    try {
      await navigator.clipboard.writeText(link);
      definirStatus('🔗 Link copiado!');
    } catch {
      prompt('Copie o link:', link);
    }
  };

  el.executar.disabled = false;
  el.enviar.disabled = false;

  return {
    abrir,
    redesenharDescricao: () => estado.item && renderDescricao(),
    sair: () => { terminal.pular(); cronometro.parar(); },
    terminal,
    diffFoiUsado,
    /** O editor aberto (os testes usam para escrever o código). */
    editor: () => editorInstance,
  };
}