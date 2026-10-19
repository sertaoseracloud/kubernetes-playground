// Módulo AWS: Networking para Kubernetes na AWS.
// Lições e exercícios sobre VPC CNI, ALB Ingress Controller e NetworkPolicies.

export const awsNetworking = {
  id: 'aws-networking',
  titulo: 'Networking AWS para K8s',
  descricao: 'VPC CNI, ALB Ingress Controller e políticas de rede no EKS.',
  icone: '🌐',
  itens: [
    {
      id: 'aws-vpc-cni',
      tipo: 'licao',
      titulo: 'VPC CNI e pod networking',
      dificuldade: 'dificil',
      xp: 5,
      resumo: `<p>O <b>VPC CNI</b> é o plugin de rede padrão do EKS. Diferente de outros CNIs que usam overlays (Calico, Flannel), ele aloca <b>ENIs reais da VPC</b> diretamente para os pods.</p>
        <p>Cada pod recebe um IP da sub-rede da VPC, eliminando a necessidade de NAT entre nós. O plugin gerencia:</p>
        <ul>
          <li><b>Alocação de ENIs</b>: interfaces de rede elásticas anexadas às instâncias.</li>
          <li><b>Prefix delegation</b>: blocos /28 atribuídos a cada ENI para reduzir chamadas à API EC2.</li>
          <li><b>Security Groups per Pod</b>: isolamento fino usando SGs associados diretamente aos pods.</li>
        </ul>
        <p>A configuração fica no ConfigMap <code>amazon-vpc-cni</code> no namespace <code>kube-system</code>.</p>`,
    },
    {
      id: 'aws-alb-ingress',
      tipo: 'licao',
      titulo: 'ALB Ingress Controller',
      dificuldade: 'dificil',
      xp: 5,
      resumo: `<p>O <b>AWS Load Balancer Controller</b> provisiona Application Load Balancers automaticamente a partir de recursos Ingress no cluster.</p>
        <p>Principais conceitos:</p>
        <dl>
          <dt><b>Ingress annotations</b></dt><dd>Controlam o comportamento do ALB (scheme, target type, health checks).</dd>
          <dt><b>TargetGroupBinding</b></dt><dd>Vincula Services a Target Groups existentes sem criar novo ALB.</dd>
          <dt><b>IngressClass</b></dt><dd><code>alb</code> identifica que o controller deve processar o recurso.</dd>
        </dl>
        <p>Anotações comuns incluem <code>alb.ingress.kubernetes.io/scheme</code>, <code>target-type</code> e <code>listen-ports</code>.</p>`,
    },
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
  ],
};