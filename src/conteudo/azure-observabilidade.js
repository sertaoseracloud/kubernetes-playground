// Módulo Azure, tópico 5: observabilidade e segredos no AKS (Container Insights, Managed Prometheus
// e Key Vault pelo Secrets Store CSI Driver).
// Segue docs/didatica.md: lição com exemplo comentado, passos, esqueleto, dicas e "como corrigir".
import { licao, exercicio, teste, existe, campo, docs } from './util.js';

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000000';
const CLIENTE = '77777777-1111-2222-3333-444444444444';
const AZMON = 'azmonitoring.coreos.com/v1';

/** A SecretProviderClass do Key Vault da loja (Workload Identity); `objetos` é o texto de objects e `extra` entra no fim do spec. */
const spcKv = (objetos, extra = '') => `
  apiVersion: secrets-store.csi.x-k8s.io/v1
  kind: SecretProviderClass
  metadata:
    name: kv-loja
  spec:
    provider: azure
    parameters:
      usePodIdentity: "false"
      clientID: "${CLIENTE}"
      keyvaultName: kv-loja
      tenantId: "${TENANT}"
      objects: |
        array:
${objetos}
${extra}`;

const OBJETO_SENHA = `          - |
            objectName: senha-banco
            objectType: secret`;

const SA_LOJA = `
  apiVersion: v1
  kind: ServiceAccount
  metadata:
    name: loja
    annotations:
      azure.workload.identity/client-id: ${CLIENTE}
`;

/** O Deployment da loja com Workload Identity; `pod` entra no spec do Pod e `container` no container. */
const deployLoja = ({ pod = '', container = '' } = {}) => `
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: loja
  spec:
    replicas: 2
    selector:
      matchLabels:
        app: loja
    template:
      metadata:
        labels:
          app: loja
          azure.workload.identity/use: "true"
      spec:
        serviceAccountName: loja
${pod}        containers:
          - name: loja
            image: nginx:1.27
${container}`;

