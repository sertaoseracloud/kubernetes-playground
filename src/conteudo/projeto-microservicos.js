// Módulo: Projeto prático de Microserviços em Kubernetes.
// Integra Deployment, Service, ConfigMap, Secret, Ingress e HPA num cenário realista.

export const projetoMicroservicos = {
  id: 'projeto-microservicos',
  titulo: 'Projeto: Microserviços em K8s',
  descricao: 'Deploy completo de uma aplicação com frontend, API, banco e fila usando recursos nativos do Kubernetes.',
  icone: '🏗️',
  itens: [
    {
      id: 'microsvc-arquitetura',
      tipo: 'licao',
      titulo: 'Arquitetura do projeto',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>Neste projeto você vai montar uma arquitetura de microserviços completa no Kubernetes. Os componentes são:</p>
        <ul>
          <li><b>Frontend</b>: aplicação estática servida por Nginx, exposta via Ingress.</li>
          <li><b>Backend API</b>: serviço Node.js ou Python que processa requisições REST.</li>
          <li><b>Banco de dados</b>: PostgreSQL ou MySQL rodando como StatefulSet (ou gerenciado fora do cluster).</li>
          <li><b>Fila de mensagens</b>: RabbitMQ ou Redis para comunicação assíncrona entre serviços.</li>
          <li><b>Observabilidade</b>: métricas, logs e health checks para garantir confiabilidade.</li>
        </ul>
        <p>Cada exercício foca em um conjunto de recursos. Ao final, você terá um deploy funcional com escalabilidade automática e configuração externa.</p>`,
    },
    {
      id: 'microsvc-backend-deploy',
      tipo: 'exercicio',
      titulo: 'Deploy do backend com Deployment e Service',
      dificuldade: 'medio',
      xp: 20,
      resumo: `<p>Crie o Deployment <code>backend-api</code> com 2 réplicas da imagem <code>node:18-alpine</code> e um Service ClusterIP chamado <code>backend-svc</code>.</p>
        <p>O container deve expor a porta 3000 e ter limits de CPU e memória definidos.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
        - name: api
          image: node:18-alpine
          ports:
            - containerPort: 3000
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
  name: backend-svc
spec:
  type: ClusterIP
  selector:
    app: backend-api
  ports:
    - port: 3000
      targetPort: 3000`,
      testes: [
        {
          descricao: 'O Deployment backend-api existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'backend-api' }],
        },
        {
          descricao: 'O Deployment tem pelo menos 2 réplicas',
          regras: [{ tipo: 'deployment-replicas', deployment: 'backend-api', minimo: 2 }],
        },
        {
          descricao: 'O Service backend-svc é do tipo ClusterIP',
          regras: [{ tipo: 'service-tipo', service: 'backend-svc', serviceType: 'ClusterIP' }],
        },
        {
          descricao: 'O container tem resource limits definidos',
          regras: [{ tipo: 'resource-limits', pod: 'backend-api', container: 'api' }],
        },
      ],
    },
    {
      id: 'microsvc-config-secret',
      tipo: 'exercicio',
      titulo: 'ConfigMap e Secret para configuração',
      dificuldade: 'medio',
      xp: 20,
      resumo: `<p>Crie um ConfigMap <code>app-config</code> com a chave <code>DATABASE_HOST</code> apontando para <code>db-svc</code>, e um Secret <code>db-credentials</code> com a chave <code>password</code> contendo a senha do banco em base64.</p>`,
      solucao: `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_HOST: db-svc
  DATABASE_PORT: "5432"
  LOG_LEVEL: info
---
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  password: c2VuaGFzZWNyZXRhMTIz
  username: YWRtaW4=`,
      testes: [
        {
          descricao: 'O ConfigMap app-config existe',
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'app-config' }],
        },
        {
          descricao: 'O ConfigMap contém a chave DATABASE_HOST',
          regras: [{ tipo: 'configmap-contem', configmap: 'app-config', chave: 'DATABASE_HOST' }],
        },
        {
          descricao: 'O Secret db-credentials existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Secret', nome: 'db-credentials' }],
        },
        {
          descricao: 'O Secret contém a chave password',
          regras: [{ tipo: 'secret-contem', secret: 'db-credentials', chave: 'password' }],
        },
      ],
    },
    {
      id: 'microsvc-ingress',
      tipo: 'exercicio',
      titulo: 'Ingress expondo frontend e API',
      dificuldade: 'dificil',
      xp: 25,
      resumo: `<p>Crie um Ingress <code>app-ingress</code> que roteie o host <code>app.local</code> para o Service <code>frontend-svc</code> na raiz (<code>/</code>) e para o Service <code>backend-svc</code> no path <code>/api</code>.</p>`,
      solucao: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: app.local
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend-svc
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-svc
                port:
                  number: 80`,
      testes: [
        {
          descricao: 'O Ingress app-ingress existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Ingress', nome: 'app-ingress' }],
        },
        {
          descricao: 'O Ingress tem regra para o host app.local',
          regras: [{ tipo: 'ingress-existe', ingress: 'app-ingress', host: 'app.local' }],
        },
      ],
    },
    {
      id: 'microsvc-hpa',
      tipo: 'exercicio',
      titulo: 'HPA e recursos para produção',
      dificuldade: 'dificil',
      xp: 25,
      resumo: `<p>Crie um HorizontalPodAutoscaler <code>backend-hpa</code> para o Deployment <code>backend-api</code> com mínimo de 2 e máximo de 8 réplicas, escalando quando a CPU média passar de 70%.</p>
        <p>Garanta que o Deployment tenha limits adequados para que o HPA funcione corretamente.</p>`,
      solucao: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-api
  minReplicas: 2
  maxReplicas: 8
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
        - name: api
          image: node:18-alpine
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi`,
      testes: [
        {
          descricao: 'O HPA backend-hpa existe',
          regras: [{ tipo: 'recurso-existe', kind: 'HorizontalPodAutoscaler', nome: 'backend-hpa' }],
        },
        {
          descricao: 'O HPA está configurado para o Deployment backend-api',
          regras: [{ tipo: 'hpa-configurado', hpa: 'backend-hpa', target: 'backend-api', minReplicas: 2, maxReplicas: 8 }],
        },
        {
          descricao: 'O Deployment tem resource limits definidos',
          regras: [{ tipo: 'resource-limits', pod: 'backend-api', container: 'api' }],
        },
      ],
    },
    {
      id: 'microsvc-service-discovery',
      tipo: 'exercicio',
      titulo: 'Service Discovery via ClusterIP em variável de ambiente',
      dificuldade: 'medio',
      xp: 20,
      resumo: `<p>O Service <code>backend-svc</code> já existe no cluster (criado na etapa anterior). O simulador gerou um <b>ClusterIP</b> determinístico para ele — esse é um atributo calculado, equivalente a um <code>output</code> do Terraform.</p>
        <p>Crie um Deployment chamado <code>frontend-app</code> com 1 réplica da imagem <code>nginx:alpine</code>. O container deve ter uma variável de ambiente <code>BACKEND_URL</code> cujo valor seja o ClusterIP do Service <code>backend-svc</code> seguido da porta 3000 (formato: <code>http://&lt;clusterIP&gt;:3000</code>).</p>
        <p><b>Dica:</b> use <code>kubectl get svc backend-svc -o jsonpath='{.spec.clusterIP}'</code> no simulador para descobrir o IP, ou consulte o estado do cluster via <code>obterEstado()</code>. No mundo real, o DNS interno resolveria <code>backend-svc</code>, mas este exercício ensina como outputs de um recurso alimentam a configuração de outro.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend-app
  template:
    metadata:
      labels:
        app: frontend-app
    spec:
      containers:
        - name: nginx
          image: nginx:alpine
          env:
            - name: BACKEND_URL
              value: "http://10.96.82.130:3000"`,
      testes: [
        {
          descricao: 'O Deployment frontend-app existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'frontend-app' }],
        },
        {
          descricao: 'O container tem a variável de ambiente BACKEND_URL',
          regras: [{ tipo: 'deployment-env', deployment: 'frontend-app', container: 'nginx', chave: 'BACKEND_URL' }],
        },
        {
          descricao: 'BACKEND_URL contém o ClusterIP do backend-svc na porta 3000',
          regras: [{ tipo: 'deployment-env-contem', deployment: 'frontend-app', container: 'nginx', chave: 'BACKEND_URL', valor: ':3000' }],
        },
      ],
    },
    {
      id: 'microsvc-kustomize-ambientes',
      tipo: 'exercicio',
      titulo: 'Kustomize: base e overlays para dev e prod',
      dificuldade: 'dificil',
      xp: 30,
      resumo: `<p>Nesta etapa final do projeto, você vai usar o padrão <b>base/overlay</b> do Kustomize para configurar dois ambientes da mesma aplicação sem duplicar YAML.</p>
        <p><b>Base (referência — representa base/deployment.yaml):</b></p>
        <pre># apiVersion: apps/v1
# kind: Deployment
# metadata:
#   name: backend-api
# spec:
#   replicas: 1
#   selector:
#     matchLabels:
#       app: backend-api
#   template:
#     metadata:
#       labels:
#         app: backend-api
#     spec:
#       containers:
#         - name: api
#           image: node:18-alpine
#           ports:
#             - containerPort: 3000
#           resources:
#             requests:
#               cpu: 100m
#               memory: 128Mi
#             limits:
#               cpu: 250m
#               memory: 256Mi</pre>
        <p><b>Sua tarefa:</b> escreva o YAML final renderizado por <code>kustomize build</code> para dois overlays:</p>
        <ul>
          <li><b>Overlay dev</b>: nome <code>backend-api-dev</code>, 1 réplica, label <code>env: dev</code> no metadata, limite de CPU <code>250m</code>.</li>
          <li><b>Overlay prod</b>: nome <code>backend-api-prod</code>, 4 réplicas, label <code>env: prod</code> no metadata, limite de CPU <code>1000m</code> e memória <code>1Gi</code>.</li>
        </ul>
        <p>Escreva ambos os Deployments separados por <code>---</code>. Isso simula o output do Kustomize para cada ambiente.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api-dev
  labels:
    env: dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
        - name: api
          image: node:18-alpine
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api-prod
  labels:
    env: prod
spec:
  replicas: 4
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
        - name: api
          image: node:18-alpine
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 1000m
              memory: 1Gi`,
      testes: [
        {
          descricao: 'O Deployment backend-api-dev existe com 1 réplica',
          regras: [{ tipo: 'deployment-replicas', nome: 'backend-api-dev', replicas: 1 }],
        },
        {
          descricao: 'O Deployment backend-api-prod existe com 4 réplicas',
          regras: [{ tipo: 'deployment-replicas', nome: 'backend-api-prod', replicas: 4 }],
        },
        {
          descricao: 'O Deployment dev tem label env=dev',
          regras: [{ tipo: 'recurso-label', kind: 'Deployment', nome: 'backend-api-dev', label: 'env', valor: 'dev' }],
        },
        {
          descricao: 'O Deployment prod tem label env=prod',
          regras: [{ tipo: 'recurso-label', kind: 'Deployment', nome: 'backend-api-prod', label: 'env', valor: 'prod' }],
        },
      ],
    },
  ],
};