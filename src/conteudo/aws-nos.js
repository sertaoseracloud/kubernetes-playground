// Módulo AWS, tópico 2: os nós do EKS e a escala deles (managed node groups, labels e taints,
// Karpenter e Cluster Autoscaler).
// Segue docs/didatica.md: lição com exemplo comentado, passos, esqueleto, dicas e "como corrigir".
import { licao, exercicio, teste, existe, campo } from './util.js';

const SUBNETS = ['subnet-0a1b2c3d4e5f60001', 'subnet-0a1b2c3d4e5f60002'];
const NODE_ROLE = 'arn:aws:iam::123456789012:role/NodeRole';

/** Um managed node group (via ACK) com o que já foi praticado; `extra` entra no fim do spec. */
const nodegroup = (nome, extra = '') => `
  apiVersion: eks.services.k8s.aws/v1alpha1
  kind: Nodegroup
  metadata:
    name: ${nome}
  spec:
    clusterName: loja-prod
    name: ${nome}
    nodeRole: ${NODE_ROLE}
    subnets:
      - ${SUBNETS[0]}
      - ${SUBNETS[1]}
    scalingConfig:
      minSize: 1
      maxSize: 3
      desiredSize: 1
${extra}`;

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

/** Um NodePool do Karpenter apontando para o EC2NodeClass "padrao"; `extra` entra no fim do spec. */
const nodepool = (nome, extra = '') => `
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
        requirements:
          - key: kubernetes.io/arch
            operator: In
            values: ["amd64"]
${extra}`;

