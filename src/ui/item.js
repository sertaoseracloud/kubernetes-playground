// Tela de uma lição, exercício ou do playground livre de Kubernetes.
// Adaptado do terraform-playground: usa editor CodeMirror (YAML) e terminal simulado.
// O simulador de kubectl é mínimo por enquanto; os testes validam o YAML diretamente.
import { minutosDoItem } from '../cargaHoraria.js';
import { buscarItem, modulos, vizinhos, DIFICULDADES } from '../conteudo/trilha.js';
import { linkItem, linkCompartilhado } from '../compartilhar.js';
import { statusDe, marcar, lerRascunho, gravarRascunho, apagarRascunho, lerHistorico, gravarHistorico } from '../progresso.js';
import { criarEditor } from './editor.js';
import { iniciarLeitura } from './acessibilidade.js';
import { aplicarChecklist } from './neuro.js';
import { criarTerminal } from './terminal.js';
import { jornadaAtual } from './inicio.js';
import { LIMITE_DESBLOQUEIO } from '../gamificacao.js';
import { $, esc } from './util.js';
import yaml from 'js-yaml';
import { aplicarYaml, verificarRegra, descreverRegra, resetarEstado, obterEstado, compararEstados, detectarDrift, simularApply, definirDiffUsado } from '../k8s/simulador.js';
import { renderEstado } from './estado.js';
import { renderDrift } from './drift.js';
import { renderDiff } from './diff.js';
import { renderArquitetura } from './arquitetura.js';

