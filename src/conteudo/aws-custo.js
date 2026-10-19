// Módulo AWS, tópico 6: custo e operação no EKS (Spot, Karpenter, PDB em upgrades e requests).
// Segue docs/didatica.md: lição com exemplo comentado, passos, esqueleto, dicas e "como corrigir".
import { licao, exercicio, teste, existe, campo } from './util.js';

const EC2NODECLASS = `
  apiVersion: karpenter.k8s.aws/v1
  kind: EC2NodeClass
  metadata:
    name: padrao
  spec:
    role: KarpenterNodeRole-loja-prod
    amiSelectorTerms:
      - alias: al2023@latest
    subnetSelectorTerms:
      - tags:
          karpenter.sh/discovery: loja-prod
    securityGroupSelectorTerms:
      - tags:
          karpenter.sh/discovery: loja-prod
`;

/** Um NodePool do Karpenter; `requisitos` são itens extras de requirements e `extra` entra no fim do spec. */
const nodepool = (nome, { requisitos = '', template = '', extra = '' } = {}) => `
  apiVersion: karpenter.sh/v1
  kind: NodePool
  metadata:
    name: ${nome}
  spec:
    template:
      spec:
        nodeClassRef:
          group: karpenter.k8s.aws
          kind: EC2NodeClass
          name: padrao
${template}        requirements:
          - key: kubernetes.io/arch
            operator: In
            values: ["amd64"]
${requisitos}${extra}`;

/** Um Deployment simples da API; `pod` entra no spec do Pod e `container` no container. */
const deployApi = (nome, { pod = '', container = '' } = {}) => `
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: ${nome}
  spec:
    replicas: 3
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
            image: public.ecr.aws/nginx/nginx:1.27
${container}`;

