// Módulo AWS, tópico 1: o EKS e a identidade (quem entra no cluster e como os Pods falam com a AWS).
// Segue docs/didatica.md: lição com exemplo comentado, passos, esqueleto, dicas e "como corrigir".
import { licao, exercicio, teste, existe, campo } from './util.js';

const CONTA = '123456789012';
const ARN_ROLE = (nome) => `arn:aws:iam::${CONTA}:role/${nome}`;
const POLITICA = (nome) => `arn:aws:eks::aws:cluster-access-policy/${nome}`;

export const awsEks = {
  id: 'aws-eks',
  titulo: 'EKS e identidade',
  descricao: 'Arquitetura do Amazon EKS, quem entra no cluster (aws-auth e access entries), IRSA e EKS Pod Identity.',
  icone: '🟠',
  itens: [
    licao('eks-arquitetura', 'Arquitetura do EKS', 'medio', `
      <p>O <b>Amazon EKS</b> (Elastic Kubernetes Service) é o Kubernetes gerenciado da AWS. Pense num <b>shopping</b>: a
      administração (a AWS) cuida do prédio, da segurança e da energia; você aluga a loja e decide o que vender.</p>
      <ul>
        <li><b>Control plane</b> (API Server, etcd, Scheduler): é da AWS. Ele roda em várias zonas de disponibilidade,
          recebe atualizações de versão e você não vê as máquinas dele.</li>
        <li><b>Nós</b> (o data plane): são seus. Podem ser <b>managed node groups</b> (máquinas EC2 que a AWS cria e atualiza
          por você), nós criados pelo <b>Karpenter</b>, ou <b>Fargate</b> (cada Pod roda numa micro máquina, sem nó para cuidar).</li>
        <li><b>Add-ons</b>: peças que todo cluster precisa (rede, DNS, discos), instaladas e atualizadas pela API do EKS:
          VPC CNI, CoreDNS, kube-proxy, EBS CSI e outros.</li>
        <li>O <b>kubectl</b> é o mesmo. O que muda é a "cola" com a AWS: identidade (IAM), rede (VPC), discos (EBS e EFS) e
          balanceadores (ALB e NLB). É isso que este módulo ensina.</li>
      </ul>
      <p>Muitas dessas peças são configuradas com <b>YAML no próprio cluster</b>: annotations em ServiceAccounts e Services,
      ConfigMaps do <code>kube-system</code> e recursos novos (CRDs) que os add-ons instalam. O exemplo mostra o primeiro
      contato: a label que todo nó de um managed node group recebe.</p>
      <p><b>No cluster:</b> <code>kubectl get nodes --show-labels</code> mostra, em cada nó, de qual node group e de qual zona ele é.</p>`,
    `
      # Um Pod que pede para rodar num nó do node group "geral".
      apiVersion: v1
      kind: Pod
      metadata:
        name: ola-eks
      spec:
        nodeSelector:
          # Label que o EKS coloca em todo nó de managed node group
          eks.amazonaws.com/nodegroup: geral
        containers:
          - name: web
            image: nginx:1.27
    `),

    licao('eks-acesso-licao', 'Quem entra no cluster: aws-auth e access entries', 'medio', `
      <p>No EKS, quem chama a API do cluster prova quem é com o <b>IAM</b> da AWS (um usuário ou uma role). Depois, o
      Kubernetes decide o que essa identidade pode fazer, com o RBAC que você já conhece. É a <b>portaria</b> de um prédio:
      o IAM mostra o documento; a portaria diz em quais andares a pessoa entra.</p>
      <ul>
        <li><b>ConfigMap <code>aws-auth</code></b> (no <code>kube-system</code>): o jeito antigo. Uma lista em texto YAML
          (<code>mapRoles</code> e <code>mapUsers</code>) liga cada ARN do IAM a um usuário e a grupos do Kubernetes.
          Um erro de digitação ali tranca todo mundo fora do cluster.</li>
        <li><b>Access entries</b>: o jeito novo, pela API do EKS. Cada entrada liga um ARN (<code>principalARN</code>) ao
          cluster e pode receber <b>access policies</b> prontas da AWS: <code>AmazonEKSClusterAdminPolicy</code> (tudo),
          <code>AmazonEKSAdminPolicy</code>, <code>AmazonEKSEditPolicy</code> e <code>AmazonEKSViewPolicy</code> (só ler),
          valendo no cluster todo ou só em alguns namespaces.</li>
        <li>Uma access entry também pode pôr a identidade em <b>grupos do Kubernetes</b> (<code>kubernetesGroups</code>);
          aí um RoleBinding comum dá as permissões a esse grupo.</li>
      </ul>
      <p>Aqui a access entry é escrita como YAML com o <b>ACK</b> (AWS Controllers for Kubernetes): um operador que lê o
      recurso <code>AccessEntry</code> do cluster e chama a API do EKS por você. Os campos são os mesmos da API e do Terraform.</p>
      <p><b>No cluster:</b> depois do apply, o ACK cria a entrada no EKS e a role do exemplo passa a entrar com permissão de
      leitura no namespace <code>loja</code>.</p>`,
    `
      # Uma access entry: a role Leitores entra no cluster loja-prod
      apiVersion: eks.services.k8s.aws/v1alpha1
      kind: AccessEntry
      metadata:
        name: leitores
      spec:
        clusterName: loja-prod          # o cluster EKS
        principalARN: arn:aws:iam::123456789012:role/Leitores   # QUEM entra
        type: STANDARD                  # pessoas e programas (os nós usam EC2_LINUX)
        accessPolicies:                 # O QUE pode, com as políticas prontas da AWS
          - policyARN: arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy
            accessScope:
              type: namespace           # só nestes namespaces (ou "cluster" para todos)
              namespaces: ["loja"]
    `),

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

    exercicio({
      id: 'eks-aws-auth-usuarios',
      titulo: 'aws-auth: uma pessoa do time com acesso de leitura',
      dificuldade: 'medio',
      resumo: `
        <p>A Ana entrou no time e usa o usuário do IAM <code>ana</code>. Ela precisa entrar no cluster no grupo
        <code>leitores</code>. Pessoas (usuários do IAM) ficam em outra chave do <code>aws-auth</code>: <code>mapUsers</code>.</p>
        <ol>
          <li>Mantenha o ConfigMap <code>aws-auth</code> no <code>kube-system</code> com o <code>mapRoles</code> dos nós, que já vem pronto.</li>
          <li>Crie a chave <code>mapUsers</code>, também com <code>|</code> (texto de várias linhas).</li>
          <li>No item: <code>userarn: arn:aws:iam::123456789012:user/ana</code>, <code>username: ana</code> e o grupo <code>leitores</code>.</li>
        </ol>
        <p><b>No cluster:</b> a Ana se autentica como o usuário <code>ana</code>, no grupo <code>leitores</code>. Sem um RoleBinding para
        esse grupo, ela entra mas não vê nada: autenticar não é autorizar.</p>`,
      inicial: `
        apiVersion: v1
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
                - system:bootstrappers
          # TODO: mapUsers: | com userarn, username e groups (passos 2 e 3)
      `,
      dica: [
        'mapUsers fica alinhado com mapRoles, dentro de data. O formato da lista é o mesmo, trocando rolearn por userarn.',
        'Depois de "mapUsers: |", recue o texto: "- userarn: ...", "  username: ana", "  groups:" e "    - leitores".',
        'mapUsers: |\n  - userarn: arn:aws:iam::123456789012:user/ana\n    username: ana\n    groups:\n      - leitores',
      ],
      solucao: `
        apiVersion: v1
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
                - system:bootstrappers
          mapUsers: |
            - userarn: arn:aws:iam::123456789012:user/ana
              username: ana
              groups:
                - leitores
      `,
      testes: [
        teste({ descricao: 'Os nós continuam mapeados', dica: 'Não apague o mapRoles: sem ele os nós saem do cluster.' },
          { tipo: 'configmap-contem', configmap: 'aws-auth', chave: 'mapRoles', contem: 'role/NodeRole' }),
        teste({ descricao: 'A Ana está em mapUsers', dica: 'Em data.mapUsers, escreva userarn: arn:aws:iam::123456789012:user/ana.' },
          { tipo: 'configmap-contem', configmap: 'aws-auth', chave: 'mapUsers', contem: 'arn:aws:iam::123456789012:user/ana' }),
        teste({ descricao: 'A Ana entra no grupo leitores', dica: 'No item da Ana, em groups, inclua "- leitores".' },
          { tipo: 'configmap-contem', configmap: 'aws-auth', chave: 'mapUsers', contem: 'leitores' }),
      ],
    }),

    exercicio({
      id: 'eks-access-entry-admin',
      titulo: 'Access entry de administrador',
      dificuldade: 'facil',
      resumo: `
        <p>O time de plataforma usa a role <code>Plataforma</code> do IAM e precisa de acesso total ao cluster <code>loja-prod</code>.
        Com access entries, isso é uma entrada com a política pronta de administrador.</p>
        <ol>
          <li>Crie a <code>AccessEntry</code> <code>plataforma</code> com <code>clusterName: loja-prod</code>.</li>
          <li><code>principalARN</code> é <code>${ARN_ROLE('Plataforma')}</code>.</li>
          <li>Em <code>accessPolicies</code>, a política <code>${POLITICA('AmazonEKSClusterAdminPolicy')}</code>, com
            <code>accessScope.type: cluster</code>.</li>
        </ol>
        <p><b>No cluster:</b> quem assumir a role Plataforma entra no cluster com o mesmo poder do <code>cluster-admin</code>,
        sem nenhuma linha no <code>aws-auth</code>.</p>`,
      inicial: `
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: AccessEntry
        metadata:
          name: plataforma
        spec:
          clusterName: loja-prod
          principalARN: ${ARN_ROLE('Plataforma')}
          type: STANDARD
          accessPolicies:
            - policyARN:       # TODO: a política AmazonEKSClusterAdminPolicy (passo 3)
              accessScope:
                type:          # TODO: cluster
      `,
      dica: [
        'Releia o exemplo da lição "Quem entra no cluster": troque a política de leitura pela de administrador.',
        'O ARN das políticas de acesso começa com arn:aws:eks::aws:cluster-access-policy/.',
        `policyARN: ${POLITICA('AmazonEKSClusterAdminPolicy')}\naccessScope:\n  type: cluster`,
      ],
      solucao: `
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: AccessEntry
        metadata:
          name: plataforma
        spec:
          clusterName: loja-prod
          principalARN: ${ARN_ROLE('Plataforma')}
          type: STANDARD
          accessPolicies:
            - policyARN: ${POLITICA('AmazonEKSClusterAdminPolicy')}
              accessScope:
                type: cluster
      `,
      testes: [
        teste({ descricao: 'A access entry plataforma existe', dica: 'Preencha os dois TODO: um campo obrigatório vazio impede o apply.' },
          existe('AccessEntry', 'plataforma')),
        teste({ descricao: 'Usa a política de administrador do cluster', dica: 'Em accessPolicies, escreva policyARN com AmazonEKSClusterAdminPolicy no final.' },
          campo('AccessEntry', 'plataforma', 'spec.accessPolicies[0].policyARN', { valor: POLITICA('AmazonEKSClusterAdminPolicy') })),
        teste({ descricao: 'Vale para o cluster todo', dica: 'Em accessScope, escreva type: cluster.' },
          campo('AccessEntry', 'plataforma', 'spec.accessPolicies[0].accessScope.type', { valor: 'cluster' })),
      ],
    }),

    exercicio({
      id: 'eks-access-entry-namespace',
      titulo: 'Access entry só de leitura, num namespace',
      dificuldade: 'medio',
      resumo: `
        <p>O time de suporte (role <code>Suporte</code>) precisa <b>olhar</b> os Pods da loja quando um cliente reclama, mas não pode
        mexer em nada nem ver outros namespaces.</p>
        <ol>
          <li>Crie a <code>AccessEntry</code> <code>suporte</code> no cluster <code>loja-prod</code>, com o
            <code>principalARN</code> <code>${ARN_ROLE('Suporte')}</code>.</li>
          <li>Use a política <code>AmazonEKSViewPolicy</code> (só leitura).</li>
          <li>Limite ao namespace: <code>accessScope.type: namespace</code> e <code>namespaces: ["loja"]</code>.</li>
        </ol>
        <p><b>No cluster:</b> <code>kubectl get pods -n loja</code> funciona para o suporte; <code>kubectl delete</code> e qualquer
        outro namespace respondem <code>Forbidden</code>.</p>`,
      inicial: `
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: AccessEntry
        metadata:
          name: suporte
        spec:
          clusterName: loja-prod
          principalARN: ${ARN_ROLE('Suporte')}
          type: STANDARD
          accessPolicies:
            - policyARN:       # TODO: a política de leitura (passo 2)
              accessScope:
                # TODO: type namespace e a lista namespaces com loja (passo 3)
      `,
      dica: [
        'O nome da política de leitura termina em ViewPolicy.',
        'Com type: namespace, o campo namespaces é obrigatório: é a lista de onde a política vale.',
        `policyARN: ${POLITICA('AmazonEKSViewPolicy')}\naccessScope:\n  type: namespace\n  namespaces: ["loja"]`,
      ],
      solucao: `
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: AccessEntry
        metadata:
          name: suporte
        spec:
          clusterName: loja-prod
          principalARN: ${ARN_ROLE('Suporte')}
          type: STANDARD
          accessPolicies:
            - policyARN: ${POLITICA('AmazonEKSViewPolicy')}
              accessScope:
                type: namespace
                namespaces: ["loja"]
      `,
      testes: [
        teste({ descricao: 'A access entry suporte existe', dica: 'Preencha os TODO: policyARN e accessScope.type são obrigatórios.' },
          existe('AccessEntry', 'suporte')),
        teste({ descricao: 'A política é só de leitura', dica: 'Use a política que termina em AmazonEKSViewPolicy.' },
          campo('AccessEntry', 'suporte', 'spec.accessPolicies[0].policyARN', { valor: POLITICA('AmazonEKSViewPolicy') })),
        teste({ descricao: 'Vale só no namespace loja', dica: 'Em accessScope: type: namespace e namespaces: ["loja"].' },
          campo('AccessEntry', 'suporte', 'spec.accessPolicies[0].accessScope.type', { valor: 'namespace' }),
          campo('AccessEntry', 'suporte', 'spec.accessPolicies[0].accessScope.namespaces', { contem: 'loja' })),
      ],
    }),

    exercicio({
      id: 'eks-access-entry-grupo',
      titulo: 'Access entry com grupo e RoleBinding',
      dificuldade: 'dificil',
      resumo: `
        <p>As políticas prontas da AWS são largas. Para uma permissão sob medida, a access entry põe a role num <b>grupo do
        Kubernetes</b>, e um RoleBinding comum (o do módulo de RBAC) dá as permissões a esse grupo.</p>
        <ol>
          <li>Crie a <code>AccessEntry</code> <code>deploy-ci</code> no cluster <code>loja-prod</code>, para a role
            <code>${ARN_ROLE('PipelineCI')}</code>, <b>sem</b> <code>accessPolicies</code>.</li>
          <li>Em <code>kubernetesGroups</code>, o grupo <code>ci-deployers</code>.</li>
          <li>Crie o RoleBinding <code>ci-deployers</code> no namespace <code>loja</code>: o <code>subject</code> é
            <code>kind: Group</code>, <code>name: ci-deployers</code>; o <code>roleRef</code> é a ClusterRole <code>edit</code>.</li>
        </ol>
        <p><b>No cluster:</b> o pipeline entra como membro de <code>ci-deployers</code> e pode criar e atualizar Deployments só no
        namespace <code>loja</code>.</p>`,
      inicial: `
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: AccessEntry
        metadata:
          name: deploy-ci
        spec:
          clusterName: loja-prod
          principalARN: ${ARN_ROLE('PipelineCI')}
          type: STANDARD
          # TODO: kubernetesGroups com ci-deployers (passo 2)
        ---
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: ci-deployers
          namespace: loja
        subjects:
          # TODO: - kind: Group, name: ci-deployers, apiGroup: rbac.authorization.k8s.io
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name:                # TODO: edit
      `,
      dica: [
        'kubernetesGroups é uma lista dentro do spec da AccessEntry. O RoleBinding é igual aos do módulo de RBAC, com um Group no lugar da ServiceAccount.',
        'Um subject do tipo Group leva apiGroup: rbac.authorization.k8s.io (e não leva namespace).',
        'kubernetesGroups: ["ci-deployers"]\n---\nsubjects:\n  - kind: Group\n    name: ci-deployers\n    apiGroup: rbac.authorization.k8s.io\nroleRef: ... name: edit',
      ],
      solucao: `
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: AccessEntry
        metadata:
          name: deploy-ci
        spec:
          clusterName: loja-prod
          principalARN: ${ARN_ROLE('PipelineCI')}
          type: STANDARD
          kubernetesGroups: ["ci-deployers"]
        ---
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: ci-deployers
          namespace: loja
        subjects:
          - kind: Group
            name: ci-deployers
            apiGroup: rbac.authorization.k8s.io
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name: edit
      `,
      testes: [
        teste({ descricao: 'A access entry põe o pipeline no grupo', dica: 'No spec da AccessEntry, escreva kubernetesGroups: ["ci-deployers"].' },
          campo('AccessEntry', 'deploy-ci', 'spec.kubernetesGroups', { contem: 'ci-deployers' })),
        teste({ descricao: 'O RoleBinding entrega a permissão ao grupo', dica: 'Em subjects: kind: Group e name: ci-deployers.' },
          campo('RoleBinding', 'ci-deployers', 'subjects[0].kind', { valor: 'Group' }),
          campo('RoleBinding', 'ci-deployers', 'subjects[0].name', { valor: 'ci-deployers' })),
        teste({ descricao: 'A permissão é a ClusterRole edit, só no namespace loja', dica: 'Em roleRef, name: edit; o RoleBinding fica em metadata.namespace: loja.' },
          campo('RoleBinding', 'ci-deployers', 'roleRef.name', { valor: 'edit' }),
          campo('RoleBinding', 'ci-deployers', 'metadata.namespace', { valor: 'loja' })),
      ],
    }),

    licao('eks-irsa', 'IAM Roles for Service Accounts (IRSA)', 'dificil', `
      <p>Um Pod que lê um bucket do S3 precisa de credenciais da AWS. Guardar uma chave de acesso num Secret é como deixar a
      <b>chave mestra</b> embaixo do tapete: vaza fácil e nunca expira. O <b>IRSA</b> troca a chave por um <b>crachá
      temporário</b> emitido na portaria.</p>
      <ol>
        <li>O cluster tem um <b>provedor OIDC</b> registrado no IAM (feito uma vez, ao criar o cluster).</li>
        <li>A role do IAM tem uma <b>trust policy</b> que diz: "confio nos tokens desse cluster, para a ServiceAccount
          <code>loja/s3-reader</code>".</li>
        <li>A ServiceAccount recebe a annotation <code>eks.amazonaws.com/role-arn</code> com o ARN da role.</li>
        <li>O Deployment usa essa ServiceAccount em <code>serviceAccountName</code>.</li>
      </ol>
      <p><b>No cluster:</b> um webhook do EKS injeta no Pod um token e as variáveis <code>AWS_ROLE_ARN</code> e
      <code>AWS_WEB_IDENTITY_TOKEN_FILE</code>. O SDK da AWS troca o token por credenciais temporárias, renovadas sozinhas.
      A annotation <code>eks.amazonaws.com/sts-regional-endpoints: "true"</code> faz essa troca no STS da própria região
      (mais rápido e sem depender de us-east-1).</p>`,
    `
      # A ServiceAccount é o crachá; a annotation diz qual role do IAM ela assume.
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: s3-reader
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/S3ReadRole
      ---
      # O Deployment usa o crachá: todo Pod dele recebe o token da role.
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: relatorios
      spec:
        replicas: 1
        selector:
          matchLabels:
            app: relatorios
        template:
          metadata:
            labels:
              app: relatorios
          spec:
            serviceAccountName: s3-reader   # aqui o Pod ganha a identidade
            containers:
              - name: app
                image: amazon/aws-cli:2.17.0
                command: ["sleep", "infinity"]
    `),

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

    exercicio({
      id: 'eks-irsa-sts-regional',
      titulo: 'IRSA com o STS da região',
      dificuldade: 'facil',
      resumo: `
        <p>Os Pods da fila de pedidos rodam em <code>sa-east-1</code> (São Paulo). Por padrão, a troca do token por credenciais
        pode ir até o STS global; com o endpoint regional ela fica na própria região.</p>
        <ol>
          <li>Crie a ServiceAccount <code>fila-pedidos</code> com a annotation <code>eks.amazonaws.com/role-arn</code> igual a
            <code>${ARN_ROLE('FilaPedidos')}</code>.</li>
          <li>Acrescente a annotation <code>eks.amazonaws.com/sts-regional-endpoints</code> com o valor <code>"true"</code> (entre aspas: annotation é texto).</li>
        </ol>
        <p><b>No cluster:</b> o webhook do EKS coloca nos Pods <code>AWS_STS_REGIONAL_ENDPOINTS=regional</code>, e o SDK passa a chamar o
        STS de São Paulo.</p>`,
      inicial: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: fila-pedidos
          annotations:
            eks.amazonaws.com/role-arn: ${ARN_ROLE('FilaPedidos')}
            # TODO: eks.amazonaws.com/sts-regional-endpoints: "true"
      `,
      dica: [
        'É mais uma linha em metadata.annotations, embaixo do role-arn.',
        'Sem aspas, o YAML lê true como booleano, e annotations só aceitam texto.',
        'eks.amazonaws.com/sts-regional-endpoints: "true"',
      ],
      solucao: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: fila-pedidos
          annotations:
            eks.amazonaws.com/role-arn: ${ARN_ROLE('FilaPedidos')}
            eks.amazonaws.com/sts-regional-endpoints: "true"
      `,
      testes: [
        teste({ descricao: 'A ServiceAccount assume a role FilaPedidos', dica: 'Mantenha a annotation eks.amazonaws.com/role-arn com o ARN da role FilaPedidos.' },
          campo('ServiceAccount', 'fila-pedidos', 'metadata.annotations["eks.amazonaws.com/role-arn"]', { valor: ARN_ROLE('FilaPedidos') })),
        teste({ descricao: 'Usa o STS da região', dica: 'Em metadata.annotations, escreva eks.amazonaws.com/sts-regional-endpoints: "true" (com aspas).' },
          campo('ServiceAccount', 'fila-pedidos', 'metadata.annotations["eks.amazonaws.com/sts-regional-endpoints"]', { valor: 'true' })),
      ],
    }),

    exercicio({
      id: 'eks-irsa-deployment',
      titulo: 'Deployment que usa a ServiceAccount do IRSA',
      dificuldade: 'medio',
      existentes: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: s3-reader
          annotations:
            eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/S3ReadRole
      `,
      resumo: `
        <p>A ServiceAccount <code>s3-reader</code>, com a annotation do IRSA, já existe no cluster. Falta o Deployment usá-la: sem
        isso, o Pod roda com a ServiceAccount <code>default</code> e não recebe permissão nenhuma da AWS.</p>
        <ol>
          <li>Crie o Deployment <code>relatorios</code> com 1 réplica e a label <code>app: relatorios</code>.</li>
          <li>O container <code>app</code> usa a imagem <code>amazon/aws-cli:2.17.0</code> com <code>command: ["sleep", "infinity"]</code>.</li>
          <li>No spec do Pod (dentro de <code>template</code>), escreva <code>serviceAccountName: s3-reader</code>.</li>
        </ol>
        <p><b>No cluster:</b> <code>kubectl exec</code> no Pod e <code>aws sts get-caller-identity</code> mostram a role
        <code>S3ReadRole</code>, e não a role do nó.</p>`,
      inicial: `
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: relatorios
        spec:
          replicas: 1
          selector:
            matchLabels:
              app: relatorios
          template:
            metadata:
              labels:
                app: relatorios
            spec:
              # TODO: serviceAccountName: s3-reader
              containers:
                - name: app
                  image: amazon/aws-cli:2.17.0
                  command: ["sleep", "infinity"]
      `,
      dica: [
        'O campo fica no spec do Pod, dentro de template, alinhado com containers.',
        'serviceAccountName: s3-reader (sem namespace: os dois estão no mesmo).',
      ],
      solucao: `
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: relatorios
        spec:
          replicas: 1
          selector:
            matchLabels:
              app: relatorios
          template:
            metadata:
              labels:
                app: relatorios
            spec:
              serviceAccountName: s3-reader
              containers:
                - name: app
                  image: amazon/aws-cli:2.17.0
                  command: ["sleep", "infinity"]
      `,
      testes: [
        teste({ descricao: 'O Deployment relatorios existe', dica: 'Mantenha kind: Deployment e metadata.name: relatorios.' }, existe('Deployment', 'relatorios')),
        teste({ descricao: 'Os Pods usam a ServiceAccount do IRSA', dica: 'Em template.spec, escreva serviceAccountName: s3-reader.' },
          campo('Deployment', 'relatorios', 'spec.template.spec.serviceAccountName', { valor: 's3-reader' })),
      ],
    }),

    licao('eks-pod-identity-licao', 'EKS Pod Identity: o crachá sem annotation', 'medio', `
      <p>O <b>EKS Pod Identity</b> é o sucessor mais simples do IRSA. Em vez de cada cluster ter um provedor OIDC e cada role
      uma trust policy com o endereço dele, a role confia no serviço <code>pods.eks.amazonaws.com</code> e uma
      <b>associação</b> no EKS diz: "a ServiceAccount <code>loja/pedidos</code> deste cluster usa esta role".</p>
      <ul>
        <li>O add-on <code>eks-pod-identity-agent</code> roda em cada nó (um DaemonSet) e entrega as credenciais aos Pods.</li>
        <li>A ServiceAccount <b>não precisa de annotation</b>: a ligação mora na associação, fora do YAML dela.</li>
        <li>A mesma role serve para vários clusters sem mudar a trust policy (bom para ter muitos ambientes).</li>
        <li>A associação é um recurso da API do EKS. Com o ACK, ela vira o recurso <code>PodIdentityAssociation</code>, com
          <code>clusterName</code>, <code>namespace</code>, <code>serviceAccount</code> e <code>roleARN</code>.</li>
      </ul>
      <p>É como trocar o crachá com foto (IRSA, que precisa da annotation) por uma <b>lista na portaria</b>: o porteiro olha
      o nome na lista e entrega a chave certa.</p>
      <p><b>No cluster:</b> os Pods dessa ServiceAccount recebem a variável <code>AWS_CONTAINER_CREDENTIALS_FULL_URI</code>, e o
      SDK da AWS busca as credenciais no agente do nó.</p>`,
    `
      # A ServiceAccount é comum: nada de annotation.
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: pedidos
        namespace: loja
      ---
      # A associação liga a ServiceAccount à role (via ACK, chama a API do EKS)
      apiVersion: eks.services.k8s.aws/v1alpha1
      kind: PodIdentityAssociation
      metadata:
        name: pedidos
        namespace: loja
      spec:
        clusterName: loja-prod
        namespace: loja                 # namespace da ServiceAccount
        serviceAccount: pedidos         # nome da ServiceAccount
        roleARN: arn:aws:iam::123456789012:role/Pedidos
    `),

    exercicio({
      id: 'eks-pod-identity-sa',
      titulo: 'Associação do Pod Identity',
      dificuldade: 'facil',
      existentes: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: pagamentos
          namespace: loja
      `,
      resumo: `
        <p>A ServiceAccount <code>pagamentos</code> (namespace <code>loja</code>) já existe. Ligue-a à role <code>Pagamentos</code> do
        IAM com o EKS Pod Identity.</p>
        <ol>
          <li>Crie a <code>PodIdentityAssociation</code> <code>pagamentos</code> no namespace <code>loja</code>, com
            <code>clusterName: loja-prod</code>.</li>
          <li>Em <code>spec</code>: <code>namespace: loja</code> e <code>serviceAccount: pagamentos</code>.</li>
          <li><code>roleARN: ${ARN_ROLE('Pagamentos')}</code>.</li>
        </ol>
        <p><b>No cluster:</b> os próximos Pods com a ServiceAccount <code>pagamentos</code> recebem credenciais da role, sem tocar no
        YAML da ServiceAccount.</p>`,
      inicial: `
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: PodIdentityAssociation
        metadata:
          name: pagamentos
          namespace: loja
        spec:
          clusterName: loja-prod
          namespace:           # TODO: loja
          serviceAccount:      # TODO: pagamentos
          roleARN:             # TODO: o ARN da role Pagamentos (passo 3)
      `,
      dica: [
        'O exemplo da lição "EKS Pod Identity" tem a mesma estrutura.',
        'namespace e serviceAccount dizem QUAL crachá; roleARN diz QUAL chave ele recebe.',
        `namespace: loja\nserviceAccount: pagamentos\nroleARN: ${ARN_ROLE('Pagamentos')}`,
      ],
      solucao: `
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: PodIdentityAssociation
        metadata:
          name: pagamentos
          namespace: loja
        spec:
          clusterName: loja-prod
          namespace: loja
          serviceAccount: pagamentos
          roleARN: ${ARN_ROLE('Pagamentos')}
      `,
      testes: [
        teste({ descricao: 'A associação existe', dica: 'Preencha os três TODO: todos são obrigatórios.' }, existe('PodIdentityAssociation', 'pagamentos')),
        teste({ descricao: 'Aponta para a ServiceAccount loja/pagamentos', dica: 'Em spec: namespace: loja e serviceAccount: pagamentos.' },
          campo('PodIdentityAssociation', 'pagamentos', 'spec.serviceAccount', { valor: 'pagamentos' }),
          campo('PodIdentityAssociation', 'pagamentos', 'spec.namespace', { valor: 'loja' })),
        teste({ descricao: 'Usa a role Pagamentos', dica: `Em spec, escreva roleARN: ${ARN_ROLE('Pagamentos')}.` },
          campo('PodIdentityAssociation', 'pagamentos', 'spec.roleARN', { valor: ARN_ROLE('Pagamentos') })),
      ],
    }),

    exercicio({
      id: 'eks-pod-identity-deploy',
      titulo: 'Do zero: ServiceAccount, associação e Deployment',
      dificuldade: 'dificil',
      resumo: `
        <p>O serviço <b>estoque</b> grava numa tabela do DynamoDB. Monte as três peças do Pod Identity de uma vez: o crachá, a
        lista da portaria e o programa que usa o crachá.</p>
        <ol>
          <li>Crie a ServiceAccount <code>estoque</code> (namespace <code>loja</code>), <b>sem</b> annotations.</li>
          <li>Crie a <code>PodIdentityAssociation</code> <code>estoque</code> ligando <code>loja/estoque</code> à role
            <code>${ARN_ROLE('Estoque')}</code> no cluster <code>loja-prod</code>.</li>
          <li>Crie o Deployment <code>estoque</code> (namespace <code>loja</code>, 2 réplicas, label <code>app: estoque</code>,
            imagem <code>public.ecr.aws/nginx/nginx:1.27</code>) com <code>serviceAccountName: estoque</code>.</li>
        </ol>
        <p><b>No cluster:</b> o agente do Pod Identity em cada nó entrega aos dois Pods credenciais temporárias da role Estoque.</p>`,
      inicial: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: estoque
          namespace: loja
        ---
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: PodIdentityAssociation
        metadata:
          name: estoque
          namespace: loja
        spec:
          # TODO: clusterName, namespace, serviceAccount e roleARN (passo 2)
        ---
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: estoque
          namespace: loja
        spec:
          replicas: 2
          selector:
            matchLabels:
              app: estoque
          template:
            metadata:
              labels:
                app: estoque
            spec:
              # TODO: a ServiceAccount do passo 1
              containers:
                - name: app
                  image: public.ecr.aws/nginx/nginx:1.27
      `,
      dica: [
        'A associação tem quatro campos no spec; o Deployment precisa de uma linha no spec do Pod.',
        'Na associação, namespace e serviceAccount repetem o namespace e o nome da ServiceAccount do passo 1.',
        `spec:\n  clusterName: loja-prod\n  namespace: loja\n  serviceAccount: estoque\n  roleARN: ${ARN_ROLE('Estoque')}\n...\nserviceAccountName: estoque`,
      ],
      solucao: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: estoque
          namespace: loja
        ---
        apiVersion: eks.services.k8s.aws/v1alpha1
        kind: PodIdentityAssociation
        metadata:
          name: estoque
          namespace: loja
        spec:
          clusterName: loja-prod
          namespace: loja
          serviceAccount: estoque
          roleARN: ${ARN_ROLE('Estoque')}
        ---
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: estoque
          namespace: loja
        spec:
          replicas: 2
          selector:
            matchLabels:
              app: estoque
          template:
            metadata:
              labels:
                app: estoque
            spec:
              serviceAccountName: estoque
              containers:
                - name: app
                  image: public.ecr.aws/nginx/nginx:1.27
      `,
      testes: [
        teste({ descricao: 'A ServiceAccount estoque não precisa de annotation', dica: 'Com Pod Identity, deixe a ServiceAccount sem metadata.annotations.' },
          existe('ServiceAccount', 'estoque'),
          campo('ServiceAccount', 'estoque', 'metadata.annotations', { ausente: true })),
        teste({ descricao: 'A associação liga loja/estoque à role Estoque', dica: 'Na PodIdentityAssociation: serviceAccount: estoque e roleARN com a role Estoque.' },
          campo('PodIdentityAssociation', 'estoque', 'spec.serviceAccount', { valor: 'estoque' }),
          campo('PodIdentityAssociation', 'estoque', 'spec.roleARN', { valor: ARN_ROLE('Estoque') })),
        teste({ descricao: 'O Deployment usa a ServiceAccount', dica: 'Em template.spec do Deployment, escreva serviceAccountName: estoque.' },
          campo('Deployment', 'estoque', 'spec.template.spec.serviceAccountName', { valor: 'estoque' })),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'eks-aws-auth': { dica: 'Confira os dois grupos dos nós do passo 3.', regras: [{ tipo: 'configmap-contem', configmap: 'aws-auth', chave: 'mapRoles', contem: 'system:bootstrappers' }] },
    'eks-sa-irsa': { dica: 'A ServiceAccount fica no namespace do passo 1.', regras: [campo('ServiceAccount', 's3-reader', 'metadata.namespace', { valor: 'default' })] },
    'eks-aws-auth-usuarios': { dica: 'Confira o item da Ana em mapUsers: cada campo pedido no passo 3.', regras: [{ tipo: 'configmap-contem', configmap: 'aws-auth', chave: 'mapUsers', contem: 'username: ana' }] },
    'eks-access-entry-admin': { dica: 'Confira o cluster e a role pedidos nos passos 1 e 2.', regras: [campo('AccessEntry', 'plataforma', 'spec.principalARN', { valor: ARN_ROLE('Plataforma') }), campo('AccessEntry', 'plataforma', 'spec.clusterName', { valor: 'loja-prod' })] },
    'eks-access-entry-namespace': { dica: 'Confira a role e o tipo da access entry do passo 1.', regras: [campo('AccessEntry', 'suporte', 'spec.principalARN', { valor: ARN_ROLE('Suporte') }), campo('AccessEntry', 'suporte', 'spec.type', { valor: 'STANDARD' })] },
    'eks-access-entry-grupo': { dica: 'Releia o passo 1: a role certa e nenhuma política pronta da AWS.', regras: [campo('AccessEntry', 'deploy-ci', 'spec.principalARN', { valor: ARN_ROLE('PipelineCI') }), campo('AccessEntry', 'deploy-ci', 'spec.accessPolicies', { ausente: true }), campo('RoleBinding', 'ci-deployers', 'roleRef.kind', { valor: 'ClusterRole' })] },
    'eks-irsa-sts-regional': { dica: 'As duas annotations ficam na mesma ServiceAccount, com o nome do passo 1.', regras: [existe('ServiceAccount', 'fila-pedidos'), campo('ServiceAccount', 'fila-pedidos', 'metadata.annotations["eks.amazonaws.com/role-arn"]', { contem: 'role/FilaPedidos' })] },
    'eks-irsa-deployment': { dica: 'Confira réplicas, label e imagem pedidas nos passos 1 e 2.', regras: [campo('Deployment', 'relatorios', 'spec.replicas', { valor: 1 }), campo('Deployment', 'relatorios', 'spec.template.spec.containers[name=app].image', { valor: 'amazon/aws-cli:2.17.0' })] },
    'eks-pod-identity-sa': { dica: 'Confira o cluster e o namespace da associação.', regras: [campo('PodIdentityAssociation', 'pagamentos', 'spec.clusterName', { valor: 'loja-prod' }), campo('PodIdentityAssociation', 'pagamentos', 'metadata.namespace', { valor: 'loja' })] },
    'eks-pod-identity-deploy': { dica: 'Confira o cluster, o namespace e as réplicas pedidos nos passos 2 e 3.', regras: [campo('PodIdentityAssociation', 'estoque', 'spec.clusterName', { valor: 'loja-prod' }), campo('PodIdentityAssociation', 'estoque', 'spec.namespace', { valor: 'loja' }), campo('Deployment', 'estoque', 'spec.replicas', { valor: 2 }), campo('Deployment', 'estoque', 'metadata.namespace', { valor: 'loja' })] },
  },
};
