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
      resumo: `
        <p class="etapa-info">🧩 <b>Projeto Multicloud</b> · etapa 1 de 3. O objetivo é o mesmo YAML rodar no EKS e no AKS.</p>
        <p>Um manifesto <b>genérico</b> não tem nada de uma nuvem só: nem annotations da AWS, nem da Azure, nem StorageClass com nome de provedor.</p>
        <ol>
          <li>Deployment <code>app-web</code> com <code>replicas: 3</code>, label <code>app: web</code> (também no metadata do Deployment) e o container <code>web</code> (<code>nginx:1.25</code>, porta 80).</li>
          <li>No container, requests (<code>100m</code>, <code>128Mi</code>) e limits (<code>250m</code>, <code>256Mi</code>).</li>
          <li>Depois do <code>---</code>, o Service <code>app-svc</code> do tipo <code>ClusterIP</code>, selector <code>app: web</code>, porta 80. Sem annotations.</li>
        </ol>
        <p><b>No cluster:</b> o mesmo arquivo roda igual no EKS, no AKS ou num kind no seu computador. O que muda por nuvem fica nos overlays (próxima etapa).</p>`,
      inicial: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-web
  labels:
    app: web
spec:
  replicas:              # TODO: 3
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
          # TODO: resources com requests (100m, 128Mi) e limits (250m, 256Mi)
---
# TODO: o Service app-svc (ClusterIP, selector app: web, porta 80), sem annotations
`,
      dica: [
        "É a mesma dupla Deployment + Service dos Fundamentos.",
        "Não acrescente annotations: o objetivo é o manifesto não depender de nenhuma nuvem.",
      ],
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
          dica: "Preencha as réplicas do Deployment app-web.",
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'app-web' }],
        },
        {
          descricao: 'O Deployment tem pelo menos 3 réplicas',
          dica: "No Deployment, replicas: 3.",
          regras: [{ tipo: 'deployment-replicas', deployment: 'app-web', minimo: 3 }],
        },
        {
          descricao: 'O Service app-svc existe',
          dica: "Depois do ---, o Service app-svc.",
          regras: [{ tipo: 'service-tipo', service: 'app-svc', serviceType: 'ClusterIP' }],
        },
        {
          descricao: 'O container tem resource limits definidos',
          dica: "No container web, resources com requests e limits.",
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
      resumo: `
        <p class="etapa-info">🧩 <b>Projeto Multicloud</b> · etapa 2 de 3. O objetivo é o mesmo YAML rodar no EKS e no AKS.</p>
        <p>O que muda por nuvem (região, classe de disco) fica num overlay por provedor. Aqui, um ConfigMap representa o que cada overlay gera.</p>
        <ol>
          <li>ConfigMap <code>overlay-aws</code>: <code>cloud: aws</code>, <code>region: us-east-1</code> e <code>storage-class: gp3</code>.</li>
          <li>Depois do <code>---</code>, ConfigMap <code>overlay-azure</code>: <code>cloud: azure</code>, <code>region: eastus</code> e <code>storage-class: managed-premium</code>.</li>
        </ol>
        <p><b>No cluster:</b> no EKS você aplicaria <code>overlays/aws</code>; no AKS, <code>overlays/azure</code>. A base genérica é a mesma.</p>`,
      inicial: `apiVersion: v1
kind: ConfigMap
metadata:
  name: overlay-aws
data:
  cloud:                 # TODO: aws
  region: us-east-1
  storage-class: gp3
---
# TODO: o ConfigMap overlay-azure (cloud: azure, region: eastus, storage-class: managed-premium)
`,
      dica: [
        "Copie o overlay-aws depois do --- e troque os valores.",
        "cloud: azure / region: eastus / storage-class: managed-premium",
      ],
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
          dica: "Mantenha metadata.name: overlay-aws.",
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'overlay-aws' }],
        },
        {
          descricao: 'O ConfigMap overlay-aws contém cloud=aws',
          dica: "Em data do overlay-aws, cloud: aws.",
          regras: [{ tipo: 'configmap-contem', configmap: 'overlay-aws', chave: 'cloud', valor: 'aws' }],
        },
        {
          descricao: 'O ConfigMap overlay-azure contém cloud=azure',
          dica: "Depois do ---, o ConfigMap overlay-azure com cloud: azure.",
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
      resumo: `
        <p class="etapa-info">🧩 <b>Projeto Multicloud</b> · etapa 3 de 3. O objetivo é o mesmo YAML rodar no EKS e no AKS.</p>
        <p>Um pipeline multi-cluster entrega a mesma versão para os dois clusters de produção, com uma estratégia de troca segura.
        Um ConfigMap guarda a configuração; um Deployment faz o papel do agente de deploy.</p>
        <ol>
          <li>ConfigMap <code>pipeline-config</code>: <code>clusters: "aws-prod,azure-prod"</code>, <code>strategy: blue-green</code> e <code>notify: slack</code>.</li>
          <li>Deployment <code>deploy-agent</code> com 1 réplica, container <code>agent</code> (<code>alpine:3.19</code>, comando <code>["sleep", "infinity"]</code>).</li>
          <li>No container, requests (<code>50m</code>, <code>64Mi</code>) e limits (<code>100m</code>, <code>128Mi</code>).</li>
        </ol>
        <p><b>No cluster:</b> num GitOps de verdade, o "agente" seria o Argo CD ou o Flux em cada cluster, lendo o mesmo repositório.</p>`,
      inicial: `apiVersion: v1
kind: ConfigMap
metadata:
  name: pipeline-config
data:
  clusters:              # TODO: "aws-prod,azure-prod" (com aspas)
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
          # TODO: resources com requests (50m, 64Mi) e limits (100m, 128Mi)
`,
      dica: [
        "A lista de clusters é um texto só, com vírgula: \"aws-prod,azure-prod\".",
        "resources:\n  requests: { cpu: 50m, memory: 64Mi }\n  limits: { cpu: 100m, memory: 128Mi }",
      ],
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
          dica: "Mantenha metadata.name: pipeline-config.",
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'pipeline-config' }],
        },
        {
          descricao: 'O ConfigMap contém a chave clusters',
          dica: "Em data, clusters: \"aws-prod,azure-prod\".",
          regras: [{ tipo: 'configmap-contem', configmap: 'pipeline-config', chave: 'clusters', valor: 'aws-prod,azure-prod' }],
        },
        {
          descricao: 'O Deployment deploy-agent existe',
          dica: "Mantenha o Deployment deploy-agent como no esqueleto.",
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'deploy-agent' }, { tipo: 'resource-limits', deployment: 'deploy-agent', container: 'agent' }],
        },
      ],
    },
  ],
};