export const awsCusto = {
  id: 'aws-custo',
  titulo: 'Custo e operação no EKS',
  itens: [
    licao('eks-custo-licao', 'Custo no EKS: pagar só pelo que usa', 'medio', `
      <p>No EKS, quase toda a conta vem das <b>máquinas</b> (EC2). Economizar é como gerenciar a frota de uma transportadora:
      caminhões do tamanho certo, aluguel barato quando dá, e nenhum caminhão parado no pátio.</p>
      <ul>
        <li><b>Spot</b>: capacidade que sobra na AWS, com até 90% de desconto, mas que pode ser recolhida com 2 minutos de
          aviso. Bom para o que aguenta ser interrompido (réplicas sem estado, jobs). Peça <b>vários tipos</b> de máquina, para
          a AWS ter de onde tirar. No Karpenter, a label <code>karpenter.sh/capacity-type</code> (<code>spot</code> ou
          <code>on-demand</code>) escolhe; no node group, <code>capacityType: SPOT</code>.</li>
        <li><b>requests certos</b>: o scheduler reserva o request, não o uso. Request alto demais = nós cheios de reserva vazia
          = mais máquinas. Defina o request de memória igual ao limit (memória não é emprestável) e evite limit de CPU, que só
          deixa a aplicação lenta.</li>
        <li><b>Consolidação</b> e <b>expiração</b> do Karpenter: juntar Pods em menos nós e trocar nós velhos. Para isso não
          derrubar o serviço, todo Deployment importante precisa de um <b>PodDisruptionBudget</b>; ele também protege os
          <b>upgrades</b> do node group, que esvaziam os nós um a um.</li>
        <li><code>karpenter.sh/do-not-disrupt: "true"</code> num Pod: o Karpenter não mexe no nó dele (para jobs longos).</li>
        <li><b>budgets</b> com <code>schedule</code>: proíbe trocas de nós no horário de pico.</li>
      </ul>
      <p><b>No cluster:</b> <code>kubectl get nodes -L karpenter.sh/capacity-type</code> mostra quais nós são Spot.</p>`,
    `
      # Um NodePool que prefere Spot e aceita On-Demand quando faltar Spot
      apiVersion: karpenter.sh/v1
      kind: NodePool
      metadata:
        name: economico
      spec:
        template:
          spec:
            nodeClassRef:
              group: karpenter.k8s.aws
              kind: EC2NodeClass
              name: padrao
            requirements:
              - key: karpenter.sh/capacity-type
                operator: In
                values: ["spot", "on-demand"]   # o Karpenter tenta Spot primeiro
              - key: karpenter.k8s.aws/instance-category
                operator: In
                values: ["c", "m", "r"]         # muitas famílias = mais Spot disponível
        disruption:
          consolidationPolicy: WhenEmptyOrUnderutilized
          budgets:
            - nodes: "0"                        # nenhuma troca...
              schedule: "0 9 * * mon-fri"       # ...a partir das 9h, em dia útil
              duration: 9h                      # ...por 9 horas
    `),

    exercicio({
      id: 'eks-nodegroup-spot',
      titulo: 'Node group Spot com vários tipos de máquina',
      dificuldade: 'facil',
      resumo: `
        <p>Os workers de fila aguentam ser interrompidos. Eles vão para um node group Spot, com três tipos de máquina para a AWS ter
        de onde tirar capacidade.</p>
        <ol>
          <li>No <code>Nodegroup</code> <code>workers-spot</code>, escreva <code>capacityType: SPOT</code>.</li>
          <li><code>instanceTypes: ["m6i.large", "m5.large", "m5a.large"]</code>.</li>
        </ol>
        <p><b>No cluster:</b> os nós nascem com a label <code>eks.amazonaws.com/capacityType=SPOT</code>. Quando a AWS avisa que vai
        recolher um, o EKS esvazia o nó antes e sobe outro.</p>`,
      inicial: `
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: Nodegroup
        metadata:
          name: workers-spot
        spec:
          clusterName: loja-prod
          name: workers-spot
          nodeRole: arn:aws:iam::123456789012:role/NodeRole
          subnets:
            - subnet-0a1b2c3d4e5f60001
            - subnet-0a1b2c3d4e5f60002
          scalingConfig:
            minSize: 0
            maxSize: 10
            desiredSize: 2
          capacityType:        # TODO: SPOT
          # TODO: instanceTypes com os três tipos
      `,
      dica: [
        'capacityType e instanceTypes ficam no spec, alinhados com scalingConfig (veja a lição "Add-ons e Managed Node Groups").',
        'capacityType: SPOT\ninstanceTypes: ["m6i.large", "m5.large", "m5a.large"]',
      ],
      solucao: `
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: Nodegroup
        metadata:
          name: workers-spot
        spec:
          clusterName: loja-prod
          name: workers-spot
          nodeRole: arn:aws:iam::123456789012:role/NodeRole
          subnets:
            - subnet-0a1b2c3d4e5f60001
            - subnet-0a1b2c3d4e5f60002
          scalingConfig:
            minSize: 0
            maxSize: 10
            desiredSize: 2
          capacityType: SPOT
          instanceTypes: ["m6i.large", "m5.large", "m5a.large"]
      `,
      testes: [
        teste({ descricao: 'O node group é Spot', dica: 'No spec, escreva capacityType: SPOT.' },
          existe('Nodegroup', 'workers-spot'),
          campo('Nodegroup', 'workers-spot', 'spec.capacityType', { valor: 'SPOT' })),
        teste({ descricao: 'Pede pelo menos três tipos de máquina', dica: 'Em instanceTypes, liste m6i.large, m5.large e m5a.large.' },
          campo('Nodegroup', 'workers-spot', 'spec.instanceTypes', { minimo: 3 })),
      ],
    }),

    exercicio({
      id: 'eks-karpenter-spot',
      titulo: 'Karpenter preferindo Spot',
      dificuldade: 'medio',
      existentes: EC2NODECLASS,
      resumo: `
        <p>O NodePool <code>economico</code> deve comprar Spot quando houver e cair para On-Demand quando faltar.</p>
        <ol>
          <li>Em <code>requirements</code>, acrescente um item com <code>key: karpenter.sh/capacity-type</code> e <code>operator: In</code>.</li>
          <li>Os <code>values</code> são <code>["spot", "on-demand"]</code>.</li>
        </ol>
        <p><b>No cluster:</b> com os dois valores, o Karpenter escolhe Spot (mais barato) e só compra On-Demand se não houver Spot para
        nenhum tipo permitido.</p>`,
      inicial: nodepool('economico', { requisitos: `
          # TODO: o requirement de karpenter.sh/capacity-type (passos 1 e 2)
` }),
      dica: [
        'O exemplo da lição "Custo no EKS" tem esse requirement.',
        'É mais um item da lista requirements, com key, operator e values, como o de kubernetes.io/arch.',
        '- key: karpenter.sh/capacity-type\n  operator: In\n  values: ["spot", "on-demand"]',
      ],
      solucao: nodepool('economico', { requisitos: `
          - key: karpenter.sh/capacity-type
            operator: In
            values: ["spot", "on-demand"]
` }),
      testes: [
        teste({ descricao: 'O NodePool pode comprar Spot', dica: 'Acrescente o requirement karpenter.sh/capacity-type com "spot" nos values.' },
          existe('NodePool', 'economico'),
          campo('NodePool', 'economico', 'spec.template.spec.requirements[key=karpenter.sh/capacity-type].values', { contem: 'spot' })),
        teste({ descricao: 'Cai para On-Demand quando faltar Spot', dica: 'Nos values do mesmo requirement, inclua "on-demand".' },
          campo('NodePool', 'economico', 'spec.template.spec.requirements[key=karpenter.sh/capacity-type].values', { contem: 'on-demand' })),
      ],
    }),

    exercicio({
      id: 'eks-spot-preferencia',
      titulo: 'Deployment que prefere nós Spot',
      dificuldade: 'medio',
      resumo: `
        <p>A vitrine pode rodar em Spot, mas, se não houver nó Spot, é melhor rodar em On-Demand do que ficar fora do ar. Uma
        <b>preferência</b> (e não uma obrigação) resolve.</p>
        <ol>
          <li>No Deployment <code>vitrine</code>, crie <code>affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution</code>.</li>
          <li>Um item com <code>weight: 100</code> e, em <code>preference.matchExpressions</code>,
            <code>key: karpenter.sh/capacity-type</code>, <code>operator: In</code> e <code>values: ["spot"]</code>.</li>
        </ol>
        <p><b>No cluster:</b> o scheduler dá pontos extras aos nós Spot. Se nenhum couber, o Pod vai para outro nó, em vez de ficar
        <code>Pending</code> (o que aconteceria com <code>nodeSelector</code>).</p>`,
      inicial: deployApi('vitrine', { pod: `        # TODO: affinity com a preferência por Spot (passos 1 e 2)
` }),
      dica: [
        'É a afinidade de nó dos Fundamentos, na versão "preferred" (com peso) em vez de "required".',
        'Cada preferência tem weight (1 a 100) e preference com matchExpressions.',
        'affinity:\n  nodeAffinity:\n    preferredDuringSchedulingIgnoredDuringExecution:\n      - weight: 100\n        preference:\n          matchExpressions:\n            - key: karpenter.sh/capacity-type\n              operator: In\n              values: ["spot"]',
      ],
      solucao: deployApi('vitrine', { pod: `        affinity:
          nodeAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                preference:
                  matchExpressions:
                    - key: karpenter.sh/capacity-type
                      operator: In
                      values: ["spot"]
` }),
      testes: [
        teste({ descricao: 'A preferência tem peso 100', dica: 'No item de preferredDuringSchedulingIgnoredDuringExecution, escreva weight: 100.' },
          existe('Deployment', 'vitrine'),
          campo('Deployment', 'vitrine', 'spec.template.spec.affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].weight', { valor: 100 })),
        teste({ descricao: 'Prefere nós Spot', dica: 'Em preference.matchExpressions: key: karpenter.sh/capacity-type, operator: In, values: ["spot"].' },
          campo('Deployment', 'vitrine', 'spec.template.spec.affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].preference.matchExpressions[0].key', { valor: 'karpenter.sh/capacity-type' }),
          campo('Deployment', 'vitrine', 'spec.template.spec.affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].preference.matchExpressions[0].values', { contem: 'spot' })),
      ],
    }),

    exercicio({
      id: 'eks-pdb-upgrade',
      titulo: 'PDB para o upgrade do node group',
      dificuldade: 'facil',
      resumo: `
        <p>Amanhã o node group sobe de versão: o EKS esvazia cada nó antes de trocá-lo. Sem proteção, as 3 réplicas da API podem estar no
        mesmo nó e sair juntas.</p>
        <ol>
          <li>Crie o PodDisruptionBudget <code>api</code> com <code>minAvailable: 2</code>.</li>
          <li>Em <code>selector.matchLabels</code>, <code>app: api</code>.</li>
        </ol>
        <p><b>No cluster:</b> o esvaziamento do nó (e a consolidação do Karpenter) só tira um Pod da API se outros 2 continuarem prontos;
        senão espera.</p>`,
      inicial: `
        apiVersion: policy/v1
        kind: PodDisruptionBudget
        metadata:
          name: api
        spec:
          minAvailable:        # TODO: 2
          selector:
            matchLabels:
              # TODO: app: api
      `,
      dica: [
        'É o PDB dos Fundamentos (lição "Disponibilidade"), agora pensando em upgrades.',
        'minAvailable: 2\nselector:\n  matchLabels:\n    app: api',
      ],
      solucao: `
        apiVersion: policy/v1
        kind: PodDisruptionBudget
        metadata:
          name: api
        spec:
          minAvailable: 2
          selector:
            matchLabels:
              app: api
      `,
      testes: [
        teste({ descricao: 'O PDB existe', dica: 'Mantenha kind: PodDisruptionBudget e metadata.name: api.' }, existe('PodDisruptionBudget', 'api')),
        teste({ descricao: 'Sempre sobram 2 Pods da API', dica: 'Em spec, escreva minAvailable: 2.' },
          campo('PodDisruptionBudget', 'api', 'spec.minAvailable', { valor: 2 })),
        teste({ descricao: 'Protege os Pods app=api', dica: 'Em selector.matchLabels, escreva app: api.' },
          campo('PodDisruptionBudget', 'api', 'spec.selector.matchLabels.app', { valor: 'api' })),
      ],
    }),

    exercicio({
      id: 'eks-karpenter-do-not-disrupt',
      titulo: 'Job longo que o Karpenter não interrompe',
      dificuldade: 'facil',
      resumo: `
        <p>O fechamento do mês leva 3 horas. Se o Karpenter consolidar o nó no meio, o Job recomeça do zero.</p>
        <ol>
          <li>No Job <code>fechamento-mes</code>, em <code>template.metadata.annotations</code>, escreva
            <code>karpenter.sh/do-not-disrupt: "true"</code>.</li>
        </ol>
        <p><b>No cluster:</b> enquanto o Pod do Job rodar, o Karpenter não consolida nem expira o nó dele. Quando o Job termina, o nó volta a
        poder ser trocado.</p>`,
      inicial: `
        apiVersion: batch/v1
        kind: Job
        metadata:
          name: fechamento-mes
        spec:
          template:
            metadata:
              # TODO: annotations com karpenter.sh/do-not-disrupt: "true"
            spec:
              restartPolicy: Never
              containers:
                - name: fechamento
                  image: busybox:1.36
                  command: ["sh", "-c", "echo fechando o mes"]
      `,
      dica: [
        'A annotation vai no Pod (template.metadata), não no Job: o Karpenter olha os Pods do nó.',
        'annotations:\n  karpenter.sh/do-not-disrupt: "true"',
      ],
      solucao: `
        apiVersion: batch/v1
        kind: Job
        metadata:
          name: fechamento-mes
        spec:
          template:
            metadata:
              annotations:
                karpenter.sh/do-not-disrupt: "true"
            spec:
              restartPolicy: Never
              containers:
                - name: fechamento
                  image: busybox:1.36
                  command: ["sh", "-c", "echo fechando o mes"]
      `,
      testes: [
        teste({ descricao: 'O Job existe', dica: 'Mantenha kind: Job e metadata.name: fechamento-mes.' }, existe('Job', 'fechamento-mes')),
        teste({ descricao: 'O Pod pede para não ser interrompido', dica: 'Em template.metadata.annotations: karpenter.sh/do-not-disrupt: "true".' },
          campo('Job', 'fechamento-mes', 'spec.template.metadata.annotations["karpenter.sh/do-not-disrupt"]', { valor: 'true' })),
      ],
    }),

    exercicio({
      id: 'eks-requests-custo',
      titulo: 'Requests do tamanho do uso',
      dificuldade: 'medio',
      resumo: `
        <p>A API pede 2 CPUs e usa 0,2. Com 3 réplicas, são 6 CPUs reservadas e quase vazias, e o Karpenter compra máquinas para essa
        reserva. O monitoramento mostrou o uso real: cerca de 250m de CPU e 256Mi de memória.</p>
        <ol>
          <li>No container <code>api</code>, <code>resources.requests</code> com <code>cpu: 250m</code> e <code>memory: 256Mi</code>.</li>
          <li>Em <code>resources.limits</code>, só <code>memory: 256Mi</code> (igual ao request).</li>
          <li><b>Não</b> coloque limite de CPU.</li>
        </ol>
        <p><b>No cluster:</b> o scheduler reserva só o necessário e cabem mais Pods por nó. Sem limite de CPU, a API usa a CPU livre do nó
        num pico, em vez de ficar lenta.</p>`,
      inicial: deployApi('api', { container: `            resources:
              requests:
                cpu: "2"       # TODO: 250m
                memory: 2Gi    # TODO: 256Mi
              limits:
                cpu: "2"       # TODO: apague esta linha (passo 3)
                memory: 2Gi    # TODO: 256Mi
` }),
      dica: [
        'É o bloco resources dos Fundamentos: requests é a reserva, limits é o teto.',
        'Memória: request igual ao limit. CPU: só o request.',
        'resources:\n  requests:\n    cpu: 250m\n    memory: 256Mi\n  limits:\n    memory: 256Mi',
      ],
      solucao: deployApi('api', { container: `            resources:
              requests:
                cpu: 250m
                memory: 256Mi
              limits:
                memory: 256Mi
` }),
      testes: [
        teste({ descricao: 'A reserva é do tamanho do uso', dica: 'Em resources.requests: cpu: 250m e memory: 256Mi.' },
          campo('Deployment', 'api', 'spec.template.spec.containers[name=api].resources.requests.cpu', { valor: '250m' }),
          campo('Deployment', 'api', 'spec.template.spec.containers[name=api].resources.requests.memory', { valor: '256Mi' })),
        teste({ descricao: 'O limite de memória é igual ao request', dica: 'Em resources.limits, escreva memory: 256Mi.' },
          campo('Deployment', 'api', 'spec.template.spec.containers[name=api].resources.limits.memory', { valor: '256Mi' })),
        teste({ descricao: 'Não há limite de CPU', dica: 'Apague a linha cpu de dentro de resources.limits.' },
          campo('Deployment', 'api', 'spec.template.spec.containers[name=api].resources.limits.cpu', { ausente: true })),
      ],
    }),

    exercicio({
      id: 'eks-karpenter-expiracao',
      titulo: 'Nós que se renovam todo mês',
      dificuldade: 'medio',
      existentes: EC2NODECLASS,
      resumo: `
        <p>Um nó que roda por meses fica sem as correções de segurança da imagem nova. O Karpenter pode trocar cada nó depois de uma idade
        máxima.</p>
        <ol>
          <li>No NodePool <code>geral</code>, em <code>spec.template.spec</code>, escreva <code>expireAfter: 720h</code> (30 dias).</li>
        </ol>
        <p><b>No cluster:</b> todo nó com 30 dias é esvaziado (respeitando os PDBs) e substituído por um novo, já com a AMI mais recente do
        <code>al2023@latest</code>.</p>`,
      inicial: nodepool('geral', { template: `        # TODO: expireAfter: 720h
` }),
      dica: [
        'expireAfter fica no template (spec.template.spec), alinhado com nodeClassRef, e não em disruption.',
        'expireAfter: 720h',
      ],
      solucao: nodepool('geral', { template: `        expireAfter: 720h
` }),
      testes: [
        teste({ descricao: 'O NodePool existe', dica: 'Mantenha kind: NodePool e metadata.name: geral.' }, existe('NodePool', 'geral')),
        teste({ descricao: 'Os nós expiram em 30 dias', dica: 'Em spec.template.spec, escreva expireAfter: 720h.' },
          campo('NodePool', 'geral', 'spec.template.spec.expireAfter', { valor: '720h' })),
      ],
    }),

    exercicio({
      id: 'eks-karpenter-budget-horario',
      titulo: 'Nada de troca de nós no horário comercial',
      dificuldade: 'dificil',
      existentes: EC2NODECLASS,
      resumo: `
        <p>A loja vende mais em dia útil, das 9h às 18h. Nesse horário, nenhum nó pode ser trocado; fora dele, até 20% por vez.</p>
        <ol>
          <li>No NodePool <code>geral</code>, em <code>disruption.budgets</code>, um item com <code>nodes: "20%"</code>.</li>
          <li>Outro item com <code>nodes: "0"</code>, <code>schedule: "0 9 * * mon-fri"</code> e <code>duration: 9h</code>.</li>
        </ol>
        <p><b>No cluster:</b> das 9h às 18h, de segunda a sexta, o Karpenter não consolida nem expira nós (só repõe os que a AWS recolher).
        No resto do tempo, troca no máximo 20% dos nós de uma vez.</p>`,
      inicial: nodepool('geral', { extra: `    disruption:
      consolidationPolicy: WhenEmptyOrUnderutilized
      budgets:
        # TODO: - nodes: "20%"
        # TODO: - nodes "0", schedule "0 9 * * mon-fri" e duration 9h
` }),
      dica: [
        'O exemplo da lição "Custo no EKS" tem um budget com horário.',
        'O schedule é uma expressão cron, como a do CronJob: minuto, hora, dia, mês e dia da semana.',
        'budgets:\n  - nodes: "20%"\n  - nodes: "0"\n    schedule: "0 9 * * mon-fri"\n    duration: 9h',
      ],
      solucao: nodepool('geral', { extra: `    disruption:
      consolidationPolicy: WhenEmptyOrUnderutilized
      budgets:
        - nodes: "20%"
        - nodes: "0"
          schedule: "0 9 * * mon-fri"
          duration: 9h
` }),
      testes: [
        teste({ descricao: 'Fora do horário, troca até 20% dos nós', dica: 'Em disruption.budgets, crie o item - nodes: "20%".' },
          campo('NodePool', 'geral', 'spec.disruption.budgets[0].nodes', { valor: '20%' })),
        teste({ descricao: 'No horário comercial, nenhuma troca', dica: 'Crie o segundo item com nodes: "0", schedule: "0 9 * * mon-fri" e duration: 9h.' },
          campo('NodePool', 'geral', 'spec.disruption.budgets[1].nodes', { valor: '0' }),
          campo('NodePool', 'geral', 'spec.disruption.budgets[1].schedule', { valor: '0 9 * * mon-fri' }),
          campo('NodePool', 'geral', 'spec.disruption.budgets[1].duration', { valor: '9h' })),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'eks-nodegroup-spot': { dica: 'Confira os três tipos de máquina do passo 2.', regras: [campo('Nodegroup', 'workers-spot', 'spec.instanceTypes', { contem: 'm5a.large' }), campo('Nodegroup', 'workers-spot', 'spec.instanceTypes', { contem: 'm6i.large' })] },
    'eks-karpenter-spot': { dica: 'O requirement usa o operador In, e o da arquitetura continua lá.', regras: [campo('NodePool', 'economico', 'spec.template.spec.requirements[key=karpenter.sh/capacity-type].operator', { valor: 'In' }), campo('NodePool', 'economico', 'spec.template.spec.requirements[key=kubernetes.io/arch].values', { contem: 'amd64' })] },
    'eks-spot-preferencia': { dica: 'É uma preferência: não use nodeSelector nem a regra obrigatória.', regras: [campo('Deployment', 'vitrine', 'spec.template.spec.nodeSelector', { ausente: true }), campo('Deployment', 'vitrine', 'spec.template.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution', { ausente: true })] },
    'eks-pdb-upgrade': { dica: 'Use só minAvailable, como pede o passo 1.', regras: [campo('PodDisruptionBudget', 'api', 'spec.maxUnavailable', { ausente: true })] },
    'eks-karpenter-do-not-disrupt': { dica: 'A annotation fica no Pod, não no metadata do Job.', regras: [campo('Job', 'fechamento-mes', 'metadata.annotations', { ausente: true })] },
    'eks-requests-custo': { dica: 'O Deployment continua com 3 réplicas.', regras: [campo('Deployment', 'api', 'spec.replicas', { valor: 3 })] },
    'eks-karpenter-expiracao': { dica: 'expireAfter fica no template, e não em disruption.', regras: [campo('NodePool', 'geral', 'spec.disruption.expireAfter', { ausente: true })] },
    'eks-karpenter-budget-horario': { dica: 'São dois budgets, e a consolidação continua ligada.', regras: [campo('NodePool', 'geral', 'spec.disruption.budgets', { valor: [{ nodes: '20%' }, { nodes: '0', schedule: '0 9 * * mon-fri', duration: '9h' }] }), campo('NodePool', 'geral', 'spec.disruption.consolidationPolicy', { valor: 'WhenEmptyOrUnderutilized' })] },
  },
};
