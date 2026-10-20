// Projeto: a entrega da loja com GitOps no Argo CD (AppProject, Applications e ApplicationSet).
// Segue docs/didatica.md: lição de arquitetura e 5 etapas; cada etapa parte da anterior.
import { licao, exercicio, teste, existe, campo } from './util.js';

const info = (n) => `<p class="etapa-info">🧩 <b>Projeto GitOps</b> · etapa ${n} de 5. O Git manda, o Argo CD obedece, nos ambientes de dev a produção.</p>`;
const REPO = 'https://github.com/exemplo/loja-gitops.git';
const CLUSTER = 'https://kubernetes.default.svc';

const PROJETO = `
  apiVersion: argoproj.io/v1alpha1
  kind: AppProject
  metadata:
    name: loja
    namespace: argocd
  spec:
    description: Aplicações da loja
    sourceRepos:
      - ${REPO}
    destinations:
      - server: ${CLUSTER}
        namespace: "loja-*"
`;

/** Uma Application da loja; `fonte` e `sync` entram no spec. */
const aplicacao = (nome, { caminho, revisao = 'main', namespace, sync = '', extra = '' }) => `
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: ${nome}
    namespace: argocd
  spec:
    project: loja
    source:
      repoURL: ${REPO}
      targetRevision: ${revisao}
      path: ${caminho}
    destination:
      server: ${CLUSTER}
      namespace: ${namespace}
${sync}${extra}`;

const SYNC_AUTO = `    syncPolicy:
      automated:
        prune: true
        selfHeal: true
`;

