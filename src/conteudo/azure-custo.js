// Módulo Azure, tópico 6: custo e operação no AKS (upgrades sem queda, pools que zeram, Spot,
// requests e o node auto-provisioning).
// Segue docs/didatica.md: lição com exemplo comentado, passos, esqueleto, dicas e "como corrigir".
import { licao, exercicio, teste, existe, campo } from './util.js';

const ASO = 'containerservice.azure.com/v1api20240901';

/** Um node pool User do AKS via Azure Service Operator; `extra` entra no fim do spec. */
const pool = (nome, extra = '') => `
  apiVersion: ${ASO}
  kind: ManagedClustersAgentPool
  metadata:
    name: ${nome}
  spec:
    owner:
      name: loja-aks
    azureName: ${nome}
    mode: User
    vmSize: Standard_D4s_v5
    count: 2
${extra}`;

const AKS_NODECLASS = `
  apiVersion: karpenter.azure.com/v1beta1
  kind: AKSNodeClass
  metadata:
    name: padrao
  spec:
    imageFamily: AzureLinux
`;

/** Um NodePool do NAP; `requisitos` são itens extras de requirements e `extra` entra no fim do spec. */
const nodepool = (nome, { requisitos = '', extra = '' } = {}) => `
  apiVersion: karpenter.sh/v1
  kind: NodePool
  metadata:
    name: ${nome}
  spec:
    template:
      spec:
        nodeClassRef:
          group: karpenter.azure.com
          kind: AKSNodeClass
          name: padrao
        requirements:
          - key: karpenter.azure.com/sku-family
            operator: In
            values: ["D"]
${requisitos}${extra}`;

/** Um Deployment; `pod` entra no spec do Pod e `container` no container. */
const deploy = (nome, { pod = '', container = '', replicas = 3 } = {}) => `
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: ${nome}
  spec:
    replicas: ${replicas}
    selector:
      matchLabels:
        app: ${nome}
    template:
      metadata:
        labels:
          app: ${nome}
      spec:
${pod}        containers:
          - name: ${nome}
            image: mcr.microsoft.com/azuredocs/aks-helloworld:v1
${container}`;

const TOLERA_SPOT = `        tolerations:
          - key: kubernetes.azure.com/scalesetpriority
            operator: Equal
            value: spot
            effect: NoSchedule
`;

