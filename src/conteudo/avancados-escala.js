// Recursos Avançados: escala automática, probes e limites de recursos.
// Segue docs/didatica.md: lição com exemplo comentado, passos, esqueleto, dicas e "como corrigir".
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
      <p>Três peças trabalham juntas para a aplicação aguentar o tráfego sem cair. Você já viu cada uma nos Fundamentos;
      aqui elas ganham os detalhes de produção.</p>
      <ul>
        <li><b>requests e limits</b>: o <b>request</b> é a reserva de mesa no restaurante (o scheduler só põe o Pod num nó
          com espaço para a reserva); o <b>limit</b> é o máximo que o Pod pode consumir. Passou do limite de memória, o
          container é encerrado (<code>OOMKilled</code>); passou do de CPU, ele fica mais lento.</li>
        <li><b>HorizontalPodAutoscaler (HPA)</b>: o gerente que chama mais garçons quando o salão enche. Em
          <code>autoscaling/v2</code>, cada métrica é um item de <code>spec.metrics</code> com um alvo, por exemplo 60% de uso
          de CPU <i>em relação ao request</i>. Sem request, o HPA não consegue calcular a porcentagem.</li>
        <li><b>behavior</b> do HPA: evita o "sanfona" (sobe, desce, sobe...). <code>scaleDown.stabilizationWindowSeconds: 300</code>
          espera 5 minutos de folga antes de reduzir réplicas.</li>
        <li><b>Probes</b>: <code>startupProbe</code> dá tempo para aplicações lentas subirem (as outras probes só começam depois
          dela); <code>livenessProbe</code> reinicia o que travou; <code>readinessProbe</code> tira do Service quem ainda não
          está pronto. O tempo máximo da startupProbe é <code>periodSeconds × failureThreshold</code>.</li>
        <li><b>LimitRange</b> define requests e limits padrão para quem esqueceu de declarar (e um máximo por container);
          <b>ResourceQuota</b> é o teto de gastos do namespace inteiro.</li>
      </ul>`,
    `
      # Um HPA com duas métricas e calma para reduzir
      apiVersion: autoscaling/v2
      kind: HorizontalPodAutoscaler
      metadata:
        name: restaurante
      spec:
        scaleTargetRef:
          apiVersion: apps/v1
          kind: Deployment
          name: restaurante
        minReplicas: 2
        maxReplicas: 6
        metrics:                       # cada item é uma métrica
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 70 # 70% da CPU reservada
        behavior:
          scaleDown:
            stabilizationWindowSeconds: 120   # espera 2 min estável antes de reduzir
    `),

    exercicio({
      id: 'escala-hpa-v2-comportamento',
      titulo: 'HPA v2 com CPU, memória e behavior',
      dificuldade: 'medio',
      existentes: DEPLOY_LOJA,
      resumo: `
        <p>O Deployment <code>loja</code> já está no cluster, com requests de CPU e memória. Crie um HPA que olhe as duas
        métricas e não fique subindo e descendo à toa.</p>
        <ol>
          <li>O HPA <code>loja</code> (<code>autoscaling/v2</code>) escala o Deployment <code>loja</code> entre <b>2</b> e <b>8</b> réplicas.</li>
          <li>Primeira métrica: <code>cpu</code> com <code>averageUtilization: 60</code>.</li>
          <li>Segunda métrica (outro item de <code>metrics</code>): <code>memory</code> com <code>averageUtilization: 75</code>.</li>
          <li>Em <code>behavior.scaleDown</code>, <code>stabilizationWindowSeconds: 300</code>.</li>
        </ol>
        <p><b>No cluster:</b> o HPA calcula as réplicas necessárias para cada métrica e usa a <b>maior</b>. Para reduzir, espera
        5 minutos de uso baixo.</p>`,
      inicial: `
        apiVersion: autoscaling/v2
        kind: HorizontalPodAutoscaler
        metadata:
          name: loja
        spec:
          scaleTargetRef:
            apiVersion: apps/v1
            kind: Deployment
            name: loja
          minReplicas:         # TODO: 2
          maxReplicas:         # TODO: 8
          metrics:
            - type: Resource
              resource:
                name: cpu
                target:
                  type: Utilization
                  averageUtilization:   # TODO: 60
            # TODO: o segundo item, igual ao de cima, com name: memory e averageUtilization: 75
          # TODO: behavior.scaleDown.stabilizationWindowSeconds: 300
      `,
      dica: [
        'Releia o exemplo da lição: ele tem uma métrica; você precisa de duas e do behavior.',
        'Copie o item da CPU (do "- type: Resource" até averageUtilization) e troque cpu por memory e 60 por 75.',
        'behavior:\n  scaleDown:\n    stabilizationWindowSeconds: 300',
      ],
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
        teste({ descricao: 'O HPA escala o Deployment loja de 2 a 8', dica: 'minReplicas: 2 e maxReplicas: 8 (preencha os TODO).' },
          { tipo: 'hpa-configurado', hpa: 'loja', target: 'loja', min: 2, max: 8 }),
        teste({ descricao: 'CPU a 60% e memória a 75%', dica: 'Dois itens em metrics: cpu com averageUtilization: 60 e memory com averageUtilization: 75.' },
          campo('HorizontalPodAutoscaler', 'loja', 'spec.metrics[resource.name=cpu].resource.target.averageUtilization', { valor: 60 }),
          campo('HorizontalPodAutoscaler', 'loja', 'spec.metrics[resource.name=memory].resource.target.averageUtilization', { valor: 75 })),
        teste({ descricao: 'A redução espera 300 segundos', dica: 'Em spec (alinhado com metrics): behavior.scaleDown.stabilizationWindowSeconds: 300.' },
          campo('HorizontalPodAutoscaler', 'loja', 'spec.behavior.scaleDown.stabilizationWindowSeconds', { valor: 300 })),
      ],
    }),

    exercicio({
      id: 'saude-startup-probe',
      titulo: 'startupProbe para uma aplicação lenta',
      dificuldade: 'medio',
      resumo: `
        <p>O sistema <b>legado</b> leva até 5 minutos para subir, e a livenessProbe o reinicia antes disso: ele nunca chega a
        funcionar. A <code>startupProbe</code> resolve, segurando as outras probes até a aplicação subir.</p>
        <ol>
          <li>No container <code>legado</code>, crie a <code>startupProbe</code>: <code>httpGet</code> em <code>/healthz</code> na
            porta 8080, <code>periodSeconds: 10</code> e <code>failureThreshold: 30</code> (10 × 30 = até 300 segundos).</li>
          <li>Crie a <code>livenessProbe</code>: <code>httpGet</code> em <code>/healthz</code> na porta 8080.</li>
          <li>Crie a <code>readinessProbe</code>: <code>httpGet</code> em <code>/ready</code> na porta 8080.</li>
        </ol>
        <p><b>No cluster:</b> o kubelet pergunta a cada 10 s se a aplicação subiu; só quando a startupProbe passa é que a liveness
        e a readiness começam. Se em 300 s não subir, aí sim o container é reiniciado.</p>`,
      inicial: `
        apiVersion: apps/v1
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
                      path:        # TODO: /healthz
                      port: 8080
                    periodSeconds:       # TODO: 10
                    failureThreshold:    # TODO: 30
                  # TODO: livenessProbe com httpGet em /healthz, porta 8080
                  # TODO: readinessProbe com httpGet em /ready, porta 8080
      `,
      dica: [
        'As três probes têm o mesmo formato e ficam alinhadas com ports, dentro do container.',
        'livenessProbe:\n  httpGet:\n    path: /healthz\n    port: 8080',
      ],
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
        teste({ descricao: 'A startupProbe dá 300 segundos para subir', dica: 'Na startupProbe: path /healthz, periodSeconds: 10 e failureThreshold: 30.' },
          campo('Deployment', 'legado', 'spec.template.spec.containers[name=legado].startupProbe.httpGet.path', { valor: '/healthz' }),
          campo('Deployment', 'legado', 'spec.template.spec.containers[name=legado].startupProbe.failureThreshold', { valor: 30 }),
          campo('Deployment', 'legado', 'spec.template.spec.containers[name=legado].startupProbe.periodSeconds', { valor: 10 })),
        teste({ descricao: 'A livenessProbe e a readinessProbe estão configuradas', dica: 'livenessProbe com path /healthz e readinessProbe com path /ready, as duas na porta 8080.' },
          { tipo: 'probe-configurada', pod: 'legado', container: 'legado', tipoProbe: 'liveness', path: '/healthz' },
          { tipo: 'probe-configurada', pod: 'legado', container: 'legado', tipoProbe: 'readiness', path: '/ready' }),
      ],
    }),

    exercicio({
      id: 'recursos-limitrange',
      titulo: 'LimitRange e ResourceQuota no namespace',
      dificuldade: 'dificil',
      resumo: `
        <p>O namespace <code>equipe-a</code> precisa de regras de consumo: valores padrão para quem esquecer de declarar e um
        teto para o time todo.</p>
        <ol>
          <li>Crie o Namespace <code>equipe-a</code>.</li>
          <li>Crie o LimitRange <code>padroes</code> no namespace, com um item em <code>spec.limits</code> de <code>type: Container</code>:
            <code>defaultRequest</code> de <code>100m</code> de CPU e <code>128Mi</code>; <code>default</code> (o limit padrão) de
            <code>500m</code> e <code>256Mi</code>; <code>max</code> de <code>"1"</code> CPU e <code>1Gi</code>.</li>
          <li>Crie a ResourceQuota <code>cota</code> no namespace com <code>requests.cpu: "4"</code>, <code>requests.memory: 8Gi</code>,
            <code>limits.cpu: "8"</code>, <code>limits.memory: 16Gi</code> e <code>pods: "20"</code>.</li>
        </ol>
        <p><b>No cluster:</b> um Pod sem resources ganha os valores padrão do LimitRange; um Pod que peça mais que o
        <code>max</code>, ou que faça a soma passar da cota, é recusado pelo API Server.</p>`,
      inicial: `
        apiVersion: v1
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
              defaultRequest:  # o request de quem não declarou
                cpu:           # TODO: 100m
                memory:        # TODO: 128Mi
              # TODO: default (cpu 500m, memory 256Mi) e max (cpu "1", memory 1Gi)
        ---
        apiVersion: v1
        kind: ResourceQuota
        metadata:
          name: cota
          namespace: equipe-a
        spec:
          hard:
            # TODO: requests.cpu "4", requests.memory 8Gi, limits.cpu "8", limits.memory 16Gi e pods "20"
      `,
      dica: [
        'Releia a lição "ResourceQuota: o orçamento do namespace", dos Fundamentos: o hard da cota tem o mesmo formato.',
        'default e max ficam alinhados com defaultRequest, cada um com cpu e memory dentro.',
        'Os nomes com ponto (requests.cpu) são chaves normais: requests.cpu: "4".',
      ],
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
        teste({ descricao: 'O namespace equipe-a existe', dica: 'Mantenha o primeiro documento, kind: Namespace com name: equipe-a.' }, existe('Namespace', 'equipe-a')),
        teste({ descricao: 'O LimitRange define os padrões dos containers', dica: 'No item type: Container: defaultRequest (100m, 128Mi), default (500m, 256Mi) e max (1, 1Gi).' },
          campo('LimitRange', 'padroes', 'metadata.namespace', { valor: 'equipe-a' }),
          campo('LimitRange', 'padroes', 'spec.limits[type=Container].defaultRequest.cpu', { valor: '100m' }),
          campo('LimitRange', 'padroes', 'spec.limits[type=Container].default.memory', { valor: '256Mi' }),
          campo('LimitRange', 'padroes', 'spec.limits[type=Container].max.memory', { valor: '1Gi' })),
        teste({ descricao: 'A ResourceQuota limita o namespace', dica: 'Em spec.hard da cota: requests.memory: 8Gi e pods: "20" (com aspas), entre os outros.' },
          campo('ResourceQuota', 'cota', 'metadata.namespace', { valor: 'equipe-a' }),
          campo('ResourceQuota', 'cota', 'spec.hard["requests.memory"]', { valor: '8Gi' }),
          campo('ResourceQuota', 'cota', 'spec.hard.pods', { valor: '20' })),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'escala-hpa-v2-comportamento': { dica: 'Releia os passos: algum valor pedido no HorizontalPodAutoscaler loja ainda não confere.', regras: [campo('HorizontalPodAutoscaler', 'loja', 'spec.metrics[0].resource.target.type', { valor: 'Utilization' }), campo('HorizontalPodAutoscaler', 'loja', 'spec.scaleTargetRef.kind', { valor: 'Deployment' })] },
    'saude-startup-probe': { dica: 'Releia os passos: algum valor pedido no Deployment legado ainda não confere.', regras: [campo('Deployment', 'legado', 'spec.template.spec.containers[name=legado].image', { valor: 'registry.example.com/legado:2.3' }), campo('Deployment', 'legado', 'spec.selector.matchLabels.app', { valor: 'legado' })] },
    'recursos-limitrange': { dica: 'Releia os passos: algum valor pedido no LimitRange padroes ainda não confere.', regras: [campo('LimitRange', 'padroes', 'spec.limits[0].type', { valor: 'Container' }), campo('LimitRange', 'padroes', 'spec.limits[0].defaultRequest.memory', { valor: '128Mi' })] },
  },
};
