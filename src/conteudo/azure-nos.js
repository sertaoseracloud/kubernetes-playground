// Módulo Azure, tópico 2: os nós do AKS e a escala (node pools System e User, autoscaler, Spot,
// KEDA e o node auto-provisioning com Karpenter).
// Segue docs/didatica.md: lição com exemplo comentado, passos, esqueleto, dicas e "como corrigir".
import { licao, exercicio, teste, existe, campo, docs } from './util.js';

const ASO = 'containerservice.azure.com/v1api20240901';

/** Um node pool do AKS via Azure Service Operator; `extra` entra no fim do spec. */
const pool = (nome, extra = '', { modo = 'User', count = 2 } = {}) => `
  apiVersion: ${ASO}
  kind: ManagedClustersAgentPool
  metadata:
    name: ${nome}
  spec:
    owner:
      name: loja-aks
    azureName: ${nome}
    mode: ${modo}
    vmSize: Standard_D4s_v5
    count: ${count}
${extra}`;

/** Um Deployment simples do worker; `pod` entra no spec do Pod. */
const deployWorker = (nome, pod = '') => `
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: ${nome}
  spec:
    replicas: 2
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
`;

const WORKER = deployWorker('worker');

const AKS_NODECLASS = `
  apiVersion: karpenter.azure.com/v1beta1
  kind: AKSNodeClass
  metadata:
    name: padrao
  spec:
    imageFamily: AzureLinux
`;

