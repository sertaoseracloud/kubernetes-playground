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
      resumo: `
        <p>Uma <b>Application</b> do Argo CD responde três perguntas: <i>de onde</i> vêm os manifestos (repositório e pasta) e
        <i>para onde</i> vão (o namespace de destino).</p>
        <p class="etapa-info">📝 <b>Como este exercício funciona:</b> as ferramentas de GitOps leem recursos próprios
        (como <code>Application</code> do Argo CD). Aqui, um <b>ConfigMap</b> faz o papel desse recurso: as chaves do ConfigMap são
        os campos que você escreveria nele. No fim do tópico você escreve os recursos de verdade.</p>
        <ol>
          <li>No ConfigMap <code>argocd-app-config</code>, a chave <code>sourceRepo</code> vale <code>https://github.com/exemplo/k8s-manifests.git</code>.</li>
          <li>A chave <code>sourcePath</code> vale <code>apps/minha-app</code> (a pasta dentro do repositório).</li>
          <li>A chave <code>destinationNamespace</code> vale <code>producao</code>.</li>
        </ol>
        <p><b>No cluster:</b> com a Application de verdade, o Argo CD clonaria o repositório, leria a pasta <code>apps/minha-app</code>
        e aplicaria os manifestos no namespace <code>producao</code>, conferindo de novo a cada poucos minutos.</p>`,
      inicial: `apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-app-config
data:
  sourceRepo:            # TODO: https://github.com/exemplo/k8s-manifests.git
  sourcePath:            # TODO: apps/minha-app
  destinationNamespace:  # TODO: producao
`,
      dica: [
        "Cada TODO vira o valor da chave, na mesma linha: sourceRepo: https://...",
        "Os valores não precisam de aspas: são textos simples.",
      ],
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
          dica: "Mantenha metadata.name: argocd-app-config e preencha os valores.",
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'argocd-app-config' }],
        },
        {
          descricao: 'Contém a chave sourceRepo com o repositório correto',
          dica: "sourceRepo: https://github.com/exemplo/k8s-manifests.git (sem espaços no meio).",
          regras: [{ tipo: 'configmap-contem', nome: 'argocd-app-config', chave: 'sourceRepo', valor: 'https://github.com/exemplo/k8s-manifests.git' }],
        },
        {
          descricao: 'Contém a chave destinationNamespace apontando para producao',
          dica: "destinationNamespace: producao.",
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
      resumo: `
        <p>A <b>política de sincronização</b> diz o que o Argo CD faz sozinho: aplicar o que mudou no Git (<code>automated</code>),
        apagar do cluster o que saiu do Git (<code>prune</code>) e desfazer mudanças manuais (<code>selfHeal</code>).</p>
        <p class="etapa-info">📝 <b>Como este exercício funciona:</b> as ferramentas de GitOps leem recursos próprios
        (como <code>Application</code> do Argo CD). Aqui, um <b>ConfigMap</b> faz o papel desse recurso: as chaves do ConfigMap são
        os campos que você escreveria nele. No fim do tópico você escreve os recursos de verdade.</p>
        <ol>
          <li>Complete o Deployment <code>app-gitops</code> (a aplicação gerenciada) com <code>replicas: 2</code> e a imagem <code>nginx:1.25</code>.</li>
          <li>No ConfigMap <code>sync-policy</code>: <code>syncPolicy: automated</code>.</li>
          <li><code>prune: "true"</code> e <code>selfHeal: "true"</code>, com aspas (os valores de um ConfigMap são sempre texto).</li>
        </ol>
        <p><b>No cluster:</b> com <code>selfHeal</code>, se alguém rodar <code>kubectl scale --replicas=5</code> à mão, o Argo CD volta
        para as 2 réplicas do Git em minutos.</p>`,
      inicial: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-gitops
spec:
  replicas:            # TODO: 2
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
          image:       # TODO: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: sync-policy
data:
  syncPolicy:            # TODO: automated
  prune:                 # TODO: "true" (com aspas)
  selfHeal:              # TODO: "true" (com aspas)
`,
      dica: [
        "O Deployment é o de sempre: preencha replicas e image.",
        "Num ConfigMap, true sem aspas vira booleano e o Kubernetes recusa: escreva \"true\".",
      ],
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
          dica: "Preencha replicas e image do Deployment app-gitops.",
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'app-gitops' }],
        },
        {
          descricao: 'O ConfigMap sync-policy contém syncPolicy=automated',
          dica: "No ConfigMap sync-policy, syncPolicy: automated.",
          regras: [{ tipo: 'configmap-contem', nome: 'sync-policy', chave: 'syncPolicy', valor: 'automated' }],
        },
        {
          descricao: 'O ConfigMap sync-policy contém selfHeal=true',
          dica: "selfHeal: \"true\", com aspas.",
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
      resumo: `
        <p>No Flux, a <b>Kustomization</b> diz qual pasta de um repositório (a fonte) aplicar no cluster, e se deve apagar o que
        sair do Git (<code>prune</code>).</p>
        <p class="etapa-info">📝 <b>Como este exercício funciona:</b> as ferramentas de GitOps leem recursos próprios
        (como <code>Application</code> do Argo CD). Aqui, um <b>ConfigMap</b> faz o papel desse recurso: as chaves do ConfigMap são
        os campos que você escreveria nele. No fim do tópico você escreve os recursos de verdade.</p>
        <ol>
          <li>No ConfigMap <code>flux-kustomization-config</code>, <code>sourceRef: flux-system</code> (o GitRepository de onde ler).</li>
          <li><code>path: ./clusters/producao</code> (a pasta).</li>
          <li><code>prune: "true"</code>.</li>
        </ol>
        <p><b>No cluster:</b> o kustomize-controller do Flux roda o equivalente a <code>kubectl apply -k ./clusters/producao</code>
        a cada intervalo e apaga o que tiver sido removido da pasta.</p>`,
      inicial: `apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-kustomization-config
data:
  sourceRef:             # TODO: flux-system
  path:                  # TODO: ./clusters/producao
  prune:                 # TODO: "true" (com aspas)
`,
      dica: [
        "Preencha cada TODO com o valor do passo correspondente.",
        "O ponto e a barra fazem parte do caminho: ./clusters/producao.",
      ],
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
          dica: "Mantenha metadata.name: flux-kustomization-config e preencha os valores.",
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'flux-kustomization-config' }],
        },
        {
          descricao: 'Contém a chave path apontando para ./clusters/producao',
          dica: "path: ./clusters/producao",
          regras: [{ tipo: 'configmap-contem', nome: 'flux-kustomization-config', chave: 'path', valor: './clusters/producao' }],
        },
        {
          descricao: 'Contém a chave prune com valor true',
          dica: "prune: \"true\", com aspas.",
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
      resumo: `
        <p>No Flux, o <b>HelmRelease</b> instala um chart do Helm numa versão fixa. O resultado no cluster é um Deployment comum.</p>
        <p class="etapa-info">📝 <b>Como este exercício funciona:</b> as ferramentas de GitOps leem recursos próprios
        (como <code>Application</code> do Argo CD). Aqui, um <b>ConfigMap</b> faz o papel desse recurso: as chaves do ConfigMap são
        os campos que você escreveria nele. No fim do tópico você escreve os recursos de verdade.</p>
        <ol>
          <li>Complete o Deployment <code>helm-app-release</code> (o que o chart instalaria): <code>replicas: 3</code>, imagem <code>nginx:1.25</code>, porta 80.</li>
          <li>No ConfigMap <code>helmrelease-config</code>: <code>chartName: nginx-chart</code>.</li>
          <li><code>version: "1.2.0"</code>, com aspas (sem elas, o YAML poderia ler como número).</li>
        </ol>
        <p><b>No cluster:</b> o helm-controller baixaria o chart <code>nginx-chart</code> na versão 1.2.0, renderizaria os templates e
        aplicaria o Deployment. Mudar a versão no Git dispara um upgrade.</p>`,
      inicial: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-app-release
spec:
  replicas:            # TODO: 3
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
          image:       # TODO: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: helmrelease-config
data:
  chartName:             # TODO: nginx-chart
  version:               # TODO: "1.2.0" (com aspas)
`,
      dica: [
        "O Deployment é o de sempre: preencha replicas e image.",
        "version: \"1.2.0\" com aspas, chartName: nginx-chart.",
      ],
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
          dica: "No Deployment helm-app-release, replicas: 3.",
          regras: [{ tipo: 'deployment-replicas', nome: 'helm-app-release', replicas: 3 }],
        },
        {
          descricao: 'O ConfigMap helmrelease-config contém chartName=nginx-chart',
          dica: "No ConfigMap helmrelease-config, chartName: nginx-chart.",
          regras: [{ tipo: 'configmap-contem', nome: 'helmrelease-config', chave: 'chartName', valor: 'nginx-chart' }],
        },
        {
          descricao: 'O container expõe a porta 80',
          dica: "Mantenha containerPort: 80 no container nginx.",
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
      resumo: `
        <p>No padrão <b>App of Apps</b>, uma Application "mãe" aponta para uma pasta cheia de Applications "filhas": instalar a mãe
        instala o ambiente inteiro. Cada filha pode seguir uma versão diferente do Git (<code>targetRevision</code>: um branch ou uma tag).</p>
        <p class="etapa-info">📝 <b>Como este exercício funciona:</b> as ferramentas de GitOps leem recursos próprios
        (como <code>Application</code> do Argo CD). Aqui, um <b>ConfigMap</b> faz o papel desse recurso: as chaves do ConfigMap são
        os campos que você escreveria nele. No fim do tópico você escreve os recursos de verdade.</p>
        <ol>
          <li>No ConfigMap <code>app-frontend</code>, <code>targetRevision: main</code> (segue o branch principal).</li>
          <li>Depois do <code>---</code>, no ConfigMap <code>app-backend</code>, <code>targetRevision: v2.1.0</code> (fica preso na tag).</li>
        </ol>
        <p><b>No cluster:</b> o frontend atualiza a cada commit no <code>main</code>; o backend só muda quando alguém trocar a tag no Git.</p>`,
      inicial: `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-frontend
data:
  targetRevision:        # TODO: main
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-backend
data:
  targetRevision:        # TODO: v2.1.0
`,
      dica: [
        "São dois ConfigMaps, cada um com uma chave.",
        "targetRevision: main no frontend e targetRevision: v2.1.0 no backend.",
      ],
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
          dica: "Mantenha metadata.name: app-frontend no primeiro ConfigMap.",
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'app-frontend' }],
        },
        {
          descricao: 'O ConfigMap app-backend contém targetRevision=v2.1.0',
          dica: "No app-backend, targetRevision: v2.1.0.",
          regras: [{ tipo: 'configmap-contem', nome: 'app-backend', chave: 'targetRevision', valor: 'v2.1.0' }],
        },
        {
          descricao: 'O ConfigMap app-frontend contém targetRevision=main',
          dica: "No app-frontend, targetRevision: main.",
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
      resumo: `
        <p>Em GitOps, cada ambiente tem a própria configuração no Git, e cada um cresce num ritmo: dev pequeno, produção grande.</p>
        <p class="etapa-info">📝 <b>Como este exercício funciona:</b> as ferramentas de GitOps leem recursos próprios
        (como <code>Application</code> do Argo CD). Aqui, um <b>ConfigMap</b> faz o papel desse recurso: as chaves do ConfigMap são
        os campos que você escreveria nele. No fim do tópico você escreve os recursos de verdade.</p>
        <ol>
          <li>No ConfigMap <code>env-dev</code>, <code>replicas: "1"</code>.</li>
          <li>No <code>env-staging</code>, <code>replicas: "2"</code>.</li>
          <li>No <code>env-prod</code>, <code>replicas: "4"</code> (os três com aspas: valores de ConfigMap são texto).</li>
        </ol>
        <p><b>No cluster:</b> uma Application por ambiente aplicaria a configuração certa em cada namespace (ou cluster).</p>`,
      inicial: `apiVersion: v1
kind: ConfigMap
metadata:
  name: env-dev
data:
  replicas:              # TODO: "1"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: env-staging
data:
  replicas:              # TODO: "2"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: env-prod
data:
  replicas:              # TODO: "4"
`,
      dica: [
        "Três ConfigMaps quase iguais: muda só o nome e o número.",
        "Sem aspas, 1 vira número e o ConfigMap é recusado: escreva \"1\".",
      ],
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
          dica: "Mantenha o terceiro ConfigMap com metadata.name: env-prod.",
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'env-prod' }],
        },
        {
          descricao: 'O ConfigMap env-dev contém replicas=1',
          dica: "No env-dev, replicas: \"1\".",
          regras: [{ tipo: 'configmap-contem', nome: 'env-dev', chave: 'replicas', valor: '1' }],
        },
        {
          descricao: 'O ConfigMap env-staging contém replicas=2',
          dica: "No env-staging, replicas: \"2\".",
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
      resumo: `
        <p>O <b>drift</b> é a diferença entre o Git e o cluster. Com <code>selfHeal</code>, o Argo CD não só avisa: ele desfaz a diferença.</p>
        <p class="etapa-info">📝 <b>Como este exercício funciona:</b> as ferramentas de GitOps leem recursos próprios
        (como <code>Application</code> do Argo CD). Aqui, um <b>ConfigMap</b> faz o papel desse recurso: as chaves do ConfigMap são
        os campos que você escreveria nele. No fim do tópico você escreve os recursos de verdade.</p>
        <ol>
          <li>Complete o Deployment <code>drift-guard-app</code> (o estado do Git): <code>replicas: 2</code> e a imagem <code>nginx:1.25</code>.</li>
          <li>No ConfigMap <code>drift-config</code>, <code>selfHeal: "true"</code>.</li>
        </ol>
        <p><b>No cluster:</b> se alguém mudar a imagem à mão, o Argo CD mostra <code>OutOfSync</code> e, com selfHeal, aplica de novo
        o que está no Git. Experimente o botão <b>🔎 Drift</b> depois do apply: mude as réplicas no editor e compare.</p>`,
      inicial: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: drift-guard-app
spec:
  replicas:            # TODO: 2
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
          image:       # TODO: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: drift-config
data:
  selfHeal:              # TODO: "true" (com aspas)
`,
      dica: [
        "Preencha replicas e image do Deployment.",
        "selfHeal: \"true\", com aspas.",
      ],
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
          dica: "No Deployment drift-guard-app, replicas: 2.",
          regras: [{ tipo: 'deployment-replicas', nome: 'drift-guard-app', replicas: 2 }],
        },
        {
          descricao: 'O ConfigMap drift-config contém selfHeal=true',
          dica: "No ConfigMap drift-config, selfHeal: \"true\".",
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
      resumo: `
        <p>Em GitOps, o rollback não é um comando no cluster: é um <code>git revert</code>. O Git volta para a versão anterior e a
        ferramenta aplica.</p>
        <p class="etapa-info">📝 <b>Como este exercício funciona:</b> as ferramentas de GitOps leem recursos próprios
        (como <code>Application</code> do Argo CD). Aqui, um <b>ConfigMap</b> faz o papel desse recurso: as chaves do ConfigMap são
        os campos que você escreveria nele. No fim do tópico você escreve os recursos de verdade.</p>
        <ol>
          <li>Complete o Deployment <code>rollback-app</code> com <code>replicas: 2</code> e a imagem <b>anterior</b>, <code>nginx:1.24</code>.</li>
          <li>No ConfigMap <code>rollback-metadata</code>, guarde de qual commit veio a versão: <code>previousCommit: abc1234</code>.</li>
        </ol>
        <p><b>No cluster:</b> depois do revert, o Argo CD vê a imagem 1.24 no Git, marca a aplicação como OutOfSync e faz o rolling
        update de volta.</p>`,
      inicial: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: rollback-app
spec:
  replicas:            # TODO: 2
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
          image:       # TODO: nginx:1.24 (a versão anterior)
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: rollback-metadata
data:
  previousCommit:        # TODO: abc1234
`,
      dica: [
        "A imagem do rollback é a versão anterior: nginx:1.24.",
        "previousCommit: abc1234",
      ],
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
          dica: "No container nginx, image: nginx:1.24.",
          regras: [{ tipo: 'container-imagem', pod: 'rollback-app', container: 'nginx', imagem: 'nginx:1.24' }],
        },
        {
          descricao: 'O ConfigMap rollback-metadata contém previousCommit=abc1234',
          dica: "No ConfigMap rollback-metadata, previousCommit: abc1234.",
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
      resumo: `
        <p>No fluxo por <b>pull request</b>, ninguém aplica nada direto: a mudança vira um PR, alguém revisa e, depois do merge no
        branch principal, a ferramenta de GitOps aplica.</p>
        <p class="etapa-info">📝 <b>Como este exercício funciona:</b> as ferramentas de GitOps leem recursos próprios
        (como <code>Application</code> do Argo CD). Aqui, um <b>ConfigMap</b> faz o papel desse recurso: as chaves do ConfigMap são
        os campos que você escreveria nele. No fim do tópico você escreve os recursos de verdade.</p>
        <ol>
          <li>No ConfigMap <code>pr-approved-config</code>, <code>approvedBy: tech-lead</code>.</li>
          <li><code>prNumber: "142"</code> (com aspas).</li>
          <li><code>branch: main</code>.</li>
        </ol>
        <p><b>No cluster:</b> só o que chegou ao <code>main</code> é aplicado. O histórico do Git registra quem aprovou cada mudança.</p>`,
      inicial: `apiVersion: v1
kind: ConfigMap
metadata:
  name: pr-approved-config
data:
  approvedBy:            # TODO: tech-lead
  prNumber:              # TODO: "142" (com aspas)
  branch:                # TODO: main
`,
      dica: [
        "Preencha cada TODO com o valor do passo.",
        "prNumber: \"142\" com aspas; os outros sem.",
      ],
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
          dica: "Mantenha metadata.name: pr-approved-config e preencha os valores.",
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'pr-approved-config' }],
        },
        {
          descricao: 'Contém a chave approvedBy com valor tech-lead',
          dica: "approvedBy: tech-lead",
          regras: [{ tipo: 'configmap-contem', nome: 'pr-approved-config', chave: 'approvedBy', valor: 'tech-lead' }],
        },
        {
          descricao: 'Contém a chave branch com valor main',
          dica: "branch: main",
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
      resumo: `
        <p>As <b>opções de sincronização</b> do Argo CD ajustam detalhes: criar o namespace se não existir, a ordem em que se apaga
        e se deve aplicar só o que está diferente.</p>
        <p class="etapa-info">📝 <b>Como este exercício funciona:</b> as ferramentas de GitOps leem recursos próprios
        (como <code>Application</code> do Argo CD). Aqui, um <b>ConfigMap</b> faz o papel desse recurso: as chaves do ConfigMap são
        os campos que você escreveria nele. No fim do tópico você escreve os recursos de verdade.</p>
        <ol>
          <li>No ConfigMap <code>argocd-sync-options</code>, <code>createNamespace: "true"</code>.</li>
          <li><code>prunePropagationPolicy: foreground</code> (apaga primeiro os filhos, depois o dono).</li>
          <li><code>applyOutOfSyncOnly: "false"</code>.</li>
        </ol>
        <p><b>No cluster:</b> na primeira sincronização, o Argo CD cria o namespace de destino; ao remover algo, espera os Pods sumirem
        antes de apagar o Deployment.</p>`,
      inicial: `apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-sync-options
data:
  createNamespace:       # TODO: "true" (com aspas)
  prunePropagationPolicy: # TODO: foreground
  applyOutOfSyncOnly:    # TODO: "false" (com aspas)
`,
      dica: [
        "true e false entre aspas; foreground sem aspas.",
        "createNamespace: \"true\" / prunePropagationPolicy: foreground / applyOutOfSyncOnly: \"false\"",
      ],
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
          dica: "Mantenha metadata.name: argocd-sync-options e preencha os valores.",
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'argocd-sync-options' }],
        },
        {
          descricao: 'Contém createNamespace=true',
          dica: "createNamespace: \"true\", com aspas.",
          regras: [{ tipo: 'configmap-contem', nome: 'argocd-sync-options', chave: 'createNamespace', valor: 'true' }],
        },
        {
          descricao: 'Contém prunePropagationPolicy=foreground',
          dica: "prunePropagationPolicy: foreground",
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
      resumo: `
        <p>Um <b>chart</b> do Helm é um modelo com lacunas (<code>{{ .Values.replicas }}</code>). Instalar o chart com valores diferentes
        gera manifestos diferentes. Você vai fazer o papel do Helm: escrever o resultado de duas instalações.</p>
        <p><b>O template do chart</b> (só referência, não escreva isto):</p>
        <pre class="trecho" tabindex="0">metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicas }}
  ...
      labels:
        app: {{ .Release.Name }}
      ...
          image: "{{ .Values.image }}"</pre>
        <ol>
          <li>Release <code>nginx-dev</code>: troque <code>.Release.Name</code> por <code>nginx-dev</code>, <code>replicas</code> por 1 e a imagem por <code>nginx:1.25</code>.</li>
          <li>Depois do <code>---</code>, release <code>nginx-prod</code>: o mesmo, com <code>replicas: 3</code>.</li>
        </ol>
        <p><b>No cluster:</b> com o Helm de verdade, <code>helm install nginx-dev ./nginx-app --set replicas=1</code> geraria exatamente o
        primeiro Deployment. <code>helm template</code> mostra o resultado sem instalar.</p>`,
      inicial: `# O resultado da release nginx-dev (troque cada lacuna pelo valor)
apiVersion: apps/v1
kind: Deployment
metadata:
  name:                # TODO: .Release.Name = nginx-dev
spec:
  replicas:            # TODO: .Values.replicas = 1
  selector:
    matchLabels:
      app:             # TODO: .Release.Name
  template:
    metadata:
      labels:
        app:           # TODO: .Release.Name
    spec:
      containers:
        - name: nginx
          image:       # TODO: .Values.image = nginx:1.25
          ports:
            - containerPort: 80
---
# TODO: o resultado da release nginx-prod (o mesmo, com o nome nginx-prod e 3 réplicas)
`,
      dica: [
        "Onde o template tem {{ .Release.Name }}, escreva o nome da release; o resto fica igual.",
        "Para a nginx-prod, copie o primeiro Deployment, troque nginx-dev por nginx-prod (3 vezes) e as réplicas para 3.",
      ],
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
          dica: "Na release nginx-dev: metadata.name e as labels nginx-dev, replicas: 1.",
          regras: [{ tipo: 'deployment-replicas', nome: 'nginx-dev', replicas: 1 }],
        },
        {
          descricao: 'O Deployment nginx-prod existe com 3 réplicas',
          dica: "Depois do ---, um Deployment nginx-prod com replicas: 3.",
          regras: [{ tipo: 'deployment-replicas', nome: 'nginx-prod', replicas: 3 }],
        },
        {
          descricao: 'Ambos usam a imagem nginx:1.25',
          dica: "image: nginx:1.25 nos dois.",
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
      resumo: `
        <p>O Kustomize não usa lacunas: ele parte de uma <b>base</b> e aplica <b>remendos</b> (overlays) por ambiente. Você vai fazer o
        papel do <code>kustomize build</code> e escrever o resultado de dois overlays.</p>
        <p><b>A base</b> (só referência): o Deployment <code>minha-app</code> com 1 réplica, label <code>app: minha-app</code> e o
        container <code>app</code> na imagem <code>node:18-alpine</code>, porta 3000.</p>
        <ol>
          <li>Overlay dev: o nome vira <code>minha-app-dev</code>, continua com 1 réplica e ganha a label <code>env: dev</code> no
            <code>metadata</code> do Deployment.</li>
          <li>Depois do <code>---</code>, overlay prod: nome <code>minha-app-prod</code>, <code>replicas: 4</code> e a label <code>env: prod</code>.</li>
        </ol>
        <p><b>No cluster:</b> <code>kubectl apply -k overlays/prod</code> geraria o segundo Deployment. A base fica igual para todos; só o
        que muda está no overlay.</p>`,
      inicial: `# O resultado do overlay dev (a base com os remendos)
apiVersion: apps/v1
kind: Deployment
metadata:
  name:                # TODO: minha-app-dev
  # TODO: labels com env: dev
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
# TODO: o resultado do overlay prod (nome minha-app-prod, 4 réplicas, label env: prod)
`,
      dica: [
        "A label env vai no metadata do Deployment (não no template).",
        "Para o prod, copie o dev e mude o nome, as réplicas e o valor de env.",
      ],
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
          dica: "No primeiro Deployment: name: minha-app-dev e replicas: 1.",
          regras: [{ tipo: 'deployment-replicas', nome: 'minha-app-dev', replicas: 1 }],
        },
        {
          descricao: 'O Deployment minha-app-prod existe com 4 réplicas',
          dica: "Depois do ---, o Deployment minha-app-prod com replicas: 4.",
          regras: [{ tipo: 'deployment-replicas', nome: 'minha-app-prod', replicas: 4 }],
        },
        {
          descricao: 'O Deployment minha-app-prod usa a imagem node:18-alpine',
          dica: "Mantenha image: node:18-alpine no container app.",
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
      resumo: `
        <p>O template de um chart pode ter <b>condições</b>: <code>{{ if gt .Values.replicas 0 }}</code> só cria o Deployment se as réplicas
        forem maiores que zero. Com <code>replicas: 3</code> nos values, a condição passa e o Deployment sai.</p>
        <ol>
          <li>Escreva o Deployment renderizado <code>helm-cond-deploy</code>: <code>replicas: 3</code>, label <code>app: helm-cond</code>, imagem <code>nginx:1.25</code>.</li>
          <li>Depois do <code>---</code>, o ConfigMap <code>helm-values-proxy</code> faz o papel do <code>values.yaml</code>: <code>replicas: "3"</code>.</li>
          <li>E <code>enabled: "true"</code>.</li>
        </ol>
        <p><b>No cluster:</b> se os values tivessem <code>replicas: 0</code>, o Helm não geraria o Deployment, e o cluster não teria
        nada para essa aplicação.</p>`,
      inicial: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-cond-deploy
spec:
  replicas:            # TODO: 3 (o valor de .Values.replicas)
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
  # TODO: replicas: "3" e enabled: "true" (com aspas)
`,
      dica: [
        "No Deployment só falta o número de réplicas.",
        "No ConfigMap, os dois valores entre aspas: replicas: \"3\" e enabled: \"true\".",
      ],
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
          dica: "Preencha o TODO das réplicas: um campo vazio impede o apply.",
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'helm-cond-deploy' }],
        },
        {
          descricao: 'O Deployment tem 3 réplicas (condição satisfeita)',
          dica: "replicas: 3 no Deployment.",
          regras: [{ tipo: 'deployment-replicas', deployment: 'helm-cond-deploy', replicas: 3 }],
        },
        {
          descricao: 'O ConfigMap helm-values-proxy contém replicas=3',
          dica: "No ConfigMap, replicas: \"3\".",
          regras: [{ tipo: 'configmap-contem', nome: 'helm-values-proxy', chave: 'replicas', valor: '3' }],
        },
        {
          descricao: 'O ConfigMap helm-values-proxy contém enabled=true',
          dica: "No ConfigMap, enabled: \"true\".",
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
      resumo: `
        <p>No Kustomize, a "condição" é <b>qual overlay você aplica</b>. O overlay de staging acrescenta um ConfigMap de depuração que
        não existe em produção.</p>
        <ol>
          <li>Escreva o Deployment da base, <code>kust-base-deploy</code>: <code>replicas: 2</code>, label <code>app: kust-app</code>, imagem <code>nginx:1.25</code>.</li>
          <li>Depois do <code>---</code>, o ConfigMap que só o overlay de staging traz: <code>kust-staging-debug</code>.</li>
          <li>Nele, <code>debugMode: "true"</code>.</li>
        </ol>
        <p><b>No cluster:</b> <code>kubectl apply -k overlays/staging</code> cria os dois; <code>kubectl apply -k overlays/prod</code> criaria só
        o Deployment.</p>`,
      inicial: `# Base: igual em todos os ambientes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kust-base-deploy
spec:
  replicas:            # TODO: 2
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
# TODO: o ConfigMap kust-staging-debug (só do overlay de staging) com debugMode: "true"
`,
      dica: [
        "O ConfigMap é um documento completo: apiVersion, kind, metadata.name e data.",
        "data:\n  debugMode: \"true\"",
      ],
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
          dica: "Preencha as réplicas do Deployment kust-base-deploy.",
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'kust-base-deploy' }],
        },
        {
          descricao: 'O Deployment tem 2 réplicas',
          dica: "replicas: 2.",
          regras: [{ tipo: 'deployment-replicas', deployment: 'kust-base-deploy', replicas: 2 }],
        },
        {
          descricao: 'O ConfigMap kust-staging-debug existe (recurso condicional do overlay)',
          dica: "Depois do ---, um ConfigMap com metadata.name: kust-staging-debug.",
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'kust-staging-debug' }],
        },
        {
          descricao: 'O ConfigMap kust-staging-debug contém debugMode=true',
          dica: "Em data do ConfigMap, debugMode: \"true\".",
          regras: [{ tipo: 'configmap-contem', nome: 'kust-staging-debug', chave: 'debugMode', valor: 'true' }],
        },
      ],
    },
  ],
};