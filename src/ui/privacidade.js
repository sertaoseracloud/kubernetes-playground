// Página "Privacidade e cookies" (#/privacidade) e aviso discreto na primeira visita.
// O site não usa cookies nem rastreamento, então o aviso só informa (não pede
// consentimento) e não bloqueia a tela.
import { ATUALIZADA_EM, CONTROLADOR, DADOS_LOCAIS, TERCEIROS } from '../privacidade.js';
import { exportarDados, apagarDados, lerPreferencia, gravarPreferencia } from '../progresso.js';
import { esc, $, dataPorExtenso } from './util.js';

const linkExterno = (url, texto = url) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(texto)}</a>`;

export function renderPrivacidade(el, { definirStatus = () => {} } = {}) {
  el.innerHTML = `
    <article class="pagina-texto">
      <p class="voltar-trilha"><a href="#/trilha">← Voltar à trilha</a></p>
      <h1>🔒 Privacidade e cookies</h1>
      <p class="atualizada">Última atualização: ${dataPorExtenso(ATUALIZADA_EM)}</p>

      <section class="resumo-privacidade" aria-labelledby="priv-resumo">
        <h2 id="priv-resumo">Em resumo</h2>
        <ul>
          <li>✅ <b>Não usamos cookies</b> nem ferramentas de rastreamento, anúncios ou estatísticas de visita.</li>
          <li>✅ <b>Não temos servidor</b> nem banco de dados: nada do que você faz aqui é enviado para a ${esc(CONTROLADOR.nome)}.</li>
          <li>✅ <b>Não pedimos</b> e-mail, CPF, idade, telefone nem senha. Não há cadastro.</li>
          <li>💾 Seu progresso, seu código e o nome do certificado ficam <b>só neste navegador</b>, até você apagar.</li>
          <li>🔗 Quando você <b>compartilha um link</b> (código ou certificado), o conteúdo vai dentro do link: quem receber vê.</li>
        </ul>
        <div class="acoes-privacidade">
          <button type="button" class="btn btn-roxo" id="btn-baixar-dados">📥 Baixar meus dados</button>
          <button type="button" class="btn btn-fantasma" id="btn-apagar-dados">🗑️ Apagar meus dados deste navegador</button>
        </div>
      </section>

      <section aria-labelledby="priv-quem">
        <h2 id="priv-quem">1. Quem é responsável</h2>
        <p>O DivergeKubernetes é mantido pela <b>${esc(CONTROLADOR.nome)}</b> (responsável: ${esc(CONTROLADOR.responsavel)}).
          Para dúvidas ou pedidos sobre seus dados, use o canal: ${linkExterno(CONTROLADOR.contato, 'issues do projeto no GitHub')}.
          Não publique dados pessoais lá: descreva o pedido sem eles.</p>
      </section>

      <section aria-labelledby="priv-dados">
        <h2 id="priv-dados">2. O que fica salvo e onde</h2>
        <p>O site usa o <b>armazenamento local do navegador</b> (<code>localStorage</code>). É parecido com um cookie,
          mas <b>não é enviado</b> a nenhum servidor: fica no seu aparelho, só para este site e só neste navegador.</p>
        <div class="tabela-rolagem"><table class="tabela-privacidade">
          <tr><th>Dado</th><th>Para quê</th><th>Chave</th></tr>
          ${DADOS_LOCAIS.map((d) => `<tr><td>${esc(d.dado)}</td><td>${esc(d.finalidade)}</td><td><code>${esc(d.chave)}</code></td></tr>`).join('')}
        </table></div>
        <p><b>Por quanto tempo:</b> até você apagar (botão acima, ou limpando os dados do site no navegador).
          Em aba anônima, tudo some ao fechar a janela.</p>
      </section>

      <section aria-labelledby="priv-cookies">
        <h2 id="priv-cookies">3. Cookies</h2>
        <p>O site <b>não grava cookies</b> no seu navegador. Por isso não há banner pedindo para aceitar cookies.</p>
        <p>O <b>Kubernetes</b> deste site é um <b>simulador</b> que roda no seu navegador: ele não acessa clusters reais,
          não pede credenciais e não cria nada de verdade. Os recursos e IDs que aparecem são inventados.</p>
      </section>

      <section aria-labelledby="priv-terceiros">
        <h2 id="priv-terceiros">4. Serviços de terceiros</h2>
        <p>Alguns recursos são baixados de outros sites. Nesses casos, o seu navegador fala direto com eles, que recebem
          dados técnicos como o endereço IP, e vale a política de privacidade de cada um:</p>
        <ul class="lista-terceiros">
          ${TERCEIROS.map((t) => `
            <li><b>${esc(t.nome)}</b>: ${esc(t.quando)} ${esc(t.dados)}
              ${t.link ? `(${linkExterno(t.link, 'política')})` : ''}</li>`).join('')}
        </ul>
        <p>Links para outros sites (como a documentação oficial do Kubernetes) só levam você até lá se você clicar.</p>
      </section>

      <section aria-labelledby="priv-certificado">
        <h2 id="priv-certificado">5. Nome e certificados</h2>
        <p>O nome é <b>opcional</b> e só é pedido quando você quer ver um certificado. Ele fica salvo neste navegador e
          vai dentro do link do certificado (<code>#/certificado/...</code> e <code>badge/.../?c=...</code>).
          O link é codificado, <b>não criptografado</b>: qualquer pessoa com ele vê o nome, o módulo e a data.</p>
      </section>

      <section aria-labelledby="priv-menores">
        <h2 id="priv-menores">8. Menores de idade</h2>
        <p>O site é usado em aulas e pode ser usado por menores de 18 anos. Ele não pede dados de identificação e funciona
          sem nome. Para estudantes menores, a recomendação é <b>usar só o primeiro nome</b> no certificado (ou nenhum) e
          compartilhar o link com acompanhamento do responsável ou do professor.</p>
      </section>

      <section aria-labelledby="priv-mudancas">
        <h2 id="priv-mudancas">9. Mudanças nesta política</h2>
        <p>Se o site passar a tratar dados de outro jeito, esta página será atualizada antes, com nova data no topo.</p>
        <p>Veja também os <a href="#/termos">termos de uso</a> e a <a href="#/licenca">licença</a>.</p>
      </section>
    </article>`;

  $('btn-baixar-dados').onclick = () => {
    const dados = { site: 'DivergeKubernetes', exportadoEm: new Date().toISOString(), dados: exportarDados() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'meus-dados-kubernetes-playground.json' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    definirStatus('📥 Seus dados foram baixados.');
  };
  $('btn-apagar-dados').onclick = () => {
    if (!confirm('Apagar tudo o que o site guardou neste navegador? Isso inclui seu progresso, seu código, seu nome e suas preferências. Não dá para desfazer.')) return;
    const total = apagarDados();
    definirStatus(`🗑️ ${total} item(ns) apagado(s). Recarregando…`);
    setTimeout(() => {
      location.hash = '#/';
      location.reload();
    }, 800);
  };
}

/** Aviso de rodapé na primeira visita: informa, não pede aceite, não bloqueia. */
export function iniciarAvisoPrivacidade() {
  if (lerPreferencia('privacidade-vista')) return;
  const aviso = $('aviso-privacidade');
  aviso.innerHTML = `
    <p>🔒 <b>Sem cookies, sem rastreamento.</b> Seu progresso e seu código ficam salvos só neste navegador.</p>
    <a class="btn btn-fantasma btn-pequeno" href="#/privacidade">Saiba mais</a>
    <button type="button" class="btn btn-roxo btn-pequeno" id="btn-aviso-ok">Entendi</button>`;
  aviso.hidden = false;
  const fechar = () => {
    aviso.hidden = true;
    gravarPreferencia('privacidade-vista', true);
  };
  $('btn-aviso-ok').onclick = fechar;
  aviso.querySelector('a').addEventListener('click', fechar);
}