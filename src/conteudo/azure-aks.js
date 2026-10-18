// Módulo Azure: AKS (Azure Kubernetes Service).
// Lições sobre arquitetura do AKS, integração com Entra ID e node pools.
// Exercícios com validação via recurso-existe, azure-identity e configmap-contem.

export const azureAks = {
  id: 'azure-aks',
  titulo: 'AKS: Kubernetes no Azure',
  descricao: 'Gerenciamento de clusters Kubernetes no Azure com AKS, identidades gerenciadas e node pools.',
  icone: '🔵',
  itens: [
    {
      id: 'aks-arquitetura',
      tipo: 'licao',
      titulo: 'Arquitetura do AKS',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O <b>Azure Kubernetes Service (AKS)</b> é um serviço gerenciado de Kubernetes no Azure. O control plane é totalmente gerenciado pela Microsoft e gratuito — você paga apenas pelos nós de trabalho.</p>
        <dl>
          <dt><b>Control Plane Gerenciado</b></dt><dd>O API server, etcd, scheduler e controller manager são provisionados e mantidos pelo Azure. Você não tem acesso SSH ao control plane.</dd>
          <dt><b>Node Pools</b></dt><dd>Os nós de trabalho são organizados em pools. Cada pool pode ter tamanho de VM diferente, sistema operacional e configurações de escala.</dd>
          <dt><b>System vs User Pools</b></dt><dd>Pools do tipo <code>system</code> hospedam pods críticos do sistema (CoreDNS, kube-proxy, métricas). Pools do tipo <code>user</code> rodam suas cargas de trabalho.</dd>
        </dl>
        <p><b>Add-ons comuns</b>:</p>
        <ul>
          <li><b>Monitoring</b>: Container Insights integrado ao Azure Monitor.</li>
          <li><b>Networking</b>: Azure CNI ou Kubenet para conectividade de pods.</li>
          <li><b>Ingress</b>: Application Gateway Ingress Controller (AGIC) ou NGINX.</li>
          <li><b>Policy</b>: Azure Policy for Kubernetes (Gatekeeper).</li>
        </ul>`,
    },
    {
      id: 'aks-entra-rbac',
      tipo: 'licao',
      titulo: 'Entra ID e RBAC Azure',
      dificuldade: 'dificil',
      xp: 5,
      resumo: `<p>O AKS integra-se nativamente ao <b>Microsoft Entra ID</b> (antigo Azure AD) para autenticação e autorização:</p>
        <dl>
          <dt><b>Autenticação AAD</b></dt><dd>Usuários fazem login no cluster usando credenciais do Entra ID via <code>kubelogin</code>. Tokens OIDC são trocados por tokens do Kubernetes.</dd>
          <dt><b>RBAC Nativo do K8s</b></dt><dd>Após autenticado, o controle de acesso usa RoleBindings e ClusterRoleBindings padrão do Kubernetes, mapeando usuários/grupos AAD para roles.</dd>
          <dt><b>Managed Identity</b></dt><dd>O cluster pode usar uma identidade gerenciada do Azure para acessar recursos (Key Vault, Storage, ACR) sem gerenciar credenciais manualmente.</dd>
        </dl>
        <p><b>Workload Identity</b> (recomendado): pods recebem tokens federados do Entra ID via anotação <code>azure.workload.identity/client-id</code> no ServiceAccount, eliminando a necessidade de secrets estáticos.</p>
        <p><b>AAD Pod Identity</b> (legado): usava labels <code>aadpodidbinding</code> nos pods para associar identidades. Substituído pelo Workload Identity.</p>`,
    },
    {
      id: 'aks-node-pools-spot',
      tipo: 'licao',
      titulo: 'Node pools e spot instances',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O AKS suporta <b>múltiplos node pools</b>, permitindo otimizar custos e performance:</p>
        <dl>
          <dt><b>Spot VMs</b></dt><dd>Nós com preço reduzido (até 90% de desconto) que podem ser removidos pelo Azure com 30 segundos de aviso. Ideais para workloads tolerantes a interrupções (batch, CI/CD, dev/test).</dd>
          <dt><b>Autoscaler de Nós</b></dt><dd>O Cluster Autoscaler ajusta automaticamente o número de nós em cada pool baseado na demanda de pods pendentes. Configure <code>min-count</code> e <code>max-count</code> por pool.</dd>
          <dt><b>Taints e Tolerations</b></dt><dd>Pools dedicados podem ter taints (<code>workload=gpu:NoSchedule</code>) para garantir que apenas pods com tolerations correspondentes sejam agendados neles.</dd>
        </dl>
        <p><b>Estratégia recomendada</b>: use um pool system com VMs regulares para componentes críticos e pools user com spot VMs para workloads escaláveis. Combine com HPA e VPA para otimização completa.</p>`,
    },
    {
      id: 'aks-deployment-identidade',
      tipo: 'exercicio',
      titulo: 'Deployment com identidade gerenciada',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie um <b>Deployment</b> chamado <code>app-azure-identity</code> configurado com Workload Identity do Azure.</p>
        <ul>
          <li>Imagem: <code>mcr.microsoft.com/azure-cli:latest</code></li>
          <li>O ServiceAccount deve ter a anotação <code>azure.workload.identity/client-id</code> com valor <code>00000000-0000-0000-0000-000000000000</code></li>
          <li>O Pod deve ter a label <code>azure.workload.identity/use: "true"</code></li>
          <li>1 réplica</li>
        </ul>
        <p>Nota: neste exercício, crie apenas o Deployment. O ServiceAccount seria criado separadamente em produção.</p>`,
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
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'app-azure-identity' }],
        },
        {
          descricao: 'O Deployment tem label de workload identity do Azure',
          regras: [{ tipo: 'azure-identity', deployment: 'app-azure-identity' }],
        },
      ],
    },
    {
      id: 'aks-configmap-aad',
      tipo: 'exercicio',
      titulo: 'ConfigMap de integração Azure AD',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um <b>ConfigMap</b> chamado <code>aad-integration-config</code> representando a configuração de integração com Azure AD.</p>
        <ul>
          <li>Chave <code>tenant-id</code> com valor <code>00000000-0000-0000-0000-000000000000</code></li>
          <li>Chave <code>client-id</code> com valor <code>11111111-1111-1111-1111-111111111111</code></li>
          <li>Chave <code>server-app-id</code> com valor <code>22222222-2222-2222-2222-222222222222</code></li>
        </ul>`,
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
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'aad-integration-config' }],
        },
        {
          descricao: 'O ConfigMap contém a chave tenant-id',
          regras: [{ tipo: 'configmap-contem', nome: 'aad-integration-config', chave: 'tenant-id', valor: '00000000-0000-0000-0000-000000000000' }],
        },
        {
          descricao: 'O ConfigMap contém a chave client-id',
          regras: [{ tipo: 'configmap-contem', nome: 'aad-integration-config', chave: 'client-id', valor: '11111111-1111-1111-1111-111111111111' }],
        },
      ],
    },
  ],
};