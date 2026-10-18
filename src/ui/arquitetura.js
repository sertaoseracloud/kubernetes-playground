// View de Arquitetura: diagrama Mermaid mostrando o fluxo do simulador K8s.
// Renderiza a arquitetura YAML → validação → apply → estado → diff/drift como SVG inline.
// Usa Mermaid via CDN carregado dinamicamente para evitar bundling pesado.

const MERMAID_CDN = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';

/** Diagrama da arquitetura do simulador Kubernetes Playground. */
const DIAGRAMA_ARQUITETURA = `graph TD
    A["📝 Editor YAML"] --> B{"✅ Validador"}
    B -->|Erros| C["❌ Mensagens de Erro<br/>+ Sugestões Levenshtein"]
    B -->|OK| D["🔍 simularApply()"]
    D --> E["📊 Diff Preview<br/>+create ~update -destroy"]
    E --> F{"Aluno confirma?"}
    F -->|Sim| G["⚙️ aplicarYaml()"]
    F -->|Não| A
    G --> H["💾 Estado Global<br/>pods, services, deployments,<br/>configmaps, secrets, ..."]
    H --> I["📦 Painel Estado<br/>JSON + diff entre applies"]
    H --> J["🔎 Drift Detection<br/>YAML vs. estado atual"]
    H --> K["🏗️ Cenário Visual<br/>Palco interativo"]
    H --> L["🔗 Outputs Cross-Resource<br/>clusterIP, nodePort, endpoints"]
    L --> M["📖 Data Sources<br/>buscarRecurso(kind, nome)"]
    M --> D

    style A fill:#2563eb,color:#fff,stroke:none
    style B fill:#f59e0b,color:#000,stroke:none
    style C fill:#ef4444,color:#fff,stroke:none
    style D fill:#8b5cf6,color:#fff,stroke:none
    style E fill:#8b5cf6,color:#fff,stroke:none
    style F fill:#f59e0b,color:#000,stroke:none
    style G fill:#10b981,color:#fff,stroke:none
    style H fill:#0ea5e9,color:#fff,stroke:none
    style I fill:#06b6d4,color:#fff,stroke:none
    style J fill:#f97316,color:#fff,stroke:none
    style K fill:#ec4899,color:#fff,stroke:none
    style L fill:#6366f1,color:#fff,stroke:none
    style M fill:#14b8a6,color:#fff,stroke:none`;

let mermaidCarregado = false;
let mermaidPromise = null;

/**
 * Carrega a biblioteca Mermaid dinamicamente via CDN.
 * @returns {Promise<object>} Instância do mermaid inicializada.
 */
function carregarMermaid() {
  if (mermaidCarregado && window.mermaid) return Promise.resolve(window.mermaid);
  if (mermaidPromise) return mermaidPromise;

  mermaidPromise = new Promise((resolve, reject) => {
    if (window.mermaid) {
      mermaidCarregado = true;
      resolve(window.mermaid);
      return;
    }
    const script = document.createElement('script');
    script.src = MERMAID_CDN;
    script.async = true;
    script.onload = () => {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'strict',
        flowchart: { curve: 'basis', padding: 16 },
      });
      mermaidCarregado = true;
      resolve(window.mermaid);
    };
    script.onerror = () => reject(new Error('Falha ao carregar Mermaid'));
    document.head.appendChild(script);
  });

  return mermaidPromise;
}

/**
 * Renderiza o diagrama de arquitetura como HTML com SVG inline via Mermaid.
 * @returns {Promise<string>} HTML contendo o diagrama renderizado ou fallback acessível.
 */
export async function renderArquitetura() {
  try {
    const mermaid = await carregarMermaid();
    const { svg } = await mermaid.render('diagrama-arquitetura-k8s', DIAGRAMA_ARQUITETURA);
    return `<div class="arquitetura-container" role="img" aria-label="Diagrama da arquitetura do simulador Kubernetes">
      <h2 class="arquitetura-titulo">🏛️ Arquitetura do Simulador</h2>
      <p class="arquitetura-descricao">Fluxo completo: edição YAML → validação → preview de mudanças → aplicação → estado do cluster.</p>
      <div class="arquitetura-diagrama">${svg}</div>
      <details class="arquitetura-detalhes">
        <summary>Componentes detalhados</summary>
        <dl>
          <dt><b>Validador</b></dt><dd>Verifica campos obrigatórios por kind e sugere correções via distância de Levenshtein.</dd>
          <dt><b>simularApply()</b></dt><dd>Projeta mudanças sem modificar o estado global — base para o botão Diff.</dd>
          <dt><b>aplicarYaml()</b></dt><dd>Aplica recursos no estado global e persiste via localStorage por exercício.</dd>
          <dt><b>Estado Global</b></dt><dd>Objeto em memória com arrays por tipo de recurso (pods, services, deployments, etc.).</dd>
          <dt><b>buscarRecurso()</b></dt><dd>Data source: lê recursos existentes para uso em exercícios cross-resource.</dd>
          <dt><b>Outputs</b></dt><dd>Atributos calculados deterministicamente: clusterIP, nodePort, endpoints.</dd>
          <dt><b>Drift Detection</b></dt><dd>Compara YAML do aluno com estado atual para detectar divergências.</dd>
        </dl>
      </details>
    </div>`;
  } catch {
    return `<div class="arquitetura-container arquitetura-fallback" role="region" aria-label="Arquitetura do simulador">
      <h2 class="arquitetura-titulo">🏛️ Arquitetura do Simulador</h2>
      <p class="arquitetura-descricao">Mermaid não pôde ser carregado. Abaixo está a descrição textual da arquitetura.</p>
      <ol class="arquitetura-fluxo">
        <li><b>Editor YAML</b> → aluno escreve manifesto</li>
        <li><b>Validador</b> → verifica campos obrigatórios, sugere correções</li>
        <li><b>simularApply()</b> → preview de mudanças (Diff) sem alterar estado</li>
        <li><b>aplicarYaml()</b> → aplica recursos no estado global</li>
        <li><b>Estado Global</b> → pods, services, deployments, configmaps, secrets, ingresses, HPAs, etc.</li>
        <li><b>Painel Estado</b> → JSON do cluster + diff entre applies</li>
        <li><b>Drift Detection</b> → compara YAML vs. estado atual</li>
        <li><b>Cenário Visual</b> → palco interativo que evolui com os exercícios</li>
        <li><b>Data Sources</b> → buscarRecurso(kind, nome) para exercícios cross-resource</li>
        <li><b>Outputs</b> → atributos calculados (clusterIP, nodePort, endpoints)</li>
      </ol>
    </div>`;
  }
}

/**
 * Re-renderiza o diagrama quando o tema muda (light/dark).
 * Chamada pelo gerenciador de tema ao alternar.
 */
export async function reRenderizarArquitetura() {
  if (!mermaidCarregado || !window.mermaid) return;
  window.mermaid.initialize({
    startOnLoad: false,
    theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default',
    securityLevel: 'strict',
    flowchart: { curve: 'basis', padding: 16 },
  });
}