// Projeto: uma API observável (portas nomeadas, ServiceMonitor e PrometheusRule do Prometheus
// Operator, probes e HPA por métrica da aplicação).
// Segue docs/didatica.md: lição de arquitetura e 5 etapas; cada etapa parte da anterior.
import { licao, exercicio, teste, existe, campo, docs } from './util.js';

const info = (n) => `<p class="etapa-info">🧩 <b>Projeto Observabilidade</b> · etapa ${n} de 5. Uma API que avisa antes de cair e cresce pelo que importa.</p>`;
const PROM = 'monitoring.coreos.com/v1';

/** O Deployment da API (podinfo); `container` entra no fim do container. */
const deployApi = (container = '') => `
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: api
  spec:
    replicas: 2
    selector:
      matchLabels:
        app: api
    template:
      metadata:
        labels:
          app: api
      spec:
        containers:
          - name: api
            image: ghcr.io/stefanprodan/podinfo:6.7.0
            ports:
              - name: http
                containerPort: 9898
            resources:
              requests:
                cpu: 100m
                memory: 64Mi
${container}`;

const SERVICE = `
  apiVersion: v1
  kind: Service
  metadata:
    name: api
    labels:
      app: api
  spec:
    selector:
      app: api
    ports:
      - name: http
        port: 80
        targetPort: http
`;

const PROBES = `            startupProbe:
              httpGet:
                path: /healthz
                port: http
              periodSeconds: 5
              failureThreshold: 12
            livenessProbe:
              httpGet:
                path: /healthz
                port: http
            readinessProbe:
              httpGet:
                path: /readyz
                port: http
`;

