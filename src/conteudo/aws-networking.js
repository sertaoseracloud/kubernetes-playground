// Módulo AWS, tópico 3: rede no EKS (VPC CNI, security groups para Pods, ALB por Ingress e NLB por Service).
// Segue docs/didatica.md: lição com exemplo comentado, passos, esqueleto, dicas e "como corrigir".
import { licao, exercicio, teste, existe, campo, yaml } from './util.js';

const CERTIFICADO = 'arn:aws:acm:us-east-1:123456789012:certificate/0a1b2c3d-1111-2222-3333-444455556666';
const ALB = 'alb.ingress.kubernetes.io';
const NLB = 'service.beta.kubernetes.io';

/** Um Ingress do ALB que leva / ao Service `servico`; `anotacoes` entram em metadata.annotations. */
const ingressAlb = (nome, servico, anotacoes) => `
  apiVersion: networking.k8s.io/v1
  kind: Ingress
  metadata:
    name: ${nome}
    annotations:
${anotacoes}
  spec:
    ingressClassName: alb
    rules:
      - http:
          paths:
            - path: /
              pathType: Prefix
              backend:
                service:
                  name: ${servico}
                  port:
                    number: 80
`;

/** Um Service LoadBalancer para os Pods app: api; `anotacoes` entram em metadata.annotations. */
const serviceNlb = (nome, anotacoes) => `
  apiVersion: v1
  kind: Service
  metadata:
    name: ${nome}
    annotations:
${anotacoes}
  spec:
    type: LoadBalancer
    selector:
      app: api
    ports:
      - port: 80
        targetPort: 8080
`;

