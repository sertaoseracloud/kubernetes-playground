// Aba 🏛️ Arquitetura: como o simulador transforma o YAML em estado do cluster.
// O diagrama é HTML e CSS do próprio site (uma lista ordenada desenhada como fluxograma):
// funciona sem internet, segue os 4 temas, é lido em ordem pelo leitor de tela e não chama
// nenhum serviço de terceiros (antes vinha do Mermaid por CDN, o que contrariava a página de
// privacidade). O código Mermaid equivalente fica disponível para quem quiser copiar e
// desenhar em outra ferramenta.

/** Etapas do fluxo, na ordem: [título, o que acontece]. */
export const ETAPAS = [
  ['📝 Editor YAML', 'Você escreve o manifesto (vários recursos separados por ---).'],
  ['✅ Validador', 'Confere os campos obrigatórios de cada kind e sugere o nome certo quando há erro de digitação.'],
  ['🔍 Diff', 'Mostra o que seria criado (+), alterado (~) ou apagado (-), sem mexer no cluster.'],
  ['⚙️ Apply', 'Cria ou atualiza os recursos no cluster simulado e grava o estado no seu navegador.'],
  ['💾 Estado do cluster', 'Pods, Services, Deployments, ConfigMaps, Secrets, Ingress, HPA e outros.'],
  ['🔗 Saídas calculadas', 'ClusterIP, NodePort e endpoints, que outros recursos podem consultar (data sources).'],
  ['🔎 Drift', 'Compara o YAML do editor com o que está rodando e aponta as diferenças.'],
];

/** O mesmo fluxo em sintaxe Mermaid, para copiar (não é carregado pelo site). */
export const DIAGRAMA_MERMAID = `graph TD
    A["Editor YAML"] --> B{"Validador"}
    B -->|erros| A
    B -->|ok| C["Diff"]
    C --> D["Apply"]
    D --> E["Estado do cluster"]
    E --> F["Saídas calculadas"]
    F -->|data sources| C
    E --> G["Drift"]
    G -->|corrigir| D`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** HTML da aba. Assíncrona por compatibilidade com quem a chama (item.js). */
export async function renderArquitetura() {
  return `<section class="arquitetura-container" aria-labelledby="arquitetura-titulo">
      <h2 class="arquitetura-titulo" id="arquitetura-titulo">🏛️ Como o simulador funciona</h2>
      <p class="arquitetura-descricao">Do YAML ao cluster: cada etapa leva à seguinte. Erros no validador voltam para o editor,
        e o Drift pode pedir um novo Apply.</p>
      <ol class="arquitetura-fluxo">
        ${ETAPAS.map(([titulo, texto]) => `<li><b>${esc(titulo)}</b><span>${esc(texto)}</span></li>`).join('')}
      </ol>
      <details class="arquitetura-detalhes">
        <summary>Ver o diagrama em código Mermaid</summary>
        <pre class="codigo-solucao" tabindex="0" aria-label="Código Mermaid do diagrama">${esc(DIAGRAMA_MERMAID)}</pre>
      </details>
    </section>`;
}