export const azureCusto = {
  id: 'azure-custo',
  titulo: 'Custo e operação no AKS',
  itens: [
    licao('aks-custo-licao', 'Custo no AKS: pagar só pelo que usa', 'medio', `
      <p>No AKS, o control plane do plano gratuito não é cobrado; quase toda a conta vem das <b>máquinas</b> dos node pools. Os mesmos
      truques da frota de caminhões valem aqui:</p>
      <ul>
        <li><b>Pools que zeram</b>: um pool User com autoscaler pode ter <code>minCount: 0</code>. Sem Pods para ele, nenhuma máquina
          ligada.</li>
        <li><b>Spot</b>: até 90% mais barato. Para quem aguenta interrupção, use toleration do taint
          <code>kubernetes.azure.com/scalesetpriority=spot:NoSchedule</code>; para quem só <b>prefere</b> Spot, uma afinidade
          <code>preferred</code> em vez de nodeSelector.</li>
        <li><b>Upgrades sem queda</b>: o AKS cria máquinas extras (<code>upgradeSettings.maxSurge</code>, como <code>"33%"</code>) e esvazia
          as antigas uma a uma. Os PodDisruptionBudgets seguram o esvaziamento para nunca derrubar todas as réplicas.</li>
        <li><b>requests certos</b>: o scheduler reserva o request. Memória com request igual ao limit; CPU sem limit.</li>
        <li><b>NAP</b> (Karpenter): <code>karpenter.sh/capacity-type</code> com <code>spot</code> e <code>on-demand</code>, consolidação e
          budgets, como na AWS.</li>
      </ul>
      <p><b>No cluster:</b> <code>kubectl get nodes -L kubernetes.azure.com/scalesetpriority</code> mostra quais nós são Spot.</p>`,
    `
      # Um pool de batch que dorme quando não há trabalho e troca máquinas com folga nos upgrades
      apiVersion: ${ASO}
      kind: ManagedClustersAgentPool
      metadata:
        name: batch
      spec:
        owner:
          name: loja-aks
        azureName: batch
        mode: User
        vmSize: Standard_D4s_v5
        count: 0
        enableAutoScaling: true
        minCount: 0                 # sem trabalho, nenhuma máquina
        maxCount: 10
        upgradeSettings:
          maxSurge: "33%"           # 1 máquina extra a cada 3 durante o upgrade
    `),

    exercicio({
      id: 'aks-pdb-upgrade',
      titulo: 'PDB para o upgrade do AKS',
      dificuldade: 'facil',
      resumo: `
        <p>No upgrade do AKS, cada nó é esvaziado antes de ser trocado. A loja tem 4 réplicas e aceita perder no máximo uma por vez.</p>
        <ol>
          <li>Crie o PodDisruptionBudget <code>loja</code> com <code>maxUnavailable: 1</code>.</li>
          <li>Em <code>selector.matchLabels</code>, <code>app: loja</code>.</li>
        </ol>
        <p><b>No cluster:</b> o esvaziamento só tira um Pod da loja quando os outros estão prontos. Um PDB impossível (por exemplo, 0 com 1
        réplica) trava o upgrade, e o AKS avisa.</p>`,
      inicial: `
        apiVersion: policy/v1
        kind: PodDisruptionBudget
        metadata:
          name: loja
        spec:
          maxUnavailable:      # TODO: 1
          selector:
            matchLabels:
              # TODO: app: loja
      `,
      dica: [
        'É o PDB dos Fundamentos, com maxUnavailable em vez de minAvailable.',
        'maxUnavailable: 1\nselector:\n  matchLabels:\n    app: loja',
      ],
      solucao: `
        apiVersion: policy/v1
        kind: PodDisruptionBudget
        metadata:
          name: loja
        spec:
          maxUnavailable: 1
          selector:
            matchLabels:
              app: loja
      `,
      testes: [
        teste({ descricao: 'O PDB existe', dica: 'Mantenha kind: PodDisruptionBudget e metadata.name: loja.' }, existe('PodDisruptionBudget', 'loja')),
        teste({ descricao: 'No máximo uma réplica fora', dica: 'Em spec: maxUnavailable: 1.' },
          campo('PodDisruptionBudget', 'loja', 'spec.maxUnavailable', { valor: 1 })),
        teste({ descricao: 'Protege os Pods da loja', dica: 'Em selector.matchLabels: app: loja.' },
          campo('PodDisruptionBudget', 'loja', 'spec.selector.matchLabels.app', { valor: 'loja' })),
      ],
    }),

    exercicio({
      id: 'aks-pool-maxsurge',
      titulo: 'Upgrade mais rápido com máquinas extras',
      dificuldade: 'medio',
      resumo: `
        <p>Com o padrão (1 máquina extra por vez), o upgrade do pool de 30 nós leva horas. Com mais máquinas extras, ele termina antes.</p>
        <ol>
          <li>No pool <code>geral</code>, crie <code>upgradeSettings</code>.</li>
          <li>Dentro, <code>maxSurge: "33%"</code> (texto, entre aspas).</li>
        </ol>
        <p><b>No cluster:</b> no upgrade, o AKS liga até 10 máquinas novas de uma vez (33% de 30), move os Pods (respeitando os PDBs) e
        desliga as antigas. Você paga as extras só durante o upgrade.</p>`,
      inicial: pool('geral', `
    # TODO: upgradeSettings com maxSurge "33%"
`),
      dica: [
        'upgradeSettings fica no spec do pool, alinhado com count.',
        'upgradeSettings:\n  maxSurge: "33%"',
      ],
      solucao: pool('geral', `
    upgradeSettings:
      maxSurge: "33%"
`),
      testes: [
        teste({ descricao: 'O pool existe', dica: 'Mantenha kind: ManagedClustersAgentPool e metadata.name: geral.' }, existe('ManagedClustersAgentPool', 'geral')),
        teste({ descricao: 'Usa 33% de máquinas extras no upgrade', dica: 'Em upgradeSettings: maxSurge: "33%".' },
          campo('ManagedClustersAgentPool', 'geral', 'spec.upgradeSettings.maxSurge', { valor: '33%' })),
      ],
    }),

    exercicio({
      id: 'aks-pool-zero',
      titulo: 'Pool de batch que dorme',
      dificuldade: 'facil',
      resumo: `
        <p>Os relatórios rodam só à noite. O pool <code>batch</code> pode ficar sem máquinas no resto do dia.</p>
        <ol>
          <li>No pool <code>batch</code>, <code>enableAutoScaling: true</code>.</li>
          <li><code>minCount: 0</code> e <code>maxCount: 10</code>.</li>
        </ol>
        <p><b>No cluster:</b> sem Pods para o pool, o autoscaler desliga as máquinas; quando o Job da noite chega, ele liga as que precisar.</p>`,
      inicial: pool('batch', `
    enableAutoScaling: true
    minCount:            # TODO: 0
    maxCount:            # TODO: 10
`),
      dica: [
        'Pools User podem ter minCount 0; pools System, não.',
        'minCount: 0\nmaxCount: 10',
      ],
      solucao: pool('batch', `
    enableAutoScaling: true
    minCount: 0
    maxCount: 10
`),
      testes: [
        teste({ descricao: 'O pool pode ficar sem máquinas', dica: 'No spec: minCount: 0 (com enableAutoScaling: true).' },
          campo('ManagedClustersAgentPool', 'batch', 'spec.minCount', { valor: 0 })),
        teste({ descricao: 'Cresce até 10 máquinas', dica: 'No spec: maxCount: 10.' },
          campo('ManagedClustersAgentPool', 'batch', 'spec.maxCount', { valor: 10 })),
      ],
    }),

    exercicio({
      id: 'aks-spot-preferencia',
      titulo: 'Preferir Spot sem depender dele',
      dificuldade: 'medio',
      resumo: `
        <p>A vitrine pode rodar no pool Spot, mas, se faltar Spot, deve rodar em outro pool em vez de ficar fora do ar.</p>
        <ol>
          <li>O Deployment <code>vitrine</code> já tem a toleration do taint do Spot.</li>
          <li>Crie <code>affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution</code> com um item de <code>weight: 100</code>.</li>
          <li>Em <code>preference.matchExpressions</code>: <code>key: kubernetes.azure.com/scalesetpriority</code>, <code>operator: In</code>,
            <code>values: ["spot"]</code>.</li>
        </ol>
        <p><b>No cluster:</b> a toleration <b>permite</b> o Spot; a preferência dá pontos extras a ele. Sem Spot livre, o Pod vai para um nó comum.</p>`,
      inicial: deploy('vitrine', { pod: `${TOLERA_SPOT}        # TODO: affinity com a preferência pelo Spot (passos 2 e 3)
` }),
      dica: [
        'É a mesma preferência do módulo da AWS, com a label do Spot do AKS.',
        'affinity fica no spec do Pod, alinhado com tolerations.',
        'affinity:\n  nodeAffinity:\n    preferredDuringSchedulingIgnoredDuringExecution:\n      - weight: 100\n        preference:\n          matchExpressions:\n            - key: kubernetes.azure.com/scalesetpriority\n              operator: In\n              values: ["spot"]',
      ],
      solucao: deploy('vitrine', { pod: `${TOLERA_SPOT}        affinity:
          nodeAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                preference:
                  matchExpressions:
                    - key: kubernetes.azure.com/scalesetpriority
                      operator: In
                      values: ["spot"]
` }),
      testes: [
        teste({ descricao: 'A preferência tem peso 100', dica: 'No item de preferredDuringSchedulingIgnoredDuringExecution: weight: 100.' },
          campo('Deployment', 'vitrine', 'spec.template.spec.affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].weight', { valor: 100 })),
        teste({ descricao: 'Prefere os nós Spot', dica: 'Em preference.matchExpressions: key: kubernetes.azure.com/scalesetpriority e values: ["spot"].' },
          campo('Deployment', 'vitrine', 'spec.template.spec.affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].preference.matchExpressions[0].key', { valor: 'kubernetes.azure.com/scalesetpriority' }),
          campo('Deployment', 'vitrine', 'spec.template.spec.affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].preference.matchExpressions[0].values', { contem: 'spot' })),
      ],
    }),

    exercicio({
      id: 'aks-requests-custo',
      titulo: 'Requests do tamanho do uso no AKS',
      dificuldade: 'medio',
      resumo: `
        <p>O catálogo reserva 1 CPU e 1Gi por réplica, mas usa perto de 100m e 200Mi. As reservas vazias fazem o autoscaler ligar máquinas à toa.</p>
        <ol>
          <li>No container <code>catalogo</code>, <code>resources.requests</code> com <code>cpu: 100m</code> e <code>memory: 256Mi</code>.</li>
          <li>Em <code>resources.limits</code>, só <code>memory: 256Mi</code>.</li>
          <li>Apague o limite de CPU.</li>
        </ol>
        <p><b>No cluster:</b> cabem bem mais Pods por nó, o pool precisa de menos máquinas, e o catálogo ainda usa a CPU livre num pico.</p>`,
      inicial: deploy('catalogo', { container: `            resources:
              requests:
                cpu: "1"         # TODO: 100m
                memory: 1Gi      # TODO: 256Mi
              limits:
                cpu: "1"         # TODO: apague esta linha (passo 3)
                memory: 1Gi      # TODO: 256Mi
` }),
      dica: [
        'É o mesmo ajuste do exercício "Requests do tamanho do uso" da AWS.',
        'resources:\n  requests:\n    cpu: 100m\n    memory: 256Mi\n  limits:\n    memory: 256Mi',
      ],
      solucao: deploy('catalogo', { container: `            resources:
              requests:
                cpu: 100m
                memory: 256Mi
              limits:
                memory: 256Mi
` }),
      testes: [
        teste({ descricao: 'A reserva é do tamanho do uso', dica: 'Em resources.requests: cpu: 100m e memory: 256Mi.' },
          campo('Deployment', 'catalogo', 'spec.template.spec.containers[name=catalogo].resources.requests.cpu', { valor: '100m' }),
          campo('Deployment', 'catalogo', 'spec.template.spec.containers[name=catalogo].resources.requests.memory', { valor: '256Mi' })),
        teste({ descricao: 'Memória com limite igual ao request, CPU sem limite', dica: 'Em resources.limits deixe só memory: 256Mi.' },
          campo('Deployment', 'catalogo', 'spec.template.spec.containers[name=catalogo].resources.limits.memory', { valor: '256Mi' }),
          campo('Deployment', 'catalogo', 'spec.template.spec.containers[name=catalogo].resources.limits.cpu', { ausente: true })),
      ],
    }),

    exercicio({
      id: 'aks-nap-spot',
      titulo: 'NAP comprando Spot primeiro',
      dificuldade: 'medio',
      existentes: AKS_NODECLASS,
      resumo: `
        <p>O NodePool <code>economico</code> do node auto-provisioning deve criar VMs Spot quando houver e cair para as comuns quando faltar.</p>
        <ol>
          <li>Em <code>requirements</code>, acrescente o item <code>key: karpenter.sh/capacity-type</code>, <code>operator: In</code>.</li>
          <li>Os <code>values</code> são <code>["spot", "on-demand"]</code>.</li>
        </ol>
        <p><b>No cluster:</b> o NAP tenta a VM Spot mais barata da família D; sem Spot disponível, cria uma comum.</p>`,
      inicial: nodepool('economico', { requisitos: `          # TODO: o requirement de karpenter.sh/capacity-type
` }),
      dica: [
        'É o mesmo requirement do Karpenter da AWS: a label karpenter.sh/capacity-type é igual nas duas nuvens.',
        '- key: karpenter.sh/capacity-type\n  operator: In\n  values: ["spot", "on-demand"]',
      ],
      solucao: nodepool('economico', { requisitos: `          - key: karpenter.sh/capacity-type
            operator: In
            values: ["spot", "on-demand"]
` }),
      testes: [
        teste({ descricao: 'O NodePool pode criar Spot', dica: 'Acrescente o requirement karpenter.sh/capacity-type com "spot".' },
          existe('NodePool', 'economico'),
          campo('NodePool', 'economico', 'spec.template.spec.requirements[key=karpenter.sh/capacity-type].values', { contem: 'spot' })),
        teste({ descricao: 'Cai para VMs comuns', dica: 'Nos values do mesmo requirement, inclua "on-demand".' },
          campo('NodePool', 'economico', 'spec.template.spec.requirements[key=karpenter.sh/capacity-type].values', { contem: 'on-demand' })),
      ],
    }),

    exercicio({
      id: 'aks-nap-consolidacao',
      titulo: 'NAP juntando Pods e devolvendo VMs',
      dificuldade: 'dificil',
      existentes: AKS_NODECLASS,
      resumo: `
        <p>Fora do pico sobram VMs quase vazias. O NAP pode consolidar, sem mexer em mais de um nó por vez, e com um teto de gastos.</p>
        <ol>
          <li>No NodePool <code>geral</code>, <code>disruption.consolidationPolicy: WhenEmptyOrUnderutilized</code> e
            <code>consolidateAfter: 10m</code>.</li>
          <li>Em <code>disruption.budgets</code>, o item <code>nodes: "1"</code>.</li>
          <li>Em <code>limits</code> (no spec), <code>cpu: "200"</code>.</li>
        </ol>
        <p><b>No cluster:</b> depois de 10 minutos com uma VM subutilizada, o NAP move os Pods (respeitando os PDBs) e a desliga, uma de cada vez.
        Somando tudo, nunca passa de 200 vCPUs.</p>`,
      inicial: nodepool('geral', { extra: `    disruption:
      consolidationPolicy:   # TODO: WhenEmptyOrUnderutilized
      consolidateAfter:      # TODO: 10m
      # TODO: budgets com nodes "1"
    # TODO: limits com cpu "200"
` }),
      dica: [
        'disruption e limits ficam direto no spec, alinhados com template.',
        'nodes e cpu são texto: "1" e "200" com aspas.',
        'disruption:\n  consolidationPolicy: WhenEmptyOrUnderutilized\n  consolidateAfter: 10m\n  budgets:\n    - nodes: "1"\nlimits:\n  cpu: "200"',
      ],
      solucao: nodepool('geral', { extra: `    disruption:
      consolidationPolicy: WhenEmptyOrUnderutilized
      consolidateAfter: 10m
      budgets:
        - nodes: "1"
    limits:
      cpu: "200"
` }),
      testes: [
        teste({ descricao: 'Consolida VMs subutilizadas depois de 10 minutos', dica: 'Em disruption: consolidationPolicy: WhenEmptyOrUnderutilized e consolidateAfter: 10m.' },
          campo('NodePool', 'geral', 'spec.disruption.consolidationPolicy', { valor: 'WhenEmptyOrUnderutilized' }),
          campo('NodePool', 'geral', 'spec.disruption.consolidateAfter', { valor: '10m' })),
        teste({ descricao: 'Uma VM de cada vez', dica: 'Em disruption.budgets: - nodes: "1".' },
          campo('NodePool', 'geral', 'spec.disruption.budgets[0].nodes', { valor: '1' })),
        teste({ descricao: 'Teto de 200 vCPUs', dica: 'Em spec.limits: cpu: "200".' },
          campo('NodePool', 'geral', 'spec.limits.cpu', { valor: '200' })),
      ],
    }),

    exercicio({
      id: 'aks-cronjob-spot',
      titulo: 'Relatório noturno no Spot, sem execuções em dobro',
      dificuldade: 'dificil',
      resumo: `
        <p>O relatório roda toda noite às 2h. Ele aguenta interrupção (vai para o Spot), mas não pode rodar duas vezes ao mesmo tempo.</p>
        <ol>
          <li>No CronJob <code>relatorio</code>, <code>schedule: "0 2 * * *"</code> e <code>concurrencyPolicy: Forbid</code>.</li>
          <li>No spec do Pod (em <code>jobTemplate.spec.template.spec</code>), a toleration do Spot: <code>key: kubernetes.azure.com/scalesetpriority</code>,
            <code>operator: Equal</code>, <code>value: spot</code>, <code>effect: NoSchedule</code>.</li>
          <li>No mesmo lugar, <code>nodeSelector</code> com <code>kubernetes.azure.com/scalesetpriority: spot</code>.</li>
        </ol>
        <p><b>No cluster:</b> às 2h nasce um Job no pool Spot. Se o anterior ainda estiver rodando, o novo não começa. Se a Azure recolher a VM, o
        Job tenta de novo em outra.</p>`,
      inicial: `
        apiVersion: batch/v1
        kind: CronJob
        metadata:
          name: relatorio
        spec:
          schedule:            # TODO: "0 2 * * *"
          # TODO: concurrencyPolicy: Forbid
          jobTemplate:
            spec:
              template:
                spec:
                  restartPolicy: OnFailure
                  # TODO: tolerations e nodeSelector do Spot (passos 2 e 3)
                  containers:
                    - name: relatorio
                      image: busybox:1.36
                      command: ["sh", "-c", "echo gerando relatorio"]
      `,
      dica: [
        'schedule e concurrencyPolicy ficam no spec do CronJob; tolerations e nodeSelector, no spec do Pod, lá dentro do jobTemplate.',
        'O schedule é texto: escreva entre aspas.',
        'schedule: "0 2 * * *"\nconcurrencyPolicy: Forbid\n...\ntolerations:\n  - key: kubernetes.azure.com/scalesetpriority\n    operator: Equal\n    value: spot\n    effect: NoSchedule\nnodeSelector:\n  kubernetes.azure.com/scalesetpriority: spot',
      ],
      solucao: `
        apiVersion: batch/v1
        kind: CronJob
        metadata:
          name: relatorio
        spec:
          schedule: "0 2 * * *"
          concurrencyPolicy: Forbid
          jobTemplate:
            spec:
              template:
                spec:
                  restartPolicy: OnFailure
                  tolerations:
                    - key: kubernetes.azure.com/scalesetpriority
                      operator: Equal
                      value: spot
                      effect: NoSchedule
                  nodeSelector:
                    kubernetes.azure.com/scalesetpriority: spot
                  containers:
                    - name: relatorio
                      image: busybox:1.36
                      command: ["sh", "-c", "echo gerando relatorio"]
      `,
      testes: [
        teste({ descricao: 'Roda às 2h, uma execução por vez', dica: 'No spec do CronJob: schedule: "0 2 * * *" e concurrencyPolicy: Forbid.' },
          { tipo: 'cronjob-schedule', cronjob: 'relatorio', schedule: '0 2 * * *' },
          campo('CronJob', 'relatorio', 'spec.concurrencyPolicy', { valor: 'Forbid' })),
        teste({ descricao: 'O Pod tolera o Spot', dica: 'Em jobTemplate.spec.template.spec.tolerations: a toleration do taint do Spot.' },
          campo('CronJob', 'relatorio', 'spec.jobTemplate.spec.template.spec.tolerations[0].value', { valor: 'spot' })),
        teste({ descricao: 'O Pod vai para o Spot', dica: 'No mesmo spec: nodeSelector com kubernetes.azure.com/scalesetpriority: spot.' },
          campo('CronJob', 'relatorio', 'spec.jobTemplate.spec.template.spec.nodeSelector["kubernetes.azure.com/scalesetpriority"]', { valor: 'spot' })),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'aks-pdb-upgrade': { dica: 'Use só maxUnavailable, como pede o passo 1.', regras: [campo('PodDisruptionBudget', 'loja', 'spec.minAvailable', { ausente: true })] },
    'aks-pool-maxsurge': { dica: 'O pool continua com as máquinas e o modo do esqueleto.', regras: [campo('ManagedClustersAgentPool', 'geral', 'spec.mode', { valor: 'User' }), campo('ManagedClustersAgentPool', 'geral', 'spec.count', { valor: 2 })] },
    'aks-pool-zero': { dica: 'O autoscaler continua ligado, e o pool é de aplicações.', regras: [campo('ManagedClustersAgentPool', 'batch', 'spec.enableAutoScaling', { valor: true }), campo('ManagedClustersAgentPool', 'batch', 'spec.mode', { valor: 'User' })] },
    'aks-spot-preferencia': { dica: 'É uma preferência: sem nodeSelector e com a toleration do esqueleto.', regras: [campo('Deployment', 'vitrine', 'spec.template.spec.nodeSelector', { ausente: true }), campo('Deployment', 'vitrine', 'spec.template.spec.tolerations[0].value', { valor: 'spot' })] },
    'aks-requests-custo': { dica: 'O Deployment continua com 3 réplicas.', regras: [campo('Deployment', 'catalogo', 'spec.replicas', { valor: 3 })] },
    'aks-nap-spot': { dica: 'O requirement da família de VM continua lá, e o novo usa o operador In.', regras: [campo('NodePool', 'economico', 'spec.template.spec.requirements[key=karpenter.azure.com/sku-family].values', { contem: 'D' }), campo('NodePool', 'economico', 'spec.template.spec.requirements[key=karpenter.sh/capacity-type].operator', { valor: 'In' })] },
    'aks-nap-consolidacao': { dica: 'Um só budget, e limits fica fora do template.', regras: [campo('NodePool', 'geral', 'spec.disruption.budgets', { maximo: 1 }), campo('NodePool', 'geral', 'spec.template.spec.limits', { ausente: true })] },
    'aks-cronjob-spot': { dica: 'Confira o operador e o efeito da toleration, e a política de reinício.', regras: [campo('CronJob', 'relatorio', 'spec.jobTemplate.spec.template.spec.tolerations[0].effect', { valor: 'NoSchedule' }), campo('CronJob', 'relatorio', 'spec.jobTemplate.spec.template.spec.restartPolicy', { valor: 'OnFailure' })] },
  },
};
