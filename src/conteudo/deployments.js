// Módulo 4: Deployments e Escalabilidade.
// Lições e exercícios sobre Deployments, ReplicaSets, rolling updates e HPA.

export const deployments = {
  id: 'deployments',
  titulo: 'Deployments e Escalabilidade',
  descricao: 'Gerenciando aplicações em produção com Deployments, rolling updates e auto-scaling.',
  icone: '🚀',
  itens: [
    {
      id: 'deploy-replicasets',
      tipo: 'licao',
      titulo: 'Deployments e ReplicaSets',
      dificuldade: 'facil',
      xp: 5,
      resumo: `<p>Um <b>Deployment</b> é o controlador de alto nível para gerenciar aplicações stateless. Ele cria e supervisiona <b>ReplicaSets</b>, que por sua vez garantem que o número certo de pods esteja sempre rodando.</p>
        <p>Fluxo: <code>Deployment → ReplicaSet → Pods</code></p>
        <p>Campos essenciais:</p>
        <ul>
          <li><code>replicas</code>: quantas cópias do pod manter.</li>
          <li><code>selector.matchLabels</code>: como o Deployment encontra seus ReplicaSets.</li>
          <li><code>template.metadata.labels</code>: labels aplicadas aos pods criados. Devem bater com o selector.</li>
          <li><code>template.spec.containers</code>: especificação dos containers (igual à de um Pod).</li>
        </ul>
        <p>Quando você atualiza o template do Deployment, ele cria um <b>novo ReplicaSet</b> e escala o antigo para zero — isso é o rolling update.</p>`,
    },
    {
      id: 'deploy-rolling-update',
      tipo: 'licao',
      titulo: 'Rolling Update e Rollback',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>A estratégia <b>RollingUpdate</b> substitui pods antigos gradualmente, sem downtime. Dois parâmetros controlam o ritmo:</p>
        <dl>
          <dt><code>maxSurge</code></dt><dd>Quantos pods extras podem ser criados acima do desejado durante a atualização (ex: 25% ou 1).</dd>
          <dt><code>maxUnavailable</code></dt><dd>Quantos pods podem ficar indisponíveis abaixo do desejado (ex: 25% ou 0 para zero-downtime).</dd>
        </dl>
        <p>Exemplo de configuração:</p>
        <pre><code>strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0</code></pre>
        <p><b>Rollback</b>: se algo der errado, <code>kubectl rollout undo deployment/nome</code> reverte para a versão anterior. O Kubernetes mantém histórico de ReplicaSets antigos justamente para permitir isso.</p>
        <p>Outras estratégias: <code>Recreate</code> mata todos os pods antigos antes de criar novos (causa downtime, mas útil quando duas versões não podem coexistir).</p>`,
    },
    {
      id: 'deploy-hpa-limits',
      tipo: 'licao',
      titulo: 'HPA e Resource Limits',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O <b>HorizontalPodAutoscaler (HPA)</b> ajusta automaticamente o número de réplicas baseado em métricas como CPU ou memória.</p>
        <p>Para o HPA funcionar, os containers precisam definir <b>resource requests</b>:</p>
        <ul>
          <li><code>requests</code>: mínimo garantido. O scheduler usa isso para decidir onde colocar o pod.</li>
          <li><code>limits</code>: máximo permitido. Se o container ultrapassar, pode ser limitado (CPU) ou morto (memória/OOMKilled).</li>
        </ul>
        <p>Exemplo de recursos:</p>
        <pre><code>resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "250m"
    memory: "256Mi"</code></pre>
        <p>O HPA compara o uso atual com os requests para calcular a escala. Sem requests definidos, o HPA não consegue tomar decisões.</p>
        <p>Além de CPU/memória, o HPA pode usar métricas customizadas via Metrics API (ex: filas de mensagens, requests por segundo).</p>`,
    },
    {
      id: 'deploy-3-replicas',
      tipo: 'exercicio',
      titulo: 'Deployment com 3 réplicas',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Deployment chamado <code>web-deploy</code> com:</p>
        <ul>
          <li>3 réplicas.</li>
          <li>Imagem <code>nginx:1.25</code>.</li>
          <li>Resource limits: CPU <code>250m</code>, memória <code>256Mi</code>.</li>
          <li>Label <code>app: web</code> nos pods.</li>
        </ul>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-deploy
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
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            limits:
              cpu: "250m"
              memory: "256Mi"`,
      testes: [
        {
          descricao: 'O Deployment web-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'web-deploy' }],
        },
        {
          descricao: 'O Deployment tem 3 réplicas',
          regras: [{ tipo: 'deployment-replicas', deployment: 'web-deploy', replicas: 3 }],
        },
        {
          descricao: 'Os containers têm resource limits definidos',
          regras: [{ tipo: 'resource-limits', deployment: 'web-deploy', container: 'nginx' }],
        },
      ],
    },
    {
      id: 'deploy-hpa-exercicio',
      tipo: 'exercicio',
      titulo: 'HPA configurado',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie um HorizontalPodAutoscaler chamado <code>web-hpa</code> para o Deployment <code>web-deploy</code> com:</p>
        <ul>
          <li>Mínimo de 2 réplicas, máximo de 10.</li>
          <li>Target de CPU: 70%.</li>
        </ul>
        <p>Use a API <code>autoscaling/v2</code>.</p>`,
      solucao: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-deploy
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70`,
      testes: [
        {
          descricao: 'O HPA web-hpa existe',
          regras: [{ tipo: 'recurso-existe', kind: 'HorizontalPodAutoscaler', nome: 'web-hpa' }],
        },
        {
          descricao: 'O HPA está configurado com min/max/target corretos',
          regras: [{ tipo: 'hpa-configurado', hpa: 'web-hpa', min: 2, max: 10, target: 70 }],
        },
      ],
    },
    {
      id: 'deploy-rolling-strategy',
      tipo: 'exercicio',
      titulo: 'Rolling Update Strategy Personalizada',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Deployment chamado <code>rolling-deploy</code> com 3 réplicas, imagem <code>nginx:1.25</code>, label <code>app: rolling</code> e estratégia de update personalizada:</p>
        <ul>
          <li><code>maxSurge: 1</code></li>
          <li><code>maxUnavailable: 0</code> (zero downtime).</li>
        </ul>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: rolling-deploy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rolling
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: rolling
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        {
          descricao: 'O Deployment rolling-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'rolling-deploy' }],
        },
        {
          descricao: 'O Deployment tem 3 réplicas',
          regras: [{ tipo: 'deployment-replicas', deployment: 'rolling-deploy', replicas: 3 }],
        },
      ],
    },
    {
      id: 'deploy-recreate-strategy',
      tipo: 'exercicio',
      titulo: 'Recreate Strategy',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Deployment chamado <code>recreate-deploy</code> com 2 réplicas, imagem <code>nginx:1.25</code>, label <code>app: recreate</code> e estratégia <code>Recreate</code>.</p>
        <p>A estratégia Recreate mata todos os pods antigos antes de criar novos — causa downtime, mas garante que duas versões nunca coexistam.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: recreate-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: recreate
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: recreate
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        {
          descricao: 'O Deployment recreate-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'recreate-deploy' }],
        },
        {
          descricao: 'O Deployment tem 2 réplicas',
          regras: [{ tipo: 'deployment-replicas', deployment: 'recreate-deploy', replicas: 2 }],
        },
      ],
    },
    {
      id: 'deploy-rollback',
      tipo: 'exercicio',
      titulo: 'Deployment com Revision History',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Deployment chamado <code>history-deploy</code> com 2 réplicas, imagem <code>nginx:1.25</code>, label <code>app: history</code> e <code>revisionHistoryLimit: 5</code> para manter histórico de rollback.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: history-deploy
spec:
  replicas: 2
  revisionHistoryLimit: 5
  selector:
    matchLabels:
      app: history
  template:
    metadata:
      labels:
        app: history
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        {
          descricao: 'O Deployment history-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'history-deploy' }],
        },
        {
          descricao: 'O Deployment tem 2 réplicas',
          regras: [{ tipo: 'deployment-replicas', deployment: 'history-deploy', replicas: 2 }],
        },
      ],
    },
    {
      id: 'deploy-canary',
      tipo: 'exercicio',
      titulo: 'Canary Deployment',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Simule um canary deployment criando dois Deployments:</p>
        <ul>
          <li><code>stable-deploy</code>: 3 réplicas, imagem <code>nginx:1.24</code>, label <code>app: web</code> e <code>track: stable</code>.</li>
          <li><code>canary-deploy</code>: 1 réplica, imagem <code>nginx:1.25</code>, label <code>app: web</code> e <code>track: canary</code>.</li>
        </ul>
        <p>Ambos compartilham a label <code>app: web</code> para receber tráfego do mesmo Service.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: stable-deploy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
      track: stable
  template:
    metadata:
      labels:
        app: web
        track: stable
    spec:
      containers:
        - name: nginx
          image: nginx:1.24
          ports:
            - containerPort: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: canary-deploy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
      track: canary
  template:
    metadata:
      labels:
        app: web
        track: canary
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        {
          descricao: 'O Deployment stable-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'stable-deploy' }],
        },
        {
          descricao: 'O Deployment canary-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'canary-deploy' }],
        },
        {
          descricao: 'O canary-deploy tem 1 réplica',
          regras: [{ tipo: 'deployment-replicas', deployment: 'canary-deploy', replicas: 1 }],
        },
      ],
    },
    {
      id: 'deploy-blue-green',
      tipo: 'exercicio',
      titulo: 'Blue-Green Deployment',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Simule blue-green deployment criando dois Deployments:</p>
        <ul>
          <li><code>blue-deploy</code>: 2 réplicas, imagem <code>nginx:1.24</code>, label <code>app: web</code> e <code>color: blue</code>.</li>
          <li><code>green-deploy</code>: 2 réplicas, imagem <code>nginx:1.25</code>, label <code>app: web</code> e <code>color: green</code>.</li>
        </ul>
        <p>O switch entre blue/green é feito atualizando o selector do Service.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: blue-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
      color: blue
  template:
    metadata:
      labels:
        app: web
        color: blue
    spec:
      containers:
        - name: nginx
          image: nginx:1.24
          ports:
            - containerPort: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: green-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
      color: green
  template:
    metadata:
      labels:
        app: web
        color: green
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        {
          descricao: 'O Deployment blue-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'blue-deploy' }],
        },
        {
          descricao: 'O Deployment green-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'green-deploy' }],
        },
        {
          descricao: 'O green-deploy tem 2 réplicas',
          regras: [{ tipo: 'deployment-replicas', deployment: 'green-deploy', replicas: 2 }],
        },
      ],
    },
    {
      id: 'deploy-pdb',
      tipo: 'exercicio',
      titulo: 'Pod Disruption Budget',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie um Deployment chamado <code>pdb-deploy</code> com 3 réplicas, imagem <code>nginx:1.25</code>, label <code>app: protected</code>.</p>
        <p>Depois crie um PodDisruptionBudget chamado <code>pdb-budget</code> que garanta no mínimo 2 pods disponíveis (<code>minAvailable: 2</code>) para pods com label <code>app: protected</code>.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: pdb-deploy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: protected
  template:
    metadata:
      labels:
        app: protected
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: pdb-budget
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: protected`,
      testes: [
        {
          descricao: 'O Deployment pdb-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'pdb-deploy' }],
        },
        {
          descricao: 'O Deployment tem 3 réplicas',
          regras: [{ tipo: 'deployment-replicas', deployment: 'pdb-deploy', replicas: 3 }],
        },
        {
          descricao: 'O PDB pdb-budget existe',
          regras: [{ tipo: 'recurso-existe', kind: 'PodDisruptionBudget', nome: 'pdb-budget' }],
        },
      ],
    },
    {
      id: 'deploy-topology-spread',
      tipo: 'exercicio',
      titulo: 'Topology Spread Constraints',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie um Deployment chamado <code>spread-deploy</code> com 4 réplicas, imagem <code>nginx:1.25</code>, label <code>app: spread</code>.</p>
        <p>Configure <code>topologySpreadConstraints</code> para distribuir pods uniformemente entre zonas (<code>topologyKey: topology.kubernetes.io/zone</code>, <code>maxSkew: 1</code>, <code>whenUnsatisfiable: DoNotSchedule</code>).</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: spread-deploy
spec:
  replicas: 4
  selector:
    matchLabels:
      app: spread
  template:
    metadata:
      labels:
        app: spread
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: spread
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        {
          descricao: 'O Deployment spread-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'spread-deploy' }],
        },
        {
          descricao: 'O Deployment tem 4 réplicas',
          regras: [{ tipo: 'deployment-replicas', deployment: 'spread-deploy', replicas: 4 }],
        },
      ],
    },
    {
      id: 'deploy-priority-class',
      tipo: 'exercicio',
      titulo: 'PriorityClass e Pods Prioritários',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie uma PriorityClass chamada <code>high-priority</code> com valor <code>1000000</code> e <code>globalDefault: false</code>.</p>
        <p>Depois crie um Deployment chamado <code>priority-deploy</code> com 2 réplicas, imagem <code>nginx:1.25</code>, label <code>app: priority</code> e <code>priorityClassName: high-priority</code>.</p>`,
      solucao: `apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: priority-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: priority
  template:
    metadata:
      labels:
        app: priority
    spec:
      priorityClassName: high-priority
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        {
          descricao: 'A PriorityClass high-priority existe',
          regras: [{ tipo: 'recurso-existe', kind: 'PriorityClass', nome: 'high-priority' }],
        },
        {
          descricao: 'O Deployment priority-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'priority-deploy' }],
        },
        {
          descricao: 'O Deployment tem 2 réplicas',
          regras: [{ tipo: 'deployment-replicas', deployment: 'priority-deploy', replicas: 2 }],
        },
      ],
    },
    {
      id: 'deploy-daemonset',
      tipo: 'exercicio',
      titulo: 'DaemonSet Básico',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um DaemonSet chamado <code>monitor-ds</code> com imagem <code>busybox:1.36</code> e label <code>app: monitor</code>.</p>
        <p>O container deve rodar o comando <code>sleep 3600</code>. DaemonSets garantem que exatamente um pod rode em cada nó do cluster.</p>`,
      solucao: `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitor-ds
spec:
  selector:
    matchLabels:
      app: monitor
  template:
    metadata:
      labels:
        app: monitor
    spec:
      containers:
        - name: monitor
          image: busybox:1.36
          command: ['sh', '-c', 'sleep 3600']`,
      testes: [
        {
          descricao: 'O DaemonSet monitor-ds existe',
          regras: [{ tipo: 'recurso-existe', kind: 'DaemonSet', nome: 'monitor-ds' }],
        },
        {
          descricao: 'O container usa a imagem busybox:1.36',
          regras: [{ tipo: 'container-imagem', pod: 'monitor-ds', container: 'monitor', imagem: 'busybox:1.36' }],
        },
      ],
    },
    {
      id: 'deploy-datasource-configmap',
      tipo: 'exercicio',
      titulo: 'Deployment com ConfigMap existente como Volume',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>No cluster já existe um ConfigMap chamado <code>app-settings</code> com as chaves <code>config.yaml</code> e <code>log-level</code>.</p>
        <p>Crie um Deployment chamado <code>app-deploy</code> com 2 réplicas, imagem <code>nginx:1.25</code>, label <code>app: myapp</code>, que monte o ConfigMap <code>app-settings</code> como volume no caminho <code>/etc/config</code>.</p>
        <p>Assim como no Terraform usamos <code>data "kubernetes_config_map"</code> para ler configurações existentes antes de criar recursos, no Kubernetes você consulta o ConfigMap (<code>kubectl get configmap app-settings -o yaml</code>) para saber quais chaves estão disponíveis antes de referenciá-lo.</p>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          volumeMounts:
            - name: config-volume
              mountPath: /etc/config
      volumes:
        - name: config-volume
          configMap:
            name: app-settings`,
      testes: [
        {
          descricao: 'O Deployment app-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'app-deploy' }],
        },
        {
          descricao: 'O Deployment tem 2 réplicas',
          regras: [{ tipo: 'deployment-replicas', deployment: 'app-deploy', replicas: 2 }],
        },
        {
          descricao: 'O volume config-volume está montado no container nginx',
          regras: [{ tipo: 'volume-montado', pod: 'app-deploy', container: 'nginx', volume: 'config-volume' }],
        },
      ],
    },
    {
      id: 'deploy-resource-limits',
      tipo: 'exercicio',
      titulo: 'Deployment com Resource Limits',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Deployment chamado <code>limited-deploy</code> com 2 réplicas, imagem <code>nginx:1.25</code>, label <code>app: limited</code> e resource limits definidos:</p>
        <ul>
          <li>CPU limit: <code>500m</code>, memória limit: <code>512Mi</code>.</li>
          <li>CPU request: <code>250m</code>, memória request: <code>256Mi</code>.</li>
        </ul>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: limited-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: limited
  template:
    metadata:
      labels:
        app: limited
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"`,
      testes: [
        {
          descricao: 'O Deployment limited-deploy existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Deployment', nome: 'limited-deploy' }],
        },
        {
          descricao: 'O Deployment tem 2 réplicas',
          regras: [{ tipo: 'deployment-replicas', deployment: 'limited-deploy', replicas: 2 }],
        },
        {
          descricao: 'Os containers têm resource limits definidos',
          regras: [{ tipo: 'resource-limits', deployment: 'limited-deploy', container: 'nginx' }],
        },
      ],
    },
  ],
};