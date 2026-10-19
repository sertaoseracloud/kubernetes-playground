// Recursos Avançados (GitOps): as CRDs de verdade do Argo CD e do Flux, e o que é uma CRD.
import { licao, exercicio, teste, existe, campo } from './util.js';

export const gitopsCrds = {
  id: 'gitops-crds',
  itens: [
    licao('crds-operadores', 'CRDs e operadores: ensinando tipos novos ao Kubernetes', 'dificil', `
      <p>O Argo CD, o Flux, o Karpenter e o KEDA não vêm com o Kubernetes. Eles chegam por duas peças:</p>
      <ul>
        <li><b>CustomResourceDefinition (CRD)</b>: é como <b>acrescentar uma página nova ao formulário</b> da prefeitura. Depois
          dela, a API aceita um <code>kind</code> novo (por exemplo, <code>Application</code> no grupo <code>argoproj.io</code>).</li>
        <li><b>Operador (controlador)</b>: o <b>funcionário que lê essa página</b> e faz o trabalho. Ele observa os recursos do
          tipo novo e age até o mundo real ficar igual ao que foi pedido (o mesmo laço de reconciliação do Deployment).</li>
        <li>Sem a CRD instalada, o <code>kubectl apply</code> falha com <i>no matches for kind</i>. Por isso a ordem importa:
          primeiro o operador (geralmente via Helm), depois os recursos dele.</li>
        <li>No Argo CD, uma <code>Application</code> diz <b>de onde</b> (repoURL, path, targetRevision) e <b>para onde</b>
          (destination) sincronizar. <code>syncPolicy.automated</code> com <code>prune</code> e <code>selfHeal</code> apaga o que
          saiu do Git e desfaz mudanças manuais.</li>
        <li>No Flux, a fonte (<code>GitRepository</code> ou <code>HelmRepository</code>) é separada do que aplica
          (<code>Kustomization</code> ou <code>HelmRelease</code>).</li>
        <li>Cuidado com o nome: o <code>Kustomization</code> do Flux (<code>kustomize.toolkit.fluxcd.io</code>) é um recurso do
          cluster; o <code>kustomization.yaml</code> do Kustomize (<code>kustomize.config.k8s.io</code>) é só um arquivo lido pelo
          <code>kubectl apply -k</code>.</li>
      </ul>`),
    exercicio({
      id: 'gitops-argocd-application',
      titulo: 'Application do Argo CD com sincronização automática',
      dificuldade: 'medio',
      resumo: `
        <p>Agora o recurso de verdade: a <code>Application</code> do Argo CD (uma CRD do grupo <code>argoproj.io</code>). Você vai publicar
        o exemplo oficial <b>guestbook</b>.</p>
        <ol>
          <li>Na Application <code>guestbook</code> (namespace <code>argocd</code>), <code>spec.project: default</code>.</li>
          <li>Em <code>source</code>: <code>repoURL: https://github.com/argoproj/argocd-example-apps.git</code>, <code>path: guestbook</code> e
            <code>targetRevision: HEAD</code>.</li>
          <li>Em <code>destination</code>: <code>server: https://kubernetes.default.svc</code> (o próprio cluster) e <code>namespace: guestbook</code>.</li>
          <li>Em <code>syncPolicy.automated</code>: <code>prune: true</code> e <code>selfHeal: true</code>; em <code>syncOptions</code>, o item <code>CreateNamespace=true</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Argo CD cria o namespace <code>guestbook</code>, aplica os manifestos da pasta e fica de olho: um commit
        novo no repositório é aplicado sozinho, e qualquer mudança manual é desfeita.</p>`,
      inicial: `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: default
  source:                # DE ONDE
    repoURL:             # TODO: https://github.com/argoproj/argocd-example-apps.git
    path:                # TODO: guestbook
    targetRevision: HEAD
  destination:           # PARA ONDE
    server: https://kubernetes.default.svc
    namespace:           # TODO: guestbook
  syncPolicy:
    # TODO: automated com prune: true e selfHeal: true
    # TODO: syncOptions com o item - CreateNamespace=true
`,
      dica: [
        "Compare com o exercício \"Configuração de Application ArgoCD\": os campos são os mesmos, agora no lugar certo.",
        "syncPolicy:\n  automated:\n    prune: true\n    selfHeal: true\n  syncOptions:\n    - CreateNamespace=true",
      ],
      solucao: `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    path: guestbook
    targetRevision: HEAD
  destination:
    server: https://kubernetes.default.svc
    namespace: guestbook
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true`,
      testes: [
        teste({ descricao: 'A Application aponta para o exemplo guestbook', dica: "Em source: repoURL do argocd-example-apps e path: guestbook." }, existe('Application', 'guestbook'), campo('Application', 'guestbook', 'spec.source.path', { valor: 'guestbook' }), campo('Application', 'guestbook', 'spec.source.repoURL', { contem: 'argocd-example-apps' })),
        teste({ descricao: 'O destino é o namespace guestbook do próprio cluster', dica: "Em destination: namespace: guestbook e server: https://kubernetes.default.svc." }, campo('Application', 'guestbook', 'spec.destination.namespace', { valor: 'guestbook' }), campo('Application', 'guestbook', 'spec.destination.server', { valor: 'https://kubernetes.default.svc' })),
        teste({ descricao: 'Sincroniza sozinha, apaga o que saiu do Git e desfaz mudanças manuais', dica: "Em syncPolicy: automated com prune e selfHeal true, e syncOptions com CreateNamespace=true." },
          campo('Application', 'guestbook', 'spec.syncPolicy.automated.prune', { valor: true }),
          campo('Application', 'guestbook', 'spec.syncPolicy.automated.selfHeal', { valor: true }),
          campo('Application', 'guestbook', 'spec.syncPolicy.syncOptions', { contem: 'CreateNamespace=true' })),
      ],
    }),
    exercicio({
      id: 'gitops-flux-gitrepository',
      titulo: 'Flux: GitRepository e Kustomization',
      dificuldade: 'dificil',
      resumo: `
        <p>No Flux, a <b>fonte</b> e a <b>aplicação</b> são recursos separados: o <code>GitRepository</code> baixa o repositório; a
        <code>Kustomization</code> do Flux aplica uma pasta dele.</p>
        <ol>
          <li>No <code>GitRepository</code> <code>podinfo</code> (namespace <code>flux-system</code>): <code>url: https://github.com/stefanprodan/podinfo</code>,
            <code>ref.branch: master</code> e <code>interval: 1m</code>.</li>
          <li>Na <code>Kustomization</code> <code>podinfo</code> (<code>apiVersion: kustomize.toolkit.fluxcd.io/v1</code>): <code>path: ./kustomize</code>,
            <code>interval: 10m</code>, <code>prune: true</code> e <code>targetNamespace: default</code>.</li>
          <li>Ligue as duas: <code>sourceRef</code> com <code>kind: GitRepository</code> e <code>name: podinfo</code>.</li>
        </ol>
        <p><b>No cluster:</b> o source-controller baixa o branch a cada minuto; o kustomize-controller aplica <code>./kustomize</code> no
        namespace <code>default</code> a cada 10 minutos e apaga o que sair do Git.</p>`,
      inicial: `apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 1m
  url:                   # TODO: https://github.com/stefanprodan/podinfo
  ref:
    branch:              # TODO: master
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 10m
  path:                  # TODO: ./kustomize
  prune: true
  targetNamespace: default
  # TODO: sourceRef com kind: GitRepository e name: podinfo
`,
      dica: [
        "A Kustomization do Flux usa apiVersion kustomize.toolkit.fluxcd.io/v1 e aponta a fonte em spec.sourceRef (kind e name).",
        "sourceRef:\n  kind: GitRepository\n  name: podinfo",
      ],
      solucao: `apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/stefanprodan/podinfo
  ref:
    branch: master
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 10m
  path: ./kustomize
  prune: true
  targetNamespace: default
  sourceRef:
    kind: GitRepository
    name: podinfo`,
      testes: [
        teste({ descricao: 'O GitRepository acompanha o branch master do podinfo', dica: "No GitRepository: url do podinfo e ref.branch: master." },
          existe('GitRepository', 'podinfo'),
          campo('GitRepository', 'podinfo', 'spec.url', { valor: 'https://github.com/stefanprodan/podinfo' }),
          campo('GitRepository', 'podinfo', 'spec.ref.branch', { valor: 'master' })),
        teste({ descricao: 'A Kustomization aplica ./kustomize da fonte podinfo', dica: "Na Kustomization: sourceRef (kind GitRepository, name podinfo) e path: ./kustomize." },
          campo('Kustomization', 'podinfo', 'spec.sourceRef.kind', { valor: 'GitRepository' }),
          campo('Kustomization', 'podinfo', 'spec.sourceRef.name', { valor: 'podinfo' }),
          campo('Kustomization', 'podinfo', 'spec.path', { valor: './kustomize' })),
        teste({ descricao: 'Apaga do cluster o que sair do Git', dica: "Na Kustomization: prune: true e targetNamespace: default." }, campo('Kustomization', 'podinfo', 'spec.prune', { valor: true }), campo('Kustomization', 'podinfo', 'spec.targetNamespace', { valor: 'default' })),
      ],
    }),
    exercicio({
      id: 'gitops-flux-helmrelease',
      titulo: 'Flux: HelmRepository e HelmRelease',
      dificuldade: 'dificil',
      resumo: `
        <p>A mesma ideia, agora com Helm: o <code>HelmRepository</code> é a fonte dos charts e a <code>HelmRelease</code> instala um deles.</p>
        <ol>
          <li>No <code>HelmRepository</code> <code>podinfo</code> (namespace <code>flux-system</code>): <code>url: https://stefanprodan.github.io/podinfo</code> e <code>interval: 1h</code>.</li>
          <li>Na <code>HelmRelease</code> <code>podinfo</code> (<code>interval: 10m</code>), em <code>chart.spec</code>: <code>chart: podinfo</code> e <code>version: "6.x"</code>.</li>
          <li>Ainda em <code>chart.spec</code>, <code>sourceRef</code> com <code>kind: HelmRepository</code> e <code>name: podinfo</code>.</li>
          <li>Em <code>values</code>, <code>replicaCount: 2</code>.</li>
        </ol>
        <p><b>No cluster:</b> o helm-controller instala a versão 6.x mais recente do chart com 2 réplicas. Uma versão 6.x nova no
        repositório é instalada sozinha.</p>`,
      inicial: `apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 1h
  url:                   # TODO: https://stefanprodan.github.io/podinfo
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart:             # TODO: podinfo
      version:           # TODO: "6.x" (com aspas)
      # TODO: sourceRef com kind: HelmRepository e name: podinfo
  # TODO: values com replicaCount: 2
`,
      dica: [
        "Na HelmRelease v2, o chart fica em spec.chart.spec (chart, version e sourceRef) e os values em spec.values.",
        "values fica alinhado com chart, direto em spec.",
      ],
      solucao: `apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 1h
  url: https://stefanprodan.github.io/podinfo
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: podinfo
      version: "6.x"
      sourceRef:
        kind: HelmRepository
        name: podinfo
  values:
    replicaCount: 2`,
      testes: [
        teste({ descricao: 'O HelmRepository aponta para os charts do podinfo', dica: "No HelmRepository: url: https://stefanprodan.github.io/podinfo." }, existe('HelmRepository', 'podinfo'), campo('HelmRepository', 'podinfo', 'spec.url', { valor: 'https://stefanprodan.github.io/podinfo' })),
        teste({ descricao: 'A HelmRelease instala o chart podinfo 6.x', dica: "Em chart.spec: chart: podinfo, version: \"6.x\" e sourceRef.kind: HelmRepository." },
          campo('HelmRelease', 'podinfo', 'spec.chart.spec.chart', { valor: 'podinfo' }),
          campo('HelmRelease', 'podinfo', 'spec.chart.spec.version', { valor: '6.x' }),
          campo('HelmRelease', 'podinfo', 'spec.chart.spec.sourceRef.kind', { valor: 'HelmRepository' })),
        teste({ descricao: 'Os values pedem 2 réplicas', dica: "Em spec.values: replicaCount: 2." }, campo('HelmRelease', 'podinfo', 'spec.values.replicaCount', { valor: 2 })),
      ],
    }),
  ],
};
