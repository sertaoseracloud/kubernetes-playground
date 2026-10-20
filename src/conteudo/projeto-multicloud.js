// Módulo: Projeto prático de Deploy Multi-Cloud com Kubernetes.
// Foca em abstrações cloud-agnostic, Kustomize overlays e pipelines multi-cluster.
import { exercicio, teste, existe, campo, comOcultos } from './util.js';

/** A base genérica da etapa 1 (já no cluster nas etapas da entrada). */
const BASE_GENERICA = `
  apiVersion: apps/v1
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
        targetPort: 80
`;

const modulo = {
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
        <p>Essa abordagem permite migrar entre clouds sem reescrever YAMLs, apenas trocando o overlay.</p>
        <p>As cinco etapas do projeto: (1) a base genérica, (2) os overlays de cada nuvem, (3) o pipeline que entrega nos dois clusters,
        (4) a entrada no EKS com um Ingress do ALB e (5) a entrada no AKS com o App Routing, mais a proteção de upgrades que vale nas duas.
        A entrada é o que mais muda entre nuvens, por isso fica nos overlays; o PodDisruptionBudget é genérico e vai na base.</p>`,
    },
    {
      id: 'multicloud-manifestos-genericos',
      tipo: 'exercicio',
      titulo: 'Manifestos genéricos sem anotações cloud-specific',
      dificuldade: 'dificil',
      xp: 25,
      resumo: `
        <p class="etapa-info">🧩 <b>Projeto Multicloud</b> · etapa 1 de 5. O objetivo é o mesmo YAML rodar no EKS e no AKS.</p>
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
        <p class="etapa-info">🧩 <b>Projeto Multicloud</b> · etapa 2 de 5. O objetivo é o mesmo YAML rodar no EKS e no AKS.</p>
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
        <p class="etapa-info">🧩 <b>Projeto Multicloud</b> · etapa 3 de 5. O objetivo é o mesmo YAML rodar no EKS e no AKS.</p>
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
    exercicio({
      id: 'multicloud-entrada-eks',
      titulo: 'A entrada no EKS: Ingress do ALB',
      dificuldade: 'medio',
      existentes: BASE_GENERICA,
      resumo: `
        <p class="etapa-info">🧩 <b>Projeto Multicloud</b> · etapa 4 de 5. O objetivo é o mesmo YAML rodar no EKS e no AKS.</p>
        <p>A base genérica (Deployment <code>app-web</code> e Service <code>app-svc</code>) já está no cluster. A <b>entrada</b> é o que mais muda
        entre nuvens: no EKS, um Ingress vira um ALB pelo AWS Load Balancer Controller (módulo da AWS). Ela fica no overlay da AWS.</p>
        <ol>
          <li>Crie o Ingress <code>app-eks</code> com <code>ingressClassName: alb</code>.</li>
          <li>Annotations <code>alb.ingress.kubernetes.io/scheme: internet-facing</code> e <code>alb.ingress.kubernetes.io/target-type: ip</code>.</li>
          <li>A regra leva <code>/</code> (<code>pathType: Prefix</code>) ao Service <code>app-svc</code>, porta 80.</li>
        </ol>
        <p><b>No cluster:</b> no EKS, o controlador cria um ALB público mandando direto para os IPs dos Pods de <code>app-web</code>. A base não muda.</p>`,
      inicial: `
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: app-eks
          annotations:
            # TODO: scheme internet-facing e target-type ip (passo 2)
        spec:
          ingressClassName:    # TODO: alb
          rules:
            - http:
                paths:
                  - path: /
                    pathType: Prefix
                    backend:
                      service:
                        name:  # TODO: app-svc
                        port:
                          number: 80
      `,
      dica: [
        'É o Ingress do exercício "Ingress com anotações ALB" do módulo da AWS, apontando para o Service da base.',
        'As duas annotations começam com alb.ingress.kubernetes.io/.',
        'annotations:\n  alb.ingress.kubernetes.io/scheme: internet-facing\n  alb.ingress.kubernetes.io/target-type: ip\nspec:\n  ingressClassName: alb',
      ],
      solucao: `
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: app-eks
          annotations:
            alb.ingress.kubernetes.io/scheme: internet-facing
            alb.ingress.kubernetes.io/target-type: ip
        spec:
          ingressClassName: alb
          rules:
            - http:
                paths:
                  - path: /
                    pathType: Prefix
                    backend:
                      service:
                        name: app-svc
                        port:
                          number: 80
      `,
      testes: [
        teste({ descricao: 'O Ingress é do ALB', dica: 'No spec, escreva ingressClassName: alb.' },
          campo('Ingress', 'app-eks', 'spec.ingressClassName', { valor: 'alb' })),
        teste({ descricao: 'O ALB é público e manda para os IPs dos Pods', dica: 'Annotations scheme: internet-facing e target-type: ip.' },
          campo('Ingress', 'app-eks', 'metadata.annotations["alb.ingress.kubernetes.io/scheme"]', { valor: 'internet-facing' }),
          campo('Ingress', 'app-eks', 'metadata.annotations["alb.ingress.kubernetes.io/target-type"]', { valor: 'ip' })),
        teste({ descricao: 'Leva ao Service da base', dica: 'No backend, service.name: app-svc e port.number: 80.' },
          campo('Ingress', 'app-eks', 'spec.rules[0].http.paths[0].backend.service.name', { valor: 'app-svc' })),
      ],
    }),
    exercicio({
      id: 'multicloud-entrada-aks',
      titulo: 'A entrada no AKS e a mesma proteção nas duas nuvens',
      dificuldade: 'dificil',
      existentes: BASE_GENERICA,
      resumo: `
        <p class="etapa-info">🧩 <b>Projeto Multicloud</b> · etapa 5 de 5. O objetivo é o mesmo YAML rodar no EKS e no AKS.</p>
        <p>No AKS, a mesma entrada usa o NGINX gerenciado do App Routing (módulo da Azure). E um PodDisruptionBudget é genérico: ele vai na
        <b>base</b>, porque protege o app nos upgrades das duas nuvens.</p>
        <ol>
          <li>Crie o Ingress <code>app-aks</code> com <code>ingressClassName: webapprouting.kubernetes.azure.com</code>, levando <code>/</code>
            (<code>Prefix</code>) ao Service <code>app-svc</code>, porta 80.</li>
          <li>Crie o PodDisruptionBudget <code>app-web</code> com <code>minAvailable: 2</code>.</li>
          <li>O <code>selector.matchLabels</code> do PDB é <code>app: web</code> (o mesmo da base).</li>
        </ol>
        <p><b>No cluster:</b> no AKS, o NGINX do App Routing passa a rotear para <code>app-svc</code>; nos upgrades de nós das duas nuvens, sempre
        sobram 2 das 3 réplicas no ar.</p>`,
      inicial: `
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: app-aks
        spec:
          ingressClassName:    # TODO: a classe do App Routing
          rules:
            - http:
                paths:
                  - path: /
                    pathType: Prefix
                    backend:
                      service:
                        name: app-svc
                        port:
                          number: 80
        ---
        # TODO: o PodDisruptionBudget app-web (minAvailable 2, selector app: web)
      `,
      dica: [
        'A classe do App Routing é webapprouting.kubernetes.azure.com. O PDB é o dos Fundamentos.',
        'O PDB escolhe os Pods pela mesma label que o Service da base usa.',
        'ingressClassName: webapprouting.kubernetes.azure.com\n---\napiVersion: policy/v1\nkind: PodDisruptionBudget\nmetadata:\n  name: app-web\nspec:\n  minAvailable: 2\n  selector:\n    matchLabels:\n      app: web',
      ],
      solucao: `
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: app-aks
        spec:
          ingressClassName: webapprouting.kubernetes.azure.com
          rules:
            - http:
                paths:
                  - path: /
                    pathType: Prefix
                    backend:
                      service:
                        name: app-svc
                        port:
                          number: 80
        ---
        apiVersion: policy/v1
        kind: PodDisruptionBudget
        metadata:
          name: app-web
        spec:
          minAvailable: 2
          selector:
            matchLabels:
              app: web
      `,
      testes: [
        teste({ descricao: 'O Ingress usa o App Routing', dica: 'No spec do Ingress: ingressClassName: webapprouting.kubernetes.azure.com.' },
          campo('Ingress', 'app-aks', 'spec.ingressClassName', { valor: 'webapprouting.kubernetes.azure.com' })),
        teste({ descricao: 'O PDB segura 2 réplicas', dica: 'Crie o PodDisruptionBudget app-web com minAvailable: 2.' },
          existe('PodDisruptionBudget', 'app-web'),
          campo('PodDisruptionBudget', 'app-web', 'spec.minAvailable', { valor: 2 })),
        teste({ descricao: 'O PDB protege os Pods da base', dica: 'Em selector.matchLabels do PDB: app: web.' },
          campo('PodDisruptionBudget', 'app-web', 'spec.selector.matchLabels.app', { valor: 'web' })),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'multicloud-manifestos-genericos': { dica: 'A base não pode ter nada de uma nuvem só, e o Service leva à porta 80.', regras: [campo('Service', 'app-svc', 'metadata.annotations', { ausente: true }), campo('Service', 'app-svc', 'spec.ports[0].port', { valor: 80 })] },
    'multicloud-kustomize-overlays': { dica: 'Confira a região e a classe de disco de cada overlay.', regras: [{ tipo: 'configmap-contem', configmap: 'overlay-azure', chave: 'region', valor: 'eastus' }, { tipo: 'configmap-contem', configmap: 'overlay-azure', chave: 'storage-class', valor: 'managed-premium' }] },
    'multicloud-pipeline-cicd': { dica: 'Confira a estratégia do passo 1 e a imagem do agente.', regras: [{ tipo: 'configmap-contem', configmap: 'pipeline-config', chave: 'strategy', valor: 'blue-green' }, campo('Deployment', 'deploy-agent', 'spec.template.spec.containers[name=agent].image', { valor: 'alpine:3.19' })] },
    'multicloud-entrada-eks': { dica: 'Confira o tipo do caminho e a porta do Service.', regras: [campo('Ingress', 'app-eks', 'spec.rules[0].http.paths[0].pathType', { valor: 'Prefix' }), campo('Ingress', 'app-eks', 'spec.rules[0].http.paths[0].backend.service.port.number', { valor: 80 })] },
    'multicloud-entrada-aks': { dica: 'O Ingress do AKS leva ao mesmo Service da base, sem annotations da AWS.', regras: [campo('Ingress', 'app-aks', 'spec.rules[0].http.paths[0].backend.service.name', { valor: 'app-svc' }), campo('Ingress', 'app-aks', 'metadata.annotations', { ausente: true })] },
  },
};

export const projetoMulticloud = { ...modulo, itens: comOcultos(modulo.itens, modulo.ocultos) };
