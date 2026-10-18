// Módulo comparativo: Terraform vs Kubernetes.
// Lições conceituais que contrastam os dois ecossistemas e mostram onde cada um brilha.
// Cada lição inclui tabela comparativa acessível com colunas Feature | Terraform | Kubernetes.

export const comparacao = {
  id: 'comparacao',
  titulo: '⚖️ Terraform vs. Kubernetes',
  descricao: 'Lições comparativas entre Terraform e Kubernetes: quando usar cada ferramenta e como elas se complementam.',
  icone: '⚖️',
  itens: [
    {
      id: 'comp-providers',
      tipo: 'licao',
      titulo: 'Provider Abstraction Layer',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O <b>Kubernetes</b> é um orquestrador de containers: seu escopo é gerenciar Pods, Services, Deployments e outros recursos dentro de um cluster. Já o <b>Terraform</b> opera em uma camada superior — através de <i>providers</i>, ele gerencia infraestrutura em qualquer nuvem (AWS, Azure, GCP), bancos de dados, DNS, TLS e centenas de serviços externos.</p>
        <p>Enquanto o K8s fala a língua dos containers, o Terraform fala a língua da infraestrutura como código (IaC) multi-cloud. Eles não competem: se complementam.</p>
        <table>
          <caption>Comparação: Provider Abstraction Layer</caption>
          <thead><tr><th scope="col">Feature</th><th scope="col">Terraform</th><th scope="col">Kubernetes</th></tr></thead>
          <tbody>
            <tr><td>Escopo principal</td><td>Infraestrutura multi-cloud (VMs, redes, buckets, IAM)</td><td>Orquestração de containers dentro do cluster</td></tr>
            <tr><td>Abstração</td><td>Providers (aws, azurerm, google, kubernetes, etc.)</td><td>API Server + CRDs nativos</td></tr>
            <tr><td>Linguagem</td><td>HCL (HashiCorp Configuration Language)</td><td>YAML / JSON manifests</td></tr>
            <tr><td>Estado</td><td>State file (.tfstate) remoto ou local</td><td>etcd (estado desejado no API Server)</td></tr>
          </tbody>
        </table>`,
    },
    {
      id: 'comp-multicloud',
      tipo: 'licao',
      titulo: 'Multi-Cloud Orchestration',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O Kubernetes por si só não provisiona clusters em múltiplas nuvens. Ferramentas como <b>Crossplane</b> estendem o K8s com CRDs que representam recursos de nuvem (RDS, S3, VPC), permitindo gerenciar infraestrutura externa usando a mesma API do Kubernetes. O <b>ArgoCD</b> entra como ponte GitOps, sincronizando manifests do Git para o cluster.</p>
        <p>O Terraform, por outro lado, já nasceu multi-cloud: um único projeto pode provisionar recursos na AWS, Azure e GCP simultaneamente usando múltiplos providers.</p>
        <table>
          <caption>Comparação: Multi-Cloud Orchestration</caption>
          <thead><tr><th scope="col">Feature</th><th scope="col">Terraform</th><th scope="col">Kubernetes</th></tr></thead>
          <tbody>
            <tr><td>Multi-cloud nativo</td><td>Sim — múltiplos providers no mesmo plano</td><td>Não nativo — requer Crossplane ou ferramentas externas</td></tr>
            <tr><td>Ponte GitOps</td><td>Terragrunt + Atlantis / Spacelift</td><td>ArgoCD / Flux CD (pull-based reconciliation)</td></tr>
            <tr><td>Recursos fora do cluster</td><td>Gerencia diretamente via providers</td><td>Via Crossplane CRDs ou operadores customizados</td></tr>
            <tr><td>Drift detection</td><td><code>terraform plan</code> detecta desvios</td><td>ArgoCD/Flux detectam e corrigem automaticamente</td></tr>
          </tbody>
        </table>`,
    },
    {
      id: 'comp-imutable',
      tipo: 'licao',
      titulo: 'Immutable Infrastructure',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>Ambos promovem infraestrutura imutável, mas de formas diferentes. O Terraform tende ao modelo <b>replace</b>: quando uma VM ou recurso muda, ele destrói o antigo e cria um novo. O Kubernetes usa <b>rolling update</b>: substitui Pods gradualmente sem downtime, mantendo o Service estável durante a transição.</p>
        <p>A imutabilidade reduz <i>configuration drift</i> e torna rollbacks previsíveis — basta reverter para a versão anterior do manifesto ou do state.</p>
        <table>
          <caption>Comparação: Immutable Infrastructure</caption>
          <thead><tr><th scope="col">Feature</th><th scope="col">Terraform</th><th scope="col">Kubernetes</th></tr></thead>
          <tbody>
            <tr><td>Estratégia padrão</td><td>Replace (destroy + create)</td><td>Rolling update (substituição gradual de Pods)</td></tr>
            <tr><td>Downtime durante update</td><td>Possível (depende do recurso)</td><td>Zero downtime com rolling update</td></tr>
            <tr><td>Rollback</td><td>Reverter commit + <code>terraform apply</code></td><td><code>kubectl rollout undo</code> ou reverter Git commit</td></tr>
            <tr><td>Versionamento</td><td>Git + state versioning</td><td>ReplicaSet history + Git (GitOps)</td></tr>
          </tbody>
        </table>`,
    },
    {
      id: 'comp-workspaces',
      tipo: 'licao',
      titulo: 'Workspaces vs Namespaces',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>É comum confundir <b>workspaces</b> do Terraform com <b>namespaces</b> do Kubernetes, mas eles resolvem problemas diferentes. Workspaces isolam <i>state files</i> — permitem gerenciar dev/staging/prod com o mesmo código mas estados separados. Namespaces isolam <i>recursos dentro do cluster</i> — são limites lógicos para RBAC, quotas e organização.</p>
        <p>Um workspace do Terraform pode criar recursos em múltiplos namespaces; um namespace do K8s não tem relação direta com workspaces.</p>
        <table>
          <caption>Comparação: Workspaces vs Namespaces</caption>
          <thead><tr><th scope="col">Feature</th><th scope="col">Terraform Workspaces</th><th scope="col">Kubernetes Namespaces</th></tr></thead>
          <tbody>
            <tr><td>O que isola</td><td>State files (mesmo código, estados diferentes)</td><td>Recursos dentro do cluster (Pods, Services, etc.)</td></tr>
            <tr><td>Escopo</td><td>Projeto Terraform inteiro</td><td>Cluster Kubernetes individual</td></tr>
            <tr><td>RBAC</td><td>Não aplicável</td><td>RoleBindings e ClusterRoleBindings por namespace</td></tr>
            <tr><td>Uso típico</td><td>dev / staging / prod com mesmo código</td><td>Equipes, ambientes ou aplicações isoladas</td></tr>
          </tbody>
        </table>`,
    },
    {
      id: 'comp-backend',
      tipo: 'licao',
      titulo: 'Backend Remoto com Locking',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O estado do Kubernetes vive no <b>etcd</b>, um banco chave-valor distribuído com consenso Raft — o locking é automático e transparente. O Terraform precisa de um <b>backend remoto</b> configurado explicitamente (S3 + DynamoDB, GCS, Azure Blob, Terraform Cloud) para armazenar o state e garantir locking concorrente.</p>
        <p>Sem backend remoto e locking, duas pessoas rodando <code>terraform apply</code> simultaneamente podem corromper o state. No K8s, o etcd resolve isso internamente.</p>
        <table>
          <caption>Comparação: Backend e State Locking</caption>
          <thead><tr><th scope="col">Feature</th><th scope="col">Terraform</th><th scope="col">Kubernetes</th></tr></thead>
          <tbody>
            <tr><td>Armazenamento de estado</td><td>Backend remoto (S3+DynamoDB, GCS, TF Cloud)</td><td>etcd (interno ao control plane)</td></tr>
            <tr><td>Locking</td><td>Explícito — DynamoDB, Consul, TF Cloud</td><td>Implícito — consenso Raft no etcd</td></tr>
            <tr><td>Configuração</td><td>Bloco <code>backend</code> no HCL</td><td>Automática (parte do control plane)</td></tr>
            <tr><td>Risco de corrupção</td><td>Alto sem locking adequado</td><td>Baixo (consenso distribuído)</td></tr>
          </tbody>
        </table>`,
    },
    {
      id: 'comp-policy',
      tipo: 'licao',
      titulo: 'Sentinel/OPA Integration',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O Terraform usa <b>Sentinel</b> (HashiCorp) ou <b>OPA</b> (Open Policy Agent) via políticas no CI/CD para bloquear applies que violam regras de compliance. No Kubernetes, o <b>Gatekeeper</b> (implementação de OPA como admission controller) valida recursos antes de serem criados no cluster.</p>
        <p>Ambos seguem o princípio de <i>policy-as-code</i>: regras são escritas em código, versionadas e testáveis, não configuradas em UIs.</p>
        <table>
          <caption>Comparação: Policy-as-Code</caption>
          <thead><tr><th scope="col">Feature</th><th scope="col">Terraform</th><th scope="col">Kubernetes</th></tr></thead>
          <tbody>
            <tr><td>Ferramenta principal</td><td>Sentinel (TF Cloud) ou OPA no CI</td><td>Gatekeeper (OPA admission controller)</td></tr>
            <tr><td>Momento da validação</td><td>Antes do <code>apply</code> (plan-time ou pre-apply)</td><td>Na admissão do recurso (admission-time)</td></tr>
            <tr><td>Linguagem de policy</td><td>Sentinel / Rego (OPA)</td><td>Rego (OPA via Gatekeeper)</td></tr>
            <tr><td>Exemplo de regra</td><td>"Proibir instâncias t2.micro em prod"</td><td>"Proibir containers sem resource limits"</td></tr>
          </tbody>
        </table>`,
    },
    {
      id: 'comp-composition',
      tipo: 'licao',
      titulo: 'Terragrunt-style Composition',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O <b>Terragrunt</b> resolve o problema de DRY (Don't Repeat Yourself) no Terraform: permite herdar configurações, compor módulos e definir dependências entre projetos. No Kubernetes, o <b>Kustomize</b> faz papel similar com overlays: uma base comum é personalizada por ambiente (dev/staging/prod) sem duplicar YAML.</p>
        <p>Helm charts também oferecem composição via templates, mas Kustomize é mais simples e nativo do <code>kubectl</code>.</p>
        <table>
          <caption>Comparação: Composição e DRY</caption>
          <thead><tr><th scope="col">Feature</th><th scope="col">Terraform (Terragrunt)</th><th scope="col">Kubernetes (Kustomize)</th></tr></thead>
          <tbody>
            <tr><td>Mecanismo de DRY</td><td>Módulos + <code>include</code> + <code>dependency</code></td><td>Base + overlays por ambiente</td></tr>
            <tr><td>Herança</td><td><code>include</code> herda terragrunt.hcl pai</td><td><code>bases</code> + <code>patchesStrategicMerge</code></td></tr>
            <tr><td>Templates</td><td>HCL interpolation + modules</td><td>Kustomize patches (sem templating)</td></tr>
            <tr><td>Nativo?</td><td>Não — ferramenta externa (Gruntwork)</td><td>Sim — integrado ao kubectl</td></tr>
          </tbody>
        </table>`,
    },
    {
      id: 'comp-quiz',
      tipo: 'exercicio',
      titulo: 'Quiz: Terraform vs Kubernetes',
      dificuldade: 'medio',
      xp: 10,
      resumo: `<p>Responda às perguntas abaixo para consolidar seu entendimento sobre quando usar Terraform, Kubernetes ou ambos.</p>
        <p><b>1.</b> Você precisa provisionar uma VPC, subnets e um cluster EKS na AWS. Qual ferramenta usa?</p>
        <ul><li>a) Apenas Kubernetes</li><li>b) Apenas Terraform</li><li>c) Ambos: Terraform para a infra, K8s para os workloads</li></ul>
        <p><b>2.</b> Onde vive o estado do Kubernetes?</p>
        <ul><li>a) Em um arquivo .tfstate no S3</li><li>b) No etcd do control plane</li><li>c) No repositório Git</li></ul>
        <p><b>3.</b> Qual ferramenta do ecossistema K8s equivale ao OPA/Sentinel do Terraform?</p>
        <ul><li>a) ArgoCD</li><li>b) Gatekeeper</li><li>c) Kustomize</li></ul>
        <p><b>4.</b> Workspaces do Terraform são equivalentes a namespaces do Kubernetes?</p>
        <ul><li>a) Sim, ambos isolam ambientes</li><li>b) Não — workspaces isolam state; namespaces isolam recursos no cluster</li><li>c) Sim, mas apenas no Terraform Cloud</li></ul>
        <p><b>5.</b> O que o Kustomize oferece no mundo Kubernetes similar ao Terragrunt no Terraform?</p>
        <ul><li>a) Provisionamento de infraestrutura</li><li>b) Composição DRY com overlays por ambiente</li><li>c) Locking de estado distribuído</li></ul>`,
      solucao: `Respostas corretas:
1. c) Ambos: Terraform para a infra, K8s para os workloads
2. b) No etcd do control plane
3. b) Gatekeeper
4. b) Não — workspaces isolam state; namespaces isolam recursos no cluster
5. b) Composição DRY com overlays por ambiente`,
      testes: [
        {
          descricao: 'O aluno respondeu ao quiz (verificação conceitual)',
          regras: [{ tipo: 'quiz-conceitual', modulo: 'comparacao' }],
        },
      ],
    },
  ],
};