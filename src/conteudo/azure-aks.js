// Módulo Azure, tópico 1: o AKS e a identidade (pessoas com Entra ID e RBAC, Pods com Workload Identity).
// Segue docs/didatica.md: lição com exemplo comentado, passos, esqueleto, dicas e "como corrigir".
import { licao, exercicio, teste, existe, campo } from './util.js';

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000000';
const CLIENTE = (n) => `${n}${n}${n}${n}${n}${n}${n}${n}-1111-2222-3333-444444444444`;
const GRUPO_LEITORES = '33333333-aaaa-bbbb-cccc-000000000001';
const GRUPO_PLATAFORMA = '33333333-aaaa-bbbb-cccc-000000000002';

/** Um Pod que usa a ServiceAccount `sa` com Workload Identity; `extraMeta` entra em metadata. */
const podWi = (nome, sa, extraMeta = '') => `
  apiVersion: v1
  kind: Pod
  metadata:
    name: ${nome}
    labels:
      azure.workload.identity/use: "true"
${extraMeta}  spec:
    serviceAccountName: ${sa}
    containers:
      - name: app
        image: mcr.microsoft.com/azure-cli:2.64.0
        command: ["sleep", "infinity"]
`;

export const azureAks = {
  id: 'azure-aks',
  titulo: 'AKS e identidade',
  descricao: 'Arquitetura do AKS, pessoas com Entra ID e RBAC, e Pods com Workload Identity.',
  icone: '🔵',
  itens: [
    licao('aks-arquitetura', 'Arquitetura do AKS', 'medio', `
      <p>O <b>Azure Kubernetes Service (AKS)</b> é o Kubernetes gerenciado da Microsoft. É o mesmo aluguel de cozinha montada do
      EKS, em outro shopping: a Azure cuida do <b>control plane</b> (API Server, etcd, Scheduler) e você cuida dos nós e dos
      manifestos.</p>
      <ul>
        <li>Os nós ficam em <b>node pools</b>: grupos de máquinas virtuais iguais (um Virtual Machine Scale Set). Todo cluster tem
          um pool <b>System</b> (para o CoreDNS e os add-ons) e pode ter pools <b>User</b> para as aplicações.</li>
        <li>Todo nó recebe a label <code>kubernetes.azure.com/agentpool</code> com o nome do pool dele. Um Pod escolhe o pool com
          <code>nodeSelector</code>.</li>
        <li>Os <b>add-ons</b> são ligados no cluster (pelo portal, CLI ou Terraform): monitoramento (Container Insights e Managed
          Prometheus), rede (Azure CNI com Cilium), entrada (App Routing, AGIC), segredos (Key Vault), KEDA e outros.</li>
        <li>Muita coisa do AKS também é YAML no cluster: annotations em ServiceAccounts e Services, ConfigMaps no
          <code>kube-system</code> e CRDs dos add-ons. Recursos da Azure (como node pools) podem ser declarados com o
          <b>Azure Service Operator</b> (ASO), que lê o YAML e chama a API da Azure.</li>
      </ul>
      <p><b>No cluster:</b> <code>kubectl get nodes -L kubernetes.azure.com/agentpool</code> mostra de qual pool é cada nó.</p>`,
    `
      # Um Pod que pede para rodar num nó do pool "geral"
      apiVersion: v1
      kind: Pod
      metadata:
        name: ola-aks
      spec:
        nodeSelector:
          # Label que o AKS coloca em todo nó: o nome do node pool
          kubernetes.azure.com/agentpool: geral
        containers:
          - name: web
            image: mcr.microsoft.com/azuredocs/aks-helloworld:v1
    `),

    licao('aks-entra-rbac', 'Entra ID e RBAC Azure', 'dificil', `
      <p>No AKS integrado ao <b>Microsoft Entra ID</b> (o antigo Azure AD), as pessoas entram no cluster com a conta da empresa
      (<code>az login</code> e o <code>kubelogin</code>). Depois, o <b>RBAC do Kubernetes</b>, que você já conhece, decide o que
      cada uma pode fazer. É o crachá da empresa (Entra ID) abrindo as catracas do prédio (RoleBindings).</p>
      <ul>
        <li>Num RoleBinding, um <b>usuário</b> do Entra ID aparece pelo e-mail de login (UPN), como
          <code>ana@contoso.com</code>, com <code>kind: User</code>.</li>
        <li>Um <b>grupo</b> aparece pelo <b>ID do objeto</b> do grupo (um GUID), com <code>kind: Group</code>. Dar permissão ao
          grupo é melhor: quem entra ou sai do time só muda no Entra ID.</li>
        <li>As ClusterRoles prontas do Kubernetes servem para quase tudo: <code>view</code> (ler), <code>edit</code> (mudar
          aplicações), <code>admin</code> (tudo num namespace) e <code>cluster-admin</code> (tudo no cluster).</li>
        <li>Há também o <b>Azure RBAC para Kubernetes</b>, em que as permissões são roles da Azure (como "Azure Kubernetes
          Service RBAC Reader") atribuídas no portal, sem YAML.</li>
      </ul>
      <p><b>No cluster:</b> <code>kubectl auth can-i list pods -n loja</code> responde conforme os RoleBindings do seu usuário e dos
      seus grupos.</p>`,
    `
      # O grupo "Leitores da loja" do Entra ID pode ler tudo no namespace loja
      apiVersion: rbac.authorization.k8s.io/v1
      kind: RoleBinding
      metadata:
        name: leitores-loja
        namespace: loja
      subjects:
        - kind: Group                                # um grupo do Entra ID...
          name: 33333333-aaaa-bbbb-cccc-000000000001 # ...pelo ID do objeto
          apiGroup: rbac.authorization.k8s.io
      roleRef:
        apiGroup: rbac.authorization.k8s.io
        kind: ClusterRole
        name: view                                   # a ClusterRole pronta de leitura
    `),

    exercicio({
      id: 'aks-rolebinding-grupo-entra',
      titulo: 'Grupo do Entra ID com leitura num namespace',
      dificuldade: 'facil',
      resumo: `
        <p>O time de suporte é o grupo do Entra ID com ID <code>${GRUPO_LEITORES}</code>. Ele precisa ler tudo no namespace <code>loja</code>.</p>
        <ol>
          <li>Crie o RoleBinding <code>suporte-loja</code> no namespace <code>loja</code>.</li>
          <li>Em <code>subjects</code>: <code>kind: Group</code>, <code>name: ${GRUPO_LEITORES}</code> e <code>apiGroup: rbac.authorization.k8s.io</code>.</li>
          <li>O <code>roleRef</code> é a ClusterRole <code>view</code>.</li>
        </ol>
        <p><b>No cluster:</b> quem está no grupo vê Pods, Services e Deployments de <code>loja</code>, mas não muda nada e não vê os Secrets
        (a ClusterRole view não inclui Secrets).</p>`,
      inicial: `
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: suporte-loja
          namespace: loja
        subjects:
          - kind:              # TODO: Group
            name:              # TODO: o ID do objeto do grupo
            apiGroup: rbac.authorization.k8s.io
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name:                # TODO: view
      `,
      dica: [
        'O exemplo da lição "Entra ID e RBAC Azure" é quase igual.',
        'O grupo aparece pelo ID do objeto (o GUID), e não pelo nome de exibição.',
        `subjects:\n  - kind: Group\n    name: ${GRUPO_LEITORES}\n...\nroleRef: ... name: view`,
      ],
      solucao: `
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: suporte-loja
          namespace: loja
        subjects:
          - kind: Group
            name: ${GRUPO_LEITORES}
            apiGroup: rbac.authorization.k8s.io
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name: view
      `,
      testes: [
        teste({ descricao: 'O RoleBinding existe', dica: 'roleRef.name vazio impede o apply: preencha os TODO.' }, existe('RoleBinding', 'suporte-loja')),
        teste({ descricao: 'A permissão é do grupo do suporte', dica: `Em subjects: kind: Group e name: ${GRUPO_LEITORES}.` },
          campo('RoleBinding', 'suporte-loja', 'subjects[0].kind', { valor: 'Group' }),
          campo('RoleBinding', 'suporte-loja', 'subjects[0].name', { valor: GRUPO_LEITORES })),
        teste({ descricao: 'A permissão é só de leitura', dica: 'Em roleRef, escreva name: view.' },
          campo('RoleBinding', 'suporte-loja', 'roleRef.name', { valor: 'view' })),
      ],
    }),

    exercicio({
      id: 'aks-rolebinding-usuario',
      titulo: 'Uma pessoa com permissão de editar',
      dificuldade: 'facil',
      resumo: `
        <p>A Ana (<code>ana@contoso.com</code>) vai cuidar dos deploys da loja. Ela precisa criar e mudar aplicações no namespace
        <code>loja</code>.</p>
        <ol>
          <li>Crie o RoleBinding <code>ana-edita-loja</code> no namespace <code>loja</code>.</li>
          <li>Em <code>subjects</code>: <code>kind: User</code> e <code>name: ana@contoso.com</code> (o login dela no Entra ID).</li>
          <li>O <code>roleRef</code> é a ClusterRole <code>edit</code>.</li>
        </ol>
        <p><b>No cluster:</b> a Ana consegue <code>kubectl apply</code> de Deployments e Services em <code>loja</code>, mas não cria RoleBindings
        (a ClusterRole edit não deixa uma pessoa dar permissões).</p>`,
      inicial: `
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: ana-edita-loja
          namespace: loja
        subjects:
          # TODO: - kind: User, name: ana@contoso.com, apiGroup: rbac.authorization.k8s.io
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name: edit
      `,
      dica: [
        'Um usuário é como o grupo do exercício anterior, com kind: User e o login no lugar do ID.',
        'subjects:\n  - kind: User\n    name: ana@contoso.com\n    apiGroup: rbac.authorization.k8s.io',
      ],
      solucao: `
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: ana-edita-loja
          namespace: loja
        subjects:
          - kind: User
            name: ana@contoso.com
            apiGroup: rbac.authorization.k8s.io
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name: edit
      `,
      testes: [
        teste({ descricao: 'O RoleBinding existe', dica: 'Mantenha kind: RoleBinding e metadata.name: ana-edita-loja.' }, existe('RoleBinding', 'ana-edita-loja')),
        teste({ descricao: 'A permissão é da Ana', dica: 'Em subjects: kind: User e name: ana@contoso.com.' },
          campo('RoleBinding', 'ana-edita-loja', 'subjects[0].kind', { valor: 'User' }),
          campo('RoleBinding', 'ana-edita-loja', 'subjects[0].name', { valor: 'ana@contoso.com' })),
      ],
    }),

    exercicio({
      id: 'aks-clusterrolebinding-admin',
      titulo: 'Administradores do cluster por grupo',
      dificuldade: 'medio',
      resumo: `
        <p>O time de plataforma (grupo <code>${GRUPO_PLATAFORMA}</code>) administra o cluster inteiro, inclusive recursos sem namespace,
        como os nós.</p>
        <ol>
          <li>Crie o <b>ClusterRoleBinding</b> <code>plataforma-admin</code> (sem namespace: vale para o cluster todo).</li>
          <li>O subject é o grupo <code>${GRUPO_PLATAFORMA}</code>.</li>
          <li>O <code>roleRef</code> é a ClusterRole <code>cluster-admin</code>.</li>
        </ol>
        <p><b>No cluster:</b> quem está no grupo pode tudo, em qualquer namespace. Por isso a lista desse grupo no Entra ID deve ser curta.</p>`,
      inicial: `
        apiVersion: rbac.authorization.k8s.io/v1
        kind:                  # TODO: ClusterRoleBinding
        metadata:
          name: plataforma-admin
        subjects:
          - kind: Group
            name:              # TODO: o ID do grupo da plataforma
            apiGroup: rbac.authorization.k8s.io
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name:                # TODO: cluster-admin
      `,
      dica: [
        'O ClusterRoleBinding é como o RoleBinding, mas sem namespace: vale no cluster todo.',
        `kind: ClusterRoleBinding\n...\nname: ${GRUPO_PLATAFORMA}\n...\nroleRef: ... name: cluster-admin`,
      ],
      solucao: `
        apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRoleBinding
        metadata:
          name: plataforma-admin
        subjects:
          - kind: Group
            name: ${GRUPO_PLATAFORMA}
            apiGroup: rbac.authorization.k8s.io
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name: cluster-admin
      `,
      testes: [
        teste({ descricao: 'O ClusterRoleBinding existe', dica: 'Escreva kind: ClusterRoleBinding no topo.' }, existe('ClusterRoleBinding', 'plataforma-admin')),
        teste({ descricao: 'É do grupo da plataforma', dica: `Em subjects, name: ${GRUPO_PLATAFORMA}.` },
          campo('ClusterRoleBinding', 'plataforma-admin', 'subjects[0].name', { valor: GRUPO_PLATAFORMA })),
        teste({ descricao: 'Dá o poder de cluster-admin', dica: 'Em roleRef, escreva name: cluster-admin.' },
          campo('ClusterRoleBinding', 'plataforma-admin', 'roleRef.name', { valor: 'cluster-admin' })),
      ],
    }),

    licao('aks-workload-identity-licao', 'Workload Identity: o Pod com crachá da Azure', 'dificil', `
      <p>Um Pod que lê o Key Vault ou um Storage Account precisa de uma identidade da Azure. Guardar a senha de um
      <i>service principal</i> num Secret é deixar a chave embaixo do tapete. O <b>Workload Identity</b> faz o Pod trocar o token
      da ServiceAccount por um token do Entra ID, como o IRSA da AWS.</p>
      <ol>
        <li>Fora do cluster: uma <b>identidade gerenciada</b> (managed identity) e uma <b>credencial federada</b> nela, que confia
          no emissor OIDC do cluster para a ServiceAccount <code>loja/pedidos</code>.</li>
        <li>A ServiceAccount recebe a annotation <code>azure.workload.identity/client-id</code> com o client ID da identidade
          (e, se quiser, <code>azure.workload.identity/tenant-id</code>).</li>
        <li>O Pod usa a ServiceAccount e tem a <b>label</b> <code>azure.workload.identity/use: "true"</code>. Sem a label, o webhook
          ignora o Pod.</li>
      </ol>
      <ul>
        <li>Annotations do Pod ajustam o comportamento: <code>azure.workload.identity/service-account-token-expiration</code> (a
          validade do token, em segundos) e <code>azure.workload.identity/skip-containers</code> (containers que não recebem o
          token, separados por <code>;</code>).</li>
      </ul>
      <p><b>No cluster:</b> o webhook injeta no Pod o token em <code>/var/run/secrets/azure/tokens</code> e as variáveis
      <code>AZURE_CLIENT_ID</code>, <code>AZURE_TENANT_ID</code> e <code>AZURE_FEDERATED_TOKEN_FILE</code>. Os SDKs da Azure usam isso sozinhos.</p>`,
    `
      # O crachá: a ServiceAccount diz qual identidade da Azure ela representa
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: pedidos
        annotations:
          azure.workload.identity/client-id: ${CLIENTE(1)}
      ---
      # O Pod: a label liga o webhook, e serviceAccountName escolhe o crachá
      apiVersion: v1
      kind: Pod
      metadata:
        name: pedidos
        labels:
          azure.workload.identity/use: "true"   # texto, entre aspas
      spec:
        serviceAccountName: pedidos
        containers:
          - name: app
            image: mcr.microsoft.com/azure-cli:2.64.0
            command: ["sleep", "infinity"]
    `),

    exercicio({
      id: 'aks-wi-serviceaccount',
      titulo: 'ServiceAccount com Workload Identity',
      dificuldade: 'facil',
      resumo: `
        <p>A identidade gerenciada <code>id-relatorios</code> tem o client ID <code>${CLIENTE(2)}</code> e já tem a credencial federada
        para a ServiceAccount <code>relatorios</code>.</p>
        <ol>
          <li>Crie a ServiceAccount <code>relatorios</code>.</li>
          <li>Em <code>metadata.annotations</code>, <code>azure.workload.identity/client-id</code> com <code>${CLIENTE(2)}</code>.</li>
        </ol>
        <p><b>No cluster:</b> os Pods com essa ServiceAccount e a label <code>azure.workload.identity/use: "true"</code> recebem
        <code>AZURE_CLIENT_ID=${CLIENTE(2)}</code>.</p>`,
      inicial: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: relatorios
          annotations:
            # TODO: azure.workload.identity/client-id com o client ID
      `,
      dica: [
        'O exemplo da lição "Workload Identity" começa com esta ServiceAccount.',
        `azure.workload.identity/client-id: ${CLIENTE(2)}`,
      ],
      solucao: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: relatorios
          annotations:
            azure.workload.identity/client-id: ${CLIENTE(2)}
      `,
      testes: [
        teste({ descricao: 'A ServiceAccount existe', dica: 'Mantenha kind: ServiceAccount e metadata.name: relatorios.' }, existe('ServiceAccount', 'relatorios')),
        teste({ descricao: 'Representa a identidade id-relatorios', dica: `Em metadata.annotations: azure.workload.identity/client-id: ${CLIENTE(2)}.` },
          campo('ServiceAccount', 'relatorios', 'metadata.annotations["azure.workload.identity/client-id"]', { valor: CLIENTE(2) })),
      ],
    }),

    exercicio({
      id: 'aks-wi-tenant',
      titulo: 'Identidade de outro tenant',
      dificuldade: 'facil',
      resumo: `
        <p>A identidade do serviço de notas fiscais mora em outro diretório (tenant) do Entra ID, o <code>${TENANT}</code>. Sem dizer o
        tenant, o Pod tentaria o tenant do cluster e falharia.</p>
        <ol>
          <li>Na ServiceAccount <code>notas</code>, mantenha o <code>azure.workload.identity/client-id</code> do esqueleto.</li>
          <li>Acrescente <code>azure.workload.identity/tenant-id</code> com <code>${TENANT}</code>.</li>
        </ol>
        <p><b>No cluster:</b> o webhook coloca nos Pods <code>AZURE_TENANT_ID=${TENANT}</code> em vez do tenant do cluster.</p>`,
      inicial: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: notas
          annotations:
            azure.workload.identity/client-id: ${CLIENTE(3)}
            # TODO: azure.workload.identity/tenant-id
      `,
      dica: [
        'É mais uma annotation com o prefixo azure.workload.identity/.',
        `azure.workload.identity/tenant-id: ${TENANT}`,
      ],
      solucao: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: notas
          annotations:
            azure.workload.identity/client-id: ${CLIENTE(3)}
            azure.workload.identity/tenant-id: ${TENANT}
      `,
      testes: [
        teste({ descricao: 'A ServiceAccount continua com o client ID', dica: 'Não apague a annotation azure.workload.identity/client-id.' },
          campo('ServiceAccount', 'notas', 'metadata.annotations["azure.workload.identity/client-id"]', { valor: CLIENTE(3) })),
        teste({ descricao: 'Diz o tenant da identidade', dica: `Escreva azure.workload.identity/tenant-id: ${TENANT}.` },
          campo('ServiceAccount', 'notas', 'metadata.annotations["azure.workload.identity/tenant-id"]', { valor: TENANT })),
      ],
    }),

    {
      id: 'aks-deployment-identidade',
      tipo: 'exercicio',
      titulo: 'Deployment com identidade gerenciada',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `
        <p>Com <b>Workload Identity</b>, um Pod no AKS usa uma identidade do Microsoft Entra ID sem senha no cluster. Duas peças: a
        ServiceAccount com a annotation do <code>client-id</code> (já existe no cluster, <code>app-sa</code>) e o Pod marcado para usá-la.</p>
        <ol>
          <li>Rode <code>kubectl describe sa app-sa</code> e veja a annotation <code>azure.workload.identity/client-id</code>.</li>
          <li>No Deployment <code>app-azure-identity</code> (1 réplica), use <code>serviceAccountName: app-sa</code> no spec do Pod.</li>
          <li>Nas labels do Pod (em <code>template.metadata.labels</code>), acrescente <code>azure.workload.identity/use: "true"</code> (com aspas).</li>
          <li>O container <code>app</code> usa a imagem <code>mcr.microsoft.com/azure-cli:latest</code> e o comando <code>["sleep", "infinity"]</code>.</li>
        </ol>
        <p><b>No cluster:</b> o webhook do Workload Identity vê a label e injeta no Pod o token e as variáveis <code>AZURE_CLIENT_ID</code>
        e <code>AZURE_TENANT_ID</code>. O Azure CLI e os SDKs usam isso para obter um token da Azure.</p>`,
      inicial: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-azure-identity
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app-azure-identity
  template:
    metadata:
      labels:
        app: app-azure-identity
        # TODO: azure.workload.identity/use: "true"
    spec:
      serviceAccountName:  # TODO: app-sa
      containers:
        - name: app
          image: mcr.microsoft.com/azure-cli:latest
          command: ["sleep", "infinity"]
`,
      existentes: `apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  annotations:
    azure.workload.identity/client-id: 00000000-0000-0000-0000-000000000000`,
      dica: [
        "A label vai no molde do Pod (template.metadata.labels), não no metadata do Deployment.",
        "O valor da label é texto: \"true\" com aspas.",
      ],
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-azure-identity
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app-azure-identity
  template:
    metadata:
      labels:
        app: app-azure-identity
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: app-sa
      containers:
        - name: app
          image: mcr.microsoft.com/azure-cli:latest
          command: ["sleep", "infinity"]`,
      testes: [
        {
          descricao: 'O Deployment app-azure-identity existe',
          dica: "Preencha serviceAccountName: app-sa (um campo vazio impede o apply).",
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'app-azure-identity' }],
        },
        {
          descricao: 'O Deployment tem label de workload identity do Azure',
          dica: "Em template.metadata.labels: azure.workload.identity/use: \"true\".",
          regras: [
            { tipo: 'azure-identity', deployment: 'app-azure-identity' },
            { tipo: 'campo', kind: 'Deployment', nome: 'app-azure-identity', caminho: 'spec.template.metadata.labels["azure.workload.identity/use"]', valor: 'true' },
            { tipo: 'campo', kind: 'Deployment', nome: 'app-azure-identity', caminho: 'spec.template.spec.serviceAccountName', valor: 'app-sa' },
          ],
        },
      ],
    },

    exercicio({
      id: 'aks-wi-token-expiracao',
      titulo: 'Token do Workload Identity com validade maior',
      dificuldade: 'medio',
      existentes: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: importador
          annotations:
            azure.workload.identity/client-id: ${CLIENTE(4)}
      `,
      resumo: `
        <p>O importador antigo só lê o arquivo do token ao iniciar e roda por horas. O token padrão vale 1 hora; para ele, vale um dia.</p>
        <ol>
          <li>O Pod <code>importador</code> já tem a label do Workload Identity e usa a ServiceAccount <code>importador</code>.</li>
          <li>Em <code>metadata.annotations</code> do Pod, escreva <code>azure.workload.identity/service-account-token-expiration: "86400"</code>.</li>
        </ol>
        <p><b>No cluster:</b> o webhook projeta o token com validade de 86400 segundos (24 horas). O máximo aceito é 86400; o mínimo, 3600.</p>`,
      inicial: podWi('importador', 'importador', `    annotations:
      # TODO: azure.workload.identity/service-account-token-expiration: "86400"
`),
      dica: [
        'A annotation vai no Pod (metadata.annotations), não na ServiceAccount.',
        'O valor é texto: "86400" com aspas.',
        'annotations:\n  azure.workload.identity/service-account-token-expiration: "86400"',
      ],
      solucao: podWi('importador', 'importador', `    annotations:
      azure.workload.identity/service-account-token-expiration: "86400"
`),
      testes: [
        teste({ descricao: 'O Pod usa o Workload Identity', dica: 'Mantenha a label azure.workload.identity/use: "true" e serviceAccountName: importador.' },
          campo('Pod', 'importador', 'metadata.labels["azure.workload.identity/use"]', { valor: 'true' })),
        teste({ descricao: 'O token vale 24 horas', dica: 'Em metadata.annotations do Pod: azure.workload.identity/service-account-token-expiration: "86400".' },
          campo('Pod', 'importador', 'metadata.annotations["azure.workload.identity/service-account-token-expiration"]', { valor: '86400' })),
      ],
    }),

    exercicio({
      id: 'aks-wi-skip-containers',
      titulo: 'Sidecar sem o token da Azure',
      dificuldade: 'medio',
      existentes: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: loja
          annotations:
            azure.workload.identity/client-id: ${CLIENTE(5)}
      `,
      resumo: `
        <p>O Pod <code>loja</code> tem dois containers: a aplicação, que precisa da identidade, e um sidecar de proxy, que não precisa. Menos
        containers com token, menos risco.</p>
        <ol>
          <li>Em <code>metadata.annotations</code> do Pod, escreva <code>azure.workload.identity/skip-containers: proxy</code>.</li>
          <li>Mantenha os dois containers, <code>app</code> e <code>proxy</code>.</li>
        </ol>
        <p><b>No cluster:</b> o webhook injeta o token e as variáveis só no container <code>app</code>. Para pular vários, separe os nomes com
        <code>;</code>.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: loja
          labels:
            azure.workload.identity/use: "true"
          annotations:
            # TODO: azure.workload.identity/skip-containers: proxy
        spec:
          serviceAccountName: loja
          containers:
            - name: app
              image: mcr.microsoft.com/azure-cli:2.64.0
              command: ["sleep", "infinity"]
            - name: proxy
              image: envoyproxy/envoy:v1.31.2
      `,
      dica: [
        'É uma annotation do Pod com o prefixo azure.workload.identity/.',
        'azure.workload.identity/skip-containers: proxy',
      ],
      solucao: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: loja
          labels:
            azure.workload.identity/use: "true"
          annotations:
            azure.workload.identity/skip-containers: proxy
        spec:
          serviceAccountName: loja
          containers:
            - name: app
              image: mcr.microsoft.com/azure-cli:2.64.0
              command: ["sleep", "infinity"]
            - name: proxy
              image: envoyproxy/envoy:v1.31.2
      `,
      testes: [
        teste({ descricao: 'O Pod tem os dois containers', dica: 'Mantenha os containers app e proxy.' },
          existe('Pod', 'loja'),
          campo('Pod', 'loja', 'spec.containers[*].name', { valor: ['app', 'proxy'] })),
        teste({ descricao: 'O proxy não recebe o token', dica: 'Em metadata.annotations do Pod: azure.workload.identity/skip-containers: proxy.' },
          campo('Pod', 'loja', 'metadata.annotations["azure.workload.identity/skip-containers"]', { valor: 'proxy' })),
      ],
    }),

    {
      id: 'aks-configmap-aad',
      tipo: 'exercicio',
      titulo: 'ConfigMap de integração Azure AD',
      dificuldade: 'medio',
      xp: 15,
      resumo: `
        <p>Aplicações que fazem login pelo Microsoft Entra ID (antigo Azure AD) precisam de três identificadores: o do diretório
        (tenant), o do cliente e o da aplicação servidora. Eles não são segredos e podem ficar num ConfigMap.</p>
        <ol>
          <li>No ConfigMap <code>aad-integration-config</code>, <code>tenant-id: "00000000-0000-0000-0000-000000000000"</code>.</li>
          <li><code>client-id: "11111111-1111-1111-1111-111111111111"</code>.</li>
          <li><code>server-app-id: "22222222-2222-2222-2222-222222222222"</code> (os três entre aspas).</li>
        </ol>
        <p><b>No cluster:</b> a aplicação lê os identificadores como variáveis ou arquivos. A senha do cliente, se houver, iria num Secret.</p>`,
      inicial: `apiVersion: v1
kind: ConfigMap
metadata:
  name: aad-integration-config
data:
  # TODO: tenant-id: "00000000-0000-0000-0000-000000000000"
  # TODO: client-id: "11111111-1111-1111-1111-111111111111"
  # TODO: server-app-id: "22222222-2222-2222-2222-222222222222"
`,
      dica: [
        "Tire o \"# TODO:\" da frente de cada linha, mantendo os 2 espaços.",
        "Use aspas nos identificadores: são textos.",
      ],
      solucao: `apiVersion: v1
kind: ConfigMap
metadata:
  name: aad-integration-config
data:
  tenant-id: "00000000-0000-0000-0000-000000000000"
  client-id: "11111111-1111-1111-1111-111111111111"
  server-app-id: "22222222-2222-2222-2222-222222222222"`,
      testes: [
        {
          descricao: 'O ConfigMap aad-integration-config existe',
          dica: "Mantenha metadata.name: aad-integration-config.",
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'aad-integration-config' }],
        },
        {
          descricao: 'O ConfigMap contém a chave tenant-id',
          dica: "Em data: tenant-id com o valor de zeros, entre aspas.",
          regras: [{ tipo: 'configmap-contem', nome: 'aad-integration-config', chave: 'tenant-id', valor: '00000000-0000-0000-0000-000000000000' }],
        },
        {
          descricao: 'O ConfigMap contém a chave client-id',
          dica: "Em data: client-id com o valor de uns, entre aspas.",
          regras: [{ tipo: 'configmap-contem', nome: 'aad-integration-config', chave: 'client-id', valor: '11111111-1111-1111-1111-111111111111' }],
        },
      ],
    },

    exercicio({
      id: 'aks-wi-completo',
      titulo: 'Do zero: ServiceAccount e Deployment com Workload Identity',
      dificuldade: 'dificil',
      resumo: `
        <p>O serviço <b>estoque</b> grava num Storage Account com a identidade <code>id-estoque</code> (client ID <code>${CLIENTE(6)}</code>).
        Monte as duas peças no namespace <code>loja</code>.</p>
        <ol>
          <li>Crie a ServiceAccount <code>estoque</code> (namespace <code>loja</code>) com a annotation do client ID.</li>
          <li>Crie o Deployment <code>estoque</code> (namespace <code>loja</code>, 2 réplicas, label <code>app: estoque</code>,
            imagem <code>mcr.microsoft.com/azure-cli:2.64.0</code> com <code>command: ["sleep", "infinity"]</code>).</li>
          <li>No template do Pod: a label <code>azure.workload.identity/use: "true"</code> e <code>serviceAccountName: estoque</code>.</li>
        </ol>
        <p><b>No cluster:</b> os dois Pods recebem o token federado e as variáveis da Azure; <code>az login --federated-token</code> funciona
        sem nenhuma senha.</p>`,
      inicial: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: estoque
          namespace: loja
          # TODO: annotations com o client ID (passo 1)
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
                # TODO: a label do Workload Identity (passo 3)
            spec:
              # TODO: a ServiceAccount (passo 3)
              containers:
                - name: app
                  image: mcr.microsoft.com/azure-cli:2.64.0
                  command: ["sleep", "infinity"]
      `,
      dica: [
        'São as três peças da lição "Workload Identity": annotation na ServiceAccount, label e serviceAccountName no Pod.',
        'A label vai em template.metadata.labels, e não no metadata do Deployment.',
        `annotations:\n  azure.workload.identity/client-id: ${CLIENTE(6)}\n...\nlabels:\n  azure.workload.identity/use: "true"\n...\nserviceAccountName: estoque`,
      ],
      solucao: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: estoque
          namespace: loja
          annotations:
            azure.workload.identity/client-id: ${CLIENTE(6)}
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
                azure.workload.identity/use: "true"
            spec:
              serviceAccountName: estoque
              containers:
                - name: app
                  image: mcr.microsoft.com/azure-cli:2.64.0
                  command: ["sleep", "infinity"]
      `,
      testes: [
        teste({ descricao: 'A ServiceAccount representa a identidade id-estoque', dica: 'Na ServiceAccount: azure.workload.identity/client-id com o client ID.' },
          campo('ServiceAccount', 'estoque', 'metadata.annotations["azure.workload.identity/client-id"]', { valor: CLIENTE(6) })),
        teste({ descricao: 'Os Pods ligam o Workload Identity', dica: 'Em template.metadata.labels: azure.workload.identity/use: "true".' },
          campo('Deployment', 'estoque', 'spec.template.metadata.labels["azure.workload.identity/use"]', { valor: 'true' })),
        teste({ descricao: 'Os Pods usam a ServiceAccount estoque', dica: 'Em template.spec: serviceAccountName: estoque.' },
          campo('Deployment', 'estoque', 'spec.template.spec.serviceAccountName', { valor: 'estoque' })),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'aks-rolebinding-grupo-entra': { dica: 'Confira o namespace e o tipo do roleRef.', regras: [campo('RoleBinding', 'suporte-loja', 'metadata.namespace', { valor: 'loja' }), campo('RoleBinding', 'suporte-loja', 'roleRef.kind', { valor: 'ClusterRole' })] },
    'aks-rolebinding-usuario': { dica: 'Confira o namespace e a ClusterRole do passo 3.', regras: [campo('RoleBinding', 'ana-edita-loja', 'metadata.namespace', { valor: 'loja' }), campo('RoleBinding', 'ana-edita-loja', 'roleRef.name', { valor: 'edit' })] },
    'aks-clusterrolebinding-admin': { dica: 'O subject é um grupo do Entra ID, e o binding não tem namespace.', regras: [campo('ClusterRoleBinding', 'plataforma-admin', 'subjects[0].kind', { valor: 'Group' }), campo('ClusterRoleBinding', 'plataforma-admin', 'metadata.namespace', { ausente: true })] },
    'aks-wi-serviceaccount': { dica: 'O client ID é o da identidade id-relatorios, sem espaços.', regras: [campo('ServiceAccount', 'relatorios', 'metadata.annotations["azure.workload.identity/client-id"]', { naoContem: ' ' })] },
    'aks-wi-tenant': { dica: 'A ServiceAccount tem o nome do passo 1.', regras: [existe('ServiceAccount', 'notas')] },
    'aks-deployment-identidade': { dica: 'Confira a imagem e o comando do passo 4.', regras: [campo('Deployment', 'app-azure-identity', 'spec.template.spec.containers[name=app].image', { valor: 'mcr.microsoft.com/azure-cli:latest' }), campo('Deployment', 'app-azure-identity', 'spec.template.spec.containers[name=app].command', { valor: ['sleep', 'infinity'] })] },
    'aks-wi-token-expiracao': { dica: 'A annotation fica no Pod, que continua usando a ServiceAccount do esqueleto.', regras: [campo('Pod', 'importador', 'spec.serviceAccountName', { valor: 'importador' })] },
    'aks-wi-skip-containers': { dica: 'A aplicação continua recebendo o token.', regras: [campo('Pod', 'loja', 'metadata.annotations["azure.workload.identity/skip-containers"]', { naoContem: 'app' }), campo('Pod', 'loja', 'metadata.labels["azure.workload.identity/use"]', { valor: 'true' })] },
    'aks-configmap-aad': { dica: 'Confira o terceiro identificador do passo 3.', regras: [{ tipo: 'configmap-contem', nome: 'aad-integration-config', chave: 'server-app-id', valor: '22222222-2222-2222-2222-222222222222' }] },
    'aks-wi-completo': { dica: 'Confira o namespace e as réplicas pedidos.', regras: [campo('Deployment', 'estoque', 'metadata.namespace', { valor: 'loja' }), campo('Deployment', 'estoque', 'spec.replicas', { valor: 2 }), campo('ServiceAccount', 'estoque', 'metadata.namespace', { valor: 'loja' })] },
  },
};
