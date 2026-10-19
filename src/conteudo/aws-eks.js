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
      resumo: `
        <p>Um Pod que lê arquivos do S3 precisa de permissão da AWS. Com <b>IRSA</b>, ela vem da ServiceAccount: uma annotation diz qual
        <b>role do IAM</b> o Pod pode assumir, sem nenhuma chave de acesso guardada no cluster.</p>
        <ol>
          <li>Crie a ServiceAccount <code>s3-reader</code> no namespace <code>default</code>.</li>
          <li>Em <code>metadata.annotations</code>, a chave <code>eks.amazonaws.com/role-arn</code>.</li>
          <li>O valor é o ARN da role: <code>arn:aws:iam::123456789012:role/S3ReadRole</code>.</li>
        </ol>
        <p><b>No cluster:</b> um webhook do EKS injeta nos Pods dessa ServiceAccount um token e as variáveis
        <code>AWS_ROLE_ARN</code> e <code>AWS_WEB_IDENTITY_TOKEN_FILE</code>. O SDK da AWS troca o token por credenciais temporárias da role.</p>`,
      inicial: `apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader
  namespace: default
  annotations:
    # TODO: eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/S3ReadRole
`,
      dica: [
        "A annotation é um par chave: valor dentro de metadata.annotations.",
        "eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/S3ReadRole",
      ],
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
          dica: "Mantenha metadata.name: s3-reader e preencha a annotation (annotations vazio impede o apply).",
          regras: [{ tipo: 'recurso-existe', kind: 'ServiceAccount', nome: 's3-reader' }],
        },
        {
          descricao: 'A ServiceAccount tem a anotação IRSA correta',
          dica: "Em metadata.annotations: eks.amazonaws.com/role-arn com o ARN completo da role S3ReadRole.",
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
      resumo: `
        <p>Nos clusters EKS mais antigos, o ConfigMap <code>aws-auth</code> (no <code>kube-system</code>) diz quais roles do IAM entram no
        cluster e com quais grupos. Os nós precisam da role deles mapeada, senão não conseguem se registrar. (Nos clusters novos, o
        mesmo é feito com <b>access entries</b>, pela API do EKS.)</p>
        <ol>
          <li>O ConfigMap se chama <code>aws-auth</code> e fica no namespace <code>kube-system</code>.</li>
          <li>Em <code>data</code>, a chave <code>mapRoles</code> recebe um <b>texto em YAML</b> (por isso o <code>|</code>, que começa um texto de várias linhas).</li>
          <li>No item da lista: <code>rolearn: arn:aws:iam::123456789012:role/NodeRole</code>, o <code>username</code> dos nós e os grupos
            <code>system:nodes</code> e <code>system:bootstrappers</code>.</li>
        </ol>
        <p><b>No cluster:</b> quando um nó se apresenta com a NodeRole, o EKS o reconhece como <code>system:node:...</code> e ele entra
        no grupo dos nós.</p>`,
      inicial: `apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace:             # TODO: kube-system
data:
  mapRoles: |
    - rolearn:           # TODO: o ARN da NodeRole (passo 3)
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        # TODO: os dois grupos dos nós (passo 3)
`,
      dica: [
        "Depois do |, tudo que estiver recuado é o texto da chave mapRoles.",
        "groups:\n  - system:nodes\n  - system:bootstrappers",
      ],
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
          dica: "metadata.namespace: kube-system e metadata.name: aws-auth.",
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'aws-auth' }],
        },
        {
          descricao: 'O ConfigMap contém o mapeamento mapRoles',
          dica: "Em data.mapRoles, o rolearn da NodeRole: arn:aws:iam::123456789012:role/NodeRole.",
          regras: [{ tipo: 'configmap-contem', configmap: 'aws-auth', chave: 'mapRoles', contem: 'rolearn' }, { tipo: 'configmap-contem', configmap: 'aws-auth', chave: 'mapRoles', contem: 'arn:aws:iam::123456789012:role/NodeRole' }, { tipo: 'configmap-contem', configmap: 'aws-auth', chave: 'mapRoles', contem: 'system:nodes' }],
        },
      ],
    },
  ],
};