export const awsNetworking = {
  id: 'aws-networking',
  titulo: 'Rede no EKS',
  descricao: 'VPC CNI, security groups para Pods, ALB por Ingress e NLB por Service.',
  icone: '🌐',
  itens: [
    licao('aws-vpc-cni', 'VPC CNI e pod networking', 'dificil', `
      <p>No EKS, cada Pod ganha um <b>IP de verdade da VPC</b>, como cada morador de um condomínio ganhar um número próprio na
      rua, em vez de dividir o número do prédio. Quem faz isso é o <b>VPC CNI</b> (o add-on <code>vpc-cni</code>, que roda como o
      DaemonSet <code>aws-node</code> em cada nó).</p>
      <ul>
        <li>O plugin pendura <b>ENIs</b> (placas de rede virtuais) no nó e reserva IPs delas para os Pods. Cada tipo de máquina
          aceita um número de ENIs e de IPs, e isso limita quantos Pods cabem no nó. Com <b>prefix delegation</b>, cada ENI
          recebe blocos de 16 IPs e cabem bem mais Pods.</li>
        <li><b>NetworkPolicy</b>: o VPC CNI aplica as políticas sozinho quando a chave
          <code>enable-network-policy-controller: "true"</code> está no ConfigMap <code>amazon-vpc-cni</code> do <code>kube-system</code>.</li>
        <li><b>Custom networking</b> (<code>ENIConfig</code>): os Pods pegam IP de <b>outra sub-rede</b>, separada da dos nós,
          quando a VPC está ficando sem endereços. Há um ENIConfig por zona, com o nome da zona.</li>
        <li><b>Security groups para Pods</b> (<code>SecurityGroupPolicy</code>): um firewall da AWS só para alguns Pods,
          escolhidos por labels (<code>podSelector</code>) ou pela ServiceAccount (<code>serviceAccountSelector</code>). É o que
          deixa só os Pods de pagamento chegarem no banco RDS.</li>
      </ul>
      <p><b>No cluster:</b> <code>kubectl get pods -o wide</code> mostra IPs da própria VPC (por exemplo <code>10.0.12.47</code>), que
      outros serviços da AWS alcançam direto.</p>`,
    `
      # Liga as NetworkPolicies no VPC CNI
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: amazon-vpc-cni
        namespace: kube-system
      data:
        enable-network-policy-controller: "true"   # texto, entre aspas
      ---
      # Os Pods com app: pagamentos ganham o security group do banco
      apiVersion: vpcresources.k8s.aws/v1beta1
      kind: SecurityGroupPolicy
      metadata:
        name: pagamentos-banco
      spec:
        podSelector:
          matchLabels:
            app: pagamentos
        securityGroups:
          groupIds:
            - sg-0a1b2c3d4e5f00001   # o SG que o RDS aceita
    `),

    exercicio({
      id: 'aws-vpc-cni-netpol',
      titulo: 'Ligando as NetworkPolicies no VPC CNI',
      dificuldade: 'facil',
      resumo: `
        <p>O time de segurança escreveu NetworkPolicies, mas elas não fazem nada: no EKS, o VPC CNI só aplica políticas quando o
        recurso está ligado.</p>
        <ol>
          <li>Crie o ConfigMap <code>amazon-vpc-cni</code> no namespace <code>kube-system</code>.</li>
          <li>Em <code>data</code>, a chave <code>enable-network-policy-controller</code> com o valor <code>"true"</code> (entre aspas).</li>
        </ol>
        <p><b>No cluster:</b> o agente de políticas do <code>aws-node</code> passa a traduzir cada NetworkPolicy em regras eBPF no nó, e os
        pacotes proibidos começam a ser descartados.</p>`,
      inicial: `
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: amazon-vpc-cni
          namespace: kube-system
        data:
          # TODO: enable-network-policy-controller: "true"
      `,
      dica: [
        'O exemplo da lição "VPC CNI" tem exatamente esse ConfigMap.',
        'Valores de ConfigMap são sempre texto: escreva "true" com aspas.',
      ],
      solucao: `
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: amazon-vpc-cni
          namespace: kube-system
        data:
          enable-network-policy-controller: "true"
      `,
      testes: [
        teste({ descricao: 'O ConfigMap amazon-vpc-cni existe', dica: 'Um ConfigMap sem nenhuma chave em data não é aceito: escreva a chave do passo 2.' },
          existe('ConfigMap', 'amazon-vpc-cni')),
        teste({ descricao: 'As NetworkPolicies estão ligadas', dica: 'Em data, escreva enable-network-policy-controller: "true".' },
          { tipo: 'configmap-contem', configmap: 'amazon-vpc-cni', chave: 'enable-network-policy-controller', valor: 'true' }),
      ],
    }),

    {
      id: 'aws-network-policy-exercicio',
      tipo: 'exercicio',
      titulo: 'NetworkPolicy restritiva',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `
        <p>No EKS, as NetworkPolicies são aplicadas pelo VPC CNI (com o recurso de políticas ligado). A regra é a mesma de qualquer cluster.</p>
        <ol>
          <li>A NetworkPolicy <code>restrict-backend</code> seleciona os Pods com <code>role: backend</code>.</li>
          <li><code>policyTypes: [Ingress]</code>: controla só a entrada.</li>
          <li>Em <code>ingress[0].from</code>, só os Pods com <code>role: frontend</code>, na porta <code>8080/TCP</code>.</li>
        </ol>
        <p><b>No cluster:</b> qualquer outra origem que tente chegar ao backend tem os pacotes descartados.</p>`,
      inicial: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-backend
spec:
  podSelector:
    matchLabels:
      role:              # TODO: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              role:      # TODO: frontend
      ports:
        - protocol: TCP
          port:          # TODO: 8080
`,
      dica: [
        "Releia o exemplo da lição \"Firewall entre Pods\" (Recursos Avançados): a estrutura é a mesma.",
        "O podSelector de cima é QUEM é protegido (backend); o de dentro do from é QUEM pode entrar (frontend).",
      ],
      solucao: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-backend
spec:
  podSelector:
    matchLabels:
      role: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              role: frontend
      ports:
        - protocol: TCP
          port: 8080`,
      testes: [
        {
          descricao: 'A NetworkPolicy restrict-backend existe',
          dica: "Preencha os TODO: um campo vazio impede o apply.",
          regras: [{ tipo: 'recurso-existe', kind: 'NetworkPolicy', nome: 'restrict-backend' }],
        },
        {
          descricao: 'A NetworkPolicy seleciona pods backend e restringe ingress',
          dica: "podSelector com role: backend e, em from, role: frontend.",
          regras: [{ tipo: 'network-policy', policy: 'restrict-backend', podSelector: 'role=backend', direction: 'Ingress' }],
        },
      ],
    },

    exercicio({
      id: 'aws-eniconfig',
      titulo: 'Pods em outra sub-rede com ENIConfig',
      dificuldade: 'medio',
      resumo: `
        <p>A sub-rede dos nós está quase sem IPs livres. Com <b>custom networking</b>, os Pods da zona <code>us-east-1a</code> passam a
        pegar IP de uma sub-rede maior, criada só para eles.</p>
        <ol>
          <li>Crie o <code>ENIConfig</code> com o nome da zona: <code>us-east-1a</code>.</li>
          <li><code>subnet: subnet-0pods0000000001a</code>.</li>
          <li>Em <code>securityGroups</code>, a lista com <code>sg-0a1b2c3d4e5f00002</code>.</li>
        </ol>
        <p><b>No cluster:</b> com custom networking ligado no VPC CNI e o nó na zona <code>us-east-1a</code>, as ENIs dos Pods nascem na
        sub-rede nova, com esse security group. Os nós continuam na sub-rede antiga.</p>`,
      inicial: `
        apiVersion: crd.k8s.amazonaws.com/v1alpha1
        kind: ENIConfig
        metadata:
          name: us-east-1a
        spec:
          subnet:              # TODO: subnet-0pods0000000001a
          # TODO: securityGroups com sg-0a1b2c3d4e5f00002
      `,
      dica: [
        'O nome do ENIConfig é o nome da zona: é assim que o VPC CNI acha qual usar em cada nó.',
        'securityGroups é uma lista de IDs, alinhada com subnet.',
        'subnet: subnet-0pods0000000001a\nsecurityGroups:\n  - sg-0a1b2c3d4e5f00002',
      ],
      solucao: `
        apiVersion: crd.k8s.amazonaws.com/v1alpha1
        kind: ENIConfig
        metadata:
          name: us-east-1a
        spec:
          subnet: subnet-0pods0000000001a
          securityGroups:
            - sg-0a1b2c3d4e5f00002
      `,
      testes: [
        teste({ descricao: 'O ENIConfig da zona us-east-1a existe', dica: 'subnet é obrigatório: preencha o primeiro TODO.' }, existe('ENIConfig', 'us-east-1a')),
        teste({ descricao: 'Os Pods usam a sub-rede nova', dica: 'Em spec, escreva subnet: subnet-0pods0000000001a.' },
          campo('ENIConfig', 'us-east-1a', 'spec.subnet', { valor: 'subnet-0pods0000000001a' })),
        teste({ descricao: 'Os Pods usam o security group certo', dica: 'Em spec, crie securityGroups com - sg-0a1b2c3d4e5f00002.' },
          campo('ENIConfig', 'us-east-1a', 'spec.securityGroups', { contem: 'sg-0a1b2c3d4e5f00002' })),
      ],
    }),

    exercicio({
      id: 'aws-sgp-pods',
      titulo: 'Security group só para os Pods de pagamento',
      dificuldade: 'medio',
      resumo: `
        <p>O banco RDS de pagamentos só aceita conexões do security group <code>sg-0a1b2c3d4e5f00001</code>. Em vez de dar esse SG ao
        nó inteiro (e a todos os Pods dele), dê só aos Pods de pagamento.</p>
        <ol>
          <li>Crie a <code>SecurityGroupPolicy</code> <code>pagamentos-banco</code>.</li>
          <li>Em <code>podSelector.matchLabels</code>, a label <code>app: pagamentos</code>.</li>
          <li>Em <code>securityGroups.groupIds</code>, a lista com <code>sg-0a1b2c3d4e5f00001</code>.</li>
        </ol>
        <p><b>No cluster:</b> cada Pod de pagamentos ganha uma ENI só dele (uma "branch ENI") com esse security group, e o banco passa a
        aceitar só esses Pods.</p>`,
      inicial: `
        apiVersion: vpcresources.k8s.aws/v1beta1
        kind: SecurityGroupPolicy
        metadata:
          name: pagamentos-banco
        spec:
          podSelector:
            matchLabels:
              # TODO: app: pagamentos
          securityGroups:
            groupIds:
              # TODO: - sg-0a1b2c3d4e5f00001
      `,
      dica: [
        'O exemplo da lição "VPC CNI" tem a mesma política.',
        'groupIds é uma lista: o ID vem depois de "- ".',
        'matchLabels:\n  app: pagamentos\n...\ngroupIds:\n  - sg-0a1b2c3d4e5f00001',
      ],
      solucao: `
        apiVersion: vpcresources.k8s.aws/v1beta1
        kind: SecurityGroupPolicy
        metadata:
          name: pagamentos-banco
        spec:
          podSelector:
            matchLabels:
              app: pagamentos
          securityGroups:
            groupIds:
              - sg-0a1b2c3d4e5f00001
      `,
      testes: [
        teste({ descricao: 'A SecurityGroupPolicy existe', dica: 'groupIds é obrigatório: preencha a lista com o ID do security group.' },
          existe('SecurityGroupPolicy', 'pagamentos-banco')),
        teste({ descricao: 'Vale só para os Pods de pagamento', dica: 'Em podSelector.matchLabels, escreva app: pagamentos.' },
          campo('SecurityGroupPolicy', 'pagamentos-banco', 'spec.podSelector.matchLabels.app', { valor: 'pagamentos' })),
        teste({ descricao: 'Dá o security group do banco', dica: 'Em securityGroups.groupIds, escreva - sg-0a1b2c3d4e5f00001.' },
          campo('SecurityGroupPolicy', 'pagamentos-banco', 'spec.securityGroups.groupIds', { contem: 'sg-0a1b2c3d4e5f00001' })),
      ],
    }),

    licao('aws-alb-ingress', 'ALB Ingress Controller', 'dificil', `
      <p>O <b>AWS Load Balancer Controller</b> é um operador que lê Ingresses e cria <b>ALBs</b> (Application Load Balancers)
      de verdade na AWS. É a recepção de um prédio comercial: olha o endereço (host e caminho) e manda cada visitante para o
      andar certo (o Service).</p>
      <ul>
        <li>O Ingress escolhe o controlador com <code>ingressClassName: alb</code>.</li>
        <li>As escolhas do ALB vão em <b>annotations</b> <code>alb.ingress.kubernetes.io/...</code>: <code>scheme</code>
          (<code>internet-facing</code> é público; <code>internal</code> só dentro da VPC), <code>target-type</code>
          (<code>ip</code> manda direto para o IP dos Pods), <code>healthcheck-path</code>, <code>listen-ports</code>,
          <code>certificate-arn</code> (o certificado do ACM para HTTPS) e <code>ssl-redirect</code>.</li>
        <li><code>group.name</code>: vários Ingresses com o mesmo grupo dividem <b>um só ALB</b> (mais barato).
          <code>group.order</code> diz quais regras vêm primeiro.</li>
        <li><b>IngressClass</b> com <b>IngressClassParams</b>: a plataforma fixa as escolhas (scheme, grupo) numa classe, e os
          times só escrevem <code>ingressClassName</code>. O IngressClass aponta para o IngressClassParams em
          <code>spec.parameters</code>.</li>
        <li><b>TargetGroupBinding</b>: o caminho contrário. O ALB (ou NLB) já existe, criado pelo Terraform; o recurso só pede ao
          controlador para registrar os Pods de um Service no target group dele.</li>
      </ul>
      <p><b>No cluster:</b> <code>kubectl get ingress</code> mostra em ADDRESS o nome DNS do ALB, como
      <code>k8s-loja-1234.us-east-1.elb.amazonaws.com</code>.</p>`,
    `
      # A classe "alb-publico": todo Ingress dela vira um ALB público do grupo loja
      apiVersion: elbv2.k8s.aws/v1beta1
      kind: IngressClassParams
      metadata:
        name: publico
      spec:
        scheme: internet-facing
        group:
          name: loja              # todos dividem o mesmo ALB
      ---
      apiVersion: networking.k8s.io/v1
      kind: IngressClass
      metadata:
        name: alb-publico
      spec:
        controller: ingress.k8s.aws/alb   # o AWS Load Balancer Controller
        parameters:                       # as escolhas fixas da classe
          apiGroup: elbv2.k8s.aws
          kind: IngressClassParams
          name: publico
      ---
      # Registra os Pods do Service web num target group que já existe
      apiVersion: elbv2.k8s.aws/v1beta1
      kind: TargetGroupBinding
      metadata:
        name: web
      spec:
        serviceRef:
          name: web
          port: 80
        targetGroupARN: arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/web/0123456789abcdef
        targetType: ip
    `),

    {
      id: 'aws-alb-ingress-exercicio',
      tipo: 'exercicio',
      titulo: 'Ingress com anotações ALB',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `
        <p>Na AWS, o <b>AWS Load Balancer Controller</b> transforma um Ingress num <b>ALB</b>. As escolhas do ALB vão em annotations.</p>
        <ol>
          <li>No Ingress <code>app-ingress</code>, escreva <code>ingressClassName: alb</code>.</li>
          <li>Annotation <code>alb.ingress.kubernetes.io/scheme: internet-facing</code> (ALB público).</li>
          <li>Annotation <code>alb.ingress.kubernetes.io/target-type: ip</code> (o ALB manda direto para o IP dos Pods).</li>
          <li>A regra leva <code>/</code> (<code>pathType: Prefix</code>) ao Service <code>app-svc</code> na porta 80.</li>
        </ol>
        <p><b>No cluster:</b> o controlador cria o ALB, um target group com os IPs dos Pods e põe o endereço DNS do ALB em
        <code>kubectl get ingress app-ingress</code>.</p>`,
      inicial: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    # TODO: alb.ingress.kubernetes.io/scheme: internet-facing
    # TODO: alb.ingress.kubernetes.io/target-type: ip
spec:
  ingressClassName:      # TODO: alb
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-svc
                port:
                  number: 80
`,
      dica: [
        "As duas annotations ficam em metadata.annotations, uma por linha.",
        "ingressClassName: alb fica em spec, alinhado com rules.",
      ],
      solucao: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
spec:
  ingressClassName: alb
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-svc
                port:
                  number: 80`,
      testes: [
        {
          descricao: 'O Ingress app-ingress existe',
          dica: "Preencha as annotations e o ingressClassName: um campo vazio impede o apply.",
          regras: [{ tipo: 'recurso-existe', kind: 'Ingress', nome: 'app-ingress' }],
        },
        {
          descricao: 'O Ingress tem anotação ALB scheme internet-facing',
          dica: "Em metadata.annotations: alb.ingress.kubernetes.io/scheme: internet-facing.",
          regras: [{ tipo: 'alb-ingress-anotacao', ingress: 'app-ingress', anotacao: 'alb.ingress.kubernetes.io/scheme', valor: 'internet-facing' }],
        },
      ],
    },

    exercicio({
      id: 'aws-alb-healthcheck',
      titulo: 'ALB conferindo a saúde no caminho certo',
      dificuldade: 'facil',
      resumo: `
        <p>A API responde 404 em <code>/</code>, e o ALB, que confere a saúde em <code>/</code> por padrão, marca todos os Pods como
        doentes. A API tem um caminho próprio para isso: <code>/saude</code>.</p>
        <ol>
          <li>No Ingress <code>api</code>, mantenha as annotations de <code>scheme</code> e <code>target-type</code>.</li>
          <li>Acrescente a annotation <code>alb.ingress.kubernetes.io/healthcheck-path: /saude</code>.</li>
        </ol>
        <p><b>No cluster:</b> o controlador muda o health check do target group; os Pods que respondem 200 em <code>/saude</code> passam a
        receber tráfego.</p>`,
      inicial: ingressAlb('api', 'api', `
      ${ALB}/scheme: internet-facing
      ${ALB}/target-type: ip
      # TODO: ${ALB}/healthcheck-path: /saude`),
      dica: [
        'É mais uma linha em metadata.annotations, com o mesmo prefixo alb.ingress.kubernetes.io/.',
        `${ALB}/healthcheck-path: /saude`,
      ],
      solucao: ingressAlb('api', 'api', `
      ${ALB}/scheme: internet-facing
      ${ALB}/target-type: ip
      ${ALB}/healthcheck-path: /saude`),
      testes: [
        teste({ descricao: 'O Ingress api é do ALB', dica: 'Mantenha ingressClassName: alb no spec.' },
          campo('Ingress', 'api', 'spec.ingressClassName', { valor: 'alb' })),
        teste({ descricao: 'O ALB confere a saúde em /saude', dica: `Em metadata.annotations, escreva ${ALB}/healthcheck-path: /saude.` },
          campo('Ingress', 'api', `metadata.annotations["${ALB}/healthcheck-path"]`, { valor: '/saude' })),
      ],
    }),

    exercicio({
      id: 'aws-alb-ingressclass',
      titulo: 'Uma IngressClass para os ALBs públicos',
      dificuldade: 'medio',
      resumo: `
        <p>Cada time escreve as mesmas annotations e às vezes esquece uma. A plataforma vai criar uma classe que já traz o ALB
        público, para os times só escreverem <code>ingressClassName: alb-publico</code>.</p>
        <ol>
          <li>Crie o <code>IngressClassParams</code> <code>publico</code> com <code>scheme: internet-facing</code>.</li>
          <li>Crie a <code>IngressClass</code> <code>alb-publico</code> com <code>controller: ingress.k8s.aws/alb</code>.</li>
          <li>Em <code>spec.parameters</code> da IngressClass: <code>apiGroup: elbv2.k8s.aws</code>,
            <code>kind: IngressClassParams</code> e <code>name: publico</code>.</li>
        </ol>
        <p><b>No cluster:</b> todo Ingress com <code>ingressClassName: alb-publico</code> vira um ALB público, mesmo sem a annotation de
        scheme. Se um time escrever <code>internal</code>, o controlador recusa: o IngressClassParams manda.</p>`,
      inicial: `
        apiVersion: elbv2.k8s.aws/v1beta1
        kind: IngressClassParams
        metadata:
          name: publico
        spec:
          scheme:              # TODO: internet-facing
        ---
        apiVersion: networking.k8s.io/v1
        kind: IngressClass
        metadata:
          name: alb-publico
        spec:
          controller:          # TODO: ingress.k8s.aws/alb
          # TODO: parameters apontando para o IngressClassParams publico (passo 3)
      `,
      dica: [
        'O exemplo da lição "ALB Ingress Controller" tem as duas peças juntas.',
        'parameters é uma referência: o grupo da API (elbv2.k8s.aws), o kind e o nome.',
        'controller: ingress.k8s.aws/alb\nparameters:\n  apiGroup: elbv2.k8s.aws\n  kind: IngressClassParams\n  name: publico',
      ],
      solucao: `
        apiVersion: elbv2.k8s.aws/v1beta1
        kind: IngressClassParams
        metadata:
          name: publico
        spec:
          scheme: internet-facing
        ---
        apiVersion: networking.k8s.io/v1
        kind: IngressClass
        metadata:
          name: alb-publico
        spec:
          controller: ingress.k8s.aws/alb
          parameters:
            apiGroup: elbv2.k8s.aws
            kind: IngressClassParams
            name: publico
      `,
      testes: [
        teste({ descricao: 'O IngressClassParams fixa o ALB público', dica: 'No IngressClassParams publico, escreva scheme: internet-facing.' },
          campo('IngressClassParams', 'publico', 'spec.scheme', { valor: 'internet-facing' })),
        teste({ descricao: 'A IngressClass é do AWS Load Balancer Controller', dica: 'Na IngressClass, escreva controller: ingress.k8s.aws/alb.' },
          campo('IngressClass', 'alb-publico', 'spec.controller', { valor: 'ingress.k8s.aws/alb' })),
        teste({ descricao: 'A IngressClass usa os parâmetros publico', dica: 'Em spec.parameters: kind: IngressClassParams e name: publico.' },
          campo('IngressClass', 'alb-publico', 'spec.parameters.kind', { valor: 'IngressClassParams' }),
          campo('IngressClass', 'alb-publico', 'spec.parameters.name', { valor: 'publico' })),
      ],
    }),

    exercicio({
      id: 'aws-alb-grupo',
      titulo: 'Dois Ingresses, um só ALB',
      dificuldade: 'medio',
      resumo: `
        <p>Cada ALB custa por hora. A loja tem dois Ingresses (<code>vitrine</code> e <code>carrinho</code>) e eles podem dividir o
        mesmo ALB com um <b>grupo</b>.</p>
        <ol>
          <li>Nos dois Ingresses, a annotation <code>alb.ingress.kubernetes.io/group.name: loja</code>.</li>
          <li>No <code>carrinho</code>, <code>alb.ingress.kubernetes.io/group.order: "10"</code>; na <code>vitrine</code>,
            <code>"20"</code> (o menor número vem primeiro).</li>
        </ol>
        <p><b>No cluster:</b> o controlador junta as regras dos dois Ingresses num único ALB, na ordem do group.order, e os dois mostram o
        mesmo endereço em <code>kubectl get ingress</code>.</p>`,
      inicial: `${yaml(ingressAlb('vitrine', 'vitrine', `
      ${ALB}/scheme: internet-facing
      ${ALB}/target-type: ip
      # TODO: group.name loja e group.order "20"`))}---
${yaml(ingressAlb('carrinho', 'carrinho', `
      ${ALB}/scheme: internet-facing
      ${ALB}/target-type: ip
      # TODO: group.name loja e group.order "10"`))}`,
      dica: [
        'As duas annotations começam com alb.ingress.kubernetes.io/group.',
        'group.order é texto: escreva o número entre aspas.',
        `${ALB}/group.name: loja\n${ALB}/group.order: "10"`,
      ],
      solucao: `${yaml(ingressAlb('vitrine', 'vitrine', `
      ${ALB}/scheme: internet-facing
      ${ALB}/target-type: ip
      ${ALB}/group.name: loja
      ${ALB}/group.order: "20"`))}---
${yaml(ingressAlb('carrinho', 'carrinho', `
      ${ALB}/scheme: internet-facing
      ${ALB}/target-type: ip
      ${ALB}/group.name: loja
      ${ALB}/group.order: "10"`))}`,
      testes: [
        teste({ descricao: 'Os dois Ingresses estão no grupo loja', dica: `Nos dois Ingresses, escreva ${ALB}/group.name: loja.` },
          campo('Ingress', 'vitrine', `metadata.annotations["${ALB}/group.name"]`, { valor: 'loja' }),
          campo('Ingress', 'carrinho', `metadata.annotations["${ALB}/group.name"]`, { valor: 'loja' })),
        teste({ descricao: 'As regras do carrinho vêm primeiro', dica: 'group.order: "10" no carrinho e "20" na vitrine.' },
          campo('Ingress', 'carrinho', `metadata.annotations["${ALB}/group.order"]`, { valor: '10' }),
          campo('Ingress', 'vitrine', `metadata.annotations["${ALB}/group.order"]`, { valor: '20' })),
      ],
    }),

    exercicio({
      id: 'aws-alb-https',
      titulo: 'ALB com HTTPS e redirecionamento',
      dificuldade: 'dificil',
      resumo: `
        <p>A loja vai ter cadeado no navegador. O certificado já está no ACM (o gerenciador de certificados da AWS); o ALB precisa
        ouvir nas portas 80 e 443 e mandar quem chega por HTTP para HTTPS.</p>
        <ol>
          <li>Annotation <code>alb.ingress.kubernetes.io/listen-ports</code> com o texto <code>'[{"HTTP": 80}, {"HTTPS": 443}]'</code>
            (aspas simples por fora, porque o valor é um JSON).</li>
          <li>Annotation <code>alb.ingress.kubernetes.io/certificate-arn</code> com <code>${CERTIFICADO}</code>.</li>
          <li>Annotation <code>alb.ingress.kubernetes.io/ssl-redirect: "443"</code>.</li>
        </ol>
        <p><b>No cluster:</b> o ALB ganha dois listeners. O da porta 80 só responde "301, vá para https://"; o da 443 usa o certificado e
        encaminha para os Pods.</p>`,
      inicial: ingressAlb('loja', 'vitrine', `
      ${ALB}/scheme: internet-facing
      ${ALB}/target-type: ip
      # TODO: listen-ports com HTTP 80 e HTTPS 443 (passo 1)
      # TODO: certificate-arn (passo 2)
      # TODO: ssl-redirect "443" (passo 3)`),
      dica: [
        'São três annotations novas com o prefixo alb.ingress.kubernetes.io/.',
        'O valor de listen-ports é um JSON dentro de um texto YAML: aspas simples por fora, aspas duplas por dentro.',
        `${ALB}/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'\n${ALB}/certificate-arn: ${CERTIFICADO}\n${ALB}/ssl-redirect: "443"`,
      ],
      solucao: ingressAlb('loja', 'vitrine', `
      ${ALB}/scheme: internet-facing
      ${ALB}/target-type: ip
      ${ALB}/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
      ${ALB}/certificate-arn: ${CERTIFICADO}
      ${ALB}/ssl-redirect: "443"`),
      testes: [
        teste({ descricao: 'O ALB ouve em HTTP 80 e HTTPS 443', dica: `Escreva ${ALB}/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'.` },
          campo('Ingress', 'loja', `metadata.annotations["${ALB}/listen-ports"]`, { contem: '"HTTPS": 443' })),
        teste({ descricao: 'O HTTPS usa o certificado do ACM', dica: `Escreva ${ALB}/certificate-arn com o ARN do certificado.` },
          campo('Ingress', 'loja', `metadata.annotations["${ALB}/certificate-arn"]`, { valor: CERTIFICADO })),
        teste({ descricao: 'Quem chega por HTTP vai para HTTPS', dica: `Escreva ${ALB}/ssl-redirect: "443".` },
          campo('Ingress', 'loja', `metadata.annotations["${ALB}/ssl-redirect"]`, { valor: '443' })),
      ],
    }),

    exercicio({
      id: 'aws-targetgroupbinding',
      titulo: 'Pods num target group criado pelo Terraform',
      dificuldade: 'medio',
      resumo: `
        <p>O ALB da empresa foi criado pelo Terraform e já tem o target group <code>web</code>. O cluster só precisa colocar os Pods do
        Service <code>web</code> lá dentro, sem criar outro ALB.</p>
        <ol>
          <li>Crie o <code>TargetGroupBinding</code> <code>web</code> com <code>serviceRef</code> apontando para o Service
            <code>web</code>, porta <code>80</code>.</li>
          <li><code>targetGroupARN: arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/web/0123456789abcdef</code>.</li>
          <li><code>targetType: ip</code>.</li>
        </ol>
        <p><b>No cluster:</b> o controlador registra o IP de cada Pod do Service no target group e tira os que somem. O ALB continua sendo do
        Terraform.</p>`,
      inicial: `
        apiVersion: elbv2.k8s.aws/v1beta1
        kind: TargetGroupBinding
        metadata:
          name: web
        spec:
          serviceRef:
            # TODO: name web e port 80
          targetGroupARN:      # TODO: o ARN do passo 2
          targetType: ip
      `,
      dica: [
        'O exemplo da lição "ALB Ingress Controller" termina com um TargetGroupBinding igual.',
        'serviceRef tem dois campos: name e port.',
        'serviceRef:\n  name: web\n  port: 80\ntargetGroupARN: arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/web/0123456789abcdef',
      ],
      solucao: `
        apiVersion: elbv2.k8s.aws/v1beta1
        kind: TargetGroupBinding
        metadata:
          name: web
        spec:
          serviceRef:
            name: web
            port: 80
          targetGroupARN: arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/web/0123456789abcdef
          targetType: ip
      `,
      testes: [
        teste({ descricao: 'O TargetGroupBinding existe', dica: 'serviceRef e targetGroupARN são obrigatórios: preencha os TODO.' }, existe('TargetGroupBinding', 'web')),
        teste({ descricao: 'Usa o Service web na porta 80', dica: 'Em serviceRef: name: web e port: 80.' },
          campo('TargetGroupBinding', 'web', 'spec.serviceRef.name', { valor: 'web' }),
          campo('TargetGroupBinding', 'web', 'spec.serviceRef.port', { valor: 80 })),
        teste({ descricao: 'Registra no target group web', dica: 'Escreva targetGroupARN com o ARN completo do passo 2.' },
          campo('TargetGroupBinding', 'web', 'spec.targetGroupARN', { contem: 'targetgroup/web/' })),
      ],
    }),

    licao('aws-nlb-licao', 'NLB: balanceador de rede para um Service', 'medio', `
      <p>O ALB entende HTTP (caminhos, hosts, cookies). Para tráfego que não é HTTP (um banco, um jogo, gRPC sem regras de caminho)
      ou quando a latência precisa ser mínima, usa-se o <b>NLB</b> (Network Load Balancer). Se o ALB é a recepção que lê o
      endereço da carta, o NLB é a <b>esteira</b> que só leva o pacote adiante, muito rápido.</p>
      <ul>
        <li>O NLB nasce de um <b>Service</b> <code>type: LoadBalancer</code> (não de um Ingress).</li>
        <li>Com o AWS Load Balancer Controller, a annotation
          <code>service.beta.kubernetes.io/aws-load-balancer-type: external</code> pede um NLB criado por ele.</li>
        <li><code>service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ip</code> manda direto para o IP dos Pods.</li>
        <li><code>service.beta.kubernetes.io/aws-load-balancer-scheme</code>: <code>internet-facing</code> (público) ou
          <code>internal</code>. <b>Sem essa annotation, o NLB é interno</b>.</li>
        <li><code>service.beta.kubernetes.io/aws-load-balancer-attributes</code> liga atributos do NLB, como
          <code>load_balancing.cross_zone.enabled=true</code> (distribuir entre todas as zonas).</li>
      </ul>
      <p><b>No cluster:</b> <code>kubectl get service</code> mostra em EXTERNAL-IP o nome DNS do NLB.</p>`,
    `
      apiVersion: v1
      kind: Service
      metadata:
        name: jogo
        annotations:
          # NLB criado pelo AWS Load Balancer Controller
          service.beta.kubernetes.io/aws-load-balancer-type: external
          # Direto para o IP dos Pods
          service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ip
          # Público (o padrão seria interno)
          service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
      spec:
        type: LoadBalancer
        selector:
          app: jogo
        ports:
          - port: 7777
            targetPort: 7777
            protocol: UDP
    `),

    exercicio({
      id: 'aws-nlb-service',
      titulo: 'Service que vira um NLB público',
      dificuldade: 'medio',
      resumo: `
        <p>A API de parceiros recebe gRPC e precisa de um NLB público, mandando direto para os Pods.</p>
        <ol>
          <li>No Service <code>api-parceiros</code> (<code>type: LoadBalancer</code>), a annotation
            <code>service.beta.kubernetes.io/aws-load-balancer-type: external</code>.</li>
          <li>A annotation <code>service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ip</code>.</li>
          <li>A annotation <code>service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing</code>.</li>
        </ol>
        <p><b>No cluster:</b> o controlador cria o NLB com um target group dos IPs dos Pods <code>app: api</code>, e o endereço aparece em
        EXTERNAL-IP.</p>`,
      inicial: serviceNlb('api-parceiros', `
      # TODO: aws-load-balancer-type external (passo 1)
      # TODO: aws-load-balancer-nlb-target-type ip (passo 2)
      # TODO: aws-load-balancer-scheme internet-facing (passo 3)`),
      dica: [
        'O exemplo da lição "NLB" tem as três annotations.',
        'Todas começam com service.beta.kubernetes.io/aws-load-balancer-.',
        `${NLB}/aws-load-balancer-type: external\n${NLB}/aws-load-balancer-nlb-target-type: ip\n${NLB}/aws-load-balancer-scheme: internet-facing`,
      ],
      solucao: serviceNlb('api-parceiros', `
      ${NLB}/aws-load-balancer-type: external
      ${NLB}/aws-load-balancer-nlb-target-type: ip
      ${NLB}/aws-load-balancer-scheme: internet-facing`),
      testes: [
        teste({ descricao: 'O Service é do tipo LoadBalancer', dica: 'Mantenha type: LoadBalancer no spec.' },
          { tipo: 'service-tipo', service: 'api-parceiros', valorEsperado: 'LoadBalancer' }),
        teste({ descricao: 'O NLB é do AWS Load Balancer Controller, direto nos Pods', dica: 'Escreva aws-load-balancer-type: external e aws-load-balancer-nlb-target-type: ip.' },
          campo('Service', 'api-parceiros', `metadata.annotations["${NLB}/aws-load-balancer-type"]`, { valor: 'external' }),
          campo('Service', 'api-parceiros', `metadata.annotations["${NLB}/aws-load-balancer-nlb-target-type"]`, { valor: 'ip' })),
        teste({ descricao: 'O NLB é público', dica: 'Sem o scheme, o NLB é interno: escreva aws-load-balancer-scheme: internet-facing.' },
          campo('Service', 'api-parceiros', `metadata.annotations["${NLB}/aws-load-balancer-scheme"]`, { valor: 'internet-facing' })),
      ],
    }),

    exercicio({
      id: 'aws-nlb-cross-zone',
      titulo: 'NLB que distribui entre as zonas',
      dificuldade: 'facil',
      resumo: `
        <p>A zona <code>us-east-1a</code> tem 1 Pod e a <code>us-east-1b</code> tem 4. Sem balanceamento entre zonas, o Pod sozinho recebe
        metade do tráfego.</p>
        <ol>
          <li>No Service <code>api-interna</code>, mantenha as annotations de tipo e de target.</li>
          <li>Acrescente <code>service.beta.kubernetes.io/aws-load-balancer-attributes</code> com o valor
            <code>load_balancing.cross_zone.enabled=true</code>.</li>
        </ol>
        <p><b>No cluster:</b> cada nó do NLB passa a distribuir entre os 5 Pods, de todas as zonas. (Tráfego entre zonas tem custo de
        transferência; vale a pena quando a distribuição é desigual.)</p>`,
      inicial: serviceNlb('api-interna', `
      ${NLB}/aws-load-balancer-type: external
      ${NLB}/aws-load-balancer-nlb-target-type: ip
      # TODO: aws-load-balancer-attributes com load_balancing.cross_zone.enabled=true`),
      dica: [
        'É mais uma annotation com o prefixo service.beta.kubernetes.io/aws-load-balancer-.',
        `${NLB}/aws-load-balancer-attributes: load_balancing.cross_zone.enabled=true`,
      ],
      solucao: serviceNlb('api-interna', `
      ${NLB}/aws-load-balancer-type: external
      ${NLB}/aws-load-balancer-nlb-target-type: ip
      ${NLB}/aws-load-balancer-attributes: load_balancing.cross_zone.enabled=true`),
      testes: [
        teste({ descricao: 'O Service continua sendo um NLB', dica: 'Mantenha aws-load-balancer-type: external.' },
          campo('Service', 'api-interna', `metadata.annotations["${NLB}/aws-load-balancer-type"]`, { valor: 'external' })),
        teste({ descricao: 'O NLB distribui entre as zonas', dica: `Escreva ${NLB}/aws-load-balancer-attributes: load_balancing.cross_zone.enabled=true.` },
          campo('Service', 'api-interna', `metadata.annotations["${NLB}/aws-load-balancer-attributes"]`, { valor: 'load_balancing.cross_zone.enabled=true' })),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'aws-network-policy-exercicio': { dica: 'Confira a porta e o protocolo do passo 3.', regras: [campo('NetworkPolicy', 'restrict-backend', 'spec.ingress[0].ports[0].port', { valor: 8080 }), campo('NetworkPolicy', 'restrict-backend', 'spec.ingress[0].ports[0].protocol', { valor: 'TCP' })] },
    'aws-alb-ingress-exercicio': { dica: 'Confira a classe e o tipo de destino pedidos nos passos 1 e 3.', regras: [campo('Ingress', 'app-ingress', 'spec.ingressClassName', { valor: 'alb' }), campo('Ingress', 'app-ingress', `metadata.annotations["${ALB}/target-type"]`, { valor: 'ip' })] },
    'aws-vpc-cni-netpol': { dica: 'O ConfigMap do VPC CNI mora no kube-system.', regras: [campo('ConfigMap', 'amazon-vpc-cni', 'metadata.namespace', { valor: 'kube-system' })] },
    'aws-eniconfig': { dica: 'O security group é um só, o do passo 3.', regras: [campo('ENIConfig', 'us-east-1a', 'spec.securityGroups', { maximo: 1 })] },
    'aws-sgp-pods': { dica: 'A política escolhe Pods por label, e só um security group.', regras: [campo('SecurityGroupPolicy', 'pagamentos-banco', 'spec.serviceAccountSelector', { ausente: true }), campo('SecurityGroupPolicy', 'pagamentos-banco', 'spec.securityGroups.groupIds', { maximo: 1 })] },
    'aws-alb-healthcheck': { dica: 'As annotations do passo 1 continuam lá.', regras: [campo('Ingress', 'api', `metadata.annotations["${ALB}/scheme"]`, { valor: 'internet-facing' }), campo('Ingress', 'api', `metadata.annotations["${ALB}/target-type"]`, { valor: 'ip' })] },
    'aws-alb-ingressclass': { dica: 'Confira o grupo da API em spec.parameters.', regras: [campo('IngressClass', 'alb-publico', 'spec.parameters.apiGroup', { valor: 'elbv2.k8s.aws' })] },
    'aws-alb-grupo': { dica: 'Os dois Ingresses continuam sendo do ALB, públicos.', regras: [campo('Ingress', 'vitrine', 'spec.ingressClassName', { valor: 'alb' }), campo('Ingress', 'carrinho', 'spec.ingressClassName', { valor: 'alb' }), campo('Ingress', 'carrinho', `metadata.annotations["${ALB}/scheme"]`, { valor: 'internet-facing' })] },
    'aws-alb-https': { dica: 'O ALB ouve nas duas portas do passo 1, e continua público.', regras: [campo('Ingress', 'loja', `metadata.annotations["${ALB}/listen-ports"]`, { contem: '"HTTP": 80' }), campo('Ingress', 'loja', `metadata.annotations["${ALB}/scheme"]`, { valor: 'internet-facing' })] },
    'aws-targetgroupbinding': { dica: 'Confira o tipo de destino do passo 3 e o ARN completo do passo 2.', regras: [campo('TargetGroupBinding', 'web', 'spec.targetType', { valor: 'ip' }), campo('TargetGroupBinding', 'web', 'spec.targetGroupARN', { valor: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/web/0123456789abcdef' })] },
    'aws-nlb-service': { dica: 'O Service continua mandando para os Pods app: api.', regras: [{ tipo: 'service-selector', service: 'api-parceiros', chave: 'app', valor: 'api' }] },
    'aws-nlb-cross-zone': { dica: 'O NLB continua mandando direto para o IP dos Pods.', regras: [campo('Service', 'api-interna', `metadata.annotations["${NLB}/aws-load-balancer-nlb-target-type"]`, { valor: 'ip' }), { tipo: 'service-tipo', service: 'api-interna', valorEsperado: 'LoadBalancer' }] },
  },
};
