// Projeto: um blog (Ghost) com banco de dados MySQL, do Deployment à produção.
// Segue docs/didatica.md: lição de arquitetura e 5 etapas; cada etapa parte da anterior.
import { licao, exercicio, teste, existe, campo, docs } from './util.js';

const info = (n) => `<p class="etapa-info">🧩 <b>Projeto Blog</b> · etapa ${n} de 5. Um blog com banco de dados, do primeiro Pod à produção.</p>`;

/** O Deployment do blog; `env` entra no container e `extra` no fim do container. */
const deployBlog = ({ env = '', extra = '' } = {}) => `
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: blog
  spec:
    replicas: 2
    selector:
      matchLabels:
        app: blog
    template:
      metadata:
        labels:
          app: blog
      spec:
        containers:
          - name: ghost
            image: ghost:5-alpine
            ports:
              - containerPort: 2368
${env}${extra}`;

const ENV_CONFIG = `            envFrom:
              - configMapRef:
                  name: blog-config
`;

const SERVICE_BLOG = `
  apiVersion: v1
  kind: Service
  metadata:
    name: blog
  spec:
    selector:
      app: blog
    ports:
      - port: 80
        targetPort: 2368
`;

const CONFIG_BLOG = `
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: blog-config
  data:
    url: https://blog.exemplo.com
    database__client: mysql
    database__connection__host: mysql
`;

const BANCO = `
  apiVersion: v1
  kind: Secret
  metadata:
    name: mysql-senha
  type: Opaque
  stringData:
    senha: troque-esta-senha
  ---
  apiVersion: v1
  kind: Service
  metadata:
    name: mysql
  spec:
    clusterIP: None
    selector:
      app: mysql
    ports:
      - port: 3306
  ---
  apiVersion: apps/v1
  kind: StatefulSet
  metadata:
    name: mysql
  spec:
    serviceName: mysql
    replicas: 1
    selector:
      matchLabels:
        app: mysql
    template:
      metadata:
        labels:
          app: mysql
      spec:
        containers:
          - name: mysql
            image: mysql:8.4
            env:
              - name: MYSQL_ROOT_PASSWORD
                valueFrom:
                  secretKeyRef:
                    name: mysql-senha
                    key: senha
            volumeMounts:
              - name: dados
                mountPath: /var/lib/mysql
    volumeClaimTemplates:
      - metadata:
          name: dados
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 5Gi
`;

