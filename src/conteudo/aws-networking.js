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
      resumo: `<p>Crie um Ingress chamado <code>app-ingress</code> que usa o AWS Load Balancer Controller.</p>
        <p>Configure as seguintes anotações:</p>
        <ul>
          <li><code>alb.ingress.kubernetes.io/scheme: internet-facing</code></li>
          <li><code>alb.ingress.kubernetes.io/target-type: ip</code></li>
        </ul>
        <p>Use <code>ingressClassName: alb</code> e aponte para o Service <code>app-svc</code> na porta 80.</p>`,
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
          regras: [{ tipo: 'recurso-existe', kind: 'Ingress', nome: 'app-ingress' }],
        },
        {
          descricao: 'O Ingress tem anotação ALB scheme internet-facing',
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
      resumo: `<p>Crie uma NetworkPolicy chamada <code>restrict-backend</code> que permite tráfego apenas de pods com label <code>role: frontend</code> para pods com label <code>role: backend</code> na porta 8080.</p>
        <p>Todos os demais tráfegos de entrada devem ser bloqueados.</p>`,
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
          regras: [{ tipo: 'recurso-existe', kind: 'NetworkPolicy', nome: 'restrict-backend' }],
        },
        {
          descricao: 'A NetworkPolicy seleciona pods backend e restringe ingress',
          regras: [{ tipo: 'network-policy', policy: 'restrict-backend', podSelector: 'role=backend', direction: 'Ingress' }],
        },
      ],
    },
  ],
};