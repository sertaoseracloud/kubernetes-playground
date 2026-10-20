// Módulo: Projeto prático de Microserviços em Kubernetes.
// Integra Deployment, Service, ConfigMap, Secret, Ingress e HPA num cenário realista.
import { comOcultos } from './util.js';


const modulo = {
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
      resumo: `
        <p class="etapa-info">🧩 <b>Projeto Microsserviços</b> · etapa 1 de 6. Cada etapa usa o que você aprendeu nos Fundamentos.</p>
        <p>O primeiro serviço da loja é a API (Node.js, porta 3000). Ela precisa de duas cópias e de um endereço interno fixo.</p>
        <ol>
          <li>Deployment <code>backend-api</code>: <code>replicas: 2</code>, label <code>app: backend-api</code>, container <code>api</code> com a imagem <code>node:18-alpine</code> e porta 3000.</li>
          <li>No container, <code>resources</code> com requests (<code>cpu: 100m</code>, <code>memory: 128Mi</code>) e limits (<code>cpu: 250m</code>, <code>memory: 256Mi</code>).</li>
          <li>Depois do <code>---</code>, o Service <code>backend-svc</code> do tipo <code>ClusterIP</code>, com selector <code>app: backend-api</code> e porta 3000 → 3000.</li>
        </ol>
        <p><b>No cluster:</b> os outros serviços passam a chamar a API por <code>http://backend-svc:3000</code>, sem saber o IP de nenhum Pod.</p>`,
      inicial: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
spec:
  replicas:              # TODO: 2
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
          # TODO: resources com requests (100m, 128Mi) e limits (250m, 256Mi)
---
# TODO: o Service backend-svc (ClusterIP, selector app: backend-api, porta 3000)
`,
      dica: [
        "Reveja os exercícios \"Deployment com Resource Limits\" e \"Service ClusterIP\": esta etapa junta os dois.",
        "O selector do Service usa a label do template do Deployment: app: backend-api.",
      ],
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
          dica: "Preencha as réplicas e confira se a label do selector é igual à do template.",
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'backend-api' }],
        },
        {
          descricao: 'O Deployment tem pelo menos 2 réplicas',
          dica: "No Deployment, replicas: 2.",
          regras: [{ tipo: 'deployment-replicas', deployment: 'backend-api', minimo: 2 }],
        },
        {
          descricao: 'O Service backend-svc é do tipo ClusterIP',
          dica: "Depois do ---, um Service backend-svc com type: ClusterIP.",
          regras: [{ tipo: 'service-tipo', service: 'backend-svc', serviceType: 'ClusterIP' }],
        },
        {
          descricao: 'O container tem resource limits definidos',
          dica: "No container api, resources com requests e limits.",
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
      resumo: `
        <p class="etapa-info">🧩 <b>Projeto Microsserviços</b> · etapa 2 de 6. Cada etapa usa o que você aprendeu nos Fundamentos.</p>
        <p>A API precisa saber onde está o banco e qual a senha. O endereço vai num ConfigMap; a senha, num Secret.</p>
        <ol>
          <li>ConfigMap <code>app-config</code> com <code>DATABASE_HOST: db-svc</code>, <code>DATABASE_PORT: "5432"</code> e <code>LOG_LEVEL: info</code>.</li>
          <li>Depois do <code>---</code>, o Secret <code>db-credentials</code> (<code>type: Opaque</code>).</li>
          <li>Em <code>data</code>, os valores em base64: <code>password: c2VuaGFzZWNyZXRhMTIz</code> e <code>username: YWRtaW4=</code>.</li>
        </ol>
        <p><b>No cluster:</b> a API lê as duas coisas como variáveis; trocar o banco é mudar o ConfigMap, trocar a senha é mudar o Secret.
        (Para gerar o base64 no seu computador: <code>echo -n admin | base64</code>.)</p>`,
      inicial: `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_HOST:         # TODO: db-svc
  DATABASE_PORT: "5432"
  LOG_LEVEL: info
---
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  # TODO: password: c2VuaGFzZWNyZXRhMTIz e username: YWRtaW4=
`,
      dica: [
        "Em data, o Secret espera base64; em stringData, aceitaria texto puro.",
        "data:\n  password: c2VuaGFzZWNyZXRhMTIz\n  username: YWRtaW4=",
      ],
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
          dica: "Mantenha metadata.name: app-config.",
          regras: [{ tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'app-config' }],
        },
        {
          descricao: 'O ConfigMap contém a chave DATABASE_HOST',
          dica: "Em data do ConfigMap, DATABASE_HOST: db-svc.",
          regras: [{ tipo: 'configmap-contem', configmap: 'app-config', chave: 'DATABASE_HOST' }],
        },
        {
          descricao: 'O Secret db-credentials existe',
          dica: "Mantenha o Secret com metadata.name: db-credentials.",
          regras: [{ tipo: 'recurso-existe', kind: 'Secret', nome: 'db-credentials' }],
        },
        {
          descricao: 'O Secret contém a chave password',
          dica: "Em data do Secret, password: c2VuaGFzZWNyZXRhMTIz.",
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
      resumo: `
        <p class="etapa-info">🧩 <b>Projeto Microsserviços</b> · etapa 3 de 6. Cada etapa usa o que você aprendeu nos Fundamentos.</p>
        <p>Um endereço só para a loja: o site em <code>/</code> e a API em <code>/api</code>.</p>
        <ol>
          <li>Ingress <code>app-ingress</code> com a annotation <code>nginx.ingress.kubernetes.io/rewrite-target: /</code>.</li>
          <li>Regra do host <code>app.local</code> com dois caminhos (<code>pathType: Prefix</code>).</li>
          <li><code>/api</code> vai para <code>backend-svc</code> na porta 3000.</li>
          <li><code>/</code> vai para <code>frontend-svc</code> na porta 80.</li>
        </ol>
        <p><b>No cluster:</b> o NGINX encaminha <code>app.local/api/produtos</code> para a API e qualquer outro caminho para o site.</p>`,
      inicial: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host:              # TODO: app.local
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name:    # TODO: backend-svc
                port:
                  number: 3000
          # TODO: o caminho / para o frontend-svc na porta 80
`,
      dica: [
        "Reveja o exercício \"Ingress com TLS e dois caminhos\" (Recursos Avançados).",
        "O segundo caminho é outro item de paths: copie o de /api e troque path, name e number.",
      ],
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
          dica: "Preencha os TODO: um campo vazio impede o apply.",
          regras: [{ tipo: 'recurso-existe', kind: 'Ingress', nome: 'app-ingress' }],
        },
        {
          descricao: 'O Ingress tem regra para o host app.local',
          dica: "Em rules, host: app.local.",
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
      resumo: `
        <p class="etapa-info">🧩 <b>Projeto Microsserviços</b> · etapa 4 de 6. Cada etapa usa o que você aprendeu nos Fundamentos.</p>
        <p>Em produção, a API precisa crescer sozinha nos horários de pico. O editor já tem o Deployment da etapa 1.</p>
        <ol>
          <li>Acima do Deployment, crie o HPA <code>backend-hpa</code> (<code>autoscaling/v2</code>) apontando para o Deployment <code>backend-api</code>.</li>
          <li><code>minReplicas: 2</code>, <code>maxReplicas: 8</code> e a métrica de CPU com <code>averageUtilization: 70</code>.</li>
          <li>No Deployment, aumente os limits para <code>cpu: 500m</code> e <code>memory: 512Mi</code> (folga para os picos).</li>
        </ol>
        <p><b>No cluster:</b> o HPA compara o uso de CPU com os 100m reservados; passou de 70%, ele aumenta as réplicas até 8.</p>`,
      inicial: `# TODO: o HPA backend-hpa (autoscaling/v2) para o Deployment backend-api: 2 a 8 réplicas, CPU a 70%
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
              cpu: 250m
              memory: 256Mi
`,
      dica: [
        "Reveja o exercício \"HPA configurado\" dos Fundamentos: o HPA tem a mesma forma.",
        "Nos limits do container: cpu: 500m e memory: 512Mi.",
      ],
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
          dica: "Crie o documento kind: HorizontalPodAutoscaler com metadata.name: backend-hpa.",
          regras: [{ tipo: 'recurso-existe', kind: 'HorizontalPodAutoscaler', nome: 'backend-hpa' }],
        },
        {
          descricao: 'O HPA está configurado para o Deployment backend-api',
          dica: "scaleTargetRef.name: backend-api, minReplicas: 2, maxReplicas: 8.",
          regras: [{ tipo: 'hpa-configurado', hpa: 'backend-hpa', target: 'backend-api', minReplicas: 2, maxReplicas: 8 }],
        },
        {
          descricao: 'O Deployment tem resource limits definidos',
          dica: "No container api, mantenha resources com requests e limits.",
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
      resumo: `
        <p class="etapa-info">🧩 <b>Projeto Microsserviços</b> · etapa 5 de 6. Cada etapa usa o que você aprendeu nos Fundamentos.</p>
        <p>O Service <code>backend-svc</code> já existe no cluster, e o cluster preencheu o <b>ClusterIP</b> dele (um valor calculado,
        como um <code>output</code> do Terraform). O frontend vai receber esse endereço numa variável.</p>
        <ol>
          <li>No terminal, rode <code>kubectl get svc backend-svc</code> e anote o <code>CLUSTER-IP</code>.</li>
          <li>Crie o Deployment <code>frontend-app</code> com 1 réplica, container <code>nginx</code> e a imagem <code>nginx:alpine</code>.</li>
          <li>Em <code>env</code>, a variável <code>BACKEND_URL</code> com o valor <code>"http://&lt;o IP anotado&gt;:3000"</code>.</li>
        </ol>
        <p><b>No cluster:</b> funciona, mas é frágil: se o Service for recriado, o IP muda. Por isso, no dia a dia, prefira o nome
        (<code>http://backend-svc:3000</code>), que o DNS interno resolve. Este exercício mostra de onde vêm os valores calculados.</p>`,
      inicial: `apiVersion: apps/v1
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
              value:     # TODO: "http://<CLUSTER-IP do backend-svc>:3000"
`,
      existentes: `apiVersion: v1
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
      dica: [
        "O IP aparece na coluna CLUSTER-IP de kubectl get svc backend-svc (e na aba 📦 Estado).",
        "O valor fica entre aspas, com http:// no começo e :3000 no fim.",
      ],
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
          dica: "Preencha o valor de BACKEND_URL: um valor vazio impede o apply.",
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'frontend-app' }],
        },
        {
          descricao: 'O container tem a variável de ambiente BACKEND_URL',
          dica: "Em env do container nginx, crie BACKEND_URL.",
          regras: [{ tipo: 'deployment-env', deployment: 'frontend-app', container: 'nginx', chave: 'BACKEND_URL' }],
        },
        {
          descricao: 'BACKEND_URL contém o ClusterIP do backend-svc na porta 3000',
          dica: "Use exatamente o CLUSTER-IP mostrado por kubectl get svc backend-svc, com :3000.",
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
      resumo: `
        <p class="etapa-info">🧩 <b>Projeto Microsserviços</b> · etapa 6 de 6. Cada etapa usa o que você aprendeu nos Fundamentos.</p>
        <p>Última etapa: o mesmo backend em dois ambientes, como o <code>kustomize build</code> geraria a partir de uma base e dois overlays.
        A base é o Deployment da etapa 1 com 1 réplica.</p>
        <ol>
          <li>Overlay dev: nome <code>backend-api-dev</code>, <code>replicas: 1</code>, label <code>env: dev</code> no metadata do Deployment e limit de CPU <code>250m</code>.</li>
          <li>Depois do <code>---</code>, overlay prod: nome <code>backend-api-prod</code>, <code>replicas: 4</code>, label <code>env: prod</code>.</li>
          <li>No prod, limits <code>cpu: 1000m</code> e <code>memory: 1Gi</code>.</li>
        </ol>
        <p><b>No cluster:</b> cada ambiente recebe só o seu resultado (<code>kubectl apply -k overlays/prod</code>). A base fica igual para todos.</p>`,
      inicial: `# Overlay dev
apiVersion: apps/v1
kind: Deployment
metadata:
  name:                  # TODO: backend-api-dev
  # TODO: labels com env: dev
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
# TODO: o overlay prod (backend-api-prod, 4 réplicas, env: prod, limits 1000m e 1Gi)
`,
      dica: [
        "Reveja o exercício \"Kustomize: base e overlays simulados\" (Recursos Avançados).",
        "Para o prod, copie o dev e mude o nome, as réplicas, a label env e os limits.",
      ],
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
          dica: "No primeiro Deployment: name: backend-api-dev e replicas: 1.",
          regras: [{ tipo: 'deployment-replicas', nome: 'backend-api-dev', replicas: 1 }],
        },
        {
          descricao: 'O Deployment backend-api-prod existe com 4 réplicas',
          dica: "Depois do ---, o Deployment backend-api-prod com replicas: 4.",
          regras: [{ tipo: 'deployment-replicas', nome: 'backend-api-prod', replicas: 4 }],
        },
        {
          descricao: 'O Deployment dev tem label env=dev',
          dica: "No metadata do Deployment dev: labels com env: dev.",
          regras: [{ tipo: 'recurso-label', kind: 'Deployment', nome: 'backend-api-dev', label: 'env', valor: 'dev' }],
        },
        {
          descricao: 'O Deployment prod tem label env=prod',
          dica: "No metadata do Deployment prod: labels com env: prod.",
          regras: [{ tipo: 'recurso-label', kind: 'Deployment', nome: 'backend-api-prod', label: 'env', valor: 'prod' }],
        },
      ],
    },
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'microsvc-backend-deploy': { dica: 'Releia os passos: algum valor pedido no Deployment backend-api ainda não confere.', regras: [{ tipo: 'campo', kind: 'Deployment', nome: 'backend-api', caminho: 'spec.template.spec.containers[name=api].image', valor: 'node:18-alpine' }, { tipo: 'campo', kind: 'Deployment', nome: 'backend-api', caminho: 'spec.selector.matchLabels.app', valor: 'backend-api' }] },
    'microsvc-config-secret': { dica: 'Releia os passos: algum valor pedido no Secret db-credentials ainda não confere.', regras: [{ tipo: 'campo', kind: 'Secret', nome: 'db-credentials', caminho: 'data.password', valor: 'c2VuaGFzZWNyZXRhMTIz' }, { tipo: 'campo', kind: 'Secret', nome: 'db-credentials', caminho: 'data.username', valor: 'YWRtaW4=' }] },
    'microsvc-ingress': { dica: 'Releia os passos: algum valor pedido no Ingress app-ingress ainda não confere.', regras: [{ tipo: 'campo', kind: 'Ingress', nome: 'app-ingress', caminho: 'spec.rules[0].http.paths[1].backend.service.name', valor: 'frontend-svc' }, { tipo: 'campo', kind: 'Ingress', nome: 'app-ingress', caminho: 'spec.rules[0].host', valor: 'app.local' }] },
    'microsvc-hpa': { dica: 'Releia os passos: algum valor pedido no Deployment backend-api ainda não confere.', regras: [{ tipo: 'campo', kind: 'Deployment', nome: 'backend-api', caminho: 'spec.template.spec.containers[name=api].image', valor: 'node:18-alpine' }, { tipo: 'campo', kind: 'HorizontalPodAutoscaler', nome: 'backend-hpa', caminho: 'spec.scaleTargetRef.name', valor: 'backend-api' }] },
    'microsvc-service-discovery': { dica: 'Releia os passos: algum valor pedido no Deployment frontend-app ainda não confere.', regras: [{ tipo: 'campo', kind: 'Deployment', nome: 'frontend-app', caminho: 'spec.selector.matchLabels.app', valor: 'frontend-app' }, { tipo: 'campo', kind: 'Deployment', nome: 'frontend-app', caminho: 'spec.template.spec.containers[name=nginx].image', valor: 'nginx:alpine' }] },
    'microsvc-kustomize-ambientes': { dica: 'Releia os passos: algum valor pedido no Deployment backend-api-dev ainda não confere.', regras: [{ tipo: 'campo', kind: 'Deployment', nome: 'backend-api-dev', caminho: 'spec.template.spec.containers[name=api].image', valor: 'node:18-alpine' }, { tipo: 'campo', kind: 'Deployment', nome: 'backend-api-prod', caminho: 'spec.template.spec.containers[name=api].image', valor: 'node:18-alpine' }] },
  },
};

export const projetoMicroservicos = { ...modulo, itens: comOcultos(modulo.itens, modulo.ocultos) };