export const projetoBlog = {
  id: 'proj-blog',
  titulo: 'Projeto Blog: Ghost com MySQL',
  icone: '📝',
  itens: [
    licao('proj-blog-arquitetura', 'Arquitetura do blog', 'medio', `
      <p>Neste projeto você monta um <b>blog</b> de verdade (o Ghost) com o banco de dados <b>MySQL</b>, como a redação de um jornal:
      os jornalistas (os Pods do Ghost) escrevem; o arquivo (o MySQL) guarda tudo; a recepção (o Ingress) recebe os leitores.</p>
      <ol>
        <li><b>Workload</b>: o Deployment <code>blog</code> e o Service <code>blog</code>, que leva a porta 80 à 2368 do Ghost.</li>
        <li><b>Configuração</b>: o ConfigMap <code>blog-config</code> com o endereço do site e do banco, entregue ao container com
          <code>envFrom</code>.</li>
        <li><b>Banco</b>: um StatefulSet <code>mysql</code> com disco próprio (<code>volumeClaimTemplates</code>), um Service headless
          e a senha num Secret.</li>
        <li><b>Entrada</b>: o Ingress <code>blog</code> com HTTPS.</li>
        <li><b>Produção</b>: readinessProbe, HPA e PodDisruptionBudget.</li>
      </ol>
      <p>Cada etapa parte do que a anterior deixou no cluster: confira com <code>kubectl get all</code> antes de começar.</p>
      <p><b>No cluster:</b> no fim, <code>https://blog.exemplo.com</code> abre o Ghost, que grava os posts no MySQL e cresce sozinho em dia de
      muito acesso.</p>`,
    `
      # O desenho do projeto, do leitor ao disco:
      #
      #   leitor -> Ingress blog (HTTPS) -> Service blog :80
      #          -> Pods do Deployment blog (Ghost :2368, config do ConfigMap blog-config)
      #          -> Service mysql (headless) -> Pod mysql-0 do StatefulSet
      #          -> PVC dados-mysql-0 (o disco do banco)
      #
      # Comece pela etapa 1: o Deployment e o Service do blog.
      apiVersion: v1
      kind: Service
      metadata:
        name: blog
      spec:
        selector:
          app: blog           # os Pods do Ghost
        ports:
          - port: 80          # a porta que os outros usam
            targetPort: 2368  # a porta do Ghost no container
    `),

    exercicio({
      id: 'proj-blog-app',
      titulo: 'Etapa 1: o Ghost e o Service',
      dificuldade: 'facil',
      resumo: `
        ${info(1)}
        <p>Primeiro, o blog no ar dentro do cluster: duas réplicas do Ghost e um Service na frente.</p>
        <ol>
          <li>O Deployment <code>blog</code> já está pronto no esqueleto (2 réplicas, imagem <code>ghost:5-alpine</code>, porta 2368).</li>
          <li>No Service <code>blog</code>, o <code>selector</code> é <code>app: blog</code>.</li>
          <li>A porta do Service é <code>80</code> e o <code>targetPort</code> é <code>2368</code>.</li>
        </ol>
        <p><b>No cluster:</b> <code>kubectl get endpoints blog</code> mostra os IPs das duas réplicas na porta 2368.</p>`,
      inicial: docs(deployBlog(), `
        apiVersion: v1
        kind: Service
        metadata:
          name: blog
        spec:
          selector:
            # TODO: app: blog
          ports:
            - port: 80
              targetPort:      # TODO: 2368
      `),
      dica: [
        'O exemplo da lição "Arquitetura do blog" é este Service.',
        'selector:\n  app: blog\nports:\n  - port: 80\n    targetPort: 2368',
      ],
      solucao: docs(deployBlog(), SERVICE_BLOG),
      testes: [
        teste({ descricao: 'O Service escolhe os Pods do blog', dica: 'No Service, selector com app: blog.' },
          { tipo: 'service-selector', service: 'blog', chave: 'app', valor: 'blog' }),
        teste({ descricao: 'A porta 80 leva à 2368 do Ghost', dica: 'Em ports: port: 80 e targetPort: 2368.' },
          campo('Service', 'blog', 'spec.ports[0].targetPort', { valor: 2368 })),
      ],
    }),

    exercicio({
      id: 'proj-blog-config',
      titulo: 'Etapa 2: a configuração do Ghost',
      dificuldade: 'medio',
      existentes: SERVICE_BLOG,
      resumo: `
        ${info(2)}
        <p>O Ghost lê a configuração de variáveis de ambiente: o endereço do site e onde está o banco. Ela vai num ConfigMap, entregue inteiro ao
        container.</p>
        <ol>
          <li>Crie o ConfigMap <code>blog-config</code> com <code>url: https://blog.exemplo.com</code>, <code>database__client: mysql</code> e
            <code>database__connection__host: mysql</code>.</li>
          <li>No container <code>ghost</code> do Deployment <code>blog</code>, use <code>envFrom</code> com <code>configMapRef.name: blog-config</code>.</li>
        </ol>
        <p><b>No cluster:</b> cada chave do ConfigMap vira uma variável no container. Os Pods são recriados com a configuração nova.</p>`,
      inicial: docs(`
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: blog-config
        data:
          url: https://blog.exemplo.com
          # TODO: database__client e database__connection__host (passo 1)
      `, deployBlog({ env: `            # TODO: envFrom com o ConfigMap blog-config (passo 2)
` })),
      dica: [
        'Os nomes com dois sublinhados (database__client) são o jeito do Ghost de ler configurações aninhadas.',
        'envFrom fica no container, alinhado com ports: é uma lista com configMapRef.',
        'database__client: mysql\ndatabase__connection__host: mysql\n...\nenvFrom:\n  - configMapRef:\n      name: blog-config',
      ],
      solucao: docs(CONFIG_BLOG, deployBlog({ env: ENV_CONFIG })),
      testes: [
        teste({ descricao: 'O ConfigMap diz onde está o banco', dica: 'Em data: database__client: mysql e database__connection__host: mysql.' },
          { tipo: 'configmap-contem', configmap: 'blog-config', chave: 'database__client', valor: 'mysql' },
          { tipo: 'configmap-contem', configmap: 'blog-config', chave: 'database__connection__host', valor: 'mysql' }),
        teste({ descricao: 'O Ghost recebe a configuração inteira', dica: 'No container ghost: envFrom com - configMapRef: name: blog-config.' },
          campo('Deployment', 'blog', 'spec.template.spec.containers[name=ghost].envFrom[0].configMapRef.name', { valor: 'blog-config' })),
      ],
    }),

    exercicio({
      id: 'proj-blog-banco',
      titulo: 'Etapa 3: o MySQL com disco próprio',
      dificuldade: 'dificil',
      existentes: docs(SERVICE_BLOG, CONFIG_BLOG, deployBlog({ env: ENV_CONFIG })),
      resumo: `
        ${info(3)}
        <p>O Ghost procura o banco em <code>mysql</code>. Agora ele vai existir: um StatefulSet, que dá ao Pod um nome fixo e um disco que não some.</p>
        <ol>
          <li>O Secret <code>mysql-senha</code> e o Service headless <code>mysql</code> (<code>clusterIP: None</code>) já vêm no esqueleto.</li>
          <li>No StatefulSet <code>mysql</code>, a variável <code>MYSQL_ROOT_PASSWORD</code> vem de <code>secretKeyRef</code> (Secret <code>mysql-senha</code>,
            chave <code>senha</code>).</li>
          <li>Em <code>volumeClaimTemplates</code>, o PVC <code>dados</code> com <code>ReadWriteOnce</code> e <code>5Gi</code>, montado em <code>/var/lib/mysql</code>.</li>
        </ol>
        <p><b>No cluster:</b> nasce o Pod <code>mysql-0</code> com o PVC <code>dados-mysql-0</code>. Se o Pod cair, o novo <code>mysql-0</code> volta com o
        mesmo disco e os posts continuam lá.</p>`,
      inicial: BANCO
        .replace(`            env:
              - name: MYSQL_ROOT_PASSWORD
                valueFrom:
                  secretKeyRef:
                    name: mysql-senha
                    key: senha
`, `            env:
              - name: MYSQL_ROOT_PASSWORD
                # TODO: valueFrom.secretKeyRef com mysql-senha e senha (passo 2)
`)
        .replace(`    volumeClaimTemplates:
      - metadata:
          name: dados
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 5Gi
`, `    # TODO: volumeClaimTemplates com o PVC dados de 5Gi (passo 3)
`),
      dica: [
        'Releia o exercício "StatefulSet" de Recursos Avançados: volumeClaimTemplates fica no spec do StatefulSet, alinhado com template.',
        'O nome do PVC no volumeClaimTemplates é o mesmo do volumeMounts (dados).',
        'valueFrom:\n  secretKeyRef:\n    name: mysql-senha\n    key: senha\n...\nvolumeClaimTemplates:\n  - metadata:\n      name: dados\n    spec:\n      accessModes: ["ReadWriteOnce"]\n      resources:\n        requests:\n          storage: 5Gi',
      ],
      solucao: BANCO,
      testes: [
        teste({ descricao: 'O StatefulSet do MySQL existe', dica: 'Mantenha kind: StatefulSet e metadata.name: mysql.' }, existe('StatefulSet', 'mysql')),
        teste({ descricao: 'A senha vem do Secret', dica: 'Em env MYSQL_ROOT_PASSWORD: valueFrom.secretKeyRef com name: mysql-senha e key: senha.' },
          campo('StatefulSet', 'mysql', 'spec.template.spec.containers[name=mysql].env[name=MYSQL_ROOT_PASSWORD].valueFrom.secretKeyRef.name', { valor: 'mysql-senha' })),
        teste({ descricao: 'Cada Pod do banco ganha um disco de 5Gi', dica: 'Em volumeClaimTemplates: o PVC dados com storage: 5Gi.' },
          campo('StatefulSet', 'mysql', 'spec.volumeClaimTemplates[0].metadata.name', { valor: 'dados' }),
          campo('StatefulSet', 'mysql', 'spec.volumeClaimTemplates[0].spec.resources.requests.storage', { valor: '5Gi' })),
      ],
    }),

    exercicio({
      id: 'proj-blog-ingress',
      titulo: 'Etapa 4: o blog com HTTPS',
      dificuldade: 'medio',
      existentes: SERVICE_BLOG,
      resumo: `
        ${info(4)}
        <p>Falta o blog sair do cluster. O certificado de <code>blog.exemplo.com</code> já está no Secret <code>blog-tls</code>.</p>
        <ol>
          <li>No Ingress <code>blog</code> (<code>ingressClassName: nginx</code>), a regra do host <code>blog.exemplo.com</code> leva <code>/</code> ao
            Service <code>blog</code>, porta 80.</li>
          <li>Em <code>tls</code>, <code>hosts: ["blog.exemplo.com"]</code> e <code>secretName: blog-tls</code>.</li>
        </ol>
        <p><b>No cluster:</b> o controlador NGINX passa a atender <code>https://blog.exemplo.com</code> com o certificado e a mandar os leitores ao Ghost.</p>`,
      inicial: `
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: blog
        spec:
          ingressClassName: nginx
          # TODO: tls com hosts e secretName (passo 2)
          rules:
            - host:            # TODO: blog.exemplo.com
              http:
                paths:
                  - path: /
                    pathType: Prefix
                    backend:
                      service:
                        name: blog
                        port:
                          number: 80
      `,
      dica: [
        'É o Ingress com TLS de Recursos Avançados.',
        'tls:\n  - hosts: ["blog.exemplo.com"]\n    secretName: blog-tls\nrules:\n  - host: blog.exemplo.com',
      ],
      solucao: `
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: blog
        spec:
          ingressClassName: nginx
          tls:
            - hosts: ["blog.exemplo.com"]
              secretName: blog-tls
          rules:
            - host: blog.exemplo.com
              http:
                paths:
                  - path: /
                    pathType: Prefix
                    backend:
                      service:
                        name: blog
                        port:
                          number: 80
      `,
      testes: [
        teste({ descricao: 'O Ingress atende blog.exemplo.com', dica: 'Na regra, host: blog.exemplo.com.' },
          { tipo: 'ingress-existe', ingress: 'blog', host: 'blog.exemplo.com' },
          campo('Ingress', 'blog', 'spec.rules[0].host', { valor: 'blog.exemplo.com' })),
        teste({ descricao: 'Com o certificado do Secret blog-tls', dica: 'Em tls: hosts: ["blog.exemplo.com"] e secretName: blog-tls.' },
          campo('Ingress', 'blog', 'spec.tls[0].secretName', { valor: 'blog-tls' })),
      ],
    }),

    exercicio({
      id: 'proj-blog-producao',
      titulo: 'Etapa 5: o blog pronto para produção',
      dificuldade: 'dificil',
      existentes: docs(SERVICE_BLOG, CONFIG_BLOG),
      resumo: `
        ${info(5)}
        <p>Últimos ajustes: o Service só manda leitores para Pods prontos, o blog cresce sozinho e um upgrade de nós nunca derruba tudo.</p>
        <ol>
          <li>No container <code>ghost</code>, uma <code>readinessProbe</code> <code>httpGet</code> em <code>/</code>, porta <code>2368</code>.</li>
          <li>Crie o HPA <code>blog</code> (<code>autoscaling/v2</code>) para o Deployment <code>blog</code>, de 2 a 6 réplicas, com 70% de CPU.</li>
          <li>Crie o PodDisruptionBudget <code>blog</code> com <code>minAvailable: 1</code> e <code>selector</code> <code>app: blog</code>.</li>
        </ol>
        <p><b>No cluster:</b> um Pod que ainda está subindo fica fora dos endpoints; com muito acesso, o HPA sobe até 6 réplicas; no esvaziamento de um nó,
        pelo menos uma réplica fica no ar.</p>`,
      inicial: docs(deployBlog({ env: ENV_CONFIG, extra: `            # TODO: readinessProbe httpGet em / na porta 2368 (passo 1)
            resources:
              requests:
                cpu: 100m
                memory: 256Mi
` }), `
        apiVersion: autoscaling/v2
        kind: HorizontalPodAutoscaler
        metadata:
          name: blog
        spec:
          scaleTargetRef:
            apiVersion: apps/v1
            kind: Deployment
            name: blog
          minReplicas:         # TODO: 2
          maxReplicas:         # TODO: 6
          metrics:
            - type: Resource
              resource:
                name: cpu
                target:
                  type: Utilization
                  averageUtilization: 70
        ---
        # TODO: o PodDisruptionBudget blog (passo 3)
      `),
      dica: [
        'São três peças dos Fundamentos: a probe no container, o HPA e o PDB.',
        'O HPA precisa do request de CPU do container (já está no esqueleto) para calcular os 70%.',
        'readinessProbe:\n  httpGet:\n    path: /\n    port: 2368\n...\nminReplicas: 2\nmaxReplicas: 6\n---\napiVersion: policy/v1\nkind: PodDisruptionBudget\nmetadata:\n  name: blog\nspec:\n  minAvailable: 1\n  selector:\n    matchLabels:\n      app: blog',
      ],
      solucao: docs(deployBlog({ env: ENV_CONFIG, extra: `            readinessProbe:
              httpGet:
                path: /
                port: 2368
            resources:
              requests:
                cpu: 100m
                memory: 256Mi
` }), `
        apiVersion: autoscaling/v2
        kind: HorizontalPodAutoscaler
        metadata:
          name: blog
        spec:
          scaleTargetRef:
            apiVersion: apps/v1
            kind: Deployment
            name: blog
          minReplicas: 2
          maxReplicas: 6
          metrics:
            - type: Resource
              resource:
                name: cpu
                target:
                  type: Utilization
                  averageUtilization: 70
        ---
        apiVersion: policy/v1
        kind: PodDisruptionBudget
        metadata:
          name: blog
        spec:
          minAvailable: 1
          selector:
            matchLabels:
              app: blog
      `),
      testes: [
        teste({ descricao: 'O Ghost só recebe leitores quando está pronto', dica: 'No container ghost: readinessProbe.httpGet com path: / e port: 2368.' },
          campo('Deployment', 'blog', 'spec.template.spec.containers[name=ghost].readinessProbe.httpGet.port', { valor: 2368 })),
        teste({ descricao: 'O HPA vai de 2 a 6 réplicas', dica: 'No HPA: minReplicas: 2 e maxReplicas: 6.' },
          { tipo: 'hpa-configurado', hpa: 'blog', target: 'blog', min: 2, max: 6 }),
        teste({ descricao: 'Um upgrade nunca derruba todas as réplicas', dica: 'Crie o PodDisruptionBudget blog com minAvailable: 1 e selector app: blog.' },
          campo('PodDisruptionBudget', 'blog', 'spec.minAvailable', { valor: 1 }),
          campo('PodDisruptionBudget', 'blog', 'spec.selector.matchLabels.app', { valor: 'blog' })),
      ],
    }),
  ],
  ocultos: {
    'proj-blog-app': { dica: 'O Deployment do esqueleto continua com 2 réplicas e a imagem do Ghost.', regras: [campo('Deployment', 'blog', 'spec.replicas', { valor: 2 }), campo('Service', 'blog', 'spec.ports[0].port', { valor: 80 })] },
    'proj-blog-config': { dica: 'Confira o endereço do site no ConfigMap.', regras: [{ tipo: 'configmap-contem', configmap: 'blog-config', chave: 'url', valor: 'https://blog.exemplo.com' }] },
    'proj-blog-banco': { dica: 'Confira o caminho da montagem, o modo de acesso e o Service headless.', regras: [campo('StatefulSet', 'mysql', 'spec.template.spec.containers[name=mysql].volumeMounts[name=dados].mountPath', { valor: '/var/lib/mysql' }), campo('StatefulSet', 'mysql', 'spec.volumeClaimTemplates[0].spec.accessModes', { contem: 'ReadWriteOnce' }), campo('Service', 'mysql', 'spec.clusterIP', { valor: 'None' })] },
    'proj-blog-ingress': { dica: 'O certificado vale para o mesmo host da regra.', regras: [campo('Ingress', 'blog', 'spec.tls[0].hosts', { contem: 'blog.exemplo.com' })] },
    'proj-blog-producao': { dica: 'Confira o caminho da probe e a métrica de CPU do HPA.', regras: [campo('Deployment', 'blog', 'spec.template.spec.containers[name=ghost].readinessProbe.httpGet.path', { valor: '/' }), campo('HorizontalPodAutoscaler', 'blog', 'spec.metrics[0].resource.target.averageUtilization', { valor: 70 })] },
  },
};
