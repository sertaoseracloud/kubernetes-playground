// Módulo avançado: GitOps com ArgoCD e Flux.
// Lições sobre princípios GitOps, ArgoCD e Flux CD.
// Exercícios usam ConfigMaps/Deployments como proxies didáticos para CRDs não suportados pelo simulador.

export const gitops = {
  id: 'gitops',
  titulo: 'GitOps com ArgoCD e Flux',
  descricao: 'Princípios de GitOps, ArgoCD e Flux CD para entregas declarativas e automatizadas.',
  icone: '🔄',
  itens: [
    {
      id: 'gitops-principios',
      tipo: 'licao',
      titulo: 'Princípios do GitOps',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p><b>GitOps</b> é uma forma de operar infraestrutura onde o <b>repositório Git é a única fonte da verdade</b>.
        Tudo o que deve existir no cluster está descrito em YAML dentro do Git; se não está no Git, não deveria estar no cluster.</p>
        <p>Os quatro pilares do GitOps são:</p>
        <ul>
          <li><b>Declarativo</b>: você descreve o estado desejado, não os passos para chegar lá.</li>
          <li><b>Versionado</b>: todo estado vive no Git, com histórico completo e possibilidade de rollback.</li>
          <li><b>Pull vs Push</b>: agentes dentro do cluster puxam as mudanças (pull), em vez de um CI externo empurrar (push). Isso reduz superfície de ataque.</li>
          <li><b>Reconciliação contínua</b>: um operador observa o estado real e corrige qualquer <i>drift</i> (desvio) em relação ao Git.</li>
        </ul>
        <p>Ferramentas populares: <b>ArgoCD</b> (modelo pull com UI rica) e <b>Flux CD</b> (nativo do CNCF, multi-tenancy).</p>`,
    },
    {
      id: 'gitops-argocd',
      tipo: 'licao',
      titulo: 'ArgoCD: arquitetura e conceitos',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O ArgoCD é instalado como um conjunto de Pods no cluster e monitora repositórios Git definidos em recursos chamados <b>Application</b>.</p>
        <dl>
          <dt><b>Application CRD</b></dt><dd>Define origem (repo + path) e destino (cluster + namespace). É o coração do ArgoCD.</dd>
          <dt><b>SyncPolicy</b></dt><dd>Controla se a sincronização é manual ou automática (<code>automated</code>), com opções de prune e self-heal.</dd>
          <dt><b>Health Status</b></dt><dd>Indica se os recursos estão saudáveis (Healthy, Degraded, Missing, Progressing).</dd>
          <dt><b>Sync Status</b></dt><dd>Indica se o cluster está alinhado com o Git (Synced, OutOfSync).</dd>
          <dt><b>App of Apps</b></dt><dd>Padrão onde uma Application gerencia outras Applications, permitindo organizar ambientes inteiros.</dd>
        </dl>
        <p>O ArgoCD detecta <i>drift</i> comparando o manifesto no Git com o estado real no cluster e pode corrigir automaticamente quando <code>selfHeal: true</code>.</p>`,
    },
    {
      id: 'gitops-flux',
      tipo: 'licao',
      titulo: 'Flux CD e Helm Controller',
      dificuldade: 'dificil',
      xp: 5,
      resumo: `<p>O <b>Flux CD</b> segue a mesma filosofia GitOps mas com arquitetura modular baseada em controllers independentes:</p>
        <ul>
          <li><b>Source Controller</b>: observa repositórios Git, Helm charts e buckets OCI via recursos <code>GitRepository</code>, <code>HelmRepository</code> e <code>Bucket</code>.</li>
          <li><b>Kustomize Controller</b>: aplica manifests usando Kustomize a partir de um <code>Kustomization</code> CRD.</li>
          <li><b>Helm Controller</b>: instala/atualiza charts via <code>HelmRelease</code>, com suporte a valores inline e de ConfigMaps/Secrets.</li>
          <li><b>Image Automation</b>: detecta novas imagens em registries e atualiza os manifests no Git automaticamente (<code>ImageRepository</code> + <code>ImagePolicy</code> + <code>ImageUpdateAutomation</code>).</li>
        </ul>
        <p>O Flux suporta <b>multi-tenancy</b> nativo: cada tenant pode ter seus próprios namespaces e service accounts com permissões isoladas, sem compartilhar credenciais de cluster.</p>`,
    },
    {
      id: 'gitops-app-configmap',
      tipo: 'exercicio',
      titulo: 'Configuração de Application ArgoCD',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Como o simulador não suporta CRDs customizados (como <code>Application</code> do ArgoCD), vamos usar um <b>ConfigMap</b> como proxy didático para representar a configuração de uma Application.</p>
        <p>Crie um ConfigMap chamado <code>argocd-app-config</code> com as seguintes chaves:</p>
        <ul>
          <li><code>sourceRepo</code>: <code>https://github.com/exemplo/k8s-manifests.git</code></li>
          <li><code>sourcePath</code>: <code>apps/minha-app</code></li>
          <li><code>destinationNamespace</code>: <code>producao</code></li>
        </ul>`,
      solucao: `apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-app-config
data:
  sourceRepo: https://github.com/exemplo/k8s-manifests.git
  sourcePath: apps/minha-app
  destinationNamespace: producao`,
      testes: [
        {
          descricao: 'O ConfigMap argocd-app-config existe',
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'argocd-app-config' }],
        },
        {
          descricao: 'Contém a chave sourceRepo com o repositório correto',
          regras: [{ tipo: 'configmap-contem', nome: 'argocd-app-config', chave: 'sourceRepo', valor: 'https://github.com/exemplo/k8s-manifests.git' }],
        },
        {
          descricao: 'Contém a chave destinationNamespace apontando para producao',
          regras: [{ tipo: 'configmap-contem', nome: 'argocd-app-config', chave: 'destinationNamespace', valor: 'producao' }],
        },
      ],
    },
    {
      id: 'gitops-sync-policy',
      tipo: 'exercicio',
      titulo: 'Sync Policy automatizada',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Neste exercício, crie um <b>Deployment</b> representando a aplicação gerenciada por GitOps e um <b>ConfigMap</b> representando a política de sincronização automática.</p>
        <p>1. Crie um Deployment chamado <code>app-gitops</code> com imagem <code>nginx:1.25</code> e 2 réplicas.</p>
        <p>2. Crie um ConfigMap chamado <code>sync-policy</code> com as chaves:</p>
        <ul>
          <li><code>syncPolicy</code>: <code>automated</code></li>
          <li><code>prune</code>: <code>true</code></li>
          <li><code>selfHeal</code>: <code>true</code></li>
        </ul>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-gitops
spec:
  replicas: 2
  selector:
    matchLabels:
      app: app-gitops
  template:
    metadata:
      labels:
        app: app-gitops
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: sync-policy
data:
  syncPolicy: automated
  prune: "true"
  selfHeal: "true"`,
      testes: [
        {
          descricao: 'O Deployment app-gitops existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'app-gitops' }],
        },
        {
          descricao: 'O ConfigMap sync-policy contém syncPolicy=automated',
          regras: [{ tipo: 'configmap-contem', nome: 'sync-policy', chave: 'syncPolicy', valor: 'automated' }],
        },
        {
          descricao: 'O ConfigMap sync-policy contém selfHeal=true',
          regras: [{ tipo: 'configmap-contem', nome: 'sync-policy', chave: 'selfHeal', valor: 'true' }],
        },
      ],
    },
    {
      id: 'gitops-flux-kustomization',
      tipo: 'exercicio',
      titulo: 'Flux Kustomization proxy',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>O Flux CD usa o recurso <b>Kustomization</b> para aplicar manifests renderizados via Kustomize. Como o simulador não suporta CRDs, use um <b>ConfigMap</b> como proxy didático.</p>
        <p>Crie um ConfigMap chamado <code>flux-kustomization-config</code> com as chaves:</p>
        <ul>
          <li><code>sourceRef</code>: <code>flux-system</code></li>
          <li><code>path</code>: <code>./clusters/producao</code></li>
          <li><code>prune</code>: <code>true</code></li>
        </ul>`,
      solucao: `apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-kustomization-config
data:
  sourceRef: flux-system
  path: ./clusters/producao
  prune: "true"`,
      testes: [
        {
          descricao: 'O ConfigMap flux-kustomization-config existe',
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'flux-kustomization-config' }],
        },
        {
          descricao: 'Contém a chave path apontando para ./clusters/producao',
          regras: [{ tipo: 'configmap-contem', nome: 'flux-kustomization-config', chave: 'path', valor: './clusters/producao' }],
        },
        {
          descricao: 'Contém a chave prune com valor true',
          regras: [{ tipo: 'configmap-contem', nome: 'flux-kustomization-config', chave: 'prune', valor: 'true' }],
        },
      ],
    },
    {
      id: 'gitops-helmrelease',
      tipo: 'exercicio',
      titulo: 'HelmRelease proxy',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>No Flux, o <b>HelmRelease</b> gerencia a instalação e atualização de Helm charts. Use um <b>Deployment</b> como proxy para representar a aplicação instalada via HelmRelease.</p>
        <p>Crie um Deployment chamado <code>helm-app-release</code> com:</p>
        <ul>
          <li>Imagem: <code>nginx:1.25</code></li>
          <li>Réplicas: <code>3</code></li>
          <li>Porta: <code>80</code></li>
        </ul>
        <p>E um ConfigMap chamado <code>helmrelease-config</code> com:</p>
        <ul>
          <li><code>chartName</code>: <code>nginx-chart</code></li>
          <li><code>version</code>: <code>1.2.0</code></li>
        </ul>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-app-release
spec:
  replicas: 3
  selector:
    matchLabels:
      app: helm-app-release
  template:
    metadata:
      labels:
        app: helm-app-release
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: helmrelease-config
data:
  chartName: nginx-chart
  version: "1.2.0"`,
      testes: [
        {
          descricao: 'O Deployment helm-app-release existe com 3 réplicas',
          regras: [{ tipo: 'deployment-replicas', nome: 'helm-app-release', replicas: 3 }],
        },
        {
          descricao: 'O ConfigMap helmrelease-config contém chartName=nginx-chart',
          regras: [{ tipo: 'configmap-contem', nome: 'helmrelease-config', chave: 'chartName', valor: 'nginx-chart' }],
        },
        {
          descricao: 'O container expõe a porta 80',
          regras: [{ tipo: 'container-porta', pod: 'helm-app-release', container: 'nginx', porta: 80 }],
        },
      ],
    },
    {
      id: 'gitops-app-of-apps',
      tipo: 'exercicio',
      titulo: 'App of Apps pattern',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>O padrão <b>App of Apps</b> no ArgoCD usa uma Application raiz que gerencia outras Applications. Use ConfigMaps como proxies para representar cada Application filha.</p>
        <p>Crie dois ConfigMaps:</p>
        <ul>
          <li><code>app-frontend</code> com chave <code>targetRevision</code> = <code>main</code></li>
          <li><code>app-backend</code> com chave <code>targetRevision</code> = <code>v2.1.0</code></li>
        </ul>`,
      solucao: `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-frontend
data:
  targetRevision: main
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-backend
data:
  targetRevision: v2.1.0`,
      testes: [
        {
          descricao: 'O ConfigMap app-frontend existe',
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'app-frontend' }],
        },
        {
          descricao: 'O ConfigMap app-backend contém targetRevision=v2.1.0',
          regras: [{ tipo: 'configmap-contem', nome: 'app-backend', chave: 'targetRevision', valor: 'v2.1.0' }],
        },
        {
          descricao: 'O ConfigMap app-frontend contém targetRevision=main',
          regras: [{ tipo: 'configmap-contem', nome: 'app-frontend', chave: 'targetRevision', valor: 'main' }],
        },
      ],
    },
    {
      id: 'gitops-multi-env',
      tipo: 'exercicio',
      titulo: 'GitOps com múltiplos ambientes',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Em GitOps, cada ambiente (dev, staging, prod) tem seus próprios manifests ou overlays. Use ConfigMaps para representar as configurações de cada ambiente.</p>
        <p>Crie três ConfigMaps:</p>
        <ul>
          <li><code>env-dev</code> com <code>replicas</code> = <code>1</code></li>
          <li><code>env-staging</code> com <code>replicas</code> = <code>2</code></li>
          <li><code>env-prod</code> com <code>replicas</code> = <code>4</code></li>
        </ul>`,
      solucao: `apiVersion: v1
kind: ConfigMap
metadata:
  name: env-dev
data:
  replicas: "1"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: env-staging
data:
  replicas: "2"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: env-prod
data:
  replicas: "4"`,
      testes: [
        {
          descricao: 'O ConfigMap env-prod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'env-prod' }],
        },
        {
          descricao: 'O ConfigMap env-dev contém replicas=1',
          regras: [{ tipo: 'configmap-contem', nome: 'env-dev', chave: 'replicas', valor: '1' }],
        },
        {
          descricao: 'O ConfigMap env-staging contém replicas=2',
          regras: [{ tipo: 'configmap-contem', nome: 'env-staging', chave: 'replicas', valor: '2' }],
        },
      ],
    },
    {
      id: 'gitops-drift-detection',
      tipo: 'exercicio',
      titulo: 'Drift detection proxy',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>O GitOps detecta <i>drift</i> quando o estado real do cluster diverge do manifesto no Git. Use um <b>Deployment</b> para representar o estado desejado reconciliado.</p>
        <p>Crie um Deployment chamado <code>drift-guard-app</code> com imagem <code>nginx:1.25</code> e 2 réplicas.</p>
        <p>Crie também um ConfigMap chamado <code>drift-config</code> com a chave <code>selfHeal</code> = <code>true</code>.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: drift-guard-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: drift-guard-app
  template:
    metadata:
      labels:
        app: drift-guard-app
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: drift-config
data:
  selfHeal: "true"`,
      testes: [
        {
          descricao: 'O Deployment drift-guard-app existe com 2 réplicas',
          regras: [{ tipo: 'deployment-replicas', nome: 'drift-guard-app', replicas: 2 }],
        },
        {
          descricao: 'O ConfigMap drift-config contém selfHeal=true',
          regras: [{ tipo: 'configmap-contem', nome: 'drift-config', chave: 'selfHeal', valor: 'true' }],
        },
      ],
    },
    {
      id: 'gitops-rollback-git',
      tipo: 'exercicio',
      titulo: 'Rollback via Git proxy',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>No GitOps, rollback é feito revertendo commits no Git — o operador reconcilia automaticamente. Use um <b>Deployment</b> para representar a versão restaurada.</p>
        <p>Crie um Deployment chamado <code>rollback-app</code> com imagem <code>nginx:1.24</code> (versão anterior) e 2 réplicas.</p>
        <p>Crie um ConfigMap chamado <code>rollback-metadata</code> com a chave <code>previousCommit</code> = <code>abc1234</code>.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: rollback-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: rollback-app
  template:
    metadata:
      labels:
        app: rollback-app
    spec:
      containers:
        - name: nginx
          image: nginx:1.24
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: rollback-metadata
data:
  previousCommit: abc1234`,
      testes: [
        {
          descricao: 'O Deployment rollback-app usa a imagem nginx:1.24',
          regras: [{ tipo: 'container-imagem', pod: 'rollback-app', container: 'nginx', imagem: 'nginx:1.24' }],
        },
        {
          descricao: 'O ConfigMap rollback-metadata contém previousCommit=abc1234',
          regras: [{ tipo: 'configmap-contem', nome: 'rollback-metadata', chave: 'previousCommit', valor: 'abc1234' }],
        },
      ],
    },
    {
      id: 'gitops-pr-workflow',
      tipo: 'exercicio',
      titulo: 'PR-based workflow proxy',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>No fluxo PR-based, mudanças passam por revisão antes de merge na branch principal. Use um <b>ConfigMap</b> para representar a configuração aprovada via PR.</p>
        <p>Crie um ConfigMap chamado <code>pr-approved-config</code> com as chaves:</p>
        <ul>
          <li><code>approvedBy</code>: <code>tech-lead</code></li>
          <li><code>prNumber</code>: <code>142</code></li>
          <li><code>branch</code>: <code>main</code></li>
        </ul>`,
      solucao: `apiVersion: v1
kind: ConfigMap
metadata:
  name: pr-approved-config
data:
  approvedBy: tech-lead
  prNumber: "142"
  branch: main`,
      testes: [
        {
          descricao: 'O ConfigMap pr-approved-config existe',
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'pr-approved-config' }],
        },
        {
          descricao: 'Contém a chave approvedBy com valor tech-lead',
          regras: [{ tipo: 'configmap-contem', nome: 'pr-approved-config', chave: 'approvedBy', valor: 'tech-lead' }],
        },
        {
          descricao: 'Contém a chave branch com valor main',
          regras: [{ tipo: 'configmap-contem', nome: 'pr-approved-config', chave: 'branch', valor: 'main' }],
        },
      ],
    },
    {
      id: 'gitops-argocd-sync-options',
      tipo: 'exercicio',
      titulo: 'ArgoCD sync options proxy',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>As opções de sincronização do ArgoCD controlam comportamentos como prune, createNamespace e applyOutOfSyncOnly. Use um <b>ConfigMap</b> para representar essas opções.</p>
        <p>Crie um ConfigMap chamado <code>argocd-sync-options</code> com as chaves:</p>
        <ul>
          <li><code>createNamespace</code>: <code>true</code></li>
          <li><code>prunePropagationPolicy</code>: <code>foreground</code></li>
          <li><code>applyOutOfSyncOnly</code>: <code>false</code></li>
        </ul>`,
      solucao: `apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-sync-options
data:
  createNamespace: "true"
  prunePropagationPolicy: foreground
  applyOutOfSyncOnly: "false"`,
      testes: [
        {
          descricao: 'O ConfigMap argocd-sync-options existe',
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'argocd-sync-options' }],
        },
        {
          descricao: 'Contém createNamespace=true',
          regras: [{ tipo: 'configmap-contem', nome: 'argocd-sync-options', chave: 'createNamespace', valor: 'true' }],
        },
        {
          descricao: 'Contém prunePropagationPolicy=foreground',
          regras: [{ tipo: 'configmap-contem', nome: 'argocd-sync-options', chave: 'prunePropagationPolicy', valor: 'foreground' }],
        },
      ],
    },
    {
      id: 'gitops-helm-kustomize-reuso',
      tipo: 'licao',
      titulo: 'Módulos reutilizáveis: Helm Charts e Kustomize Bases',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>Assim como o Terraform possui o <b>Module Registry</b> para reuso de configurações, o ecossistema Kubernetes oferece duas abordagens principais para evitar repetição de YAML:</p>
        <h3>Helm Charts</h3>
        <p>O Helm é o gerenciador de pacotes do Kubernetes. Um <b>Chart</b> é um pacote reutilizável com a seguinte estrutura:</p>
        <ul>
          <li><code>Chart.yaml</code>: metadados do chart (nome, versão, descrição).</li>
          <li><code>values.yaml</code>: valores padrão que podem ser sobrescritos por cada usuário.</li>
          <li><code>templates/</code>: templates Go que geram manifests YAML usando os valores fornecidos.</li>
        </ul>
        <p>Os charts são publicados no <b>Artifact Hub</b> (artifacthub.io), equivalente ao Terraform Module Registry. Você pode instalar o mesmo chart múltiplas vezes com valores diferentes — ex: <code>helm install nginx-dev meu-chart --set replicas=1</code> e <code>helm install nginx-prod meu-chart --set replicas=5</code>.</p>
        <h3>Kustomize Bases e Overlays</h3>
        <p>O Kustomize usa uma abordagem diferente: <b>herança de configuração sem templates</b>. A estrutura típica é:</p>
        <ul>
          <li><code>base/</code>: contém os manifests YAML comuns (Deployment, Service, etc.) e um <code>kustomization.yaml</code>.</li>
          <li><code>overlays/dev/</code> e <code>overlays/prod/</code>: cada overlay referencia a base e aplica patches específicos do ambiente (replicas, recursos, labels).</li>
        </ul>
        <p>O comando <code>kustomize build overlays/prod</code> gera o YAML final combinando base + overlay.</p>
        <h3>Comparação: Terraform ↔ Kubernetes</h3>
        <table border="1" cellpadding="4">
          <tr><th>Conceito</th><th>Terraform</th><th>Kubernetes (Helm)</th><th>Kubernetes (Kustomize)</th></tr>
          <tr><td>Reuso</td><td>Module Registry</td><td>Artifact Hub (Charts)</td><td>Bases compartilhadas</td></tr>
          <tr><td>Parametrização</td><td>Variables / inputs</td><td>values.yaml / --set</td><td>Patches e transformers</td></tr>
          <tr><td>Múltiplos ambientes</td><td>Workspaces ou módulos separados</td><td>Releases diferentes</td><td>Overlays por ambiente</td></tr>
          <tr><td>Linguagem</td><td>HCL</td><td>Go templates + YAML</td><td>YAML puro (sem templates)</td></tr>
          <tr><td>Complexidade</td><td>Moderada</td><td>Alta (templates Go)</td><td>Baixa (patches declarativos)</td></tr>
        </table>
        <h3>Quando usar cada abordagem?</h3>
        <ul>
          <li><b>Helm</b>: quando você precisa de lógica condicional, loops, ou quer distribuir um pacote para terceiros.</li>
          <li><b>Kustomize</b>: quando quer simplicidade, já tem manifests YAML e só precisa variar configurações entre ambientes.</li>
          <li><b>Ambos</b>: o ArgoCD e Flux suportam Helm e Kustomize nativamente; muitas equipes usam Kustomize internamente e Helm para dependências externas.</li>
        </ul>`,
    },
    {
      id: 'gitops-helm-render-exercicio',
      tipo: 'exercicio',
      titulo: 'Renderização de Helm Chart simulada',
      dificuldade: 'medio',
      xp: 20,
      resumo: `<p>Neste exercício, você vai simular a renderização de um Helm Chart. O chart <code>nginx-app</code> tem o seguinte template (comentado) e dois conjuntos de values.</p>
        <p><b>Template do Chart (referência — não escreva isto):</b></p>
        <pre># templates/deployment.yaml
# apiVersion: apps/v1
# kind: Deployment
# metadata:
#   name: {{ .Release.Name }}
# spec:
#   replicas: {{ .Values.replicas }}
#   selector:
#     matchLabels:
#       app: {{ .Release.Name }}
#   template:
#     metadata:
#       labels:
#         app: {{ .Release.Name }}
#     spec:
#       containers:
#         - name: nginx
#           image: "{{ .Values.image }}"
#           ports:
#             - containerPort: 80</pre>
        <p><b>Sua tarefa:</b> escreva o YAML final expandido que resultaria de <b>duas instalações</b> deste chart:</p>
        <ul>
          <li>Release <code>nginx-dev</code> com <code>replicas: 1</code> e <code>image: nginx:1.25</code></li>
          <li>Release <code>nginx-prod</code> com <code>replicas: 3</code> e <code>image: nginx:1.25</code></li>
        </ul>
        <p>Escreva ambos os Deployments separados por <code>---</code> no editor. Como o simulador não roda Helm de verdade, estamos testando se você entende o resultado da renderização.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-dev
  template:
    metadata:
      labels:
        app: nginx-dev
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx-prod
  template:
    metadata:
      labels:
        app: nginx-prod
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        {
          descricao: 'O Deployment nginx-dev existe com 1 réplica',
          regras: [{ tipo: 'deployment-replicas', nome: 'nginx-dev', replicas: 1 }],
        },
        {
          descricao: 'O Deployment nginx-prod existe com 3 réplicas',
          regras: [{ tipo: 'deployment-replicas', nome: 'nginx-prod', replicas: 3 }],
        },
        {
          descricao: 'Ambos usam a imagem nginx:1.25',
          regras: [{ tipo: 'container-imagem', pod: 'nginx-prod', container: 'nginx', imagem: 'nginx:1.25' }],
        },
      ],
    },
    {
      id: 'gitops-kustomize-overlay-exercicio',
      tipo: 'exercicio',
      titulo: 'Kustomize: base e overlays simulados',
      dificuldade: 'medio',
      xp: 20,
      resumo: `<p>Neste exercício, você vai simular o resultado do <code>kustomize build</code> para dois ambientes usando o padrão base/overlay.</p>
        <p><b>Base (referência — representa base/deployment.yaml):</b></p>
        <pre># apiVersion: apps/v1
# kind: Deployment
# metadata:
#   name: minha-app
# spec:
#   replicas: 1
#   selector:
#     matchLabels:
#       app: minha-app
#   template:
#     metadata:
#       labels:
#         app: minha-app
#     spec:
#       containers:
#         - name: app
#           image: node:18-alpine
#           ports:
#             - containerPort: 3000</pre>
        <p><b>Sua tarefa:</b> escreva o YAML final que resultaria de dois overlays:</p>
        <ul>
          <li><b>Overlay dev</b>: mantém 1 réplica, adiciona label <code>env: dev</code> no metadata do Deployment.</li>
          <li><b>Overlay prod</b>: muda para 4 réplicas, adiciona label <code>env: prod</code> no metadata do Deployment.</li>
        </ul>
        <p>Escreva ambos os Deployments separados por <code>---</code>. Os nomes devem ser <code>minha-app-dev</code> e <code>minha-app-prod</code> respectivamente.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: minha-app-dev
  labels:
    env: dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minha-app
  template:
    metadata:
      labels:
        app: minha-app
    spec:
      containers:
        - name: app
          image: node:18-alpine
          ports:
            - containerPort: 3000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minha-app-prod
  labels:
    env: prod
spec:
  replicas: 4
  selector:
    matchLabels:
      app: minha-app
  template:
    metadata:
      labels:
        app: minha-app
    spec:
      containers:
        - name: app
          image: node:18-alpine
          ports:
            - containerPort: 3000`,
      testes: [
        {
          descricao: 'O Deployment minha-app-dev existe com 1 réplica',
          regras: [{ tipo: 'deployment-replicas', nome: 'minha-app-dev', replicas: 1 }],
        },
        {
          descricao: 'O Deployment minha-app-prod existe com 4 réplicas',
          regras: [{ tipo: 'deployment-replicas', nome: 'minha-app-prod', replicas: 4 }],
        },
        {
          descricao: 'O Deployment minha-app-prod usa a imagem node:18-alpine',
          regras: [{ tipo: 'container-imagem', pod: 'minha-app-prod', container: 'app', imagem: 'node:18-alpine' }],
        },
      ],
    },
    {
      id: 'gitops-condicionais-licao',
      tipo: 'licao',
      titulo: 'Condicionais no Kubernetes: Helm e Kustomize',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>No Terraform, <code>count</code> e <code>for_each</code> permitem criar recursos condicionalmente ou em lote. No Kubernetes puro (YAML estático), não há lógica condicional nativa — mas <b>Helm</b> e <b>Kustomize</b> preenchem essa lacuna.</p>
        <h4>Helm: templates Go com lógica condicional</h4>
        <p>O Helm usa a linguagem de templates do Go. Dentro de <code>{{ }}</code>, você pode usar:</p>
        <ul>
          <li><code>{{ if .Values.replicas }}</code> — renderiza um bloco apenas se o valor for verdadeiro (não-zero, não-vazio).</li>
          <li><code>{{ range .Values.services }}</code> — itera sobre uma lista, gerando um recurso por item (equivalente ao <code>for_each</code>).</li>
          <li><code>{{ else }}</code>, <code>{{ end }}</code> — controle de fluxo completo.</li>
        </ul>
        <pre><code># values.yaml
replicas: 3
enableIngress: true

# template.yaml
{{ if .Values.enableIngress }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minha-app
{{ end }}</code></pre>
        <h4>Kustomize: overlays e patches condicionais</h4>
        <p>O Kustomize não tem linguagem de template. Em vez disso, usa <b>overlays</b>: diretórios separados por ambiente que aplicam patches sobre uma base comum.</p>
        <ul>
          <li><b>Base</b>: manifests compartilhados (ex: Deployment genérico).</li>
          <li><b>Overlay</b>: patches específicos de staging/producao que adicionam, removem ou modificam recursos.</li>
          <li><code>kustomization.yaml</code>: declara quais patches aplicar — a "condição" é qual overlay você escolhe renderizar.</li>
        </ul>
        <pre><code># overlays/staging/kustomization.yaml
resources:
  - ../../base
patchesStrategicMerge:
  - add-debug-container.yaml</code></pre>
        <h4>Tabela comparativa</h4>
        <table border="1" cellpadding="4">
          <thead><tr><th>Terraform</th><th>Helm</th><th>Kustomize</th></tr></thead>
          <tbody>
            <tr><td><code>count = var.n</code></td><td><code>{{ range until .Values.n }}</code></td><td>Replicas fixas no patch do overlay</td></tr>
            <tr><td><code>for_each = var.map</code></td><td><code>{{ range $k, $v := .Values.map }}</code></td><td>Patch separado por entrada no overlay</td></tr>
            <tr><td><code>var.enabled ? ... : null</code></td><td><code>{{ if .Values.enabled }}</code></td><td>Incluir/excluir recurso no overlay</td></tr>
          </tbody>
        </table>
        <p><b>Nota didática</b>: o simulador deste playground aceita apenas YAML puro. Nos exercícios a seguir, você escreverá o YAML que seria o <i>resultado renderizado</i> de um template Helm ou de um overlay Kustomize — ou seja, o output final após a engine processar a lógica condicional.</p>`,
    },
    {
      id: 'gitops-helm-condicional',
      tipo: 'exercicio',
      titulo: 'Replicas condicionais com Helm',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Imagine que você tem um chart Helm com um <code>values.yaml</code> onde define quantas réplicas deseja. O template usa <code>{{ if gt .Values.replicas 0 }}</code> para criar o Deployment apenas quando replicas &gt; 0.</p>
        <p>Neste exercício, escreva o <b>YAML renderizado</b> (o resultado final) de um Deployment chamado <code>helm-cond-deploy</code> com:</p>
        <ul>
          <li>Imagem: <code>nginx:1.25</code></li>
          <li>Réplicas: <code>3</code> (simulando que <code>.Values.replicas = 3</code> passou na condição)</li>
          <li>Label: <code>app: helm-cond</code></li>
        </ul>
        <p>E um ConfigMap chamado <code>helm-values-proxy</code> representando o values.yaml usado, com:</p>
        <ul>
          <li><code>replicas</code>: <code>3</code></li>
          <li><code>enabled</code>: <code>true</code></li>
        </ul>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-cond-deploy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: helm-cond
  template:
    metadata:
      labels:
        app: helm-cond
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: helm-values-proxy
data:
  replicas: "3"
  enabled: "true"`,
      testes: [
        {
          descricao: 'O Deployment helm-cond-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'helm-cond-deploy' }],
        },
        {
          descricao: 'O Deployment tem 3 réplicas (condição satisfeita)',
          regras: [{ tipo: 'deployment-replicas', deployment: 'helm-cond-deploy', replicas: 3 }],
        },
        {
          descricao: 'O ConfigMap helm-values-proxy contém replicas=3',
          regras: [{ tipo: 'configmap-contem', nome: 'helm-values-proxy', chave: 'replicas', valor: '3' }],
        },
        {
          descricao: 'O ConfigMap helm-values-proxy contém enabled=true',
          regras: [{ tipo: 'configmap-contem', nome: 'helm-values-proxy', chave: 'enabled', valor: 'true' }],
        },
      ],
    },
    {
      id: 'gitops-kustomize-overlay',
      tipo: 'exercicio',
      titulo: 'Kustomize overlay condicional',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>No Kustomize, a "condição" é qual overlay você aplica. Imagine um cenário onde o overlay de <b>staging</b> adiciona um ConfigMap de debug que não existe em produção.</p>
        <p>Crie o YAML que seria o <b>resultado final do overlay de staging</b>:</p>
        <ul>
          <li>Um Deployment chamado <code>kust-base-deploy</code> com imagem <code>nginx:1.25</code>, 2 réplicas e label <code>app: kust-app</code>.</li>
          <li>Um ConfigMap chamado <code>kust-staging-debug</code> (recurso que só existe no overlay de staging) com a chave <code>debugMode</code> = <code>true</code>.</li>
        </ul>
        <p>Isso simula o output de <code>kubectl kustomize overlays/staging</code> — o Deployment da base mais o ConfigMap adicional do overlay.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: kust-base-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kust-app
  template:
    metadata:
      labels:
        app: kust-app
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: kust-staging-debug
data:
  debugMode: "true"`,
      testes: [
        {
          descricao: 'O Deployment kust-base-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'kust-base-deploy' }],
        },
        {
          descricao: 'O Deployment tem 2 réplicas',
          regras: [{ tipo: 'deployment-replicas', deployment: 'kust-base-deploy', replicas: 2 }],
        },
        {
          descricao: 'O ConfigMap kust-staging-debug existe (recurso condicional do overlay)',
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'kust-staging-debug' }],
        },
        {
          descricao: 'O ConfigMap kust-staging-debug contém debugMode=true',
          regras: [{ tipo: 'configmap-contem', nome: 'kust-staging-debug', chave: 'debugMode', valor: 'true' }],
        },
      ],
    },
  ],
};