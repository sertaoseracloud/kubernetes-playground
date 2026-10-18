// Módulo AWS: EKS - Kubernetes gerenciado na AWS.
// Lições e exercícios sobre arquitetura EKS, IRSA e add-ons.

export const awsEks = {
  id: 'aws-eks',
  titulo: 'EKS: Kubernetes na AWS',
  descricao: 'Arquitetura do Amazon EKS, IRSA e gerenciamento de nós.',
  icone: '🟠',
  itens: [
    {
      id: 'eks-arquitetura',
      tipo: 'licao',
      titulo: 'Arquitetura do EKS',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O <b>Amazon EKS</b> (Elastic Kubernetes Service) é o serviço gerenciado de Kubernetes da AWS. A AWS cuida do <b>control plane</b> (API Server, etcd, Scheduler), garantindo alta disponibilidade em múltiplas zonas.</p>
        <p>Você gerencia o <b>data plane</b> escolhendo entre:</p>
        <ul>
          <li><b>Managed Node Groups</b>: instâncias EC2 provisionadas e atualizadas automaticamente.</li>
          <li><b>Fargate</b>: pods serverless sem gerenciamento de nós.</li>
          <li><b>Self-managed nodes</b>: controle total sobre as instâncias EC2.</li>
        </ul>
        <p>Add-ons como VPC CNI, CoreDNS e kube-proxy são instalados via API ou CLI.</p>`,
    },
    {
      id: 'eks-irsa',
      tipo: 'licao',
      titulo: 'IAM Roles for Service Accounts (IRSA)',
      dificuldade: 'dificil',
      xp: 5,
      resumo: `<p>O <b>IRSA</b> permite que pods assumam roles IAM específicas sem usar credenciais estáticas. O mecanismo usa um <b>OIDC provider</b> vinculado ao cluster EKS.</p>
        <p>Para configurar:</p>
        <ol>
          <li>Crie um OIDC identity provider no IAM apontando para o endpoint do EKS.</li>
          <li>Crie uma IAM Role com uma <b>trust policy</b> que confie no OIDC provider.</li>
          <li>Anote a ServiceAccount com <code>eks.amazonaws.com/role-arn</code>.</li>
        </ol>
        <p>O webhook do EKS injeta tokens STS nos pods que usam essa ServiceAccount, permitindo acesso seguro a serviços AWS como S3, DynamoDB e SQS.</p>`,
    },
    {
      id: 'eks-addons',
      tipo: 'licao',
      titulo: 'Add-ons e Managed Node Groups',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O EKS fornece add-ons essenciais como recursos gerenciados:</p>
        <dl>
          <dt><b>vpc-cni</b></dt><dd>Plugin de rede que aloca ENIs para pods.</dd>
          <dt><b>coredns</b></dt><dd>DNS interno do cluster.</dd>
          <dt><b>kube-proxy</b></dt><dd>Regras de rede para Services.</dd>
        </dl>
        <p><b>Managed Node Groups</b> simplificam operações: criam ASG, aplicam labels/taints e executam rolling updates. Já os <b>self-managed nodes</b> exigem configuração manual de bootstrap e integração com o cluster.</p>`,
    },
    {
      id: 'eks-sa-irsa',
      tipo: 'exercicio',
      titulo: 'ServiceAccount com IRSA',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie uma ServiceAccount chamada <code>s3-reader</code> no namespace <code>default</code> com a anotação IRSA apontando para a role <code>arn:aws:iam::123456789012:role/S3ReadRole</code>.</p>
        <p>A anotação deve ser <code>eks.amazonaws.com/role-arn</code>.</p>`,
      solucao: `apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/S3ReadRole`,
      testes: [
        {
          descricao: 'A ServiceAccount s3-reader existe',
          regras: [{ tipo: 'recurso-existe', kind: 'ServiceAccount', nome: 's3-reader' }],
        },
        {
          descricao: 'A ServiceAccount tem a anotação IRSA correta',
          regras: [{ tipo: 'serviceaccount-anotacao', sa: 's3-reader', anotacao: 'eks.amazonaws.com/role-arn', valor: 'arn:aws:iam::123456789012:role/S3ReadRole' }],
        },
      ],
    },
    {
      id: 'eks-aws-auth',
      tipo: 'exercicio',
      titulo: 'ConfigMap aws-auth',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um ConfigMap chamado <code>aws-auth</code> no namespace <code>kube-system</code> que mapeia a role IAM <code>arn:aws:iam::123456789012:role/NodeRole</code> para o grupo <code>system:nodes</code>.</p>
        <p>O dado deve conter a chave <code>mapRoles</code> com o mapeamento YAML correspondente.</p>`,
      solucao: `apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: arn:aws:iam::123456789012:role/NodeRole
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:nodes
        - system:bootstrappers`,
      testes: [
        {
          descricao: 'O ConfigMap aws-auth existe no namespace kube-system',
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'aws-auth' }],
        },
        {
          descricao: 'O ConfigMap contém o mapeamento mapRoles',
          regras: [{ tipo: 'configmap-contem', configmap: 'aws-auth', chave: 'mapRoles', contem: 'rolearn' }],
        },
      ],
    },
  ],
};