export const projetoObservabilidade = {
  id: 'proj-observabilidade',
  titulo: 'Projeto Observabilidade: uma API que avisa',
  icone: '📊',
  itens: [
    licao('proj-observabilidade-arquitetura', 'Arquitetura de uma API observável', 'dificil', `
      <p>Uma API em produção precisa de <b>painel e alarme</b>, como um carro: ponteiros (métricas), uma luz que acende antes do motor fundir
      (alertas) e um mecânico que só deixa o carro sair quando ele liga (probes). O cluster tem o <b>Prometheus Operator</b> (o
      kube-prometheus-stack) instalado.</p>
      <ul>
        <li><b>Portas com nome</b>: o container chama a porta de <code>http</code>, e o Service usa <code>targetPort: http</code>. Quem coleta
          procura a porta pelo nome.</li>
        <li><b>ServiceMonitor</b> (<code>monitoring.coreos.com/v1</code>): diz ao Prometheus quais Services coletar (<code>selector</code>), em
          qual porta e de quanto em quanto tempo (<code>endpoints</code>). A label <code>release: prometheus</code> faz o Prometheus do stack
          enxergar o recurso.</li>
        <li><b>PrometheusRule</b>: os alertas. Cada regra tem um nome (<code>alert</code>), uma expressão em PromQL (<code>expr</code>), quanto
          tempo ela precisa ficar verdadeira (<code>for</code>) e labels como <code>severity</code>.</li>
        <li><b>Probes</b> nos Fundamentos e em Recursos Avançados: startup, liveness e readiness.</li>
        <li><b>HPA por métrica da aplicação</b>: com o prometheus-adapter, o HPA escala por <code>type: Pods</code> (por exemplo, requisições por
          segundo em cada Pod), e não só por CPU.</li>
      </ul>
      <p><b>No cluster:</b> no fim, o Prometheus coleta a API a cada 30 segundos, o Alertmanager avisa quando ela fica lenta e o HPA cresce pelo número
      de requisições.</p>`,
    `
      # O Prometheus coleta a porta "http" dos Services app: api
      apiVersion: ${PROM}
      kind: ServiceMonitor
      metadata:
        name: api
        labels:
          release: prometheus    # o Prometheus do stack só olha recursos com esta label
      spec:
        selector:
          matchLabels:
            app: api             # as labels do Service
        endpoints:
          - port: http           # o NOME da porta no Service
            path: /metrics
            interval: 30s
      ---
      # Um alerta: a API ficou lenta por 10 minutos
      apiVersion: ${PROM}
      kind: PrometheusRule
      metadata:
        name: api-alertas
        labels:
          release: prometheus
      spec:
        groups:
          - name: api
            rules:
              - alert: ApiLenta
                expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{app="api"}[5m])) by (le)) > 0.5
                for: 10m
                labels:
                  severity: warning
    `),

    exercicio({
      id: 'proj-obs-api',
      titulo: 'Etapa 1: a API com portas nomeadas',
      dificuldade: 'facil',
      resumo: `
        ${info(1)}
        <p>A API (o podinfo) já tem a porta <code>http</code> com nome no container. O Service precisa dar o mesmo nome à porta dele, para o
        Prometheus achá-la depois.</p>
        <ol>
          <li>No Service <code>api</code> (com a label <code>app: api</code>), a porta tem <code>name: http</code>.</li>
          <li>O <code>targetPort</code> é o <b>nome</b> da porta do container: <code>http</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Service manda a porta 80 para a 9898 dos Pods, achando-a pelo nome. Se a porta do container mudar de número, o Service
        continua certo.</p>`,
      inicial: docs(deployApi(), `
        apiVersion: v1
        kind: Service
        metadata:
          name: api
          labels:
            app: api
        spec:
          selector:
            app: api
          ports:
            - port: 80
              # TODO: name http e targetPort http
      `),
      dica: [
        'targetPort aceita um número ou o nome da porta do container.',
        'ports:\n  - name: http\n    port: 80\n    targetPort: http',
      ],
      solucao: docs(deployApi(), SERVICE),
      testes: [
        teste({ descricao: 'A porta do Service tem nome', dica: 'Em ports: name: http.' },
          campo('Service', 'api', 'spec.ports[0].name', { valor: 'http' })),
        teste({ descricao: 'O Service acha a porta do container pelo nome', dica: 'Em ports: targetPort: http.' },
          campo('Service', 'api', 'spec.ports[0].targetPort', { valor: 'http' })),
      ],
    }),

    exercicio({
      id: 'proj-obs-servicemonitor',
      titulo: 'Etapa 2: o Prometheus coletando a API',
      dificuldade: 'medio',
      existentes: docs(deployApi(), SERVICE),
      resumo: `
        ${info(2)}
        <p>Com a porta nomeada, o ServiceMonitor diz ao Prometheus o que coletar.</p>
        <ol>
          <li>Crie o <code>ServiceMonitor</code> <code>api</code> (<code>apiVersion: ${PROM}</code>) com a label <code>release: prometheus</code>.</li>
          <li><code>selector.matchLabels</code>: <code>app: api</code>.</li>
          <li>Em <code>endpoints</code>: <code>port: http</code>, <code>path: /metrics</code> e <code>interval: 30s</code>.</li>
        </ol>
        <p><b>No cluster:</b> em instantes, os dois Pods da API aparecem como alvos <code>UP</code> no Prometheus.</p>`,
      inicial: `
        apiVersion: ${PROM}
        kind: ServiceMonitor
        metadata:
          name: api
          labels:
            # TODO: release: prometheus
        spec:
          selector:
            matchLabels:
              app: api
          endpoints:
            # TODO: - port http, path /metrics e interval 30s
      `,
      dica: [
        'O exemplo da lição "Arquitetura de uma API observável" começa com este ServiceMonitor.',
        'Sem a label release: prometheus, o Prometheus do stack ignora o ServiceMonitor.',
        'labels:\n  release: prometheus\n...\nendpoints:\n  - port: http\n    path: /metrics\n    interval: 30s',
      ],
      solucao: `
        apiVersion: ${PROM}
        kind: ServiceMonitor
        metadata:
          name: api
          labels:
            release: prometheus
        spec:
          selector:
            matchLabels:
              app: api
          endpoints:
            - port: http
              path: /metrics
              interval: 30s
      `,
      testes: [
        teste({ descricao: 'O Prometheus do stack enxerga o ServiceMonitor', dica: 'Em metadata.labels: release: prometheus.' },
          existe('ServiceMonitor', 'api'),
          campo('ServiceMonitor', 'api', 'metadata.labels.release', { valor: 'prometheus' })),
        teste({ descricao: 'Coleta a porta http em /metrics a cada 30s', dica: 'Em endpoints: - port: http, path: /metrics e interval: 30s.' },
          campo('ServiceMonitor', 'api', 'spec.endpoints[0].port', { valor: 'http' }),
          campo('ServiceMonitor', 'api', 'spec.endpoints[0].interval', { valor: '30s' })),
      ],
    }),

    exercicio({
      id: 'proj-obs-alerta',
      titulo: 'Etapa 3: o alarme de API lenta',
      dificuldade: 'dificil',
      existentes: docs(deployApi(), SERVICE),
      resumo: `
        ${info(3)}
        <p>O time quer ser avisado quando 5% das requisições demorarem mais de meio segundo por 10 minutos seguidos. A expressão em PromQL já vem pronta.</p>
        <ol>
          <li>Na <code>PrometheusRule</code> <code>api-alertas</code> (label <code>release: prometheus</code>), o grupo <code>api</code> tem a regra
            <code>alert: ApiLenta</code>.</li>
          <li>A regra dispara depois de <code>for: 10m</code>.</li>
          <li>Em <code>labels</code>, <code>severity: warning</code>; em <code>annotations</code>, <code>summary: A API está lenta</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Prometheus avalia a regra; depois de 10 minutos verdadeira, o alerta vai ao Alertmanager, que avisa o time.</p>`,
      inicial: `
        apiVersion: ${PROM}
        kind: PrometheusRule
        metadata:
          name: api-alertas
          labels:
            release: prometheus
        spec:
          groups:
            - name: api
              rules:
                - alert:       # TODO: ApiLenta
                  expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{app="api"}[5m])) by (le)) > 0.5
                  # TODO: for 10m (passo 2)
                  # TODO: labels com severity warning e annotations com summary (passo 3)
      `,
      dica: [
        'O fim do exemplo da lição "Arquitetura de uma API observável" é esta regra.',
        'for, labels e annotations ficam no item da regra, alinhados com expr.',
        'alert: ApiLenta\n...\nfor: 10m\nlabels:\n  severity: warning\nannotations:\n  summary: A API está lenta',
      ],
      solucao: `
        apiVersion: ${PROM}
        kind: PrometheusRule
        metadata:
          name: api-alertas
          labels:
            release: prometheus
        spec:
          groups:
            - name: api
              rules:
                - alert: ApiLenta
                  expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{app="api"}[5m])) by (le)) > 0.5
                  for: 10m
                  labels:
                    severity: warning
                  annotations:
                    summary: A API está lenta
      `,
      testes: [
        teste({ descricao: 'A regra ApiLenta existe', dica: 'No item da regra: alert: ApiLenta.' },
          campo('PrometheusRule', 'api-alertas', 'spec.groups[0].rules[0].alert', { valor: 'ApiLenta' })),
        teste({ descricao: 'Só dispara depois de 10 minutos', dica: 'No item da regra: for: 10m.' },
          campo('PrometheusRule', 'api-alertas', 'spec.groups[0].rules[0].for', { valor: '10m' })),
        teste({ descricao: 'É um aviso, com resumo', dica: 'labels.severity: warning e annotations.summary: A API está lenta.' },
          campo('PrometheusRule', 'api-alertas', 'spec.groups[0].rules[0].labels.severity', { valor: 'warning' }),
          campo('PrometheusRule', 'api-alertas', 'spec.groups[0].rules[0].annotations.summary', { valor: 'A API está lenta' })),
      ],
    }),

    exercicio({
      id: 'proj-obs-probes',
      titulo: 'Etapa 4: as três probes da API',
      dificuldade: 'medio',
      existentes: SERVICE,
      resumo: `
        ${info(4)}
        <p>O podinfo responde em <code>/healthz</code> (está vivo) e <code>/readyz</code> (está pronto). Ele demora até 1 minuto para subir na primeira vez.</p>
        <ol>
          <li>Uma <code>startupProbe</code> <code>httpGet</code> em <code>/healthz</code>, porta <code>http</code>, com <code>periodSeconds: 5</code> e
            <code>failureThreshold: 12</code> (até 60 segundos).</li>
          <li>Uma <code>livenessProbe</code> <code>httpGet</code> em <code>/healthz</code>, porta <code>http</code>.</li>
          <li>Uma <code>readinessProbe</code> <code>httpGet</code> em <code>/readyz</code>, porta <code>http</code>.</li>
        </ol>
        <p><b>No cluster:</b> as outras probes só começam depois da startup; um Pod travado é reiniciado; um Pod ainda não pronto sai dos endpoints do Service.</p>`,
      inicial: deployApi(`            # TODO: startupProbe, livenessProbe e readinessProbe (passos 1 a 3)
`),
      dica: [
        'As três probes ficam no container, alinhadas com ports. A porta pode ser o nome: http.',
        'O tempo máximo da startupProbe é periodSeconds × failureThreshold: 5 × 12 = 60 segundos.',
        'startupProbe:\n  httpGet:\n    path: /healthz\n    port: http\n  periodSeconds: 5\n  failureThreshold: 12\nlivenessProbe:\n  httpGet:\n    path: /healthz\n    port: http\nreadinessProbe:\n  httpGet:\n    path: /readyz\n    port: http',
      ],
      solucao: deployApi(PROBES),
      testes: [
        teste({ descricao: 'A startupProbe dá até 60 segundos', dica: 'startupProbe com periodSeconds: 5 e failureThreshold: 12.' },
          campo('Deployment', 'api', 'spec.template.spec.containers[name=api].startupProbe.periodSeconds', { valor: 5 }),
          campo('Deployment', 'api', 'spec.template.spec.containers[name=api].startupProbe.failureThreshold', { valor: 12 })),
        teste({ descricao: 'A livenessProbe confere /healthz', dica: 'livenessProbe.httpGet com path: /healthz e port: http.' },
          campo('Deployment', 'api', 'spec.template.spec.containers[name=api].livenessProbe.httpGet.path', { valor: '/healthz' })),
        teste({ descricao: 'A readinessProbe confere /readyz', dica: 'readinessProbe.httpGet com path: /readyz e port: http.' },
          campo('Deployment', 'api', 'spec.template.spec.containers[name=api].readinessProbe.httpGet.path', { valor: '/readyz' })),
      ],
    }),

    exercicio({
      id: 'proj-obs-hpa',
      titulo: 'Etapa 5: crescer pelas requisições',
      dificuldade: 'dificil',
      existentes: docs(SERVICE, deployApi(PROBES)),
      resumo: `
        ${info(5)}
        <p>A API é leve em CPU mas recebe muitas requisições. O prometheus-adapter já publica a métrica <code>http_requests_per_second</code> de cada Pod;
        o HPA vai usá-la.</p>
        <ol>
          <li>No HPA <code>api</code> (de 2 a 10 réplicas), a métrica tem <code>type: Pods</code>, com <code>pods.metric.name: http_requests_per_second</code>.</li>
          <li>O alvo é <code>target.type: AverageValue</code> com <code>averageValue: "100"</code> (100 requisições por segundo em cada Pod).</li>
          <li>Em <code>behavior.scaleDown</code>, <code>stabilizationWindowSeconds: 300</code>.</li>
        </ol>
        <p><b>No cluster:</b> com 800 requisições por segundo no total, o HPA pede 8 réplicas; quando o tráfego cai, ele espera 5 minutos antes de reduzir.</p>`,
      inicial: `
        apiVersion: autoscaling/v2
        kind: HorizontalPodAutoscaler
        metadata:
          name: api
        spec:
          scaleTargetRef:
            apiVersion: apps/v1
            kind: Deployment
            name: api
          minReplicas: 2
          maxReplicas: 10
          metrics:
            - type:            # TODO: Pods
              pods:
                metric:
                  name: http_requests_per_second
                target:
                  # TODO: AverageValue com averageValue "100" (passo 2)
          # TODO: behavior.scaleDown com stabilizationWindowSeconds 300 (passo 3)
      `,
      dica: [
        'É o HPA v2 de Recursos Avançados, com uma métrica do tipo Pods em vez de Resource.',
        'O averageValue é texto (uma quantidade): "100".',
        'type: Pods\n...\ntarget:\n  type: AverageValue\n  averageValue: "100"\n...\nbehavior:\n  scaleDown:\n    stabilizationWindowSeconds: 300',
      ],
      solucao: `
        apiVersion: autoscaling/v2
        kind: HorizontalPodAutoscaler
        metadata:
          name: api
        spec:
          scaleTargetRef:
            apiVersion: apps/v1
            kind: Deployment
            name: api
          minReplicas: 2
          maxReplicas: 10
          metrics:
            - type: Pods
              pods:
                metric:
                  name: http_requests_per_second
                target:
                  type: AverageValue
                  averageValue: "100"
          behavior:
            scaleDown:
              stabilizationWindowSeconds: 300
      `,
      testes: [
        teste({ descricao: 'O HPA usa a métrica de requisições', dica: 'Em metrics: type: Pods e pods.metric.name: http_requests_per_second.' },
          campo('HorizontalPodAutoscaler', 'api', 'spec.metrics[0].type', { valor: 'Pods' })),
        teste({ descricao: 'Mira 100 requisições por segundo por Pod', dica: 'Em target: type: AverageValue e averageValue: "100".' },
          campo('HorizontalPodAutoscaler', 'api', 'spec.metrics[0].pods.target.type', { valor: 'AverageValue' }),
          campo('HorizontalPodAutoscaler', 'api', 'spec.metrics[0].pods.target.averageValue', { valor: '100' })),
        teste({ descricao: 'Espera 5 minutos para reduzir', dica: 'Em behavior.scaleDown: stabilizationWindowSeconds: 300.' },
          campo('HorizontalPodAutoscaler', 'api', 'spec.behavior.scaleDown.stabilizationWindowSeconds', { valor: 300 })),
      ],
    }),
  ],
  ocultos: {
    'proj-obs-api': { dica: 'O Service continua com a porta 80 e a label do app.', regras: [campo('Service', 'api', 'spec.ports[0].port', { valor: 80 }), campo('Service', 'api', 'metadata.labels.app', { valor: 'api' })] },
    'proj-obs-servicemonitor': { dica: 'Confira o caminho da coleta.', regras: [campo('ServiceMonitor', 'api', 'spec.endpoints[0].path', { valor: '/metrics' })] },
    'proj-obs-alerta': { dica: 'A regra fica no grupo api, e a expressão continua a do esqueleto.', regras: [campo('PrometheusRule', 'api-alertas', 'spec.groups[0].name', { valor: 'api' }), campo('PrometheusRule', 'api-alertas', 'spec.groups[0].rules[0].expr', { contem: 'histogram_quantile(0.95' })] },
    'proj-obs-probes': { dica: 'As probes usam a porta pelo nome.', regras: [campo('Deployment', 'api', 'spec.template.spec.containers[name=api].readinessProbe.httpGet.port', { valor: 'http' }), campo('Deployment', 'api', 'spec.template.spec.containers[name=api].startupProbe.httpGet.path', { valor: '/healthz' })] },
    'proj-obs-hpa': { dica: 'Confira o nome da métrica e os limites de réplicas.', regras: [campo('HorizontalPodAutoscaler', 'api', 'spec.metrics[0].pods.metric.name', { valor: 'http_requests_per_second' }), campo('HorizontalPodAutoscaler', 'api', 'spec.maxReplicas', { valor: 10 })] },
  },
};
