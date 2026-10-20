// Projeto: a vitrine de uma loja no EKS, com identidade, ALB, Karpenter e alta disponibilidade.
// Segue docs/didatica.md: lição de arquitetura e 5 etapas; cada etapa parte da anterior.
import { licao, exercicio, teste, existe, campo, docs } from './util.js';

const info = (n) => `<p class="etapa-info">🧩 <b>Projeto Loja no EKS</b> · etapa ${n} de 5. A vitrine da loja rodando na AWS, do namespace ao Karpenter.</p>`;
const ROLE = 'arn:aws:iam::123456789012:role/Vitrine';

const NAMESPACE = `
  apiVersion: v1
  kind: Namespace
  metadata:
    name: loja
    labels:
      pod-security.kubernetes.io/enforce: baseline
`;

/** O Deployment da vitrine no namespace loja; `pod` entra no spec do Pod. */
const deployVitrine = (pod = '') => `
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: vitrine
    namespace: loja
  spec:
    replicas: 3
    selector:
      matchLabels:
        app: vitrine
    template:
      metadata:
        labels:
          app: vitrine
      spec:
${pod}        containers:
          - name: vitrine
            image: public.ecr.aws/nginx/nginx:1.27
            ports:
              - containerPort: 80
`;

const SERVICE = `
  apiVersion: v1
  kind: Service
  metadata:
    name: vitrine
    namespace: loja
  spec:
    selector:
      app: vitrine
    ports:
      - port: 80
        targetPort: 80
`;

const SA_POD = '        serviceAccountName: vitrine\n';

