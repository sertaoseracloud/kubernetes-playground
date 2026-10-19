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
      resumo: `<p>Crie a <code>Application</code> <code>guestbook</code> no namespace <code>argocd</code> que publica o exemplo oficial do Argo CD:</p>
        <ul>
          <li>Projeto <code>default</code>.</li>
          <li>Fonte: <code>https://github.com/argoproj/argocd-example-apps.git</code>, caminho <code>guestbook</code>, revisão <code>HEAD</code>.</li>
          <li>Destino: o próprio cluster (<code>https://kubernetes.default.svc</code>), namespace <code>guestbook</code>.</li>
          <li>Sincronização automática com <code>prune: true</code> e <code>selfHeal: true</code>, e a opção <code>CreateNamespace=true</code>.</li>
        </ul>`,
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
        teste('A Application aponta para o exemplo guestbook', existe('Application', 'guestbook'), campo('Application', 'guestbook', 'spec.source.path', { valor: 'guestbook' }), campo('Application', 'guestbook', 'spec.source.repoURL', { contem: 'argocd-example-apps' })),
        teste('O destino é o namespace guestbook do próprio cluster', campo('Application', 'guestbook', 'spec.destination.namespace', { valor: 'guestbook' }), campo('Application', 'guestbook', 'spec.destination.server', { valor: 'https://kubernetes.default.svc' })),
        teste('Sincroniza sozinha, apaga o que saiu do Git e desfaz mudanças manuais',
          campo('Application', 'guestbook', 'spec.syncPolicy.automated.prune', { valor: true }),
          campo('Application', 'guestbook', 'spec.syncPolicy.automated.selfHeal', { valor: true }),
          campo('Application', 'guestbook', 'spec.syncPolicy.syncOptions', { contem: 'CreateNamespace=true' })),
      ],
    }),
    exercicio({
      id: 'gitops-flux-gitrepository',
      titulo: 'Flux: GitRepository e Kustomization',
      dificuldade: 'dificil',
      resumo: `<p>Com o Flux instalado, publique o <b>podinfo</b> a partir do Git. No namespace <code>flux-system</code>, crie:</p>
        <ol>
          <li>O <code>GitRepository</code> <code>podinfo</code>: URL <code>https://github.com/stefanprodan/podinfo</code>, branch
            <code>master</code>, conferido a cada <code>1m</code>.</li>
          <li>A <code>Kustomization</code> do Flux <code>podinfo</code>: aplica o caminho <code>./kustomize</code> da fonte
            <code>podinfo</code> a cada <code>10m</code>, com <code>prune: true</code> e <code>targetNamespace: default</code>.</li>
        </ol>`,
      dica: 'A Kustomization do Flux usa apiVersion kustomize.toolkit.fluxcd.io/v1 e aponta a fonte em spec.sourceRef (kind e name).',
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
        teste('O GitRepository acompanha o branch master do podinfo',
          existe('GitRepository', 'podinfo'),
          campo('GitRepository', 'podinfo', 'spec.url', { valor: 'https://github.com/stefanprodan/podinfo' }),
          campo('GitRepository', 'podinfo', 'spec.ref.branch', { valor: 'master' })),
        teste('A Kustomization aplica ./kustomize da fonte podinfo',
          campo('Kustomization', 'podinfo', 'spec.sourceRef.kind', { valor: 'GitRepository' }),
          campo('Kustomization', 'podinfo', 'spec.sourceRef.name', { valor: 'podinfo' }),
          campo('Kustomization', 'podinfo', 'spec.path', { valor: './kustomize' })),
        teste('Apaga do cluster o que sair do Git', campo('Kustomization', 'podinfo', 'spec.prune', { valor: true }), campo('Kustomization', 'podinfo', 'spec.targetNamespace', { valor: 'default' })),
      ],
    }),
    exercicio({
      id: 'gitops-flux-helmrelease',
      titulo: 'Flux: HelmRepository e HelmRelease',
      dificuldade: 'dificil',
      resumo: `<p>Agora instale o podinfo como chart Helm, de forma declarativa. No namespace <code>flux-system</code>:</p>
        <ol>
          <li><code>HelmRepository</code> <code>podinfo</code> com a URL <code>https://stefanprodan.github.io/podinfo</code>, conferida a cada <code>1h</code>.</li>
          <li><code>HelmRelease</code> <code>podinfo</code> (a cada <code>10m</code>) com o chart <code>podinfo</code>, versão <code>6.x</code>, vindo
            do HelmRepository <code>podinfo</code>, e os values <code>replicaCount: 2</code>.</li>
        </ol>`,
      dica: 'Na HelmRelease v2, o chart fica em spec.chart.spec (chart, version e sourceRef) e os values em spec.values.',
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
        teste('O HelmRepository aponta para os charts do podinfo', existe('HelmRepository', 'podinfo'), campo('HelmRepository', 'podinfo', 'spec.url', { valor: 'https://stefanprodan.github.io/podinfo' })),
        teste('A HelmRelease instala o chart podinfo 6.x',
          campo('HelmRelease', 'podinfo', 'spec.chart.spec.chart', { valor: 'podinfo' }),
          campo('HelmRelease', 'podinfo', 'spec.chart.spec.version', { valor: '6.x' }),
          campo('HelmRelease', 'podinfo', 'spec.chart.spec.sourceRef.kind', { valor: 'HelmRepository' })),
        teste('Os values pedem 2 réplicas', campo('HelmRelease', 'podinfo', 'spec.values.replicaCount', { valor: 2 })),
      ],
    }),
  ],
};