export const awsNos = {
  id: 'aws-nos',
  titulo: 'Nós e escala no EKS',
  itens: [
    licao('eks-addons', 'Add-ons e Managed Node Groups', 'medio', `
      <p>Os nós são as máquinas EC2 onde os Pods rodam. Um <b>managed node group</b> é uma <b>frota de carros alugados</b>:
      você escolhe o modelo (tipo de instância), quantos quer (mínimo, máximo e desejado) e a locadora (a AWS) cuida da
      manutenção, inclusive trocar os carros um a um quando sai uma versão nova.</p>
      <ul>
        <li><b>scalingConfig</b>: <code>minSize</code>, <code>maxSize</code> e <code>desiredSize</code>. O grupo nunca fica
          abaixo do mínimo nem acima do máximo.</li>
        <li><b>instanceTypes</b> e <b>capacityType</b>: o modelo da máquina e se ela é <code>ON_DEMAND</code> (preço cheio, nunca
          é tomada de volta) ou <code>SPOT</code> (sobra da AWS, muito mais barata, mas pode ser recolhida com 2 minutos de aviso).</li>
        <li><b>labels</b>: etiquetas que todo nó do grupo recebe. Além das suas, o EKS coloca
          <code>eks.amazonaws.com/nodegroup</code> (o nome do grupo) e <code>eks.amazonaws.com/capacityType</code>.
          Um Pod escolhe nós com <code>nodeSelector</code>.</li>
        <li><b>taints</b>: uma placa de "acesso restrito" no nó. Só entram Pods com a <b>toleration</b> que combina. No node
          group, o efeito é escrito como na API da AWS (<code>NO_SCHEDULE</code>); no Pod, como no Kubernetes
          (<code>NoSchedule</code>).</li>
        <li><b>Add-ons</b> do EKS (<code>vpc-cni</code>, <code>coredns</code>, <code>kube-proxy</code>,
          <code>aws-ebs-csi-driver</code>...) são instalados e atualizados pela API do EKS, com versão escolhida por você.</li>
      </ul>
      <p>O node group é um recurso da API do EKS. Aqui ele é escrito como YAML com o <b>ACK</b>, no recurso
      <code>Nodegroup</code> (os campos são os mesmos da API e do Terraform).</p>
      <p><b>No cluster:</b> a AWS cria um Auto Scaling Group com as máquinas, e cada uma aparece em <code>kubectl get nodes</code>
      com as labels e os taints do grupo.</p>`,
    `
      # Um managed node group com 2 a 6 máquinas m6i.large
      apiVersion: eks.services.k8s.aws/v1alpha1
      kind: Nodegroup
      metadata:
        name: geral
      spec:
        clusterName: loja-prod          # o cluster EKS
        name: geral                     # vira a label eks.amazonaws.com/nodegroup
        nodeRole: arn:aws:iam::123456789012:role/NodeRole   # a role das máquinas
        subnets:                        # onde as máquinas nascem (uma por zona)
          - subnet-0a1b2c3d4e5f60001
          - subnet-0a1b2c3d4e5f60002
        instanceTypes: ["m6i.large"]
        capacityType: ON_DEMAND
        scalingConfig:
          minSize: 2                    # nunca menos que 2
          maxSize: 6                    # nunca mais que 6
          desiredSize: 2                # quantas agora
        labels:
          carga: geral                  # etiqueta em todo nó do grupo
    `),

    exercicio({
      id: 'eks-nodegroup-basico',
      titulo: 'Um node group com tamanho mínimo e máximo',
      dificuldade: 'facil',
      resumo: `
        <p>O cluster <code>loja-prod</code> precisa de um grupo de nós para as aplicações comuns, que cresça em dia de promoção.</p>
        <ol>
          <li>O <code>Nodegroup</code> <code>geral</code> já tem cluster, role e sub-redes no esqueleto.</li>
          <li>Em <code>scalingConfig</code>: <code>minSize: 2</code>, <code>maxSize: 5</code> e <code>desiredSize: 2</code>.</li>
        </ol>
        <p><b>No cluster:</b> a AWS liga 2 máquinas agora. O Cluster Autoscaler ou você podem subir até 5, nunca mais.</p>`,
      inicial: `
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: Nodegroup
        metadata:
          name: geral
        spec:
          clusterName: loja-prod
          name: geral
          nodeRole: ${NODE_ROLE}
          subnets:
            - ${SUBNETS[0]}
            - ${SUBNETS[1]}
          scalingConfig:
            # TODO: minSize 2, maxSize 5 e desiredSize 2
      `,
      dica: [
        'scalingConfig tem três números: o mínimo, o máximo e quantos você quer agora.',
        'scalingConfig:\n  minSize: 2\n  maxSize: 5\n  desiredSize: 2',
      ],
      solucao: nodegroup('geral').replace('minSize: 1', 'minSize: 2').replace('maxSize: 3', 'maxSize: 5').replace('desiredSize: 1', 'desiredSize: 2'),
      testes: [
        teste({ descricao: 'O node group geral existe', dica: 'Mantenha kind: Nodegroup e metadata.name: geral.' }, existe('Nodegroup', 'geral')),
        teste({ descricao: 'Tem de 2 a 5 nós', dica: 'Em scalingConfig: minSize: 2 e maxSize: 5.' },
          campo('Nodegroup', 'geral', 'spec.scalingConfig.minSize', { valor: 2 }),
          campo('Nodegroup', 'geral', 'spec.scalingConfig.maxSize', { valor: 5 })),
        teste({ descricao: 'Começa com 2 nós', dica: 'Em scalingConfig, escreva desiredSize: 2 (entre o mínimo e o máximo).' },
          campo('Nodegroup', 'geral', 'spec.scalingConfig.desiredSize', { valor: 2 })),
      ],
    }),

    exercicio({
      id: 'eks-nodegroup-labels',
      titulo: 'Node group com tipo de máquina e label',
      dificuldade: 'facil',
      resumo: `
        <p>Os relatórios noturnos usam muita memória. Eles vão ganhar um grupo de nós só deles, com máquinas de memória
        maior e uma etiqueta para os Pods encontrarem.</p>
        <ol>
          <li>No <code>Nodegroup</code> <code>batch</code>, escreva <code>instanceTypes: ["r6i.large"]</code>.</li>
          <li>Em <code>labels</code>, a etiqueta <code>carga: batch</code>.</li>
        </ol>
        <p><b>No cluster:</b> cada nó do grupo aparece com <code>carga=batch</code> e
        <code>node.kubernetes.io/instance-type=r6i.large</code> em <code>kubectl get nodes --show-labels</code>.</p>`,
      inicial: nodegroup('batch', `
    # TODO: instanceTypes com r6i.large
    # TODO: labels com carga: batch
`),
      dica: [
        'instanceTypes é uma lista; labels é um mapa de chave: valor. Os dois ficam no spec, alinhados com scalingConfig.',
        'instanceTypes: ["r6i.large"]\nlabels:\n  carga: batch',
      ],
      solucao: nodegroup('batch', `
    instanceTypes: ["r6i.large"]
    labels:
      carga: batch
`),
      testes: [
        teste({ descricao: 'O node group usa r6i.large', dica: 'No spec, escreva instanceTypes: ["r6i.large"].' },
          existe('Nodegroup', 'batch'),
          campo('Nodegroup', 'batch', 'spec.instanceTypes', { contem: 'r6i.large' })),
        teste({ descricao: 'Os nós recebem a label carga=batch', dica: 'No spec, em labels, escreva carga: batch.' },
          campo('Nodegroup', 'batch', 'spec.labels.carga', { valor: 'batch' })),
      ],
    }),

    exercicio({
      id: 'eks-pod-nodeselector',
      titulo: 'Pod no node group certo',
      dificuldade: 'facil',
      resumo: `
        <p>O node group <code>batch</code> existe. Agora o Job de relatório precisa rodar <b>nele</b>, e não em qualquer nó.
        A label que o EKS coloca em todo nó de managed node group resolve isso.</p>
        <ol>
          <li>No Job <code>relatorio-noturno</code>, no spec do Pod (dentro de <code>template</code>), crie <code>nodeSelector</code>.</li>
          <li>A chave é <code>eks.amazonaws.com/nodegroup</code> e o valor é <code>batch</code>.</li>
        </ol>
        <p><b>No cluster:</b> o scheduler só considera os nós com essa label. Se o grupo estiver sem nós, o Pod fica
        <code>Pending</code> até um aparecer.</p>`,
      inicial: `
        apiVersion: batch/v1
        kind: Job
        metadata:
          name: relatorio-noturno
        spec:
          template:
            spec:
              restartPolicy: Never
              # TODO: nodeSelector com eks.amazonaws.com/nodegroup: batch
              containers:
                - name: relatorio
                  image: busybox:1.36
                  command: ["sh", "-c", "echo gerando relatorio"]
      `,
      dica: [
        'Releia o exemplo da lição "Arquitetura do EKS": ele usa a mesma label.',
        'nodeSelector fica no spec do Pod, alinhado com containers.',
        'nodeSelector:\n  eks.amazonaws.com/nodegroup: batch',
      ],
      solucao: `
        apiVersion: batch/v1
        kind: Job
        metadata:
          name: relatorio-noturno
        spec:
          template:
            spec:
              restartPolicy: Never
              nodeSelector:
                eks.amazonaws.com/nodegroup: batch
              containers:
                - name: relatorio
                  image: busybox:1.36
                  command: ["sh", "-c", "echo gerando relatorio"]
      `,
      testes: [
        teste({ descricao: 'O Job existe', dica: 'Mantenha kind: Job e metadata.name: relatorio-noturno.' }, existe('Job', 'relatorio-noturno')),
        teste({ descricao: 'O Pod escolhe o node group batch', dica: 'Em template.spec, escreva nodeSelector com eks.amazonaws.com/nodegroup: batch.' },
          campo('Job', 'relatorio-noturno', 'spec.template.spec.nodeSelector["eks.amazonaws.com/nodegroup"]', { valor: 'batch' })),
      ],
    }),

    exercicio({
      id: 'eks-nodegroup-taint',
      titulo: 'Node group reservado com taint',
      dificuldade: 'medio',
      resumo: `
        <p>As máquinas com GPU são caras: só os Pods de inteligência artificial podem usá-las. Um <b>taint</b> no grupo afasta
        todo Pod que não tiver a toleration.</p>
        <ol>
          <li>No <code>Nodegroup</code> <code>gpu</code>, escreva <code>instanceTypes: ["g5.xlarge"]</code>.</li>
          <li>Em <code>taints</code>, um item com <code>key: dedicado</code>, <code>value: gpu</code> e
            <code>effect: NO_SCHEDULE</code> (o formato da API da AWS).</li>
        </ol>
        <p><b>No cluster:</b> os nós aparecem com o taint <code>dedicado=gpu:NoSchedule</code>. O scheduler não põe ali nenhum Pod sem
        a toleration.</p>`,
      inicial: nodegroup('gpu', `
    instanceTypes: ["g5.xlarge"]
    taints:
      - key: dedicado
        value: gpu
        effect:          # TODO: NO_SCHEDULE
`),
      dica: [
        'No node group (API da AWS) o efeito é escrito em maiúsculas com sublinhado.',
        'effect: NO_SCHEDULE',
      ],
      solucao: nodegroup('gpu', `
    instanceTypes: ["g5.xlarge"]
    taints:
      - key: dedicado
        value: gpu
        effect: NO_SCHEDULE
`),
      testes: [
        teste({ descricao: 'O node group gpu existe', dica: 'O effect vazio impede o apply: escreva NO_SCHEDULE.' }, existe('Nodegroup', 'gpu')),
        teste({ descricao: 'O taint afasta os outros Pods', dica: 'Em taints: key: dedicado, value: gpu e effect: NO_SCHEDULE.' },
          campo('Nodegroup', 'gpu', 'spec.taints[0].key', { valor: 'dedicado' }),
          campo('Nodegroup', 'gpu', 'spec.taints[0].effect', { valor: 'NO_SCHEDULE' })),
      ],
    }),

    exercicio({
      id: 'eks-pod-toleration',
      titulo: 'Pod que tolera o taint da GPU',
      dificuldade: 'medio',
      resumo: `
        <p>O node group <code>gpu</code> tem o taint <code>dedicado=gpu:NoSchedule</code>. O Pod de treino precisa de duas coisas: a
        <b>toleration</b> (a permissão para entrar) e o <b>nodeSelector</b> (o pedido para ir só para lá).</p>
        <ol>
          <li>No Pod <code>treino</code>, crie <code>tolerations</code> com <code>key: dedicado</code>, <code>operator: Equal</code>,
            <code>value: gpu</code> e <code>effect: NoSchedule</code> (formato do Kubernetes).</li>
          <li>Crie <code>nodeSelector</code> com <code>eks.amazonaws.com/nodegroup: gpu</code>.</li>
        </ol>
        <p><b>No cluster:</b> a toleration sozinha só <b>permite</b> o nó com GPU; o nodeSelector é o que <b>obriga</b>. Com os dois,
        o Pod vai para o grupo gpu e mais nenhum Pod entra lá.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: treino
        spec:
          # TODO: tolerations com dedicado=gpu e effect NoSchedule (passo 1)
          # TODO: nodeSelector com eks.amazonaws.com/nodegroup: gpu (passo 2)
          containers:
            - name: treino
              image: public.ecr.aws/docker/library/python:3.12
              command: ["sleep", "3600"]
      `,
      dica: [
        'tolerations é uma lista no spec do Pod; nodeSelector é um mapa. Os dois ficam alinhados com containers.',
        'No Pod, o efeito segue o Kubernetes: NoSchedule (e não NO_SCHEDULE).',
        'tolerations:\n  - key: dedicado\n    operator: Equal\n    value: gpu\n    effect: NoSchedule\nnodeSelector:\n  eks.amazonaws.com/nodegroup: gpu',
      ],
      solucao: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: treino
        spec:
          tolerations:
            - key: dedicado
              operator: Equal
              value: gpu
              effect: NoSchedule
          nodeSelector:
            eks.amazonaws.com/nodegroup: gpu
          containers:
            - name: treino
              image: public.ecr.aws/docker/library/python:3.12
              command: ["sleep", "3600"]
      `,
      testes: [
        teste({ descricao: 'O Pod treino existe', dica: 'Mantenha kind: Pod e metadata.name: treino.' }, existe('Pod', 'treino')),
        teste({ descricao: 'O Pod tolera o taint da GPU', dica: 'Em tolerations: key: dedicado, value: gpu e effect: NoSchedule.' },
          campo('Pod', 'treino', 'spec.tolerations[0].value', { valor: 'gpu' }),
          campo('Pod', 'treino', 'spec.tolerations[0].effect', { valor: 'NoSchedule' })),
        teste({ descricao: 'O Pod vai só para o grupo gpu', dica: 'Crie nodeSelector com eks.amazonaws.com/nodegroup: gpu.' },
          campo('Pod', 'treino', 'spec.nodeSelector["eks.amazonaws.com/nodegroup"]', { valor: 'gpu' })),
      ],
    }),

    licao('eks-karpenter-licao', 'Karpenter: nós sob medida, na hora', 'dificil', `
      <p>O node group tem máquinas de um tamanho fixo. O <b>Karpenter</b> é diferente: ele olha os Pods <code>Pending</code> e
      <b>compra a máquina certa</b> para eles, em segundos, escolhendo entre centenas de tipos. É como um <b>motorista de
      aplicativo</b> que chama o carro do tamanho do grupo, em vez de uma frota parada no estacionamento.</p>
      <ul>
        <li><b>EC2NodeClass</b> (<code>karpenter.k8s.aws/v1</code>): o "como" da máquina na AWS. A role dos nós
          (<code>role</code>), a imagem (<code>amiSelectorTerms</code>, por exemplo <code>alias: al2023@latest</code>) e onde ela
          nasce (<code>subnetSelectorTerms</code> e <code>securityGroupSelectorTerms</code>, achados por tags).</li>
        <li><b>NodePool</b> (<code>karpenter.sh/v1</code>): o "quais" máquinas. Aponta para um EC2NodeClass em
          <code>nodeClassRef</code> e limita as escolhas com <code>requirements</code> (arquitetura, família, Spot ou
          On-Demand). Cada requirement tem <code>key</code>, <code>operator</code> (<code>In</code>, <code>NotIn</code>,
          <code>Exists</code>, <code>Gt</code>, <code>Lt</code>) e <code>values</code>.</li>
        <li><code>limits</code>: o teto do NodePool inteiro (por exemplo <code>cpu: "100"</code>). Passou do teto, ele para de comprar.</li>
        <li><code>disruption</code>: quando o Karpenter pode <b>desligar</b> nós. Com
          <code>consolidationPolicy: WhenEmptyOrUnderutilized</code>, ele junta Pods em menos máquinas e devolve as sobras;
          <code>budgets</code> limita quantos nós saem ao mesmo tempo.</li>
        <li><code>expireAfter</code> (no template): a idade máxima de um nó. Velho demais, é trocado por um novo, já com os
          patches de segurança.</li>
      </ul>
      <p><b>No cluster:</b> <code>kubectl get nodeclaims</code> mostra cada máquina que o Karpenter pediu, e os nós nascem com a label
      <code>karpenter.sh/nodepool</code>.</p>`,
    `
      # O "como": role, imagem e rede das máquinas
      apiVersion: karpenter.k8s.aws/v1
      kind: EC2NodeClass
      metadata:
        name: padrao
      spec:
        role: KarpenterNodeRole-loja-prod
        amiSelectorTerms:
          - alias: al2023@latest        # Amazon Linux 2023, sempre a mais nova
        subnetSelectorTerms:            # as sub-redes com esta tag
          - tags:
              karpenter.sh/discovery: loja-prod
        securityGroupSelectorTerms:     # os security groups com esta tag
          - tags:
              karpenter.sh/discovery: loja-prod
      ---
      # O "quais": que máquinas o Karpenter pode comprar
      apiVersion: karpenter.sh/v1
      kind: NodePool
      metadata:
        name: geral
      spec:
        template:
          spec:
            nodeClassRef:               # usa o EC2NodeClass acima
              group: karpenter.k8s.aws
              kind: EC2NodeClass
              name: padrao
            requirements:
              - key: kubernetes.io/arch
                operator: In
                values: ["amd64"]
        limits:
          cpu: "100"                    # no máximo 100 vCPUs somando todos os nós
    `),

    exercicio({
      id: 'eks-karpenter-ec2nodeclass',
      titulo: 'EC2NodeClass: a receita da máquina',
      dificuldade: 'medio',
      resumo: `
        <p>Antes de comprar máquinas, o Karpenter precisa saber a imagem, a role e a rede delas.</p>
        <ol>
          <li>Crie o <code>EC2NodeClass</code> <code>padrao</code> com <code>role: KarpenterNodeRole-loja-prod</code>.</li>
          <li>Em <code>amiSelectorTerms</code>, um item com <code>alias: al2023@latest</code>.</li>
          <li>Em <code>subnetSelectorTerms</code> e em <code>securityGroupSelectorTerms</code>, um item com
            <code>tags</code> <code>karpenter.sh/discovery: loja-prod</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Karpenter descobre as sub-redes e os security groups pelas tags e marca o EC2NodeClass como
        <code>Ready</code>. Ele ainda não compra nada: falta um NodePool.</p>`,
      inicial: `
        apiVersion: karpenter.k8s.aws/v1
        kind: EC2NodeClass
        metadata:
          name: padrao
        spec:
          role: KarpenterNodeRole-loja-prod
          amiSelectorTerms:
            # TODO: - alias: al2023@latest
          subnetSelectorTerms:
            - tags:
                karpenter.sh/discovery: loja-prod
          securityGroupSelectorTerms:
            # TODO: o mesmo seletor por tag das sub-redes
      `,
      dica: [
        'O exemplo da lição "Karpenter" tem o EC2NodeClass completo.',
        'Os três campos ...SelectorTerms são listas: cada item começa com "-".',
        'amiSelectorTerms:\n  - alias: al2023@latest\nsecurityGroupSelectorTerms:\n  - tags:\n      karpenter.sh/discovery: loja-prod',
      ],
      solucao: EC2NODECLASS,
      testes: [
        teste({ descricao: 'O EC2NodeClass padrao existe', dica: 'Preencha amiSelectorTerms e securityGroupSelectorTerms: os dois são obrigatórios.' },
          existe('EC2NodeClass', 'padrao')),
        teste({ descricao: 'Usa o Amazon Linux 2023', dica: 'Em amiSelectorTerms, escreva - alias: al2023@latest.' },
          campo('EC2NodeClass', 'padrao', 'spec.amiSelectorTerms[0].alias', { valor: 'al2023@latest' })),
        teste({ descricao: 'Acha os security groups pela tag', dica: 'Em securityGroupSelectorTerms: - tags: karpenter.sh/discovery: loja-prod.' },
          campo('EC2NodeClass', 'padrao', 'spec.securityGroupSelectorTerms[0].tags["karpenter.sh/discovery"]', { valor: 'loja-prod' })),
      ],
    }),

    exercicio({
      id: 'eks-karpenter-nodepool',
      titulo: 'NodePool: quais máquinas comprar',
      dificuldade: 'medio',
      existentes: EC2NODECLASS,
      resumo: `
        <p>O EC2NodeClass <code>padrao</code> já existe. Agora o NodePool <code>geral</code> diz quais máquinas o Karpenter pode
        comprar: só de arquitetura <code>arm64</code> (os processadores Graviton, mais baratos).</p>
        <ol>
          <li>Em <code>nodeClassRef</code>: <code>group: karpenter.k8s.aws</code>, <code>kind: EC2NodeClass</code> e <code>name: padrao</code>.</li>
          <li>Em <code>requirements</code>, um item com <code>key: kubernetes.io/arch</code>, <code>operator: In</code> e
            <code>values: ["arm64"]</code>.</li>
        </ol>
        <p><b>No cluster:</b> quando um Pod fica <code>Pending</code>, o Karpenter escolhe a máquina Graviton mais barata que caiba nele.
        As imagens dos containers precisam ter versão para arm64.</p>`,
      inicial: `
        apiVersion: karpenter.sh/v1
        kind: NodePool
        metadata:
          name: geral
        spec:
          template:
            spec:
              nodeClassRef:
                # TODO: group, kind e name do EC2NodeClass padrao
              requirements:
                - key: kubernetes.io/arch
                  operator:      # TODO: In
                  values:        # TODO: ["arm64"]
      `,
      dica: [
        'nodeClassRef tem três campos, como uma referência: o grupo da API, o kind e o nome.',
        'O requirement é uma regra: a label kubernetes.io/arch do nó tem que estar (In) na lista.',
        'nodeClassRef:\n  group: karpenter.k8s.aws\n  kind: EC2NodeClass\n  name: padrao\n...\noperator: In\nvalues: ["arm64"]',
      ],
      solucao: nodepool('geral').replace('["amd64"]', '["arm64"]'),
      testes: [
        teste({ descricao: 'O NodePool geral existe', dica: 'Preencha nodeClassRef e o requirement: são obrigatórios.' }, existe('NodePool', 'geral')),
        teste({ descricao: 'Usa o EC2NodeClass padrao', dica: 'Em nodeClassRef: kind: EC2NodeClass e name: padrao.' },
          campo('NodePool', 'geral', 'spec.template.spec.nodeClassRef.name', { valor: 'padrao' }),
          campo('NodePool', 'geral', 'spec.template.spec.nodeClassRef.kind', { valor: 'EC2NodeClass' })),
        teste({ descricao: 'Só compra máquinas arm64', dica: 'No requirement de kubernetes.io/arch, values: ["arm64"].' },
          campo('NodePool', 'geral', 'spec.template.spec.requirements[key=kubernetes.io/arch].values', { contem: 'arm64' })),
      ],
    }),

    exercicio({
      id: 'eks-karpenter-limites',
      titulo: 'NodePool com teto de gastos',
      dificuldade: 'medio',
      existentes: EC2NODECLASS,
      resumo: `
        <p>Um bug que cria Pods sem parar faria o Karpenter comprar máquinas sem parar. O teto do NodePool impede a conta de explodir.</p>
        <ol>
          <li>No NodePool <code>geral</code>, crie <code>limits</code> no nível do <code>spec</code> (fora do <code>template</code>).</li>
          <li>Os limites são <code>cpu: "64"</code> e <code>memory: 256Gi</code>.</li>
        </ol>
        <p><b>No cluster:</b> somando todos os nós do NodePool, o Karpenter para de comprar ao chegar em 64 vCPUs ou 256 GiB. Os Pods
        que sobrarem ficam <code>Pending</code> (e aparecem nos alertas).</p>`,
      inicial: nodepool('geral', `
    # TODO: limits com cpu "64" e memory 256Gi
`),
      dica: [
        'limits fica alinhado com template, direto embaixo de spec.',
        'limits:\n  cpu: "64"\n  memory: 256Gi',
      ],
      solucao: nodepool('geral', `
    limits:
      cpu: "64"
      memory: 256Gi
`),
      testes: [
        teste({ descricao: 'O NodePool tem teto de CPU', dica: 'Em spec.limits, escreva cpu: "64".' },
          existe('NodePool', 'geral'),
          campo('NodePool', 'geral', 'spec.limits.cpu', { valor: '64' })),
        teste({ descricao: 'O NodePool tem teto de memória', dica: 'Em spec.limits, escreva memory: 256Gi.' },
          campo('NodePool', 'geral', 'spec.limits.memory', { valor: '256Gi' })),
      ],
    }),

    exercicio({
      id: 'eks-karpenter-consolidacao',
      titulo: 'Karpenter devolvendo as máquinas que sobram',
      dificuldade: 'dificil',
      existentes: EC2NODECLASS,
      resumo: `
        <p>De madrugada o tráfego cai e sobram nós quase vazios. A consolidação junta os Pods em menos máquinas e devolve o resto,
        sem derrubar tudo de uma vez.</p>
        <ol>
          <li>No NodePool <code>geral</code>, crie <code>disruption</code> no nível do <code>spec</code>.</li>
          <li><code>consolidationPolicy: WhenEmptyOrUnderutilized</code> e <code>consolidateAfter: 5m</code>.</li>
          <li>Em <code>budgets</code>, um item com <code>nodes: "10%"</code> (no máximo 10% dos nós saem ao mesmo tempo).</li>
        </ol>
        <p><b>No cluster:</b> depois de 5 minutos com um nó subutilizado, o Karpenter tira os Pods dele (respeitando os
        PodDisruptionBudgets), põe em outros nós e desliga a máquina.</p>`,
      inicial: nodepool('geral', `
    disruption:
      consolidationPolicy:   # TODO: WhenEmptyOrUnderutilized
      consolidateAfter:      # TODO: 5m
      # TODO: budgets com nodes "10%"
`),
      dica: [
        'disruption fica alinhado com template. budgets é uma lista dentro de disruption.',
        'O valor de nodes é texto: uma porcentagem ou um número entre aspas.',
        'disruption:\n  consolidationPolicy: WhenEmptyOrUnderutilized\n  consolidateAfter: 5m\n  budgets:\n    - nodes: "10%"',
      ],
      solucao: nodepool('geral', `
    disruption:
      consolidationPolicy: WhenEmptyOrUnderutilized
      consolidateAfter: 5m
      budgets:
        - nodes: "10%"
`),
      testes: [
        teste({ descricao: 'Consolida nós vazios e subutilizados', dica: 'Em spec.disruption, escreva consolidationPolicy: WhenEmptyOrUnderutilized.' },
          campo('NodePool', 'geral', 'spec.disruption.consolidationPolicy', { valor: 'WhenEmptyOrUnderutilized' })),
        teste({ descricao: 'Espera 5 minutos antes de consolidar', dica: 'Em spec.disruption, escreva consolidateAfter: 5m.' },
          campo('NodePool', 'geral', 'spec.disruption.consolidateAfter', { valor: '5m' })),
        teste({ descricao: 'No máximo 10% dos nós saem por vez', dica: 'Em disruption.budgets, crie o item - nodes: "10%".' },
          campo('NodePool', 'geral', 'spec.disruption.budgets[0].nodes', { valor: '10%' })),
      ],
    }),

    licao('eks-cluster-autoscaler-licao', 'Cluster Autoscaler: o node group que cresce sozinho', 'medio', `
      <p>Antes do Karpenter, o jeito de ter nós automáticos era o <b>Cluster Autoscaler</b>, e ele ainda é muito usado. Ele não
      escolhe máquinas: ele <b>aumenta e diminui o desiredSize</b> dos node groups que já existem, como o gerente que chama
      mais um ônibus igual aos outros quando a fila cresce.</p>
      <ul>
        <li>Roda como um Deployment no <code>kube-system</code>, com uma ServiceAccount que tem permissão (IRSA ou Pod Identity)
          para mexer nos Auto Scaling Groups.</li>
        <li><b>Auto-discovery</b>: com <code>--node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/loja-prod</code>
          ele acha sozinho os grupos com essas tags.</li>
        <li><code>--balance-similar-node-groups</code> distribui os nós novos entre grupos iguais de zonas diferentes.</li>
        <li><code>--expander=least-waste</code> escolhe o grupo que deixa menos CPU e memória sobrando.</li>
        <li>A versão da imagem acompanha a do Kubernetes: cluster 1.31, imagem <code>v1.31.x</code>.</li>
      </ul>
      <p>Use <b>um ou outro</b>: Cluster Autoscaler e Karpenter cuidando dos mesmos nós brigam entre si.</p>
      <p><b>No cluster:</b> quando um Pod fica <code>Pending</code> por falta de espaço, o Cluster Autoscaler sobe o desiredSize do
      grupo; quando um nó fica ocioso por 10 minutos, ele tira os Pods dali e diminui o grupo.</p>`,
    `
      # O pedaço que importa do Deployment do Cluster Autoscaler
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: cluster-autoscaler
        namespace: kube-system
      spec:
        replicas: 1
        selector:
          matchLabels:
            app: cluster-autoscaler
        template:
          metadata:
            labels:
              app: cluster-autoscaler
          spec:
            serviceAccountName: cluster-autoscaler   # com permissão nos Auto Scaling Groups
            containers:
              - name: cluster-autoscaler
                image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.31.0
                command:
                  - ./cluster-autoscaler
                  - --cloud-provider=aws            # fala com a AWS
                  - --balance-similar-node-groups   # espalha entre zonas
    `),

    exercicio({
      id: 'eks-cluster-autoscaler',
      titulo: 'Cluster Autoscaler que acha os node groups',
      dificuldade: 'dificil',
      resumo: `
        <p>O Cluster Autoscaler do exemplo ainda não sabe quais node groups pode mexer. A auto-descoberta por tags resolve, e o
        expander escolhe o grupo com menos desperdício.</p>
        <ol>
          <li>No Deployment <code>cluster-autoscaler</code> (<code>kube-system</code>), mantenha <code>--cloud-provider=aws</code>.</li>
          <li>Acrescente ao <code>command</code>
            <code>--node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/loja-prod</code>.</li>
          <li>Acrescente <code>--expander=least-waste</code>.</li>
        </ol>
        <p><b>No cluster:</b> nos logs do Pod aparecem os Auto Scaling Groups descobertos; com um Pod <code>Pending</code>, o grupo que
        sobra menos recursos ganha mais um nó.</p>`,
      inicial: `
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: cluster-autoscaler
          namespace: kube-system
        spec:
          replicas: 1
          selector:
            matchLabels:
              app: cluster-autoscaler
          template:
            metadata:
              labels:
                app: cluster-autoscaler
            spec:
              serviceAccountName: cluster-autoscaler
              containers:
                - name: cluster-autoscaler
                  image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.31.0
                  command:
                    - ./cluster-autoscaler
                    - --cloud-provider=aws
                    # TODO: a auto-descoberta por tags (passo 2)
                    # TODO: o expander least-waste (passo 3)
      `,
      dica: [
        'Cada opção é um item da lista command, numa linha começando com "- ".',
        'As duas tags vão juntas, separadas por vírgula, depois de asg:tag=.',
        '- --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/loja-prod\n- --expander=least-waste',
      ],
      solucao: `
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: cluster-autoscaler
          namespace: kube-system
        spec:
          replicas: 1
          selector:
            matchLabels:
              app: cluster-autoscaler
          template:
            metadata:
              labels:
                app: cluster-autoscaler
            spec:
              serviceAccountName: cluster-autoscaler
              containers:
                - name: cluster-autoscaler
                  image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.31.0
                  command:
                    - ./cluster-autoscaler
                    - --cloud-provider=aws
                    - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/loja-prod
                    - --expander=least-waste
      `,
      testes: [
        teste({ descricao: 'O Cluster Autoscaler fala com a AWS', dica: 'Mantenha - --cloud-provider=aws no command.' },
          existe('Deployment', 'cluster-autoscaler'),
          campo('Deployment', 'cluster-autoscaler', 'spec.template.spec.containers[0].command', { contem: '--cloud-provider=aws' })),
        teste({ descricao: 'Descobre os node groups pelas tags', dica: 'Acrescente ao command a linha --node-group-auto-discovery=asg:tag=... com as duas tags.' },
          campo('Deployment', 'cluster-autoscaler', 'spec.template.spec.containers[0].command',
            { contem: '--node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/loja-prod' })),
        teste({ descricao: 'Escolhe o grupo com menos desperdício', dica: 'Acrescente ao command a linha --expander=least-waste.' },
          campo('Deployment', 'cluster-autoscaler', 'spec.template.spec.containers[0].command', { contem: '--expander=least-waste' })),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'eks-nodegroup-basico': { dica: 'Mantenha o cluster, a role e as sub-redes que vieram no esqueleto.', regras: [campo('Nodegroup', 'geral', 'spec.clusterName', { valor: 'loja-prod' }), campo('Nodegroup', 'geral', 'spec.subnets', { minimo: 2 })] },
    'eks-nodegroup-labels': { dica: 'O grupo tem um só tipo de máquina, e o nome dele não muda.', regras: [campo('Nodegroup', 'batch', 'spec.instanceTypes', { maximo: 1 }), campo('Nodegroup', 'batch', 'spec.name', { valor: 'batch' })] },
    'eks-pod-nodeselector': { dica: 'O Job continua com restartPolicy: Never e um só nodeSelector.', regras: [campo('Job', 'relatorio-noturno', 'spec.template.spec.restartPolicy', { valor: 'Never' })] },
    'eks-nodegroup-taint': { dica: 'Confira o valor do taint e o tipo de máquina.', regras: [campo('Nodegroup', 'gpu', 'spec.taints[0].value', { valor: 'gpu' }), campo('Nodegroup', 'gpu', 'spec.instanceTypes', { contem: 'g5.xlarge' })] },
    'eks-pod-toleration': { dica: 'Confira a chave e o operador da toleration do passo 1.', regras: [campo('Pod', 'treino', 'spec.tolerations[0].key', { valor: 'dedicado' }), campo('Pod', 'treino', 'spec.tolerations[0].operator', { valor: 'Equal' })] },
    'eks-karpenter-ec2nodeclass': { dica: 'Confira a role e o seletor das sub-redes.', regras: [campo('EC2NodeClass', 'padrao', 'spec.role', { valor: 'KarpenterNodeRole-loja-prod' }), campo('EC2NodeClass', 'padrao', 'spec.subnetSelectorTerms[0].tags["karpenter.sh/discovery"]', { valor: 'loja-prod' })] },
    'eks-karpenter-nodepool': { dica: 'Confira o grupo da API no nodeClassRef e o operador do requirement.', regras: [campo('NodePool', 'geral', 'spec.template.spec.nodeClassRef.group', { valor: 'karpenter.k8s.aws' }), campo('NodePool', 'geral', 'spec.template.spec.requirements[key=kubernetes.io/arch].operator', { valor: 'In' }), campo('NodePool', 'geral', 'spec.template.spec.requirements[key=kubernetes.io/arch].values', { naoContem: 'amd64' })] },
    'eks-karpenter-limites': { dica: 'limits fica direto no spec, e o NodePool continua usando o EC2NodeClass padrao.', regras: [campo('NodePool', 'geral', 'spec.template.spec.nodeClassRef.name', { valor: 'padrao' }), campo('NodePool', 'geral', 'spec.template.spec.limits', { ausente: true })] },
    'eks-karpenter-consolidacao': { dica: 'Um só budget, e o NodePool continua usando o EC2NodeClass padrao.', regras: [campo('NodePool', 'geral', 'spec.disruption.budgets', { maximo: 1 }), campo('NodePool', 'geral', 'spec.template.spec.nodeClassRef.name', { valor: 'padrao' })] },
    'eks-cluster-autoscaler': { dica: 'O Cluster Autoscaler fica no kube-system, com a ServiceAccount e a imagem do esqueleto.', regras: [campo('Deployment', 'cluster-autoscaler', 'metadata.namespace', { valor: 'kube-system' }), campo('Deployment', 'cluster-autoscaler', 'spec.template.spec.serviceAccountName', { valor: 'cluster-autoscaler' }), campo('Deployment', 'cluster-autoscaler', 'spec.template.spec.containers[0].image', { contem: 'cluster-autoscaler:v1.31' })] },
  },
};