const semPressao = () => document.documentElement.classList.contains('a11y-sem-pressao');
const esperar = () => new Promise((r) => setTimeout(r, 0));

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

  // Terminal simulado
  const terminal = criarTerminal(el.terminal, {
    aoMudar: (animando) => { el.pular.hidden = !animando; },
    campo: $('campo-terminal'),
    rotulo: $('prompt-terminal'),
    historico: lerHistorico(),
    aoMudarHistorico: gravarHistorico,
  });
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

    if (item.tipo === 'licao') {
      el.enunciado.innerHTML = avisoBloqueio + (item.resumo || '') ;
      aplicarChecklist(el.enunciado, item.id);
      return;
    }

    // Exercício
    el.enunciado.innerHTML = `
      ${avisoBloqueio}
      <ol class="roteiro" aria-label="Como resolver" tabindex="0">
        <li>Leia o que fazer</li><li>Escreva o YAML</li><li>▶ Apply</li><li>Confira os ✅</li><li>⬆ Enviar</li>
      </ol>
      <section class="secao secao-fazer"><h2>🎯 O que fazer</h2>${item.resumo || ''}</section>
      ${comoConferir(item.testes)}
      <details><summary>💡 Dica</summary><p>${esc(item.dica || 'Revise a documentação dos recursos usados.')}</p></details>`;
    aplicarChecklist(el.enunciado, item.id);
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

  function renderSolucao() {
    const item = estado.item;
    if (!item?.solucao) {
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
  function abrir(id) {
    const item = buscarItem(id);
    if (!item) return false;
    estado.item = item;

    iniciarEditor();
    const rascunho = lerRascunho(id);
    definirCodigo(rascunho ?? item.solucao ?? '');

    renderCabecalho();
    renderDescricao();
    el.enviar.hidden = item.tipo !== 'exercicio';
    el.abaTestes.hidden = item.tipo !== 'exercicio';
    renderSolucao();
    layout.aplicar();
    leitura.parar();

    if (item.tipo === 'exercicio') renderTestesPendentes();

    el.tituloTerminal.textContent = `aluno@sertao: ~/k8s/${item.id}`;
    mostrarDesc('enunciado');
    mostrarSaida('terminal');
    terminal.limpar();
    terminal.escrever(`kubectl configured — namespace: default`, 'info');

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
    if (chaveExercicio) resetarEstado(chaveExercicio);
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
      const verificacoes = (teste.regras || []).map((regra) => verificarRegra(regra));
      const ok = verificacoes.every((v) => v.ok);
      resultados.push({ ok, resultados: verificacoes, ms: 1 });
    }
    const aprovado = resultados.every((r) => r.ok);
    return { aprovado, relatorio: resultados };
  }

  function renderTestes(resultado) {
    const testes = estado.item.testes || [];
    const { aprovado, relatorio } = resultado;
    const passaram = relatorio.filter((r) => r.ok).length;

    const cards = testes.map((t, i) => {
      const r = relatorio[i];
      const situacao = r?.ok ? 'ok' : 'falha';
      const icone = r?.ok ? '✅' : '❌';
      const nome = t.oculto ? `🔒 Oculto ${i + 1}` : `Caso ${i + 1}`;
      const verificacoes = (r?.resultados || []).map((v) => `
        <li class="verificacao ${v.ok ? 'ok' : 'falha'}">
          <span class="marca" aria-hidden="true">${v.ok ? '✅' : '❌'}</span>
          <div>${esc(v.mensagem)}${v.detalhe ? `<br><span class="detalhe">${esc(v.detalhe)}</span>` : ''}</div>
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
      ? 'Aceito 🎉 Você acertou a questão!'
      : gentil ? 'Ainda não passou, e tudo bem: errar faz parte' : 'Resposta errada';
    const sub = aprovado
      ? 'Parabéns! Continue na trilha.'
      : `${passaram} de ${relatorio.length} casos já funcionam. Abra o caso marcado abaixo para ver o próximo ajuste.`;

    el.testes.innerHTML = `
      <p class="veredito ${aprovado ? 'ok' : 'falha'}">${titulo}</p>
      <p class="veredito-sub">${sub}</p>
      <div class="casos">${cards}</div>`;
    definirResumo(`${aprovado ? '✅' : '❌'} ${passaram}/${relatorio.length} casos`, aprovado ? 'ok' : 'falha');
  }

  async function executarApply() {
    if (estado.ocupado) return;
    const codigo = obterCodigo();
    if (!codigo.trim()) {
      terminal.escrever('error: nenhum manifesto YAML fornecido', 'erro');
      definirStatus('Erro: YAML vazio');
      return;
    }
    terminal.escrever('$ kubectl apply -f manifest.yaml', 'comando');
    terminal.escrever('Validando manifesto...', 'info');
    await esperar();

    // Simula saída do kubectl
    try {
      const doc = yaml.load(codigo);
      const kind = doc?.kind || 'Resource';
      const name = doc?.metadata?.name || 'unnamed';
      terminal.escrever(`${kind.toLowerCase()}/${name} created`, 'sucesso');
      definirStatus(`${kind}/${name} aplicado com sucesso`);
      atualizarPainelEstado();
    } catch (erro) {
      terminal.escrever(`error: ${erro.message}`, 'erro');
      definirStatus('Erro ao aplicar YAML');
    }
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
      aoMudarProgresso();
      renderTestes(resultado);
      definirStatus(aprovado ? 'Aceito! 🎉' : semPressao() ? 'Ainda não passou: veja o que falta' : 'Resposta errada', {
        falar: aprovado ? 'Parabéns! Exercício resolvido.' : `${resultado.relatorio.filter((r) => r.ok).length} de ${resultado.relatorio.length} casos passaram.`,
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
        terminal.escrever('drift: nenhum manifesto YAML no editor', 'erro');
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
      terminal.escrever(`drift: ${relatorio.temDrift ? relatorio.drifts.length + ' divergência(s)' : 'sincronizado'}`, relatorio.temDrift ? 'aviso' : 'sucesso');
    };
  }

  // ---------- diff (plan) ----------
  let diffUsadoNesteExercicio = false;

  function executarDiff() {
    const yamlTexto = obterCodigo();
    if (!yamlTexto.trim()) {
      terminal.escrever('diff: editor vazio — escreva um manifesto YAML primeiro.', 'aviso');
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
        terminal.escrever('Plan: No changes. Infrastructure is up-to-date.', 'sucesso');
      } else {
        terminal.escrever(`Plan: ${criar.length} to create, ${atualizar.length} to update, ${destruir.length} to destroy.`, 'comando');
        for (const item of criar) terminal.escrever(`  + create ${item.kind}/${item.nome}`, 'sucesso');
        for (const item of atualizar) terminal.escrever(`  ~ update ${item.kind}/${item.nome}`, 'aviso');
        for (const item of destruir) terminal.escrever(`  - destroy ${item.kind}/${item.nome}`, 'erro');
      }
    } else {
      terminal.escrever(`diff: ${resultado.mensagem}`, 'erro');
    }
    diffUsadoNesteExercicio = true;
    definirDiffUsado(true);
  }

  // Expõe para testes de exercício verificarem se diff foi usado
  function diffFoiUsado() { return diffUsadoNesteExercicio; }

  // ---------- eventos ----------
  el.diff.onclick = () => executarDiff();
  el.executar.onclick = () => executarApply();
  el.enviar.onclick = () => enviar();
  el.restaurar.onclick = () => {
    if (!confirm('Voltar ao código original? Suas alterações serão perdidas.')) return;
    apagarRascunho(estado.item.id);
    definirCodigo(estado.item.solucao ?? '');
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
    sair: () => terminal.pular(),
    terminal,
    diffFoiUsado,
  };
}