export const projetoEks = {
  id: 'proj-eks',
  titulo: 'Projeto Loja no EKS',
  icone: '🟠',
  itens: [
    licao('proj-eks-arquitetura', 'Arquitetura da loja no EKS', 'dificil', `
      <p>Agora a vitrine da loja vai para um cluster <b>EKS</b> de produção, usando o que você praticou no módulo da AWS. Pense na mudança
      de uma loja de bairro para um shopping: a loja é a mesma, mas ganha crachás, recepção, estacionamento que cresce e saídas de
      emergência.</p>
      <ol>
        <li><b>Base</b>: o namespace <code>loja</code> (com o Pod Security no nível baseline), o Deployment e o Service da vitrine.</li>
        <li><b>Identidade</b>: a ServiceAccount <code>vitrine</code> ligada à role do IAM pelo EKS Pod Identity.</li>
        <li><b>Entrada</b>: um Ingress que vira um ALB, com health check e grupo.</li>
        <li><b>Nós</b>: o Karpenter com EC2NodeClass e NodePool que prefere Spot, com teto de gastos.</li>
        <li><b>Alta disponibilidade</b>: réplicas espalhadas pelas zonas e um PodDisruptionBudget.</li>
      </ol>
      <p><b>No cluster:</b> no fim, o ALB recebe os clientes, os Pods leem o S3 com a própria identidade e o Karpenter compra as máquinas mais
      baratas que couberem neles, sem nunca deixar a vitrine numa zona só.</p>`,
    `
      # O desenho do projeto:
      #
      #   cliente -> ALB (Ingress vitrine) -> Service vitrine -> Pods vitrine (3 zonas)
      #   Pods vitrine --(Pod Identity: role Vitrine)--> S3
      #   Pods Pending --> Karpenter (NodePool geral + EC2NodeClass padrao) --> EC2 Spot/On-Demand
      #
      # Etapa 1: tudo começa no namespace loja.
      apiVersion: v1
      kind: Namespace
      metadata:
        name: loja
        labels:
          pod-security.kubernetes.io/enforce: baseline   # recusa Pods privilegiados
    `),

    exercicio({
      id: 'proj-eks-base',
      titulo: 'Etapa 1: a vitrine no namespace da loja',
      dificuldade: 'facil',
      resumo: `
        ${info(1)}
        <p>Tudo da loja fica no namespace <code>loja</code>, que já recusa Pods privilegiados.</p>
        <ol>
          <li>Crie o Namespace <code>loja</code> com a label <code>pod-security.kubernetes.io/enforce: baseline</code>.</li>
          <li>Coloque o Deployment <code>vitrine</code> e o Service <code>vitrine</code> no namespace <code>loja</code> (<code>metadata.namespace</code>).</li>
        </ol>
        <p><b>No cluster:</b> <code>kubectl get all -n loja</code> mostra as 3 réplicas da vitrine e o Service; no namespace <code>default</code>, nada.</p>`,
      inicial: docs(`
        apiVersion: v1
        kind: Namespace
        metadata:
          name: loja
          labels:
            # TODO: pod-security.kubernetes.io/enforce: baseline
      `, deployVitrine().replace('    namespace: loja\n', '    # TODO: namespace: loja\n'), SERVICE.replace('    namespace: loja\n', '    # TODO: namespace: loja\n')),
      dica: [
        'O exemplo da lição "Arquitetura da loja no EKS" é o Namespace pronto.',
        'metadata.namespace fica dentro de metadata, alinhado com name.',
        'metadata:\n  name: vitrine\n  namespace: loja',
      ],
      solucao: docs(NAMESPACE, deployVitrine(), SERVICE),
      testes: [
        teste({ descricao: 'O namespace loja recusa Pods privilegiados', dica: 'No Namespace: label pod-security.kubernetes.io/enforce: baseline.' },
          campo('Namespace', 'loja', 'metadata.labels["pod-security.kubernetes.io/enforce"]', { valor: 'baseline' })),
        teste({ descricao: 'A vitrine mora no namespace loja', dica: 'No Deployment e no Service: metadata.namespace: loja.' },
          campo('Deployment', 'vitrine', 'metadata.namespace', { valor: 'loja' }),
          campo('Service', 'vitrine', 'metadata.namespace', { valor: 'loja' })),
      ],
    }),

    exercicio({
      id: 'proj-eks-identidade',
      titulo: 'Etapa 2: a vitrine com identidade da AWS',
      dificuldade: 'medio',
      existentes: docs(NAMESPACE, SERVICE),
      resumo: `
        ${info(2)}
        <p>A vitrine lê as fotos dos produtos num bucket S3. Ela ganha um crachá com o EKS Pod Identity.</p>
        <ol>
          <li>Crie a ServiceAccount <code>vitrine</code> no namespace <code>loja</code>.</li>
          <li>Crie a <code>PodIdentityAssociation</code> <code>vitrine</code> (cluster <code>loja-prod</code>, namespace <code>loja</code>, ServiceAccount
            <code>vitrine</code>, <code>roleARN: ${ROLE}</code>).</li>
          <li>No Deployment <code>vitrine</code>, use <code>serviceAccountName: vitrine</code>.</li>
        </ol>
        <p><b>No cluster:</b> os Pods recriados recebem credenciais temporárias da role Vitrine e conseguem ler o bucket, sem chave guardada.</p>`,
      inicial: docs(`
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: vitrine
          namespace: loja
        ---
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: PodIdentityAssociation
        metadata:
          name: vitrine
          namespace: loja
        spec:
          clusterName: loja-prod
          # TODO: namespace, serviceAccount e roleARN (passo 2)
      `, deployVitrine('        # TODO: serviceAccountName: vitrine (passo 3)\n')),
      dica: [
        'São as três peças do exercício "Do zero: ServiceAccount, associação e Deployment" do módulo da AWS.',
        `namespace: loja\nserviceAccount: vitrine\nroleARN: ${ROLE}\n...\nserviceAccountName: vitrine`,
      ],
      solucao: docs(`
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: vitrine
          namespace: loja
        ---
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: PodIdentityAssociation
        metadata:
          name: vitrine
          namespace: loja
        spec:
          clusterName: loja-prod
          namespace: loja
          serviceAccount: vitrine
          roleARN: ${ROLE}
      `, deployVitrine(SA_POD)),
      testes: [
        teste({ descricao: 'A associação liga loja/vitrine à role Vitrine', dica: `Na PodIdentityAssociation: serviceAccount: vitrine e roleARN: ${ROLE}.` },
          campo('PodIdentityAssociation', 'vitrine', 'spec.serviceAccount', { valor: 'vitrine' }),
          campo('PodIdentityAssociation', 'vitrine', 'spec.roleARN', { valor: ROLE })),
        teste({ descricao: 'Os Pods usam a ServiceAccount', dica: 'No Deployment: serviceAccountName: vitrine.' },
          campo('Deployment', 'vitrine', 'spec.template.spec.serviceAccountName', { valor: 'vitrine' })),
      ],
    }),

    exercicio({
      id: 'proj-eks-alb',
      titulo: 'Etapa 3: a entrada com o ALB',
      dificuldade: 'medio',
      existentes: docs(NAMESPACE, SERVICE),
      resumo: `
        ${info(3)}
        <p>Os clientes chegam pelo ALB. Ele deve ser público, mandar direto aos Pods, conferir a saúde em <code>/</code> e entrar no grupo
        <code>loja</code> (para dividir o ALB com o checkout no futuro).</p>
        <ol>
          <li>No Ingress <code>vitrine</code> (namespace <code>loja</code>, <code>ingressClassName: alb</code>), as annotations de <code>scheme</code>
            (<code>internet-facing</code>) e <code>target-type</code> (<code>ip</code>).</li>
          <li>As annotations <code>alb.ingress.kubernetes.io/healthcheck-path: /</code> e <code>alb.ingress.kubernetes.io/group.name: loja</code>.</li>
        </ol>
        <p><b>No cluster:</b> o AWS Load Balancer Controller cria (ou reaproveita) o ALB do grupo loja e registra os IPs das 3 réplicas.</p>`,
      inicial: `
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: vitrine
          namespace: loja
          annotations:
            alb.ingress.kubernetes.io/scheme: internet-facing
            alb.ingress.kubernetes.io/target-type: ip
            # TODO: healthcheck-path / e group.name loja (passo 2)
        spec:
          ingressClassName: alb
          rules:
            - http:
                paths:
                  - path: /
                    pathType: Prefix
                    backend:
                      service:
                        name: vitrine
                        port:
                          number: 80
      `,
      dica: [
        'As duas annotations novas são as dos exercícios de health check e de grupo do módulo da AWS.',
        'alb.ingress.kubernetes.io/healthcheck-path: /\nalb.ingress.kubernetes.io/group.name: loja',
      ],
      solucao: `
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: vitrine
          namespace: loja
          annotations:
            alb.ingress.kubernetes.io/scheme: internet-facing
            alb.ingress.kubernetes.io/target-type: ip
            alb.ingress.kubernetes.io/healthcheck-path: /
            alb.ingress.kubernetes.io/group.name: loja
        spec:
          ingressClassName: alb
          rules:
            - http:
                paths:
                  - path: /
                    pathType: Prefix
                    backend:
                      service:
                        name: vitrine
                        port:
                          number: 80
      `,
      testes: [
        teste({ descricao: 'O ALB confere a saúde em /', dica: 'Annotation alb.ingress.kubernetes.io/healthcheck-path: /.' },
          campo('Ingress', 'vitrine', 'metadata.annotations["alb.ingress.kubernetes.io/healthcheck-path"]', { valor: '/' })),
        teste({ descricao: 'O Ingress está no grupo loja', dica: 'Annotation alb.ingress.kubernetes.io/group.name: loja.' },
          campo('Ingress', 'vitrine', 'metadata.annotations["alb.ingress.kubernetes.io/group.name"]', { valor: 'loja' })),
      ],
    }),

    exercicio({
      id: 'proj-eks-karpenter',
      titulo: 'Etapa 4: máquinas sob medida com o Karpenter',
      dificuldade: 'dificil',
      resumo: `
        ${info(4)}
        <p>Os nós da loja vão ser comprados pelo Karpenter: Spot quando houver, com teto de 40 vCPUs.</p>
        <ol>
          <li>O EC2NodeClass <code>padrao</code> já vem pronto no esqueleto.</li>
          <li>No NodePool <code>geral</code>, o <code>nodeClassRef</code> aponta para ele (<code>group: karpenter.k8s.aws</code>, <code>kind: EC2NodeClass</code>,
            <code>name: padrao</code>).</li>
          <li>Em <code>requirements</code>, <code>karpenter.sh/capacity-type</code> <code>In</code> <code>["spot", "on-demand"]</code>; em <code>limits</code>,
            <code>cpu: "40"</code>.</li>
        </ol>
        <p><b>No cluster:</b> quando a vitrine escalar e faltar espaço, o Karpenter compra a máquina Spot mais barata que caiba nos Pods, até somar 40 vCPUs.</p>`,
      inicial: `
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
        ---
        apiVersion: karpenter.sh/v1
        kind: NodePool
        metadata:
          name: geral
        spec:
          template:
            spec:
              nodeClassRef:
                # TODO: group, kind e name (passo 2)
              requirements:
                # TODO: o requirement de karpenter.sh/capacity-type (passo 3)
          # TODO: limits com cpu "40" (passo 3)
      `,
      dica: [
        'É o NodePool dos exercícios do Karpenter, juntando nodeClassRef, o requirement de Spot e o teto.',
        'limits fica no spec, alinhado com template, e o valor é texto.',
        'nodeClassRef:\n  group: karpenter.k8s.aws\n  kind: EC2NodeClass\n  name: padrao\nrequirements:\n  - key: karpenter.sh/capacity-type\n    operator: In\n    values: ["spot", "on-demand"]\n...\nlimits:\n  cpu: "40"',
      ],
      solucao: `
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
        ---
        apiVersion: karpenter.sh/v1
        kind: NodePool
        metadata:
          name: geral
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
                  values: ["spot", "on-demand"]
          limits:
            cpu: "40"
      `,
      testes: [
        teste({ descricao: 'O NodePool usa o EC2NodeClass padrao', dica: 'Em nodeClassRef: kind: EC2NodeClass e name: padrao.' },
          existe('NodePool', 'geral'),
          campo('NodePool', 'geral', 'spec.template.spec.nodeClassRef.name', { valor: 'padrao' })),
        teste({ descricao: 'Prefere Spot e cai para On-Demand', dica: 'No requirement karpenter.sh/capacity-type: values: ["spot", "on-demand"].' },
          campo('NodePool', 'geral', 'spec.template.spec.requirements[key=karpenter.sh/capacity-type].values', { valor: ['spot', 'on-demand'] })),
        teste({ descricao: 'Teto de 40 vCPUs', dica: 'Em spec.limits: cpu: "40".' },
          campo('NodePool', 'geral', 'spec.limits.cpu', { valor: '40' })),
      ],
    }),

    exercicio({
      id: 'proj-eks-producao',
      titulo: 'Etapa 5: a vitrine em todas as zonas',
      dificuldade: 'dificil',
      existentes: docs(NAMESPACE, SERVICE, `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: vitrine
          namespace: loja
      `),
      resumo: `
        ${info(5)}
        <p>Se uma zona da AWS cair, a vitrine não pode cair junto. As réplicas vão para zonas diferentes, e o esvaziamento de nós (upgrade ou
        consolidação do Karpenter) sempre deixa duas no ar.</p>
        <ol>
          <li>No Deployment <code>vitrine</code>, em <code>topologySpreadConstraints</code>: <code>maxSkew: 1</code>,
            <code>topologyKey: topology.kubernetes.io/zone</code> e <code>whenUnsatisfiable: DoNotSchedule</code>.</li>
          <li>No mesmo item, <code>labelSelector.matchLabels</code> com <code>app: vitrine</code>.</li>
          <li>Crie o PodDisruptionBudget <code>vitrine</code> (namespace <code>loja</code>) com <code>minAvailable: 2</code> e <code>selector</code>
            <code>app: vitrine</code>.</li>
        </ol>
        <p><b>No cluster:</b> as 3 réplicas ficam uma em cada zona (o Karpenter compra nós nas zonas que faltarem). Uma zona fora do ar leva só uma réplica.</p>`,
      inicial: docs(deployVitrine(`${SA_POD}        # TODO: topologySpreadConstraints pelas zonas (passos 1 e 2)
`), `
        # TODO: o PodDisruptionBudget vitrine no namespace loja (passo 3)
      `),
      dica: [
        'topologySpreadConstraints é o espalhamento dos Fundamentos (lição "Disponibilidade"), agora com a label de zona da nuvem.',
        'O PDB é o do exercício "PDB para o upgrade do node group".',
        'topologySpreadConstraints:\n  - maxSkew: 1\n    topologyKey: topology.kubernetes.io/zone\n    whenUnsatisfiable: DoNotSchedule\n    labelSelector:\n      matchLabels:\n        app: vitrine',
      ],
      solucao: docs(deployVitrine(`${SA_POD}        topologySpreadConstraints:
          - maxSkew: 1
            topologyKey: topology.kubernetes.io/zone
            whenUnsatisfiable: DoNotSchedule
            labelSelector:
              matchLabels:
                app: vitrine
`), `
        apiVersion: policy/v1
        kind: PodDisruptionBudget
        metadata:
          name: vitrine
          namespace: loja
        spec:
          minAvailable: 2
          selector:
            matchLabels:
              app: vitrine
      `),
      testes: [
        teste({ descricao: 'As réplicas se espalham pelas zonas', dica: 'Em topologySpreadConstraints: topologyKey: topology.kubernetes.io/zone e maxSkew: 1.' },
          campo('Deployment', 'vitrine', 'spec.template.spec.topologySpreadConstraints[0].topologyKey', { valor: 'topology.kubernetes.io/zone' }),
          campo('Deployment', 'vitrine', 'spec.template.spec.topologySpreadConstraints[0].maxSkew', { valor: 1 })),
        teste({ descricao: 'O espalhamento é obrigatório e conta os Pods da vitrine', dica: 'whenUnsatisfiable: DoNotSchedule e labelSelector.matchLabels: app: vitrine.' },
          campo('Deployment', 'vitrine', 'spec.template.spec.topologySpreadConstraints[0].whenUnsatisfiable', { valor: 'DoNotSchedule' }),
          campo('Deployment', 'vitrine', 'spec.template.spec.topologySpreadConstraints[0].labelSelector.matchLabels.app', { valor: 'vitrine' })),
        teste({ descricao: 'Sempre sobram 2 réplicas', dica: 'Crie o PodDisruptionBudget vitrine com minAvailable: 2 e selector app: vitrine.' },
          campo('PodDisruptionBudget', 'vitrine', 'spec.minAvailable', { valor: 2 })),
      ],
    }),
  ],
  ocultos: {
    'proj-eks-base': { dica: 'O Deployment continua com 3 réplicas, e o Service escolhe os Pods da vitrine.', regras: [campo('Deployment', 'vitrine', 'spec.replicas', { valor: 3 }), { tipo: 'service-selector', service: 'vitrine', chave: 'app', valor: 'vitrine' }] },
    'proj-eks-identidade': { dica: 'Confira o cluster e o namespace da associação, e o namespace da ServiceAccount.', regras: [campo('PodIdentityAssociation', 'vitrine', 'spec.clusterName', { valor: 'loja-prod' }), campo('PodIdentityAssociation', 'vitrine', 'spec.namespace', { valor: 'loja' }), campo('ServiceAccount', 'vitrine', 'metadata.namespace', { valor: 'loja' })] },
    'proj-eks-alb': { dica: 'As annotations do passo 1 continuam lá, e o Ingress fica no namespace loja.', regras: [campo('Ingress', 'vitrine', 'metadata.annotations["alb.ingress.kubernetes.io/target-type"]', { valor: 'ip' }), campo('Ingress', 'vitrine', 'metadata.namespace', { valor: 'loja' })] },
    'proj-eks-karpenter': { dica: 'Confira o grupo e o kind do nodeClassRef.', regras: [campo('NodePool', 'geral', 'spec.template.spec.nodeClassRef.group', { valor: 'karpenter.k8s.aws' }), campo('NodePool', 'geral', 'spec.template.spec.nodeClassRef.kind', { valor: 'EC2NodeClass' })] },
    'proj-eks-producao': { dica: 'O PDB fica no namespace loja e escolhe os Pods da vitrine; a vitrine continua com a ServiceAccount da etapa 2.', regras: [campo('PodDisruptionBudget', 'vitrine', 'metadata.namespace', { valor: 'loja' }), campo('PodDisruptionBudget', 'vitrine', 'spec.selector.matchLabels.app', { valor: 'vitrine' }), campo('Deployment', 'vitrine', 'spec.template.spec.serviceAccountName', { valor: 'vitrine' })] },
  },
};