export const azureNos = {
  id: 'azure-nos',
  titulo: 'Nós e escala no AKS',
  itens: [
    licao('aks-node-pools-spot', 'Node pools e spot instances', 'medio', `
      <p>Um <b>node pool</b> é um grupo de máquinas virtuais iguais do cluster, como uma frota de carros do mesmo modelo. Ter vários
      pools é ter carros diferentes para trabalhos diferentes.</p>
      <ul>
        <li><b>Modo</b>: pools <code>System</code> rodam o CoreDNS e os add-ons (todo cluster precisa de pelo menos um); pools
          <code>User</code> rodam as aplicações. Um taint <code>CriticalAddonsOnly=true:NoSchedule</code> no pool System afasta as
          aplicações dele.</li>
        <li><b>vmSize</b> e <b>count</b>: o tamanho da máquina (<code>Standard_D4s_v5</code>) e quantas.</li>
        <li><b>Autoscaler</b>: com <code>enableAutoScaling: true</code>, o Cluster Autoscaler do AKS ajusta o pool entre
          <code>minCount</code> e <code>maxCount</code>. Pools User podem ir até 0.</li>
        <li><b>nodeLabels</b> e <b>nodeTaints</b>: etiquetas e placas de "acesso restrito" em todo nó do pool. No AKS, o taint é um
          texto <code>chave=valor:Efeito</code>.</li>
        <li><b>Spot</b>: com <code>scaleSetPriority: Spot</code>, as máquinas custam bem menos, mas a Azure pode tirá-las com 30
          segundos de aviso. O AKS põe sozinho o taint <code>kubernetes.azure.com/scalesetpriority=spot:NoSchedule</code> e a label
          <code>kubernetes.azure.com/scalesetpriority=spot</code>. Pools System não podem ser Spot.</li>
      </ul>
      <p>O pool é um recurso da Azure. Aqui ele é escrito como YAML com o <b>Azure Service Operator</b>, no recurso
      <code>ManagedClustersAgentPool</code> (<code>owner</code> aponta para o cluster).</p>
      <p><b>No cluster:</b> as máquinas do pool aparecem em <code>kubectl get nodes</code> com a label
      <code>kubernetes.azure.com/agentpool</code> e os taints do pool.</p>`,
    `
      # Um pool User que escala de 1 a 5 máquinas
      apiVersion: ${ASO}
      kind: ManagedClustersAgentPool
      metadata:
        name: geral
      spec:
        owner:
          name: loja-aks              # o cluster AKS dono do pool
        azureName: geral              # vira a label kubernetes.azure.com/agentpool
        mode: User                    # aplicações (System = add-ons)
        vmSize: Standard_D4s_v5
        count: 1
        enableAutoScaling: true       # o autoscaler ajusta entre min e max
        minCount: 1
        maxCount: 5
        nodeLabels:
          carga: geral
    `),

    exercicio({
      id: 'aks-pool-user',
      titulo: 'Um node pool para as aplicações',
      dificuldade: 'facil',
      resumo: `
        <p>O cluster <code>loja-aks</code> só tem o pool System. As aplicações vão para um pool User próprio.</p>
        <ol>
          <li>No <code>ManagedClustersAgentPool</code> <code>geral</code>, escreva <code>mode: User</code>.</li>
          <li><code>vmSize: Standard_D4s_v5</code> e <code>count: 2</code>.</li>
        </ol>
        <p><b>No cluster:</b> a Azure cria um scale set com 2 máquinas, que entram no cluster com a label
        <code>kubernetes.azure.com/agentpool=geral</code>.</p>`,
      inicial: `
        apiVersion: ${ASO}
        kind: ManagedClustersAgentPool
        metadata:
          name: geral
        spec:
          owner:
            name: loja-aks
          azureName: geral
          mode:                # TODO: User
          vmSize:              # TODO: Standard_D4s_v5
          count:               # TODO: 2
      `,
      dica: [
        'O exemplo da lição "Node pools e spot instances" tem um pool User.',
        'mode: User\nvmSize: Standard_D4s_v5\ncount: 2',
      ],
      solucao: pool('geral'),
      testes: [
        teste({ descricao: 'O pool geral é de aplicações', dica: 'No spec, escreva mode: User.' },
          existe('ManagedClustersAgentPool', 'geral'),
          campo('ManagedClustersAgentPool', 'geral', 'spec.mode', { valor: 'User' })),
        teste({ descricao: 'Tem 2 máquinas Standard_D4s_v5', dica: 'No spec: vmSize: Standard_D4s_v5 e count: 2.' },
          campo('ManagedClustersAgentPool', 'geral', 'spec.vmSize', { valor: 'Standard_D4s_v5' }),
          campo('ManagedClustersAgentPool', 'geral', 'spec.count', { valor: 2 })),
      ],
    }),

    exercicio({
      id: 'aks-pool-autoscale',
      titulo: 'Node pool com autoscaler',
      dificuldade: 'medio',
      resumo: `
        <p>Na Black Friday, o pool <code>geral</code> precisa crescer sozinho; de madrugada, encolher.</p>
        <ol>
          <li>No pool <code>geral</code>, escreva <code>enableAutoScaling: true</code>.</li>
          <li><code>minCount: 2</code> e <code>maxCount: 10</code>.</li>
        </ol>
        <p><b>No cluster:</b> quando um Pod fica <code>Pending</code> por falta de espaço, o autoscaler do AKS liga mais uma máquina; quando
        uma fica ociosa, ele a desliga, sempre entre 2 e 10.</p>`,
      inicial: pool('geral', `
    enableAutoScaling:   # TODO: true
    # TODO: minCount 2 e maxCount 10
`),
      dica: [
        'Os três campos ficam no spec, alinhados com count.',
        'Com o autoscaler ligado, minCount e maxCount são obrigatórios.',
        'enableAutoScaling: true\nminCount: 2\nmaxCount: 10',
      ],
      solucao: pool('geral', `
    enableAutoScaling: true
    minCount: 2
    maxCount: 10
`),
      testes: [
        teste({ descricao: 'O autoscaler está ligado', dica: 'No spec, escreva enableAutoScaling: true.' },
          campo('ManagedClustersAgentPool', 'geral', 'spec.enableAutoScaling', { valor: true })),
        teste({ descricao: 'Fica entre 2 e 10 máquinas', dica: 'No spec: minCount: 2 e maxCount: 10.' },
          campo('ManagedClustersAgentPool', 'geral', 'spec.minCount', { valor: 2 }),
          campo('ManagedClustersAgentPool', 'geral', 'spec.maxCount', { valor: 10 })),
      ],
    }),

    exercicio({
      id: 'aks-pool-system-taint',
      titulo: 'Pool System só para os add-ons',
      dificuldade: 'medio',
      resumo: `
        <p>Uma aplicação caiu o CoreDNS ao gastar toda a memória do pool System. A recomendação do AKS é reservar o pool System para os
        add-ons com um taint.</p>
        <ol>
          <li>O pool <code>sistema</code> tem <code>mode: System</code>.</li>
          <li>Em <code>nodeTaints</code>, a lista com o texto <code>CriticalAddonsOnly=true:NoSchedule</code>.</li>
        </ol>
        <p><b>No cluster:</b> só os Pods com a toleration desse taint (o CoreDNS, o metrics-server e os outros add-ons já têm) entram nos nós
        do pool System. As aplicações vão para os pools User.</p>`,
      inicial: pool('sistema', `
    # TODO: nodeTaints com CriticalAddonsOnly=true:NoSchedule
`, { modo: 'System', count: 3 }),
      dica: [
        'No AKS o taint é um texto só, no formato chave=valor:Efeito, dentro de uma lista.',
        'nodeTaints:\n  - CriticalAddonsOnly=true:NoSchedule',
      ],
      solucao: pool('sistema', `
    nodeTaints:
      - CriticalAddonsOnly=true:NoSchedule
`, { modo: 'System', count: 3 }),
      testes: [
        teste({ descricao: 'O pool é System', dica: 'Mantenha mode: System.' },
          campo('ManagedClustersAgentPool', 'sistema', 'spec.mode', { valor: 'System' })),
        teste({ descricao: 'Só os add-ons entram', dica: 'Em nodeTaints, escreva - CriticalAddonsOnly=true:NoSchedule.' },
          campo('ManagedClustersAgentPool', 'sistema', 'spec.nodeTaints', { contem: 'CriticalAddonsOnly=true:NoSchedule' })),
      ],
    }),

    exercicio({
      id: 'aks-pod-agentpool',
      titulo: 'Deployment no pool certo',
      dificuldade: 'facil',
      resumo: `
        <p>O pool <code>geral</code> existe. Agora o Deployment <code>worker</code> precisa rodar <b>nele</b>.</p>
        <ol>
          <li>No spec do Pod (dentro de <code>template</code>), crie <code>nodeSelector</code>.</li>
          <li>A chave é <code>kubernetes.azure.com/agentpool</code> e o valor é <code>geral</code>.</li>
        </ol>
        <p><b>No cluster:</b> o scheduler só considera os nós do pool geral. Se o pool estiver cheio, o Pod fica <code>Pending</code> e o autoscaler
        do pool liga mais uma máquina.</p>`,
      inicial: deployWorker('worker', `        # TODO: nodeSelector com kubernetes.azure.com/agentpool: geral
`),
      dica: [
        'O exemplo da lição "Arquitetura do AKS" usa a mesma label.',
        'nodeSelector:\n  kubernetes.azure.com/agentpool: geral',
      ],
      solucao: deployWorker('worker', `        nodeSelector:
          kubernetes.azure.com/agentpool: geral
`),
      testes: [
        teste({ descricao: 'O Deployment existe', dica: 'Mantenha kind: Deployment e metadata.name: worker.' }, existe('Deployment', 'worker')),
        teste({ descricao: 'Os Pods vão para o pool geral', dica: 'Em template.spec: nodeSelector com kubernetes.azure.com/agentpool: geral.' },
          campo('Deployment', 'worker', 'spec.template.spec.nodeSelector["kubernetes.azure.com/agentpool"]', { valor: 'geral' })),
      ],
    }),

    exercicio({
      id: 'aks-pool-spot',
      titulo: 'Node pool Spot',
      dificuldade: 'medio',
      resumo: `
        <p>Os workers de fila aguentam ser interrompidos e vão para um pool Spot, bem mais barato.</p>
        <ol>
          <li>No pool <code>spot</code>, escreva <code>scaleSetPriority: Spot</code>.</li>
          <li><code>scaleSetEvictionPolicy: Delete</code> (a máquina recolhida é apagada, sem cobrar o disco parado).</li>
          <li><code>spotMaxPrice: -1</code> (aceita pagar até o preço normal, para nunca ser tirada por preço).</li>
        </ol>
        <p><b>No cluster:</b> os nós nascem com o taint <code>kubernetes.azure.com/scalesetpriority=spot:NoSchedule</code>: só entra quem tiver a
        toleration.</p>`,
      inicial: pool('spot', `
    scaleSetPriority:        # TODO: Spot
    scaleSetEvictionPolicy:  # TODO: Delete
    # TODO: spotMaxPrice -1
`),
      dica: [
        'Os três campos ficam no spec do pool, alinhados com count.',
        'spotMaxPrice é um número: -1, sem aspas.',
        'scaleSetPriority: Spot\nscaleSetEvictionPolicy: Delete\nspotMaxPrice: -1',
      ],
      solucao: pool('spot', `
    scaleSetPriority: Spot
    scaleSetEvictionPolicy: Delete
    spotMaxPrice: -1
`),
      testes: [
        teste({ descricao: 'O pool é Spot', dica: 'No spec, escreva scaleSetPriority: Spot.' },
          campo('ManagedClustersAgentPool', 'spot', 'spec.scaleSetPriority', { valor: 'Spot' })),
        teste({ descricao: 'A máquina recolhida é apagada', dica: 'No spec, escreva scaleSetEvictionPolicy: Delete.' },
          campo('ManagedClustersAgentPool', 'spot', 'spec.scaleSetEvictionPolicy', { valor: 'Delete' })),
        teste({ descricao: 'Nunca é tirada por preço', dica: 'No spec, escreva spotMaxPrice: -1.' },
          campo('ManagedClustersAgentPool', 'spot', 'spec.spotMaxPrice', { valor: -1 })),
      ],
    }),

    exercicio({
      id: 'aks-pod-spot-toleration',
      titulo: 'Workers que rodam no pool Spot',
      dificuldade: 'medio',
      resumo: `
        <p>O pool Spot tem o taint que o AKS coloca. O Deployment <code>worker</code> precisa da toleration (a permissão) e do
        nodeSelector (o pedido para ir só para lá).</p>
        <ol>
          <li>Em <code>tolerations</code>: <code>key: kubernetes.azure.com/scalesetpriority</code>, <code>operator: Equal</code>,
            <code>value: spot</code> e <code>effect: NoSchedule</code>.</li>
          <li>Em <code>nodeSelector</code>: <code>kubernetes.azure.com/scalesetpriority: spot</code>.</li>
        </ol>
        <p><b>No cluster:</b> os workers vão para as máquinas Spot. Quando a Azure recolhe uma, os Pods dela são recriados em outra.</p>`,
      inicial: deployWorker('worker', `        # TODO: tolerations com o taint do Spot (passo 1)
        # TODO: nodeSelector com a label do Spot (passo 2)
`),
      dica: [
        'É a mesma dupla toleration + nodeSelector do pool com GPU, com a chave que o AKS usa no Spot.',
        'No Pod, o efeito segue o Kubernetes: NoSchedule.',
        'tolerations:\n  - key: kubernetes.azure.com/scalesetpriority\n    operator: Equal\n    value: spot\n    effect: NoSchedule\nnodeSelector:\n  kubernetes.azure.com/scalesetpriority: spot',
      ],
      solucao: deployWorker('worker', `        tolerations:
          - key: kubernetes.azure.com/scalesetpriority
            operator: Equal
            value: spot
            effect: NoSchedule
        nodeSelector:
          kubernetes.azure.com/scalesetpriority: spot
`),
      testes: [
        teste({ descricao: 'Os Pods toleram o taint do Spot', dica: 'Em tolerations: key: kubernetes.azure.com/scalesetpriority, value: spot e effect: NoSchedule.' },
          campo('Deployment', 'worker', 'spec.template.spec.tolerations[0].key', { valor: 'kubernetes.azure.com/scalesetpriority' }),
          campo('Deployment', 'worker', 'spec.template.spec.tolerations[0].value', { valor: 'spot' })),
        teste({ descricao: 'Os Pods vão só para o Spot', dica: 'Em nodeSelector: kubernetes.azure.com/scalesetpriority: spot.' },
          campo('Deployment', 'worker', 'spec.template.spec.nodeSelector["kubernetes.azure.com/scalesetpriority"]', { valor: 'spot' })),
      ],
    }),

    licao('aks-keda-licao', 'KEDA: escalar pelo que interessa', 'dificil', `
      <p>O HPA escala por CPU e memória. Mas, para um worker de fila, o que importa é <b>quantas mensagens estão esperando</b>. O
      <b>KEDA</b> (add-on do AKS) escala pelo evento certo, e até <b>zera</b> as réplicas quando não há trabalho. É o gerente que
      olha a fila do caixa, e não o cansaço dos caixas.</p>
      <ul>
        <li><b>ScaledObject</b>: diz qual Deployment escalar (<code>scaleTargetRef</code>), os limites
          (<code>minReplicaCount</code>, que pode ser 0, e <code>maxReplicaCount</code>) e os <b>triggers</b>.</li>
        <li>Cada trigger tem um <code>type</code> (<code>cron</code>, <code>azure-servicebus</code>, <code>azure-queue</code>,
          <code>prometheus</code>...) e um <code>metadata</code> com os detalhes, sempre em texto.</li>
        <li><code>pollingInterval</code> (de quanto em quanto tempo olhar, em segundos) e <code>cooldownPeriod</code> (quanto
          esperar sem eventos antes de zerar).</li>
        <li><b>TriggerAuthentication</b>: como o KEDA se autentica para ler a fila. Com
          <code>podIdentity.provider: azure-workload</code>, ele usa o Workload Identity, sem senha.</li>
      </ul>
      <p><b>No cluster:</b> o KEDA cria e cuida de um HPA para o Deployment (<code>keda-hpa-...</code>). Com 0 réplicas, quem acorda o
      Deployment é o próprio KEDA, quando chega a primeira mensagem.</p>`,
    `
      # Quem autentica: o KEDA lê o Service Bus com o Workload Identity
      apiVersion: keda.sh/v1alpha1
      kind: TriggerAuthentication
      metadata:
        name: servicebus-wi
      spec:
        podIdentity:
          provider: azure-workload
      ---
      # O que escalar e por quê
      apiVersion: keda.sh/v1alpha1
      kind: ScaledObject
      metadata:
        name: worker
      spec:
        scaleTargetRef:
          name: worker                  # o Deployment
        minReplicaCount: 0              # sem mensagens, nenhum Pod
        maxReplicaCount: 20
        triggers:
          - type: azure-servicebus
            metadata:
              queueName: pedidos
              namespace: loja-sb        # o namespace do Service Bus (na Azure)
              messageCount: "10"        # 1 réplica a cada 10 mensagens
            authenticationRef:
              name: servicebus-wi
    `),

    exercicio({
      id: 'aks-keda-cron',
      titulo: 'Mais réplicas no horário comercial',
      dificuldade: 'facil',
      existentes: WORKER,
      resumo: `
        <p>O atendimento tem pico das 8h às 20h. Um trigger <code>cron</code> do KEDA deixa 5 réplicas prontas nesse horário.</p>
        <ol>
          <li>No ScaledObject <code>worker</code>, o trigger tem <code>type: cron</code>.</li>
          <li>Em <code>metadata</code>: <code>timezone: America/Sao_Paulo</code>, <code>start: "0 8 * * *"</code> e <code>end: "0 20 * * *"</code>.</li>
          <li>Também em <code>metadata</code>: <code>desiredReplicas: "5"</code>.</li>
        </ol>
        <p><b>No cluster:</b> às 8h de Brasília o KEDA sobe o Deployment para 5 réplicas; às 20h ele volta ao mínimo.</p>`,
      inicial: `
        apiVersion: keda.sh/v1alpha1
        kind: ScaledObject
        metadata:
          name: worker
        spec:
          scaleTargetRef:
            name: worker
          minReplicaCount: 1
          maxReplicaCount: 10
          triggers:
            - type:            # TODO: cron
              metadata:
                timezone: America/Sao_Paulo
                # TODO: start, end e desiredReplicas (passos 2 e 3)
      `,
      dica: [
        'Os valores de metadata do trigger são sempre texto: as expressões cron e o "5" entre aspas.',
        'start e end usam o formato do CronJob: minuto, hora, dia, mês e dia da semana.',
        'type: cron\nmetadata:\n  timezone: America/Sao_Paulo\n  start: "0 8 * * *"\n  end: "0 20 * * *"\n  desiredReplicas: "5"',
      ],
      solucao: `
        apiVersion: keda.sh/v1alpha1
        kind: ScaledObject
        metadata:
          name: worker
        spec:
          scaleTargetRef:
            name: worker
          minReplicaCount: 1
          maxReplicaCount: 10
          triggers:
            - type: cron
              metadata:
                timezone: America/Sao_Paulo
                start: "0 8 * * *"
                end: "0 20 * * *"
                desiredReplicas: "5"
      `,
      testes: [
        teste({ descricao: 'O trigger é de horário', dica: 'O type vazio impede o apply: escreva type: cron.' },
          existe('ScaledObject', 'worker'),
          campo('ScaledObject', 'worker', 'spec.triggers[0].type', { valor: 'cron' })),
        teste({ descricao: 'Das 8h às 20h', dica: 'Em metadata: start: "0 8 * * *" e end: "0 20 * * *".' },
          campo('ScaledObject', 'worker', 'spec.triggers[0].metadata.start', { valor: '0 8 * * *' }),
          campo('ScaledObject', 'worker', 'spec.triggers[0].metadata.end', { valor: '0 20 * * *' })),
        teste({ descricao: 'Com 5 réplicas', dica: 'Em metadata: desiredReplicas: "5".' },
          campo('ScaledObject', 'worker', 'spec.triggers[0].metadata.desiredReplicas', { valor: '5' })),
      ],
    }),

    exercicio({
      id: 'aks-keda-zero',
      titulo: 'Worker que dorme quando não há trabalho',
      dificuldade: 'medio',
      existentes: WORKER,
      resumo: `
        <p>O worker de relatórios recebe trabalho poucas vezes por dia. Com o KEDA, ele pode ficar com <b>zero</b> réplicas no resto do
        tempo.</p>
        <ol>
          <li>No ScaledObject <code>worker</code>, <code>minReplicaCount: 0</code> e <code>maxReplicaCount: 30</code>.</li>
          <li><code>pollingInterval: 15</code> (olhar a fila a cada 15 segundos).</li>
          <li><code>cooldownPeriod: 300</code> (5 minutos sem mensagens antes de zerar).</li>
        </ol>
        <p><b>No cluster:</b> sem mensagens por 5 minutos, o Deployment vai a 0 Pods; a primeira mensagem nova o acorda em até 15 segundos.</p>`,
      inicial: `
        apiVersion: keda.sh/v1alpha1
        kind: ScaledObject
        metadata:
          name: worker
        spec:
          scaleTargetRef:
            name: worker
          minReplicaCount:     # TODO: 0
          maxReplicaCount:     # TODO: 30
          # TODO: pollingInterval 15 e cooldownPeriod 300
          triggers:
            - type: azure-queue
              metadata:
                queueName: relatorios
                accountName: lojastorage
                queueLength: "5"
              authenticationRef:
                name: storage-wi
      `,
      dica: [
        'Os quatro campos são números e ficam no spec, alinhados com triggers.',
        'minReplicaCount: 0\nmaxReplicaCount: 30\npollingInterval: 15\ncooldownPeriod: 300',
      ],
      solucao: `
        apiVersion: keda.sh/v1alpha1
        kind: ScaledObject
        metadata:
          name: worker
        spec:
          scaleTargetRef:
            name: worker
          minReplicaCount: 0
          maxReplicaCount: 30
          pollingInterval: 15
          cooldownPeriod: 300
          triggers:
            - type: azure-queue
              metadata:
                queueName: relatorios
                accountName: lojastorage
                queueLength: "5"
              authenticationRef:
                name: storage-wi
      `,
      testes: [
        teste({ descricao: 'Pode ir a zero réplicas', dica: 'No spec, escreva minReplicaCount: 0.' },
          campo('ScaledObject', 'worker', 'spec.minReplicaCount', { valor: 0 }),
          campo('ScaledObject', 'worker', 'spec.maxReplicaCount', { valor: 30 })),
        teste({ descricao: 'Olha a fila a cada 15 segundos', dica: 'No spec, escreva pollingInterval: 15.' },
          campo('ScaledObject', 'worker', 'spec.pollingInterval', { valor: 15 })),
        teste({ descricao: 'Espera 5 minutos antes de zerar', dica: 'No spec, escreva cooldownPeriod: 300.' },
          campo('ScaledObject', 'worker', 'spec.cooldownPeriod', { valor: 300 })),
      ],
    }),

    exercicio({
      id: 'aks-keda-servicebus',
      titulo: 'Escalar pela fila do Service Bus, sem senha',
      dificuldade: 'dificil',
      existentes: WORKER,
      resumo: `
        <p>Os pedidos chegam na fila <code>pedidos</code> do Service Bus <code>loja-sb</code>. O worker deve ter uma réplica a cada 20
        mensagens, e o KEDA deve ler a fila com o Workload Identity.</p>
        <ol>
          <li>Crie a <code>TriggerAuthentication</code> <code>servicebus-wi</code> com <code>podIdentity.provider: azure-workload</code>.</li>
          <li>No ScaledObject <code>worker</code>, o trigger <code>azure-servicebus</code> com <code>queueName: pedidos</code>,
            <code>namespace: loja-sb</code> e <code>messageCount: "20"</code>.</li>
          <li>No trigger, <code>authenticationRef.name: servicebus-wi</code>.</li>
        </ol>
        <p><b>No cluster:</b> com 100 mensagens na fila, o KEDA pede 5 réplicas ao HPA que ele criou; com a fila vazia, volta ao mínimo.</p>`,
      inicial: `
        apiVersion: keda.sh/v1alpha1
        kind: TriggerAuthentication
        metadata:
          name: servicebus-wi
        spec:
          # TODO: podIdentity com provider azure-workload (passo 1)
        ---
        apiVersion: keda.sh/v1alpha1
        kind: ScaledObject
        metadata:
          name: worker
        spec:
          scaleTargetRef:
            name: worker
          minReplicaCount: 0
          maxReplicaCount: 20
          triggers:
            - type: azure-servicebus
              metadata:
                queueName:     # TODO: pedidos
                namespace: loja-sb
                messageCount:  # TODO: "20"
              # TODO: authenticationRef com a TriggerAuthentication (passo 3)
      `,
      dica: [
        'O exemplo da lição "KEDA" tem as duas peças.',
        'authenticationRef fica no item do trigger, alinhado com metadata.',
        'podIdentity:\n  provider: azure-workload\n...\nqueueName: pedidos\nmessageCount: "20"\nauthenticationRef:\n  name: servicebus-wi',
      ],
      solucao: `
        apiVersion: keda.sh/v1alpha1
        kind: TriggerAuthentication
        metadata:
          name: servicebus-wi
        spec:
          podIdentity:
            provider: azure-workload
        ---
        apiVersion: keda.sh/v1alpha1
        kind: ScaledObject
        metadata:
          name: worker
        spec:
          scaleTargetRef:
            name: worker
          minReplicaCount: 0
          maxReplicaCount: 20
          triggers:
            - type: azure-servicebus
              metadata:
                queueName: pedidos
                namespace: loja-sb
                messageCount: "20"
              authenticationRef:
                name: servicebus-wi
      `,
      testes: [
        teste({ descricao: 'O KEDA usa o Workload Identity', dica: 'Na TriggerAuthentication: podIdentity.provider: azure-workload.' },
          campo('TriggerAuthentication', 'servicebus-wi', 'spec.podIdentity.provider', { valor: 'azure-workload' })),
        teste({ descricao: 'Lê a fila pedidos, uma réplica a cada 20 mensagens', dica: 'No trigger: queueName: pedidos e messageCount: "20".' },
          campo('ScaledObject', 'worker', 'spec.triggers[0].metadata.queueName', { valor: 'pedidos' }),
          campo('ScaledObject', 'worker', 'spec.triggers[0].metadata.messageCount', { valor: '20' })),
        teste({ descricao: 'O trigger usa a autenticação', dica: 'No item do trigger: authenticationRef.name: servicebus-wi.' },
          campo('ScaledObject', 'worker', 'spec.triggers[0].authenticationRef.name', { valor: 'servicebus-wi' })),
      ],
    }),

    licao('aks-nap-licao', 'Node auto-provisioning: o Karpenter no AKS', 'dificil', `
      <p>O <b>node auto-provisioning</b> (NAP) do AKS é o <b>Karpenter</b> gerenciado pela Azure. Em vez de pools de tamanho fixo, ele
      olha os Pods <code>Pending</code> e cria a máquina certa na hora, escolhendo entre muitos tamanhos de VM.</p>
      <ul>
        <li><b>AKSNodeClass</b> (<code>karpenter.azure.com/v1beta1</code>): o "como" da máquina na Azure, como a imagem
          (<code>imageFamily: Ubuntu2204</code> ou <code>AzureLinux</code>) e o disco (<code>osDiskSizeGB</code>).</li>
        <li><b>NodePool</b> (<code>karpenter.sh/v1</code>, o mesmo da AWS): o "quais" máquinas. Aponta para o AKSNodeClass em
          <code>nodeClassRef</code> (com <code>group: karpenter.azure.com</code>) e filtra com <code>requirements</code>, como
          <code>karpenter.azure.com/sku-family</code> (a família da VM: D, E, F...) e <code>karpenter.sh/capacity-type</code>
          (<code>spot</code> ou <code>on-demand</code>).</li>
        <li><code>limits</code> e <code>disruption</code> funcionam como no Karpenter da AWS: teto de gastos e consolidação.</li>
      </ul>
      <p><b>No cluster:</b> com o NAP ligado, <code>kubectl get nodepools</code> mostra o pool <code>default</code> que o AKS cria, e cada
      máquina nova aparece com a label <code>karpenter.sh/nodepool</code>.</p>`,
    `
      apiVersion: karpenter.azure.com/v1beta1
      kind: AKSNodeClass
      metadata:
        name: padrao
      spec:
        imageFamily: AzureLinux       # a imagem dos nós
      ---
      apiVersion: karpenter.sh/v1
      kind: NodePool
      metadata:
        name: geral
      spec:
        template:
          spec:
            nodeClassRef:             # usa o AKSNodeClass acima
              group: karpenter.azure.com
              kind: AKSNodeClass
              name: padrao
            requirements:
              - key: karpenter.azure.com/sku-family
                operator: In
                values: ["D"]         # só VMs da família D
        limits:
          cpu: "100"
    `),

    exercicio({
      id: 'aks-nap-nodepool',
      titulo: 'NodePool do NAP com a família de VM',
      dificuldade: 'dificil',
      resumo: `
        <p>O cluster vai usar o node auto-provisioning. Crie a classe e o pool, limitando às VMs da família E (mais memória).</p>
        <ol>
          <li>Crie o <code>AKSNodeClass</code> <code>padrao</code> com <code>imageFamily: AzureLinux</code>.</li>
          <li>Crie o NodePool <code>memoria</code> com <code>nodeClassRef</code>: <code>group: karpenter.azure.com</code>,
            <code>kind: AKSNodeClass</code> e <code>name: padrao</code>.</li>
          <li>Em <code>requirements</code>: <code>key: karpenter.azure.com/sku-family</code>, <code>operator: In</code> e
            <code>values: ["E"]</code>.</li>
        </ol>
        <p><b>No cluster:</b> um Pod <code>Pending</code> que pede muita memória faz o NAP criar uma VM da família E (por exemplo
        <code>Standard_E4s_v5</code>) com Azure Linux.</p>`,
      inicial: `
        apiVersion: karpenter.azure.com/v1beta1
        kind: AKSNodeClass
        metadata:
          name: padrao
        spec:
          imageFamily:         # TODO: AzureLinux
        ---
        apiVersion: karpenter.sh/v1
        kind: NodePool
        metadata:
          name: memoria
        spec:
          template:
            spec:
              nodeClassRef:
                # TODO: group, kind e name (passo 2)
              requirements:
                # TODO: o requirement da família E (passo 3)
      `,
      dica: [
        'É o exemplo da lição "Node auto-provisioning", com outra família.',
        'No AKS, o group do nodeClassRef é karpenter.azure.com (na AWS era karpenter.k8s.aws).',
        'nodeClassRef:\n  group: karpenter.azure.com\n  kind: AKSNodeClass\n  name: padrao\nrequirements:\n  - key: karpenter.azure.com/sku-family\n    operator: In\n    values: ["E"]',
      ],
      solucao: docs(AKS_NODECLASS, `
        apiVersion: karpenter.sh/v1
        kind: NodePool
        metadata:
          name: memoria
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
                  values: ["E"]
      `),
      testes: [
        teste({ descricao: 'A classe usa Azure Linux', dica: 'No AKSNodeClass, escreva imageFamily: AzureLinux.' },
          campo('AKSNodeClass', 'padrao', 'spec.imageFamily', { valor: 'AzureLinux' })),
        teste({ descricao: 'O NodePool usa o AKSNodeClass', dica: 'Em nodeClassRef: group: karpenter.azure.com, kind: AKSNodeClass e name: padrao.' },
          existe('NodePool', 'memoria'),
          campo('NodePool', 'memoria', 'spec.template.spec.nodeClassRef.group', { valor: 'karpenter.azure.com' }),
          campo('NodePool', 'memoria', 'spec.template.spec.nodeClassRef.kind', { valor: 'AKSNodeClass' })),
        teste({ descricao: 'Só cria VMs da família E', dica: 'No requirement karpenter.azure.com/sku-family, values: ["E"].' },
          campo('NodePool', 'memoria', 'spec.template.spec.requirements[key=karpenter.azure.com/sku-family].values', { valor: ['E'] })),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'aks-pool-user': { dica: 'O pool continua sendo do cluster loja-aks, com o nome geral na Azure.', regras: [campo('ManagedClustersAgentPool', 'geral', 'spec.owner.name', { valor: 'loja-aks' }), campo('ManagedClustersAgentPool', 'geral', 'spec.azureName', { valor: 'geral' })] },
    'aks-pool-autoscale': { dica: 'O pool continua sendo de aplicações.', regras: [campo('ManagedClustersAgentPool', 'geral', 'spec.mode', { valor: 'User' })] },
    'aks-pool-system-taint': { dica: 'Um só taint, no formato do AKS.', regras: [campo('ManagedClustersAgentPool', 'sistema', 'spec.nodeTaints', { maximo: 1 })] },
    'aks-pod-agentpool': { dica: 'Use só o nodeSelector, sem tolerations.', regras: [campo('Deployment', 'worker', 'spec.template.spec.tolerations', { ausente: true })] },
    'aks-pool-spot': { dica: 'Um pool Spot é sempre de aplicações.', regras: [campo('ManagedClustersAgentPool', 'spot', 'spec.mode', { valor: 'User' })] },
    'aks-pod-spot-toleration': { dica: 'Confira o operador e o efeito da toleration.', regras: [campo('Deployment', 'worker', 'spec.template.spec.tolerations[0].operator', { valor: 'Equal' }), campo('Deployment', 'worker', 'spec.template.spec.tolerations[0].effect', { valor: 'NoSchedule' })] },
    'aks-keda-cron': { dica: 'Confira o fuso horário do trigger.', regras: [campo('ScaledObject', 'worker', 'spec.triggers[0].metadata.timezone', { valor: 'America/Sao_Paulo' })] },
    'aks-keda-zero': { dica: 'O ScaledObject continua escalando o Deployment worker.', regras: [campo('ScaledObject', 'worker', 'spec.scaleTargetRef.name', { valor: 'worker' })] },
    'aks-keda-servicebus': { dica: 'Confira o namespace do Service Bus no trigger.', regras: [campo('ScaledObject', 'worker', 'spec.triggers[0].metadata.namespace', { valor: 'loja-sb' }), campo('ScaledObject', 'worker', 'spec.triggers[0].type', { valor: 'azure-servicebus' })] },
    'aks-nap-nodepool': { dica: 'Confira o operador do requirement e o nome da classe.', regras: [campo('NodePool', 'memoria', 'spec.template.spec.requirements[key=karpenter.azure.com/sku-family].operator', { valor: 'In' }), campo('NodePool', 'memoria', 'spec.template.spec.nodeClassRef.name', { valor: 'padrao' })] },
  },
};
