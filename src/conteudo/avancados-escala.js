// Recursos Avançados: escala automática, probes e limites de recursos.
import { licao, exercicio, teste, existe, campo } from './util.js';

const DEPLOY_LOJA = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: loja
spec:
  replicas: 2
  selector:
    matchLabels:
      app: loja
  template:
    metadata:
      labels:
        app: loja
    spec:
      containers:
        - name: loja
          image: nginx:1.27
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              memory: 512Mi`;

export const avancadosEscala = {
  id: 'escala',
  titulo: 'Escala, saúde e recursos',
  itens: [
    licao('escala-conceitos', 'HPA, probes e requests: o trio da estabilidade', 'medio', `
      <p>Três peças trabalham juntas para a aplicação aguentar o tráfego sem cair:</p>
      <ul>
        <li><b>requests e limits</b>: o <b>request</b> é a reserva de mesa no restaurante (o scheduler só põe o Pod num nó
          com espaço para a reserva); o <b>limit</b> é o máximo que o Pod pode consumir. Passou do limite de memória, o
          container é encerrado (<code>OOMKilled</code>); passou do de CPU, ele fica mais lento.</li>
        <li><b>HorizontalPodAutoscaler (HPA)</b>: o gerente que chama mais garçons quando o salão enche. Em
          <code>autoscaling/v2</code>, cada métrica tem um alvo, por exemplo 60% de uso de CPU <i>em relação ao request</i>.
          Sem request, o HPA não consegue calcular a porcentagem.</li>
        <li><b>behavior</b> do HPA: evita o "sanfona". <code>scaleDown.stabilizationWindowSeconds: 300</code> espera 5 minutos
          de folga antes de reduzir réplicas.</li>
        <li><b>Probes</b>: <code>startupProbe</code> dá tempo para aplicações lentas subirem (as outras probes só começam depois
          dela); <code>livenessProbe</code> reinicia o que travou; <code>readinessProbe</code> tira do Service quem ainda não
          está pronto.</li>
        <li><b>LimitRange</b> define requests e limits padrão para quem esqueceu de declarar; <b>ResourceQuota</b> é o teto
          de gastos do namespace inteiro.</li>
      </ul>`),
    exercicio({
      id: 'escala-hpa-v2-comportamento',
      titulo: 'HPA v2 com CPU, memória e behavior',
      dificuldade: 'medio',
      existentes: DEPLOY_LOJA,
      resumo: `<p>O Deployment <code>loja</code> já está no cluster, com requests de CPU e memória. Crie o HPA <code>loja</code>
        (<code>autoscaling/v2</code>) que:</p>
        <ul>
          <li>Escala o Deployment <code>loja</code> entre <b>2</b> e <b>8</b> réplicas.</li>
          <li>Mira <b>60%</b> de uso médio de CPU e <b>75%</b> de memória (<code>type: Utilization</code>).</li>
          <li>Só reduz réplicas depois de <b>300 segundos</b> estáveis (<code>behavior.scaleDown.stabilizationWindowSeconds</code>).</li>
        </ul>`,
      dica: 'Cada métrica é um item de spec.metrics com type: Resource e resource.name (cpu ou memory) e resource.target.',
      solucao: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: loja
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: loja
  minReplicas: 2
  maxReplicas: 8
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 75
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300`,
      testes: [
        teste('O HPA escala o Deployment loja de 2 a 8', { tipo: 'hpa-configurado', hpa: 'loja', target: 'loja', min: 2, max: 8 }),
        teste('CPU a 60% e memória a 75%',
          campo('HorizontalPodAutoscaler', 'loja', 'spec.metrics[resource.name=cpu].resource.target.averageUtilization', { valor: 60 }),
          campo('HorizontalPodAutoscaler', 'loja', 'spec.metrics[resource.name=memory].resource.target.averageUtilization', { valor: 75 })),
        teste('A redução espera 300 segundos', campo('HorizontalPodAutoscaler', 'loja', 'spec.behavior.scaleDown.stabilizationWindowSeconds', { valor: 300 })),
      ],
    }),
    exercicio({
      id: 'saude-startup-probe',
      titulo: 'startupProbe para uma aplicação lenta',
      dificuldade: 'medio',
      resumo: `<p>O sistema <b>legado</b> leva até 5 minutos para subir, e a livenessProbe o reinicia antes disso. Crie o
        Deployment <code>legado</code> (1 réplica, label <code>app: legado</code>, container <code>legado</code>, imagem
        <code>registry.example.com/legado:2.3</code>, porta 8080) com:</p>
        <ul>
          <li><code>startupProbe</code>: HTTP <code>/healthz</code> na porta 8080, <code>periodSeconds: 10</code> e
            <code>failureThreshold: 30</code> (até 300 segundos para subir).</li>
          <li><code>livenessProbe</code>: HTTP <code>/healthz</code> na porta 8080.</li>
          <li><code>readinessProbe</code>: HTTP <code>/ready</code> na porta 8080.</li>
        </ul>`,
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: legado
spec:
  replicas: 1
  selector:
    matchLabels:
      app: legado
  template:
    metadata:
      labels:
        app: legado
    spec:
      containers:
        - name: legado
          image: registry.example.com/legado:2.3
          ports:
            - containerPort: 8080
          startupProbe:
            httpGet:
              path: /healthz
              port: 8080
            periodSeconds: 10
            failureThreshold: 30
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            periodSeconds: 5`,
      testes: [
        teste('A startupProbe dá 300 segundos para subir',
          campo('Deployment', 'legado', 'spec.template.spec.containers[name=legado].startupProbe.httpGet.path', { valor: '/healthz' }),
          campo('Deployment', 'legado', 'spec.template.spec.containers[name=legado].startupProbe.failureThreshold', { valor: 30 }),
          campo('Deployment', 'legado', 'spec.template.spec.containers[name=legado].startupProbe.periodSeconds', { valor: 10 })),
        teste('A livenessProbe e a readinessProbe estão configuradas',
          { tipo: 'probe-configurada', pod: 'legado', container: 'legado', tipoProbe: 'liveness', path: '/healthz' },
          { tipo: 'probe-configurada', pod: 'legado', container: 'legado', tipoProbe: 'readiness', path: '/ready' }),
      ],
    }),
    exercicio({
      id: 'recursos-limitrange',
      titulo: 'LimitRange e ResourceQuota no namespace',
      dificuldade: 'dificil',
      resumo: `<p>O namespace <code>equipe-a</code> precisa de regras de consumo. Crie:</p>
        <ol>
          <li>O Namespace <code>equipe-a</code>.</li>
          <li>O LimitRange <code>padroes</code> (no namespace) para containers: <code>defaultRequest</code> de <code>100m</code>
            de CPU e <code>128Mi</code> de memória, <code>default</code> (limit) de <code>500m</code> e <code>256Mi</code> e
            <code>max</code> de <code>1</code> CPU e <code>1Gi</code>.</li>
          <li>A ResourceQuota <code>cota</code> (no namespace) com <code>requests.cpu: "4"</code>, <code>requests.memory: 8Gi</code>,
            <code>limits.cpu: "8"</code>, <code>limits.memory: 16Gi</code> e no máximo <code>20</code> Pods.</li>
        </ol>`,
      dica: 'O LimitRange tem spec.limits, uma lista; o item de containers tem type: Container.',
      solucao: `apiVersion: v1
kind: Namespace
metadata:
  name: equipe-a
---
apiVersion: v1
kind: LimitRange
metadata:
  name: padroes
  namespace: equipe-a
spec:
  limits:
    - type: Container
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      default:
        cpu: 500m
        memory: 256Mi
      max:
        cpu: "1"
        memory: 1Gi
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: cota
  namespace: equipe-a
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"`,
      testes: [
        teste('O namespace equipe-a existe', existe('Namespace', 'equipe-a')),
        teste('O LimitRange define os padrões dos containers',
          campo('LimitRange', 'padroes', 'metadata.namespace', { valor: 'equipe-a' }),
          campo('LimitRange', 'padroes', 'spec.limits[type=Container].defaultRequest.cpu', { valor: '100m' }),
          campo('LimitRange', 'padroes', 'spec.limits[type=Container].default.memory', { valor: '256Mi' }),
          campo('LimitRange', 'padroes', 'spec.limits[type=Container].max.memory', { valor: '1Gi' })),
        teste('A ResourceQuota limita o namespace',
          campo('ResourceQuota', 'cota', 'metadata.namespace', { valor: 'equipe-a' }),
          campo('ResourceQuota', 'cota', 'spec.hard["requests.memory"]', { valor: '8Gi' }),
          campo('ResourceQuota', 'cota', 'spec.hard.pods', { valor: '20' })),
      ],
    }),
  ],
};