export const azureObservabilidade = {
  id: 'azure-observabilidade',
  titulo: 'Observabilidade e segredos no AKS',
  itens: [
    licao('aks-observabilidade-licao', 'Observabilidade no AKS: Container Insights e Prometheus', 'medio', `
      <p>No AKS, o painel e a caixa-preta do avião ficam no <b>Azure Monitor</b>. Dois add-ons fazem a coleta, e os dois se ajustam com
      ConfigMaps no <code>kube-system</code>:</p>
      <ul>
        <li><b>Container Insights</b>: manda os <b>logs</b> dos containers (stdout e stderr) para o Log Analytics. O ConfigMap
          <code>container-azm-ms-agentconfig</code> diz o que coletar. A chave <code>log-data-collection-settings</code> é um texto
          no formato TOML, com seções como <code>[log_collection_settings.stdout]</code> e linhas <code>chave = valor</code>.</li>
        <li><b>Managed Prometheus</b> (Azure Monitor managed service for Prometheus): coleta <b>métricas</b> e guarda num Azure
          Monitor workspace, para ver no Grafana gerenciado. O ConfigMap <code>ama-metrics-settings-configmap</code> liga coletas
          prontas e a coleta por annotations (<code>prometheus.io/scrape: "true"</code> no Pod).</li>
        <li>Para dizer exatamente o que coletar, há os recursos <b>PodMonitor</b> e <b>ServiceMonitor</b>, como no Prometheus
          Operator, mas no grupo <code>azmonitoring.coreos.com/v1</code> (para não brigar com um Prometheus seu).</li>
      </ul>
      <p><b>No cluster:</b> os Pods <code>ama-logs</code> e <code>ama-metrics</code> no <code>kube-system</code> leem esses ConfigMaps e
      recarregam a configuração em alguns minutos, sem reiniciar nada seu.</p>`,
    `
      # Coleta as métricas dos Pods app: api na porta "metrics"
      apiVersion: ${AZMON}
      kind: PodMonitor
      metadata:
        name: api
      spec:
        selector:
          matchLabels:
            app: api              # quais Pods
        podMetricsEndpoints:
          - port: metrics         # o nome da porta no container
            path: /metrics
            interval: 30s         # de quanto em quanto tempo
    `),

    exercicio({
      id: 'aks-ci-stdout',
      titulo: 'Container Insights sem os logs do kube-system',
      dificuldade: 'facil',
      resumo: `
        <p>A conta do Log Analytics subiu por causa dos logs do <code>kube-system</code>, que ninguém lê. Dá para tirar esse namespace da
        coleta.</p>
        <ol>
          <li>O ConfigMap <code>container-azm-ms-agentconfig</code> (no <code>kube-system</code>) já tem <code>schema-version</code> e <code>config-version</code>.</li>
          <li>No texto de <code>log-data-collection-settings</code>, na seção <code>[log_collection_settings.stdout]</code>, escreva
            <code>exclude_namespaces = ["kube-system"]</code>.</li>
        </ol>
        <p><b>No cluster:</b> em alguns minutos os Pods <code>ama-logs</code> recarregam a configuração e param de enviar o stdout do
        <code>kube-system</code>.</p>`,
      inicial: `
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: container-azm-ms-agentconfig
          namespace: kube-system
        data:
          schema-version: v1
          config-version: ver1
          # TODO: no texto abaixo, troque a lista vazia de exclude_namespaces (passo 2)
          log-data-collection-settings: |-
            [log_collection_settings]
              [log_collection_settings.stdout]
                enabled = true
                exclude_namespaces = []
      `,
      dica: [
        'O texto depois do |- está no formato TOML: listas entre colchetes, textos entre aspas duplas.',
        'Troque a lista vazia pela lista com o namespace.',
        'exclude_namespaces = ["kube-system"]',
      ],
      solucao: `
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: container-azm-ms-agentconfig
          namespace: kube-system
        data:
          schema-version: v1
          config-version: ver1
          log-data-collection-settings: |-
            [log_collection_settings]
              [log_collection_settings.stdout]
                enabled = true
                exclude_namespaces = ["kube-system"]
      `,
      testes: [
        teste({ descricao: 'O ConfigMap do Container Insights existe', dica: 'Mantenha o nome container-azm-ms-agentconfig.' },
          existe('ConfigMap', 'container-azm-ms-agentconfig')),
        teste({ descricao: 'O kube-system sai da coleta', dica: 'Na seção stdout, escreva exclude_namespaces = ["kube-system"].' },
          { tipo: 'configmap-contem', configmap: 'container-azm-ms-agentconfig', chave: 'log-data-collection-settings', contem: 'exclude_namespaces = ["kube-system"]' }),
      ],
    }),

    exercicio({
      id: 'aks-ci-env',
      titulo: 'Sem guardar as variáveis de ambiente',
      dificuldade: 'medio',
      resumo: `
        <p>Por padrão, o Container Insights coleta as variáveis de ambiente dos containers, e alguém pode ter posto uma senha numa delas.
        A segurança pediu para desligar.</p>
        <ol>
          <li>No texto de <code>log-data-collection-settings</code>, acrescente a seção <code>[log_collection_settings.env_var]</code>.</li>
          <li>Dentro dela, <code>enabled = false</code>.</li>
        </ol>
        <p><b>No cluster:</b> o inventário de containers no Log Analytics deixa de mostrar as variáveis de ambiente.</p>`,
      inicial: `
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: container-azm-ms-agentconfig
          namespace: kube-system
        data:
          schema-version: v1
          config-version: ver1
          # TODO: no fim do texto abaixo, a seção [log_collection_settings.env_var] com enabled = false
          log-data-collection-settings: |-
            [log_collection_settings]
              [log_collection_settings.stdout]
                enabled = true
                exclude_namespaces = ["kube-system"]
      `,
      dica: [
        'A seção nova fica no mesmo recuo de [log_collection_settings.stdout], dentro do texto.',
        '[log_collection_settings.env_var]\n  enabled = false',
      ],
      solucao: `
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: container-azm-ms-agentconfig
          namespace: kube-system
        data:
          schema-version: v1
          config-version: ver1
          log-data-collection-settings: |-
            [log_collection_settings]
              [log_collection_settings.stdout]
                enabled = true
                exclude_namespaces = ["kube-system"]
              [log_collection_settings.env_var]
                enabled = false
      `,
      testes: [
        teste({ descricao: 'A seção das variáveis de ambiente existe', dica: 'Acrescente a linha [log_collection_settings.env_var] no texto.' },
          { tipo: 'configmap-contem', configmap: 'container-azm-ms-agentconfig', chave: 'log-data-collection-settings', contem: '[log_collection_settings.env_var]' }),
        teste({ descricao: 'A coleta delas está desligada', dica: 'Embaixo da seção env_var, escreva enabled = false.' },
          { tipo: 'configmap-contem', configmap: 'container-azm-ms-agentconfig', chave: 'log-data-collection-settings', contem: 'enabled = false' }),
      ],
    }),

    exercicio({
      id: 'aks-prom-settings',
      titulo: 'Prometheus lendo as annotations do namespace loja',
      dificuldade: 'facil',
      resumo: `
        <p>O jeito mais simples de coletar métricas é pela annotation <code>prometheus.io/scrape</code> nos Pods. No Managed Prometheus,
        isso fica desligado até você dizer em quais namespaces procurar.</p>
        <ol>
          <li>Crie o ConfigMap <code>ama-metrics-settings-configmap</code> no <code>kube-system</code>, com <code>schema-version: v1</code> e
            <code>config-version: ver1</code>.</li>
          <li>A chave <code>pod-annotation-based-scraping</code> recebe o texto <code>podannotationnamespaceregex = "loja"</code>.</li>
        </ol>
        <p><b>No cluster:</b> os Pods <code>ama-metrics</code> passam a coletar os Pods com <code>prometheus.io/scrape: "true"</code> no
        namespace <code>loja</code>.</p>`,
      inicial: `
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: ama-metrics-settings-configmap
          namespace: kube-system
        data:
          schema-version: v1
          config-version: ver1
          # TODO: pod-annotation-based-scraping com podannotationnamespaceregex = "loja"
      `,
      dica: [
        'O valor é um texto de uma linha com aspas duplas dentro: use |- e escreva a linha embaixo, recuada.',
        'pod-annotation-based-scraping: |-\n  podannotationnamespaceregex = "loja"',
      ],
      solucao: `
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: ama-metrics-settings-configmap
          namespace: kube-system
        data:
          schema-version: v1
          config-version: ver1
          pod-annotation-based-scraping: |-
            podannotationnamespaceregex = "loja"
      `,
      testes: [
        teste({ descricao: 'O ConfigMap do Managed Prometheus existe', dica: 'Mantenha o nome ama-metrics-settings-configmap.' },
          existe('ConfigMap', 'ama-metrics-settings-configmap')),
        teste({ descricao: 'Procura annotations no namespace loja', dica: 'A chave pod-annotation-based-scraping recebe podannotationnamespaceregex = "loja".' },
          { tipo: 'configmap-contem', configmap: 'ama-metrics-settings-configmap', chave: 'pod-annotation-based-scraping', contem: 'podannotationnamespaceregex = "loja"' }),
      ],
    }),

    exercicio({
      id: 'aks-prom-annotations',
      titulo: 'Pods pedindo para ter as métricas coletadas',
      dificuldade: 'facil',
      resumo: `
        <p>O Managed Prometheus já procura annotations no namespace <code>loja</code>. Falta a API pedir a coleta.</p>
        <ol>
          <li>No Deployment <code>api</code>, em <code>template.metadata.annotations</code>: <code>prometheus.io/scrape: "true"</code>.</li>
          <li>Também: <code>prometheus.io/port: "8080"</code> e <code>prometheus.io/path: /metrics</code>.</li>
        </ol>
        <p><b>No cluster:</b> a cada 30 segundos o <code>ama-metrics</code> lê <code>http://&lt;IP do Pod&gt;:8080/metrics</code> e envia ao
        Azure Monitor workspace.</p>`,
      inicial: `
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: api
          namespace: loja
        spec:
          replicas: 2
          selector:
            matchLabels:
              app: api
          template:
            metadata:
              labels:
                app: api
              # TODO: annotations prometheus.io/scrape, port e path
            spec:
              containers:
                - name: api
                  image: ghcr.io/stefanprodan/podinfo:6.7.0
                  ports:
                    - containerPort: 8080
      `,
      dica: [
        'As annotations vão no template do Pod (template.metadata), porque quem é coletado é o Pod.',
        'Valores de annotation são texto: "true" e "8080" com aspas.',
        'annotations:\n  prometheus.io/scrape: "true"\n  prometheus.io/port: "8080"\n  prometheus.io/path: /metrics',
      ],
      solucao: `
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: api
          namespace: loja
        spec:
          replicas: 2
          selector:
            matchLabels:
              app: api
          template:
            metadata:
              labels:
                app: api
              annotations:
                prometheus.io/scrape: "true"
                prometheus.io/port: "8080"
                prometheus.io/path: /metrics
            spec:
              containers:
                - name: api
                  image: ghcr.io/stefanprodan/podinfo:6.7.0
                  ports:
                    - containerPort: 8080
      `,
      testes: [
        teste({ descricao: 'Os Pods pedem a coleta', dica: 'Em template.metadata.annotations: prometheus.io/scrape: "true".' },
          campo('Deployment', 'api', 'spec.template.metadata.annotations["prometheus.io/scrape"]', { valor: 'true' })),
        teste({ descricao: 'Na porta 8080, caminho /metrics', dica: 'Também: prometheus.io/port: "8080" e prometheus.io/path: /metrics.' },
          campo('Deployment', 'api', 'spec.template.metadata.annotations["prometheus.io/port"]', { valor: '8080' }),
          campo('Deployment', 'api', 'spec.template.metadata.annotations["prometheus.io/path"]', { valor: '/metrics' })),
      ],
    }),

    exercicio({
      id: 'aks-prom-podmonitor',
      titulo: 'PodMonitor do Managed Prometheus',
      dificuldade: 'medio',
      resumo: `
        <p>O time quer controlar a coleta por recurso, e não por annotation: um PodMonitor para os Pods do checkout.</p>
        <ol>
          <li>Crie o <code>PodMonitor</code> <code>checkout</code> com <code>apiVersion: ${AZMON}</code>.</li>
          <li>Em <code>selector.matchLabels</code>, <code>app: checkout</code>.</li>
          <li>Em <code>podMetricsEndpoints</code>, um item com <code>port: metrics</code> e <code>interval: 15s</code>.</li>
        </ol>
        <p><b>No cluster:</b> o <code>ama-metrics</code> descobre os Pods do checkout e coleta a porta <code>metrics</code> a cada 15 segundos.</p>`,
      inicial: `
        apiVersion: ${AZMON}
        kind: PodMonitor
        metadata:
          name: checkout
        spec:
          selector:
            matchLabels:
              app:             # TODO: checkout
          podMetricsEndpoints:
            # TODO: - port metrics e interval 15s
      `,
      dica: [
        'O exemplo da lição "Observabilidade no AKS" é um PodMonitor.',
        'podMetricsEndpoints é uma lista; port é o nome da porta no container, não o número.',
        'podMetricsEndpoints:\n  - port: metrics\n    interval: 15s',
      ],
      solucao: `
        apiVersion: ${AZMON}
        kind: PodMonitor
        metadata:
          name: checkout
        spec:
          selector:
            matchLabels:
              app: checkout
          podMetricsEndpoints:
            - port: metrics
              interval: 15s
      `,
      testes: [
        teste({ descricao: 'O PodMonitor escolhe os Pods do checkout', dica: 'Em selector.matchLabels: app: checkout.' },
          existe('PodMonitor', 'checkout'),
          campo('PodMonitor', 'checkout', 'spec.selector.matchLabels.app', { valor: 'checkout' })),
        teste({ descricao: 'Coleta a porta metrics a cada 15 segundos', dica: 'Em podMetricsEndpoints: - port: metrics e interval: 15s.' },
          campo('PodMonitor', 'checkout', 'spec.podMetricsEndpoints[0].port', { valor: 'metrics' }),
          campo('PodMonitor', 'checkout', 'spec.podMetricsEndpoints[0].interval', { valor: '15s' })),
      ],
    }),

    exercicio({
      id: 'aks-prom-servicemonitor',
      titulo: 'ServiceMonitor pelo Service da API',
      dificuldade: 'medio',
      resumo: `
        <p>A API tem um Service com a porta <code>http-metrics</code>. O ServiceMonitor coleta todos os Pods por trás dele.</p>
        <ol>
          <li>Crie o <code>ServiceMonitor</code> <code>api</code> (<code>apiVersion: ${AZMON}</code>) com <code>selector.matchLabels</code>
            <code>app: api</code> (as labels do <b>Service</b>).</li>
          <li>Em <code>endpoints</code>, um item com <code>port: http-metrics</code> e <code>path: /metrics</code>.</li>
        </ol>
        <p><b>No cluster:</b> o <code>ama-metrics</code> acha o Service pelas labels, lê os endpoints dele e coleta cada Pod na porta
        <code>http-metrics</code>.</p>`,
      inicial: `
        apiVersion: ${AZMON}
        kind: ServiceMonitor
        metadata:
          name: api
        spec:
          selector:
            matchLabels:
              app: api
          endpoints:
            # TODO: - port http-metrics e path /metrics
      `,
      dica: [
        'É como o PodMonitor, com endpoints no lugar de podMetricsEndpoints; o selector escolhe Services.',
        'endpoints:\n  - port: http-metrics\n    path: /metrics',
      ],
      solucao: `
        apiVersion: ${AZMON}
        kind: ServiceMonitor
        metadata:
          name: api
        spec:
          selector:
            matchLabels:
              app: api
          endpoints:
            - port: http-metrics
              path: /metrics
      `,
      testes: [
        teste({ descricao: 'O ServiceMonitor existe', dica: 'Mantenha kind: ServiceMonitor e apiVersion: azmonitoring.coreos.com/v1.' }, existe('ServiceMonitor', 'api')),
        teste({ descricao: 'Coleta a porta http-metrics em /metrics', dica: 'Em endpoints: - port: http-metrics e path: /metrics.' },
          campo('ServiceMonitor', 'api', 'spec.endpoints[0].port', { valor: 'http-metrics' }),
          campo('ServiceMonitor', 'api', 'spec.endpoints[0].path', { valor: '/metrics' })),
      ],
    }),

    licao('aks-keyvault-licao', 'Key Vault: os segredos da Azure no Pod', 'dificil', `
      <p>O <b>Azure Key Vault</b> é o cofre da Azure para senhas, chaves e certificados. Com o add-on do <b>Secrets Store CSI Driver</b>, o
      Pod recebe os segredos do cofre como <b>arquivos</b>, lidos com a identidade dele (Workload Identity), sem senha no cluster.</p>
      <ul>
        <li>A <b>SecretProviderClass</b> com <code>provider: azure</code> diz o cofre e quem lê: <code>keyvaultName</code>,
          <code>tenantId</code>, <code>clientID</code> (o client ID da identidade do Workload Identity) e
          <code>usePodIdentity: "false"</code>.</li>
        <li><code>objects</code> é um texto com uma lista <code>array:</code>; cada item é outro texto (<code>- |</code>) com
          <code>objectName</code> e <code>objectType</code> (<code>secret</code>, <code>key</code> ou <code>cert</code>).</li>
        <li>O Pod monta um volume <code>csi</code> com <code>driver: secrets-store.csi.k8s.io</code> e a classe em
          <code>volumeAttributes.secretProviderClass</code>.</li>
        <li><code>secretObjects</code> copia o segredo para um Secret do Kubernetes, para usar em variáveis de ambiente.</li>
      </ul>
      <p><b>No cluster:</b> ao subir o Pod, o driver busca <code>senha-banco</code> no Key Vault e grava o arquivo em
      <code>/mnt/segredos/senha-banco</code>. Com a rotação ligada no add-on, ele confere o cofre de tempos em tempos.</p>`,
    `
      apiVersion: secrets-store.csi.x-k8s.io/v1
      kind: SecretProviderClass
      metadata:
        name: kv-loja
      spec:
        provider: azure
        parameters:
          usePodIdentity: "false"
          clientID: "${CLIENTE}"   # a identidade do Workload Identity
          keyvaultName: kv-loja                               # o cofre
          tenantId: "${TENANT}"
          objects: |                # um texto com a lista do que buscar
            array:
              - |
                objectName: senha-banco
                objectType: secret
    `),

    exercicio({
      id: 'aks-kv-spc',
      titulo: 'SecretProviderClass do Key Vault',
      dificuldade: 'medio',
      resumo: `
        <p>A senha do banco está no Key Vault <code>kv-loja</code>, com o nome <code>senha-banco</code>. A identidade da loja tem o client ID
        <code>${CLIENTE}</code>.</p>
        <ol>
          <li>Na <code>SecretProviderClass</code> <code>kv-loja</code>, <code>provider: azure</code>.</li>
          <li>Em <code>parameters</code>: <code>keyvaultName: kv-loja</code> e <code>clientID: "${CLIENTE}"</code>.</li>
          <li>Em <code>objects</code>, o item com <code>objectName: senha-banco</code> e <code>objectType: secret</code>.</li>
        </ol>
        <p><b>No cluster:</b> nada é buscado ainda: o driver só lê o cofre quando um Pod monta um volume com esta classe.</p>`,
      inicial: `
        apiVersion: secrets-store.csi.x-k8s.io/v1
        kind: SecretProviderClass
        metadata:
          name: kv-loja
        spec:
          provider:            # TODO: azure
          parameters:
            usePodIdentity: "false"
            clientID:          # TODO: o client ID, entre aspas
            keyvaultName:      # TODO: kv-loja
            tenantId: "${TENANT}"
            objects: |
              array:
                - |
                  objectName: # TODO: senha-banco
                  objectType: secret
      `,
      dica: [
        'O exemplo da lição "Key Vault" tem a classe completa.',
        'Dentro do texto de objects, o comentário "# TODO" vira texto: troque a linha inteira por "objectName: senha-banco".',
        `provider: azure\n...\nclientID: "${CLIENTE}"\nkeyvaultName: kv-loja\n...\nobjectName: senha-banco`,
      ],
      solucao: spcKv(OBJETO_SENHA),
      testes: [
        teste({ descricao: 'A classe usa o provedor da Azure', dica: 'provider é obrigatório: escreva provider: azure.' },
          existe('SecretProviderClass', 'kv-loja'),
          campo('SecretProviderClass', 'kv-loja', 'spec.provider', { valor: 'azure' })),
        teste({ descricao: 'Lê o cofre kv-loja com a identidade da loja', dica: `Em parameters: keyvaultName: kv-loja e clientID: "${CLIENTE}".` },
          campo('SecretProviderClass', 'kv-loja', 'spec.parameters.keyvaultName', { valor: 'kv-loja' }),
          campo('SecretProviderClass', 'kv-loja', 'spec.parameters.clientID', { valor: CLIENTE })),
        teste({ descricao: 'Busca o segredo senha-banco', dica: 'No texto de objects: objectName: senha-banco.' },
          campo('SecretProviderClass', 'kv-loja', 'spec.parameters.objects', { contem: 'objectName: senha-banco' })),
      ],
    }),

    exercicio({
      id: 'aks-kv-varios',
      titulo: 'Dois segredos e um certificado do mesmo cofre',
      dificuldade: 'medio',
      resumo: `
        <p>Além da senha do banco, a loja precisa da chave da API de frete e do certificado do site, todos no <code>kv-loja</code>.</p>
        <ol>
          <li>Mantenha o item de <code>senha-banco</code>.</li>
          <li>Acrescente o item <code>objectName: chave-frete</code> com <code>objectType: secret</code>.</li>
          <li>Acrescente o item <code>objectName: certificado-site</code> com <code>objectType: cert</code>.</li>
        </ol>
        <p><b>No cluster:</b> o volume do Pod passa a ter três arquivos: <code>senha-banco</code>, <code>chave-frete</code> e
        <code>certificado-site</code>.</p>`,
      inicial: spcKv(`${OBJETO_SENHA}
          # TODO: os itens de chave-frete (secret) e certificado-site (cert)`).replace('          # TODO', '        # TODO'),
      dica: [
        'Cada item de array começa com "- |" e tem objectName e objectType embaixo, recuados.',
        'O tipo de um certificado é cert.',
        '- |\n  objectName: chave-frete\n  objectType: secret\n- |\n  objectName: certificado-site\n  objectType: cert',
      ],
      solucao: spcKv(`${OBJETO_SENHA}
          - |
            objectName: chave-frete
            objectType: secret
          - |
            objectName: certificado-site
            objectType: cert`),
      testes: [
        teste({ descricao: 'Busca a chave do frete', dica: 'Acrescente o item com objectName: chave-frete e objectType: secret.' },
          campo('SecretProviderClass', 'kv-loja', 'spec.parameters.objects', { contem: 'objectName: chave-frete' })),
        teste({ descricao: 'Busca o certificado do site', dica: 'Acrescente o item com objectName: certificado-site e objectType: cert.' },
          campo('SecretProviderClass', 'kv-loja', 'spec.parameters.objects', { contem: 'objectName: certificado-site' }),
          campo('SecretProviderClass', 'kv-loja', 'spec.parameters.objects', { contem: 'objectType: cert' })),
      ],
    }),

    exercicio({
      id: 'aks-kv-pod',
      titulo: 'Montando os segredos do Key Vault no Pod',
      dificuldade: 'dificil',
      existentes: docs(spcKv(OBJETO_SENHA), SA_LOJA),
      resumo: `
        <p>A SecretProviderClass <code>kv-loja</code> e a ServiceAccount <code>loja</code> (com o client ID) já existem. O Deployment já usa
        o Workload Identity; falta montar o cofre.</p>
        <ol>
          <li>Declare o volume <code>segredos</code> do tipo <code>csi</code>: <code>driver: secrets-store.csi.k8s.io</code> e
            <code>readOnly: true</code>.</li>
          <li>Em <code>volumeAttributes</code>, <code>secretProviderClass: kv-loja</code>.</li>
          <li>Monte <code>segredos</code> em <code>/mnt/segredos</code> no container <code>loja</code>, com <code>readOnly: true</code>.</li>
        </ol>
        <p><b>No cluster:</b> o driver troca o token do Pod por um token do Entra ID, lê o Key Vault e grava <code>/mnt/segredos/senha-banco</code>.
        Sem permissão no cofre, o Pod fica em <code>ContainerCreating</code> com o erro no describe.</p>`,
      inicial: deployLoja({
        pod: `        volumes:
          - name: segredos
            # TODO: csi com driver, readOnly e volumeAttributes (passos 1 e 2)
`,
        container: `            volumeMounts:
              - name: segredos
                mountPath:     # TODO: /mnt/segredos
                readOnly: true
`,
      }),
      dica: [
        'É o mesmo volume csi do módulo da AWS: só muda a classe.',
        'volumes fica no spec do Pod, alinhado com containers.',
        'csi:\n  driver: secrets-store.csi.k8s.io\n  readOnly: true\n  volumeAttributes:\n    secretProviderClass: kv-loja',
      ],
      solucao: deployLoja({
        pod: `        volumes:
          - name: segredos
            csi:
              driver: secrets-store.csi.k8s.io
              readOnly: true
              volumeAttributes:
                secretProviderClass: kv-loja
`,
        container: `            volumeMounts:
              - name: segredos
                mountPath: /mnt/segredos
                readOnly: true
`,
      }),
      testes: [
        teste({ descricao: 'O volume vem do Secrets Store CSI com a classe kv-loja', dica: 'No volume segredos: csi com driver: secrets-store.csi.k8s.io e secretProviderClass: kv-loja.' },
          campo('Deployment', 'loja', 'spec.template.spec.volumes[name=segredos].csi.driver', { valor: 'secrets-store.csi.k8s.io' }),
          campo('Deployment', 'loja', 'spec.template.spec.volumes[name=segredos].csi.volumeAttributes.secretProviderClass', { valor: 'kv-loja' })),
        teste({ descricao: 'Os segredos aparecem em /mnt/segredos', dica: 'No volumeMounts de segredos: mountPath: /mnt/segredos.' },
          { tipo: 'volume-montado', pod: 'loja', container: 'loja', volume: 'segredos', caminho: '/mnt/segredos' }),
      ],
    }),

    exercicio({
      id: 'aks-kv-sync',
      titulo: 'Do Key Vault para uma variável de ambiente',
      dificuldade: 'dificil',
      existentes: SA_LOJA,
      resumo: `
        <p>A aplicação lê a senha da variável <code>DB_SENHA</code>. O driver pode copiar o segredo do cofre para um Secret do Kubernetes.</p>
        <ol>
          <li>Na SecretProviderClass <code>kv-loja</code>, crie <code>secretObjects</code> (no spec): <code>secretName: banco</code>,
            <code>type: Opaque</code> e, em <code>data</code>, <code>objectName: senha-banco</code> com <code>key: senha</code>.</li>
          <li>No Deployment <code>loja</code>, a variável <code>DB_SENHA</code> vem de <code>secretKeyRef</code> com <code>name: banco</code> e
            <code>key: senha</code>.</li>
          <li>O volume csi continua no Deployment: a cópia só acontece enquanto algum Pod monta o volume.</li>
        </ol>
        <p><b>No cluster:</b> quando o primeiro Pod monta o volume, o driver cria o Secret <code>banco</code> e o kubelet preenche
        <code>DB_SENHA</code>.</p>`,
      inicial: docs(spcKv(OBJETO_SENHA, '    # TODO: secretObjects com secretName banco, type Opaque e data (passo 1)\n'), deployLoja({
        pod: `        volumes:
          - name: segredos
            csi:
              driver: secrets-store.csi.k8s.io
              readOnly: true
              volumeAttributes:
                secretProviderClass: kv-loja
`,
        container: `            env:
              - name: DB_SENHA
                # TODO: valueFrom.secretKeyRef com banco e senha (passo 2)
            volumeMounts:
              - name: segredos
                mountPath: /mnt/segredos
                readOnly: true
`,
      })),
      dica: [
        'secretObjects fica no spec da SecretProviderClass, alinhado com provider e parameters.',
        'O objectName do secretObjects é o nome do segredo no cofre; key é o nome da chave no Secret do Kubernetes.',
        'secretObjects:\n  - secretName: banco\n    type: Opaque\n    data:\n      - objectName: senha-banco\n        key: senha\n...\nvalueFrom:\n  secretKeyRef:\n    name: banco\n    key: senha',
      ],
      solucao: docs(spcKv(OBJETO_SENHA, `    secretObjects:
      - secretName: banco
        type: Opaque
        data:
          - objectName: senha-banco
            key: senha
`), deployLoja({
        pod: `        volumes:
          - name: segredos
            csi:
              driver: secrets-store.csi.k8s.io
              readOnly: true
              volumeAttributes:
                secretProviderClass: kv-loja
`,
        container: `            env:
              - name: DB_SENHA
                valueFrom:
                  secretKeyRef:
                    name: banco
                    key: senha
            volumeMounts:
              - name: segredos
                mountPath: /mnt/segredos
                readOnly: true
`,
      })),
      testes: [
        teste({ descricao: 'O driver copia para o Secret banco', dica: 'Em spec.secretObjects: secretName: banco e type: Opaque.' },
          campo('SecretProviderClass', 'kv-loja', 'spec.secretObjects[0].secretName', { valor: 'banco' }),
          campo('SecretProviderClass', 'kv-loja', 'spec.secretObjects[0].data[0].objectName', { valor: 'senha-banco' })),
        teste({ descricao: 'DB_SENHA vem do Secret', dica: 'Em env DB_SENHA: valueFrom.secretKeyRef com name: banco e key: senha.' },
          campo('Deployment', 'loja', 'spec.template.spec.containers[0].env[name=DB_SENHA].valueFrom.secretKeyRef.name', { valor: 'banco' }),
          campo('Deployment', 'loja', 'spec.template.spec.containers[0].env[name=DB_SENHA].valueFrom.secretKeyRef.key', { valor: 'senha' })),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'aks-ci-stdout': { dica: 'A coleta do stdout continua ligada, no ConfigMap do kube-system.', regras: [campo('ConfigMap', 'container-azm-ms-agentconfig', 'metadata.namespace', { valor: 'kube-system' }), { tipo: 'configmap-contem', configmap: 'container-azm-ms-agentconfig', chave: 'log-data-collection-settings', contem: 'enabled = true' }] },
    'aks-ci-env': { dica: 'A seção do stdout continua lá, sem o kube-system.', regras: [{ tipo: 'configmap-contem', configmap: 'container-azm-ms-agentconfig', chave: 'log-data-collection-settings', contem: 'exclude_namespaces = ["kube-system"]' }] },
    'aks-prom-settings': { dica: 'Confira as versões do passo 1 e o namespace do ConfigMap.', regras: [{ tipo: 'configmap-contem', configmap: 'ama-metrics-settings-configmap', chave: 'schema-version', valor: 'v1' }, campo('ConfigMap', 'ama-metrics-settings-configmap', 'metadata.namespace', { valor: 'kube-system' })] },
    'aks-prom-annotations': { dica: 'As annotations ficam no Pod, não no metadata do Deployment.', regras: [campo('Deployment', 'api', 'metadata.annotations', { ausente: true })] },
    'aks-prom-podmonitor': { dica: 'O PodMonitor é do Managed Prometheus (o grupo azmonitoring).', regras: [campo('PodMonitor', 'checkout', 'apiVersion', { valor: AZMON })] },
    'aks-prom-servicemonitor': { dica: 'O ServiceMonitor é do Managed Prometheus (o grupo azmonitoring).', regras: [campo('ServiceMonitor', 'api', 'apiVersion', { valor: AZMON })] },
    'aks-kv-spc': { dica: 'Confira o tipo do objeto e o tenant.', regras: [campo('SecretProviderClass', 'kv-loja', 'spec.parameters.objects', { contem: 'objectType: secret' }), campo('SecretProviderClass', 'kv-loja', 'spec.parameters.tenantId', { valor: TENANT })] },
    'aks-kv-varios': { dica: 'A senha do banco continua na lista.', regras: [campo('SecretProviderClass', 'kv-loja', 'spec.parameters.objects', { contem: 'objectName: senha-banco' })] },
    'aks-kv-pod': { dica: 'O volume csi é só de leitura, e o Deployment continua usando o Workload Identity.', regras: [campo('Deployment', 'loja', 'spec.template.spec.volumes[name=segredos].csi.readOnly', { valor: true }), campo('Deployment', 'loja', 'spec.template.spec.serviceAccountName', { valor: 'loja' })] },
    'aks-kv-sync': { dica: 'Confira o tipo do Secret e a chave dele.', regras: [campo('SecretProviderClass', 'kv-loja', 'spec.secretObjects[0].type', { valor: 'Opaque' }), campo('SecretProviderClass', 'kv-loja', 'spec.secretObjects[0].data[0].key', { valor: 'senha' })] },
  },
};