export const projetoGitops = {
  id: 'proj-gitops',
  titulo: 'Projeto GitOps: a loja entregue pelo Argo CD',
  icone: '🔄',
  itens: [
    licao('proj-gitops-arquitetura', 'Arquitetura da entrega com Argo CD', 'dificil', `
      <p>Neste projeto ninguém roda <code>kubectl apply</code> em produção: o <b>repositório Git</b> é a fonte da verdade e o <b>Argo CD</b>
      sincroniza o cluster com ele, como um encarregado de obra que segue a planta à risca e desfaz qualquer puxadinho.</p>
      <ul>
        <li><b>AppProject</b>: a cerca. Diz de quais repositórios as aplicações podem vir (<code>sourceRepos</code>) e para quais
          clusters e namespaces podem ir (<code>destinations</code>). Uma Application de fora da cerca é recusada.</li>
        <li><b>Application</b> (que você viu em Recursos Avançados): um caminho do repositório (<code>source</code>) num namespace
          (<code>destination</code>). Com <code>syncPolicy.automated</code>, o Argo CD aplica sozinho; <code>prune</code> apaga o
          que saiu do Git e <code>selfHeal</code> desfaz mudanças feitas na mão.</li>
        <li><code>syncOptions</code> ajustam a sincronização: <code>CreateNamespace=true</code> cria o namespace de destino;
          <code>RespectIgnoreDifferences=true</code> não mexe nos campos listados em <code>ignoreDifferences</code> (como as
          réplicas que o HPA controla).</li>
        <li><b>ApplicationSet</b>: uma fábrica de Applications. Um <b>gerador</b> (por exemplo, uma lista de ambientes) preenche um
          <code>template</code>, e cada item vira uma Application (<code>loja-{{ambiente}}</code>).</li>
      </ul>
      <p>As cinco etapas: o AppProject, a Application de dev (automática), a de produção (manual, numa tag), o ApplicationSet dos
      ambientes e o ajuste para conviver com o HPA.</p>
      <p><b>No cluster:</b> <code>kubectl get applications -n argocd</code> mostra cada aplicação com o estado <code>Synced</code> e
      <code>Healthy</code> quando o cluster está igual ao Git.</p>`,
    `
      # A cerca: de onde vêm e para onde vão as aplicações da loja
      apiVersion: argoproj.io/v1alpha1
      kind: AppProject
      metadata:
        name: loja
        namespace: argocd           # os recursos do Argo CD moram no namespace dele
      spec:
        sourceRepos:
          - ${REPO}
        destinations:
          - server: ${CLUSTER}      # este cluster
            namespace: "loja-*"     # só namespaces que começam com loja-
      ---
      # A fábrica: uma Application por ambiente da lista
      apiVersion: argoproj.io/v1alpha1
      kind: ApplicationSet
      metadata:
        name: loja
        namespace: argocd
      spec:
        generators:
          - list:
              elements:
                - ambiente: dev
                - ambiente: homolog
        template:
          metadata:
            name: "loja-{{ambiente}}"
          spec:
            project: loja
            source:
              repoURL: ${REPO}
              targetRevision: main
              path: "overlays/{{ambiente}}"
            destination:
              server: ${CLUSTER}
              namespace: "loja-{{ambiente}}"
    `),

    exercicio({
      id: 'proj-gitops-projeto',
      titulo: 'Etapa 1: a cerca das aplicações da loja',
      dificuldade: 'facil',
      resumo: `
        ${info(1)}
        <p>Antes das aplicações, a cerca: o AppProject <code>loja</code> só aceita o repositório da loja e os namespaces que começam com <code>loja-</code>.</p>
        <ol>
          <li>No AppProject <code>loja</code> (namespace <code>argocd</code>), em <code>sourceRepos</code>, o repositório <code>${REPO}</code>.</li>
          <li>Em <code>destinations</code>, um item com <code>server: ${CLUSTER}</code> e <code>namespace: "loja-*"</code>.</li>
        </ol>
        <p><b>No cluster:</b> uma Application do projeto loja apontando para outro repositório ou para o namespace <code>kube-system</code> fica com
        erro de permissão e não sincroniza.</p>`,
      inicial: `
        apiVersion: argoproj.io/v1alpha1
        kind: AppProject
        metadata:
          name: loja
          namespace: argocd
        spec:
          description: Aplicações da loja
          sourceRepos:
            # TODO: - o repositório da loja
          destinations:
            # TODO: - server e namespace "loja-*"
      `,
      dica: [
        'O exemplo da lição "Arquitetura da entrega com Argo CD" começa com este AppProject.',
        'O namespace com * vai entre aspas: o * sozinho tem outro significado no YAML.',
        `sourceRepos:\n  - ${REPO}\ndestinations:\n  - server: ${CLUSTER}\n    namespace: "loja-*"`,
      ],
      solucao: PROJETO,
      testes: [
        teste({ descricao: 'O AppProject existe no namespace do Argo CD', dica: 'Mantenha kind: AppProject, name: loja e namespace: argocd.' },
          existe('AppProject', 'loja'),
          campo('AppProject', 'loja', 'metadata.namespace', { valor: 'argocd' })),
        teste({ descricao: 'Só aceita o repositório da loja', dica: `Em sourceRepos: - ${REPO}.` },
          campo('AppProject', 'loja', 'spec.sourceRepos', { valor: [REPO] })),
        teste({ descricao: 'Só entrega nos namespaces loja-*', dica: 'Em destinations: namespace: "loja-*".' },
          campo('AppProject', 'loja', 'spec.destinations[0].namespace', { valor: 'loja-*' })),
      ],
    }),

    exercicio({
      id: 'proj-gitops-dev',
      titulo: 'Etapa 2: o ambiente de dev sincroniza sozinho',
      dificuldade: 'medio',
      existentes: PROJETO,
      resumo: `
        ${info(2)}
        <p>Em dev, todo commit na <code>main</code> deve chegar ao cluster sem ninguém clicar em nada.</p>
        <ol>
          <li>A Application <code>loja-dev</code> (projeto <code>loja</code>) usa o caminho <code>overlays/dev</code> da <code>main</code> e entrega no
            namespace <code>loja-dev</code>.</li>
          <li>Em <code>syncPolicy.automated</code>: <code>prune: true</code> e <code>selfHeal: true</code>.</li>
        </ol>
        <p><b>No cluster:</b> a cada commit, o Argo CD aplica o overlay de dev; se alguém mudar algo na mão, ele volta ao que está no Git.</p>`,
      inicial: aplicacao('loja-dev', { caminho: 'overlays/dev', namespace: 'loja-dev', sync: `    # TODO: syncPolicy.automated com prune e selfHeal (passo 2)
` }),
      dica: [
        'É a syncPolicy do exercício de sync automático de Recursos Avançados.',
        'syncPolicy:\n  automated:\n    prune: true\n    selfHeal: true',
      ],
      solucao: aplicacao('loja-dev', { caminho: 'overlays/dev', namespace: 'loja-dev', sync: SYNC_AUTO }),
      testes: [
        teste({ descricao: 'A Application usa o overlay de dev', dica: 'Em source: path: overlays/dev; em destination: namespace: loja-dev.' },
          campo('Application', 'loja-dev', 'spec.source.path', { valor: 'overlays/dev' }),
          campo('Application', 'loja-dev', 'spec.destination.namespace', { valor: 'loja-dev' })),
        teste({ descricao: 'Sincroniza sozinha, apaga sobras e desfaz mudanças na mão', dica: 'Em syncPolicy.automated: prune: true e selfHeal: true.' },
          campo('Application', 'loja-dev', 'spec.syncPolicy.automated.prune', { valor: true }),
          campo('Application', 'loja-dev', 'spec.syncPolicy.automated.selfHeal', { valor: true })),
      ],
    }),

    exercicio({
      id: 'proj-gitops-prod',
      titulo: 'Etapa 3: produção numa versão fixa, com sync manual',
      dificuldade: 'medio',
      existentes: PROJETO,
      resumo: `
        ${info(3)}
        <p>Produção não segue a <code>main</code>: ela usa uma <b>tag</b> do Git (uma versão congelada) e só sincroniza quando alguém aprova no Argo CD.
        O namespace ainda não existe.</p>
        <ol>
          <li>A Application <code>loja-prod</code> usa <code>targetRevision: v1.4.0</code> e <code>path: overlays/prod</code>, no namespace <code>loja-prod</code>.</li>
          <li><b>Sem</b> <code>automated</code>: em <code>syncPolicy</code>, só <code>syncOptions</code> com <code>CreateNamespace=true</code>.</li>
        </ol>
        <p><b>No cluster:</b> a Application aparece como <code>OutOfSync</code> até alguém clicar em Sync. Na primeira vez, o Argo CD cria o namespace
        <code>loja-prod</code>.</p>`,
      inicial: aplicacao('loja-prod', { caminho: 'overlays/prod', revisao: 'main           # TODO: a tag v1.4.0', namespace: 'loja-prod', sync: `    syncPolicy:
      # TODO: syncOptions com CreateNamespace=true (sem automated)
` }),
      dica: [
        'targetRevision aceita um branch, uma tag ou um commit.',
        'syncOptions é uma lista de textos dentro de syncPolicy.',
        'targetRevision: v1.4.0\n...\nsyncPolicy:\n  syncOptions:\n    - CreateNamespace=true',
      ],
      solucao: aplicacao('loja-prod', { caminho: 'overlays/prod', revisao: 'v1.4.0', namespace: 'loja-prod', sync: `    syncPolicy:
      syncOptions:
        - CreateNamespace=true
` }),
      testes: [
        teste({ descricao: 'Produção usa a tag v1.4.0', dica: 'Em source: targetRevision: v1.4.0.' },
          campo('Application', 'loja-prod', 'spec.source.targetRevision', { valor: 'v1.4.0' })),
        teste({ descricao: 'O sync é manual', dica: 'Não escreva automated em syncPolicy: em produção, alguém aprova.' },
          existe('Application', 'loja-prod'),
          campo('Application', 'loja-prod', 'spec.syncPolicy.automated', { ausente: true })),
        teste({ descricao: 'O Argo CD cria o namespace', dica: 'Em syncPolicy.syncOptions: - CreateNamespace=true.' },
          campo('Application', 'loja-prod', 'spec.syncPolicy.syncOptions', { contem: 'CreateNamespace=true' })),
      ],
    }),

    exercicio({
      id: 'proj-gitops-appset',
      titulo: 'Etapa 4: um ApplicationSet para os ambientes',
      dificuldade: 'dificil',
      existentes: PROJETO,
      resumo: `
        ${info(4)}
        <p>O time vai ter dev, homolog e qa. Em vez de copiar a Application três vezes, um ApplicationSet gera uma por ambiente.</p>
        <ol>
          <li>No ApplicationSet <code>loja</code>, o gerador <code>list</code> com os <code>elements</code> <code>ambiente: dev</code>, <code>ambiente: homolog</code>
            e <code>ambiente: qa</code>.</li>
          <li>No <code>template</code>: <code>metadata.name: "loja-{{ambiente}}"</code> e, no <code>source</code>, <code>path: "overlays/{{ambiente}}"</code>.</li>
          <li>No <code>destination</code>, <code>namespace: "loja-{{ambiente}}"</code>.</li>
        </ol>
        <p><b>No cluster:</b> o controlador do ApplicationSet cria as Applications <code>loja-dev</code>, <code>loja-homolog</code> e <code>loja-qa</code>.
        Tirar um item da lista apaga a Application dele.</p>`,
      inicial: `
        apiVersion: argoproj.io/v1alpha1
        kind: ApplicationSet
        metadata:
          name: loja
          namespace: argocd
        spec:
          generators:
            - list:
                elements:
                  # TODO: os três ambientes (passo 1)
          template:
            metadata:
              name: "loja-{{ambiente}}"
            spec:
              project: loja
              source:
                repoURL: ${REPO}
                targetRevision: main
                path:          # TODO: "overlays/{{ambiente}}"
              destination:
                server: ${CLUSTER}
                namespace:     # TODO: "loja-{{ambiente}}"
      `,
      dica: [
        'O exemplo da lição "Arquitetura da entrega com Argo CD" termina com este ApplicationSet.',
        'Cada elemento é um mapa com a chave ambiente; {{ambiente}} no template vira o valor de cada um. Use aspas por causa das chaves.',
        'elements:\n  - ambiente: dev\n  - ambiente: homolog\n  - ambiente: qa\n...\npath: "overlays/{{ambiente}}"\n...\nnamespace: "loja-{{ambiente}}"',
      ],
      solucao: `
        apiVersion: argoproj.io/v1alpha1
        kind: ApplicationSet
        metadata:
          name: loja
          namespace: argocd
        spec:
          generators:
            - list:
                elements:
                  - ambiente: dev
                  - ambiente: homolog
                  - ambiente: qa
          template:
            metadata:
              name: "loja-{{ambiente}}"
            spec:
              project: loja
              source:
                repoURL: ${REPO}
                targetRevision: main
                path: "overlays/{{ambiente}}"
              destination:
                server: ${CLUSTER}
                namespace: "loja-{{ambiente}}"
      `,
      testes: [
        teste({ descricao: 'A lista tem os três ambientes', dica: 'Em generators[0].list.elements: dev, homolog e qa.' },
          campo('ApplicationSet', 'loja', 'spec.generators[0].list.elements[*].ambiente', { valor: ['dev', 'homolog', 'qa'] })),
        teste({ descricao: 'Cada ambiente usa o próprio overlay', dica: 'No template, source.path: "overlays/{{ambiente}}".' },
          campo('ApplicationSet', 'loja', 'spec.template.spec.source.path', { valor: 'overlays/{{ambiente}}' })),
        teste({ descricao: 'Cada ambiente no próprio namespace', dica: 'No template, destination.namespace: "loja-{{ambiente}}".' },
          campo('ApplicationSet', 'loja', 'spec.template.spec.destination.namespace', { valor: 'loja-{{ambiente}}' })),
      ],
    }),

    exercicio({
      id: 'proj-gitops-hpa',
      titulo: 'Etapa 5: GitOps convivendo com o HPA',
      dificuldade: 'dificil',
      existentes: PROJETO,
      resumo: `
        ${info(5)}
        <p>Em homolog, o HPA muda as réplicas do Deployment <code>vitrine</code>, e o <code>selfHeal</code> do Argo CD volta o número para o que está no Git. Os dois
        ficam brigando. A saída é mandar o Argo CD ignorar esse campo.</p>
        <ol>
          <li>Na Application <code>loja-homolog</code>, em <code>ignoreDifferences</code>: <code>group: apps</code>, <code>kind: Deployment</code>,
            <code>name: vitrine</code> e <code>jsonPointers: ["/spec/replicas"]</code>.</li>
          <li>Em <code>syncPolicy.syncOptions</code>, acrescente <code>RespectIgnoreDifferences=true</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Argo CD continua aplicando o resto do Git e desfazendo mudanças na mão, mas deixa as réplicas da vitrine para o HPA.</p>`,
      inicial: aplicacao('loja-homolog', {
        caminho: 'overlays/homolog', namespace: 'loja-homolog', sync: `${SYNC_AUTO}      syncOptions:
        - CreateNamespace=true
        # TODO: RespectIgnoreDifferences=true (passo 2)
`, extra: `    # TODO: ignoreDifferences das réplicas da vitrine (passo 1)
`,
      }),
      dica: [
        'ignoreDifferences fica no spec da Application, alinhado com syncPolicy; é uma lista.',
        'O jsonPointer é o caminho do campo com barras: /spec/replicas.',
        'ignoreDifferences:\n  - group: apps\n    kind: Deployment\n    name: vitrine\n    jsonPointers: ["/spec/replicas"]\n...\nsyncOptions:\n  - CreateNamespace=true\n  - RespectIgnoreDifferences=true',
      ],
      solucao: aplicacao('loja-homolog', {
        caminho: 'overlays/homolog', namespace: 'loja-homolog', sync: `${SYNC_AUTO}      syncOptions:
        - CreateNamespace=true
        - RespectIgnoreDifferences=true
`, extra: `    ignoreDifferences:
      - group: apps
        kind: Deployment
        name: vitrine
        jsonPointers: ["/spec/replicas"]
`,
      }),
      testes: [
        teste({ descricao: 'O Argo CD ignora as réplicas da vitrine', dica: 'Em ignoreDifferences: kind: Deployment, name: vitrine e jsonPointers: ["/spec/replicas"].' },
          campo('Application', 'loja-homolog', 'spec.ignoreDifferences[0].name', { valor: 'vitrine' }),
          campo('Application', 'loja-homolog', 'spec.ignoreDifferences[0].jsonPointers', { contem: '/spec/replicas' })),
        teste({ descricao: 'A sincronização respeita o que é ignorado', dica: 'Em syncPolicy.syncOptions: - RespectIgnoreDifferences=true.' },
          campo('Application', 'loja-homolog', 'spec.syncPolicy.syncOptions', { contem: 'RespectIgnoreDifferences=true' })),
      ],
    }),
  ],
  ocultos: {
    'proj-gitops-projeto': { dica: 'Confira o servidor do destino.', regras: [campo('AppProject', 'loja', 'spec.destinations[0].server', { valor: CLUSTER })] },
    'proj-gitops-dev': { dica: 'A Application é do projeto loja e segue a main.', regras: [campo('Application', 'loja-dev', 'spec.project', { valor: 'loja' }), campo('Application', 'loja-dev', 'spec.source.targetRevision', { valor: 'main' })] },
    'proj-gitops-prod': { dica: 'Confira o caminho e o namespace de produção.', regras: [campo('Application', 'loja-prod', 'spec.source.path', { valor: 'overlays/prod' }), campo('Application', 'loja-prod', 'spec.destination.namespace', { valor: 'loja-prod' })] },
    'proj-gitops-appset': { dica: 'O template continua no projeto loja, com o nome que usa o ambiente.', regras: [campo('ApplicationSet', 'loja', 'spec.template.spec.project', { valor: 'loja' }), campo('ApplicationSet', 'loja', 'spec.template.metadata.name', { valor: 'loja-{{ambiente}}' })] },
    'proj-gitops-hpa': { dica: 'O selfHeal continua ligado, e o ignoreDifferences é do grupo apps.', regras: [campo('Application', 'loja-homolog', 'spec.syncPolicy.automated.selfHeal', { valor: true }), campo('Application', 'loja-homolog', 'spec.ignoreDifferences[0].group', { valor: 'apps' })] },
  },
};
