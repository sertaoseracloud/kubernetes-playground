// Cenários visuais da trilha: cada módulo tem um cenário que evolui conforme o aluno
// resolve exercícios. No Kubernetes, o cenário é um cluster visual com nós, pods e serviços.
// A renderização fica em src/ui/cenarios/; aqui só definimos os dados de cada estágio.

export const CENARIO_DO_MODULO = {
  fundamentos: {
    id: 'fundamentos',
    titulo: 'Cluster fundamental',
    estagios: [
      {
        feitos: 0,
        descricao: 'Cluster vazio: nenhum recurso criado ainda.',
        elementos: [],
      },
      {
        feitos: 3,
        descricao: 'Nó ativo com Pods e Services básicos rodando.',
        elementos: [
          { tipo: 'no', nome: 'node-1', status: 'Ready' },
          { tipo: 'pod', nome: 'nginx-demo', no: 'node-1', status: 'Running' },
          { tipo: 'service', nome: 'nginx-svc', alvo: 'nginx-demo' },
        ],
      },
      {
        feitos: 6,
        descricao: 'Deployments escaláveis com health checks ativos.',
        elementos: [
          { tipo: 'no', nome: 'node-1', status: 'Ready' },
          { tipo: 'pod', nome: 'app-web-1', no: 'node-1', status: 'Running' },
          { tipo: 'pod', nome: 'app-web-2', no: 'node-1', status: 'Running' },
          { tipo: 'service', nome: 'web-svc', alvo: 'app-web' },
          { tipo: 'hpa', nome: 'web-hpa', alvo: 'app-web' },
        ],
      },
    ],
  },
  avancados: {
    id: 'avancados',
    titulo: 'Recursos avançados',
    estagios: [
      {
        feitos: 0,
        descricao: 'Nenhum recurso avançado configurado.',
        elementos: [{ tipo: 'no', nome: 'node-1', status: 'Ready' }],
      },
      {
        feitos: 2,
        descricao: 'GitOps ativo com ArgoCD sincronizando deployments.',
        elementos: [
          { tipo: 'no', nome: 'node-1', status: 'Ready' },
          { tipo: 'pod', nome: 'argocd-app', no: 'node-1', status: 'Running' },
          { tipo: 'pod', nome: 'app-gitops', no: 'node-1', status: 'Running' },
        ],
      },
      {
        feitos: 4,
        descricao: 'CronJobs agendados e Secrets montados como volumes.',
        elementos: [
          { tipo: 'no', nome: 'node-1', status: 'Ready' },
          { tipo: 'pod', nome: 'cronjob-limpeza', no: 'node-1', status: 'Running' },
          { tipo: 'pod', nome: 'app-com-secret', no: 'node-1', status: 'Running' },
          { tipo: 'service', nome: 'app-svc', alvo: 'app-com-secret' },
        ],
      },
    ],
  },
  aws: {
    id: 'aws',
    titulo: 'Kubernetes na AWS',
    estagios: [
      {
        feitos: 0,
        descricao: 'Cluster EKS vazio, aguardando configuração.',
        elementos: [],
      },
      {
        feitos: 2,
        descricao: 'IRSA configurada e ALB Ingress roteando tráfego.',
        elementos: [
          { tipo: 'no', nome: 'eks-node-1', status: 'Ready' },
          { tipo: 'pod', nome: 'irsa-app', no: 'eks-node-1', status: 'Running' },
          { tipo: 'ingress', nome: 'alb-ingress', alvo: 'app-svc' },
        ],
      },
      {
        feitos: 4,
        descricao: 'Volumes EBS e EFS provisionados e montados nos Pods.',
        elementos: [
          { tipo: 'no', nome: 'eks-node-1', status: 'Ready' },
          { tipo: 'pod', nome: 'app-com-ebs', no: 'eks-node-1', status: 'Running' },
          { tipo: 'pod', nome: 'app-com-efs', no: 'eks-node-1', status: 'Running' },
          { tipo: 'service', nome: 'storage-svc', alvo: 'app-com-ebs' },
        ],
      },
    ],
  },
  azure: {
    id: 'azure',
    titulo: 'Kubernetes no Azure',
    estagios: [
      {
        feitos: 0,
        descricao: 'Cluster AKS vazio, aguardando recursos.',
        elementos: [],
      },
      {
        feitos: 2,
        descricao: 'Identidade gerenciada e AGIC roteando via Application Gateway.',
        elementos: [
          { tipo: 'no', nome: 'aks-nodepool-1', status: 'Ready' },
          { tipo: 'pod', nome: 'app-azure-id', no: 'aks-nodepool-1', status: 'Running' },
          { tipo: 'ingress', nome: 'agic-ingress', alvo: 'app-svc' },
        ],
      },
      {
        feitos: 4,
        descricao: 'Azure Disk e Azure Files provisionados e acessíveis.',
        elementos: [
          { tipo: 'no', nome: 'aks-nodepool-1', status: 'Ready' },
          { tipo: 'pod', nome: 'app-com-disco', no: 'aks-nodepool-1', status: 'Running' },
          { tipo: 'pod', nome: 'app-com-files', no: 'aks-nodepool-1', status: 'Running' },
          { tipo: 'service', nome: 'storage-svc', alvo: 'app-com-disco' },
        ],
      },
    ],
  },
  'projeto-microservicos': {
    id: 'projeto-microservicos',
    titulo: 'Microserviços em K8s',
    estagios: [
      {
        feitos: 0,
        descricao: 'Cluster vazio: arquitetura de microserviços ainda não implantada.',
        elementos: [],
      },
      {
        feitos: 2,
        descricao: 'Backend API rodando com Deployment, Service e ConfigMap.',
        elementos: [
          { tipo: 'no', nome: 'node-1', status: 'Ready' },
          { tipo: 'pod', nome: 'backend-api-1', no: 'node-1', status: 'Running' },
          { tipo: 'pod', nome: 'backend-api-2', no: 'node-1', status: 'Running' },
          { tipo: 'service', nome: 'backend-svc', alvo: 'backend-api' },
        ],
      },
      {
        feitos: 4,
        descricao: 'Ingress e HPA configurados, aplicação escalando sob carga.',
        elementos: [
          { tipo: 'no', nome: 'node-1', status: 'Ready' },
          { tipo: 'pod', nome: 'backend-api-1', no: 'node-1', status: 'Running' },
          { tipo: 'pod', nome: 'backend-api-2', no: 'node-1', status: 'Running' },
          { tipo: 'pod', nome: 'backend-api-3', no: 'node-1', status: 'Running' },
          { tipo: 'service', nome: 'backend-svc', alvo: 'backend-api' },
          { tipo: 'ingress', nome: 'app-ingress', alvo: 'backend-svc' },
          { tipo: 'hpa', nome: 'backend-hpa', alvo: 'backend-api' },
        ],
      },
    ],
  },
  comparacao: {
    id: 'comparacao',
    titulo: '⚖️ Terraform vs Kubernetes',
    estagios: [
      {
        feitos: 0,
        descricao: 'Dois mundos lado a lado: Terraform e Kubernetes ainda não conectados.',
        elementos: [],
      },
      {
        feitos: 1,
        descricao: 'Provider Abstraction Layer: Terraform provisiona infra, K8s orquestra containers.',
        elementos: [
          { tipo: 'no', nome: 'node-1', status: 'Ready' },
          { tipo: 'pod', nome: 'tf-provider-pod', no: 'node-1', status: 'Running' },
        ],
      },
      {
        feitos: 2,
        descricao: 'Multi-cloud orchestration com Crossplane e ArgoCD fazendo a ponte.',
        elementos: [
          { tipo: 'no', nome: 'node-1', status: 'Ready' },
          { tipo: 'pod', nome: 'tf-provider-pod', no: 'node-1', status: 'Running' },
          { tipo: 'pod', nome: 'crossplane-pod', no: 'node-1', status: 'Running' },
          { tipo: 'service', nome: 'bridge-svc', alvo: 'crossplane-pod' },
        ],
      },
      {
        feitos: 3,
        descricao: 'Policy-as-code ativo: Gatekeeper validando recursos na admissão.',
        elementos: [
          { tipo: 'no', nome: 'node-1', status: 'Ready' },
          { tipo: 'pod', nome: 'tf-provider-pod', no: 'node-1', status: 'Running' },
          { tipo: 'pod', nome: 'crossplane-pod', no: 'node-1', status: 'Running' },
          { tipo: 'pod', nome: 'gatekeeper-pod', no: 'node-1', status: 'Running' },
          { tipo: 'service', nome: 'bridge-svc', alvo: 'crossplane-pod' },
        ],
      },
    ],
  },
  'projeto-multicloud': {
    id: 'projeto-multicloud',
    titulo: 'Deploy Multi-Cloud',
    estagios: [
      {
        feitos: 0,
        descricao: 'Nenhum manifesto multi-cloud aplicado.',
        elementos: [],
      },
      {
        feitos: 2,
        descricao: 'Deployment genérico rodando com overlays Kustomize para AWS e Azure.',
        elementos: [
          { tipo: 'no', nome: 'node-1', status: 'Ready' },
          { tipo: 'pod', nome: 'app-web-1', no: 'node-1', status: 'Running' },
          { tipo: 'pod', nome: 'app-web-2', no: 'node-1', status: 'Running' },
          { tipo: 'service', nome: 'app-svc', alvo: 'app-web' },
        ],
      },
      {
        feitos: 4,
        descricao: 'Pipeline CI/CD multi-cluster ativo com agente de deploy.',
        elementos: [
          { tipo: 'no', nome: 'node-1', status: 'Ready' },
          { tipo: 'pod', nome: 'app-web-1', no: 'node-1', status: 'Running' },
          { tipo: 'pod', nome: 'app-web-2', no: 'node-1', status: 'Running' },
          { tipo: 'pod', nome: 'app-web-3', no: 'node-1', status: 'Running' },
          { tipo: 'service', nome: 'app-svc', alvo: 'app-web' },
          { tipo: 'pod', nome: 'deploy-agent', no: 'node-1', status: 'Running' },
        ],
      },
    ],
  },
};