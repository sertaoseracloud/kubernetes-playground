// Módulo: Projeto prático de Deploy Multi-Cloud com Kubernetes.
// Foca em abstrações cloud-agnostic, Kustomize overlays e pipelines multi-cluster.

export const projetoMulticloud = {
  id: 'projeto-multicloud',
  titulo: 'Projeto: Deploy Multi-Cloud',
  descricao: 'Manifestos genéricos e overlays para AWS e Azure, evitando vendor lock-in com Kustomize.',
  icone: '☁️',
  itens: [
    {
      id: 'multicloud-abstracoes',
      tipo: 'licao',
      titulo: 'Abstrações cloud-agnostic',
      dificuldade: 'dificil',
      xp: 5,
      resumo: `<p>Para evitar <b>vendor lock-in</b>, escreva manifestos que funcionem em qualquer cluster Kubernetes, sem anotações específicas de AWS ou Azure.</p>
        <p>A estratégia é separar o que é genérico do que é específico da cloud:</p>
        <ul>
          <li><b>Base manifests</b>: Deployment, Service, ConfigMap sem nenhuma referência a provedor.</li>
          <li><b>Kustomize overlays</b>: patches que adicionam anotações, labels ou configurações específicas por ambiente (AWS, Azure, GCP).</li>
          <li><b>CI/CD multi-cluster</b>: pipeline que aplica o overlay correto no cluster de destino.</li>
        </ul>
        <p>Essa abordagem permite migrar entre clouds sem reescrever YAMLs — apenas trocando o overlay.</p>`,
    },
    {
      id: 'multicloud-manifestos-genericos',
      tipo: 'exercicio',
      titulo: 'Manifestos genéricos sem anotações cloud-specific',
      dificuldade: 'dificil',
      xp: 25,
      resumo: `<p>Crie um Deployment <code>app-web</code> com 3 réplicas e um Service <code>app-svc</code> sem nenhuma anotação específica de AWS ou Azure.</p>
        <p>O container deve ter resource limits definidos para funcionar em qualquer cluster.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-web
  labels:
    app: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: app-svc
spec:
  type: ClusterIP
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80`,
      testes: [
        {
          descricao: 'O Deployment app-web existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'app-web' }],
        },
        {
          descricao: 'O Deployment tem pelo menos 3 réplicas',
          regras: [{ tipo: 'deployment-replicas', deployment: 'app-web', minimo: 3 }],
        },
        {
          descricao: 'O Service app-svc existe',
          regras: [{ tipo: 'service-tipo', service: 'app-svc', tipo: 'ClusterIP' }],
        },
        {
          descricao: 'O container tem resource limits definidos',
          regras: [{ tipo: 'resource-limits', pod: 'app-web', container: 'web' }],
        },
      ],
    },
    {
      id: 'multicloud-kustomize-overlays',
      tipo: 'exercicio',
      titulo: 'Kustomize overlays para AWS e Azure',
      dificuldade: 'dificil',
      xp: 30,
      resumo: `<p>Simule overlays do Kustomize criando dois ConfigMaps: <code>overlay-aws</code> com a chave <code>cloud=aws</code> e <code>overlay-azure</code> com a chave <code>cloud=azure</code>.</p>
        <p>Em um projeto real, esses ConfigMaps seriam gerados pelo Kustomize ao aplicar patches específicos por cloud.</p>`,
      solucao: `apiVersion: v1
kind: ConfigMap
metadata:
  name: overlay-aws
data:
  cloud: aws
  region: us-east-1
  storage-class: gp3
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: overlay-azure
data:
  cloud: azure
  region: eastus
  storage-class: managed-premium`,
      testes: [
        {
          descricao: 'O ConfigMap overlay-aws existe',
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'overlay-aws' }],
        },
        {
          descricao: 'O ConfigMap overlay-aws contém cloud=aws',
          regras: [{ tipo: 'configmap-contem', configmap: 'overlay-aws', chave: 'cloud', valor: 'aws' }],
        },
        {
          descricao: 'O ConfigMap overlay-azure contém cloud=azure',
          regras: [{ tipo: 'configmap-contem', configmap: 'overlay-azure', chave: 'cloud', valor: 'azure' }],
        },
      ],
    },
    {
      id: 'multicloud-pipeline-cicd',
      tipo: 'exercicio',
      titulo: 'Pipeline CI/CD multi-cluster',
      dificuldade: 'dificil',
      xp: 30,
      resumo: `<p>Crie um ConfigMap <code>pipeline-config</code> representando a configuração do pipeline CI/CD e um Deployment <code>deploy-agent</code> que simula o agente de deploy.</p>
        <p>O ConfigMap deve conter as chaves <code>clusters</code> e <code>strategy</code>. O Deployment deve ter 1 réplica com resource limits.</p>`,
      solucao: `apiVersion: v1
kind: ConfigMap
metadata:
  name: pipeline-config
data:
  clusters: "aws-prod,azure-prod"
  strategy: blue-green
  notify: slack
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deploy-agent
spec:
  replicas: 1
  selector:
    matchLabels:
      app: deploy-agent
  template:
    metadata:
      labels:
        app: deploy-agent
    spec:
      containers:
        - name: agent
          image: alpine:3.19
          command: ["sleep", "infinity"]
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi`,
      testes: [
        {
          descricao: 'O ConfigMap pipeline-config existe',
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'pipeline-config' }],
        },
        {
          descricao: 'O ConfigMap contém a chave clusters',
          regras: [{ tipo: 'configmap-contem', configmap: 'pipeline-config', chave: 'clusters' }],
        },
        {
          descricao: 'O Deployment deploy-agent existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'deploy-agent' }],
        },
      ],
    },
  ],
};