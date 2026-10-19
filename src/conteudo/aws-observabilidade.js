// Módulo AWS, tópico 5: observabilidade e segurança no EKS (CloudWatch com Fluent Bit, ADOT e
// OpenTelemetry, Pod Security Standards e segredos do AWS Secrets Manager via CSI).
// Segue docs/didatica.md: lição com exemplo comentado, passos, esqueleto, dicas e "como corrigir".
import { licao, exercicio, teste, existe, campo, docs } from './util.js';

const ROLE_BANCO = 'arn:aws:iam::123456789012:role/LojaBanco';

const CONFIG_FLUENT = `
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: fluent-bit-cluster-info
    namespace: amazon-cloudwatch
  data:
    cluster.name: loja-prod
    logs.region: us-east-1
    http.server: "On"
    http.port: "2020"
    read.head: "Off"
    read.tail: "On"
`;

const NS_RESTRITO = `
  apiVersion: v1
  kind: Namespace
  metadata:
    name: pagamentos
    labels:
      pod-security.kubernetes.io/enforce: restricted
`;

/** A SecretProviderClass do banco (Secrets Manager); `extra` entra no fim do spec. */
const spcBanco = (extra = '') => `
  apiVersion: secrets-store.csi.x-k8s.io/v1
  kind: SecretProviderClass
  metadata:
    name: banco-aws
  spec:
    provider: aws
    parameters:
      objects: |
        - objectName: "prod/loja/banco"
          objectType: "secretsmanager"
${extra}`;

const SA_BANCO = `
  apiVersion: v1
  kind: ServiceAccount
  metadata:
    name: loja-banco
    annotations:
      eks.amazonaws.com/role-arn: ${ROLE_BANCO}
`;

export const awsObservabilidade = {
  id: 'aws-observabilidade',
  titulo: 'Observabilidade e segurança no EKS',
  itens: [
    licao('eks-observabilidade-licao', 'Observabilidade no EKS: logs, métricas e traces', 'medio', `
      <p>Observar um cluster é como ter o <b>painel e a caixa-preta de um avião</b>: os <b>logs</b> contam o que aconteceu,
      as <b>métricas</b> mostram os ponteiros (CPU, memória, requisições) e os <b>traces</b> seguem uma requisição de serviço em
      serviço. Na AWS, tudo vai para o <b>CloudWatch</b> e para o <b>X-Ray</b>.</p>
      <ul>
        <li><b>Container Insights</b> (o add-on <code>amazon-cloudwatch-observability</code>): coleta métricas de nós, Pods e
          containers e manda os logs com o <b>Fluent Bit</b>, que roda como DaemonSet (um coletor por nó, lendo
          <code>/var/log</code>). O ConfigMap <code>fluent-bit-cluster-info</code> diz o nome do cluster e a região.</li>
        <li><b>ADOT</b> (AWS Distro for OpenTelemetry): a versão da AWS do <b>OpenTelemetry</b>. O operador cria coletores a
          partir do recurso <code>OpenTelemetryCollector</code>: <code>mode</code> (<code>deployment</code>,
          <code>daemonset</code>, <code>sidecar</code>) e <code>config</code> com <b>receivers</b> (de onde chegam os dados),
          <b>exporters</b> (para onde vão: <code>awsxray</code>, <code>awsemf</code> para o CloudWatch) e
          <b>pipelines</b> (quem liga em quem).</li>
        <li>O recurso <code>Instrumentation</code> mais a annotation <code>instrumentation.opentelemetry.io/inject-java: "true"</code>
          no Pod instrumentam a aplicação <b>sem mudar o código</b>: o operador injeta o agente do OpenTelemetry.</li>
      </ul>
      <p><b>No cluster:</b> os Pods do Fluent Bit e do coletor aparecem em <code>kubectl get pods -n amazon-cloudwatch</code>, e
      os dados chegam ao CloudWatch e ao X-Ray em poucos segundos.</p>`,
    `
      # Um coletor do ADOT que recebe traces em OTLP e manda ao X-Ray
      apiVersion: opentelemetry.io/v1beta1
      kind: OpenTelemetryCollector
      metadata:
        name: adot
      spec:
        mode: deployment                # um Deployment com o coletor
        serviceAccount: adot-collector  # com permissão no X-Ray (IRSA)
        config:
          receivers:                    # de onde chegam os dados
            otlp:
              protocols:
                grpc:
                  endpoint: 0.0.0.0:4317
          exporters:                    # para onde vão
            awsxray:
              region: us-east-1
          service:
            pipelines:                  # quem liga em quem
              traces:
                receivers: [otlp]
                exporters: [awsxray]
    `),

    exercicio({
      id: 'eks-fluentbit-config',
      titulo: 'Fluent Bit sabendo o nome do cluster',
      dificuldade: 'facil',
      resumo: `
        <p>O Fluent Bit do Container Insights lê o nome do cluster e a região de um ConfigMap. Sem ele, os logs não sabem para qual
        grupo do CloudWatch ir.</p>
        <ol>
          <li>Crie o ConfigMap <code>fluent-bit-cluster-info</code> no namespace <code>amazon-cloudwatch</code>.</li>
          <li>Em <code>data</code>: <code>cluster.name: loja-prod</code> e <code>logs.region: us-east-1</code>.</li>
          <li>Também: <code>http.server: "On"</code>, <code>http.port: "2020"</code>, <code>read.head: "Off"</code> e <code>read.tail: "On"</code>.</li>
        </ol>
        <p><b>No cluster:</b> os logs dos containers vão para o grupo <code>/aws/containerinsights/loja-prod/application</code> do CloudWatch,
        só com as linhas novas (read.tail), sem reenviar o arquivo inteiro.</p>`,
      inicial: `
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: fluent-bit-cluster-info
          namespace: amazon-cloudwatch
        data:
          # TODO: cluster.name e logs.region (passo 2)
          http.server: "On"
          http.port: "2020"
          # TODO: read.head "Off" e read.tail "On" (passo 3)
      `,
      dica: [
        'As chaves têm ponto no nome (cluster.name), e isso é permitido em ConfigMaps.',
        'Valores de ConfigMap são texto: "On", "Off" e "2020" entre aspas.',
        'cluster.name: loja-prod\nlogs.region: us-east-1\nread.head: "Off"\nread.tail: "On"',
      ],
      solucao: CONFIG_FLUENT,
      testes: [
        teste({ descricao: 'O ConfigMap diz o nome do cluster', dica: 'Em data, escreva cluster.name: loja-prod.' },
          { tipo: 'configmap-contem', configmap: 'fluent-bit-cluster-info', chave: 'cluster.name', valor: 'loja-prod' }),
        teste({ descricao: 'O ConfigMap diz a região', dica: 'Em data, escreva logs.region: us-east-1.' },
          { tipo: 'configmap-contem', configmap: 'fluent-bit-cluster-info', chave: 'logs.region', valor: 'us-east-1' }),
        teste({ descricao: 'Lê só as linhas novas', dica: 'Em data: read.head: "Off" e read.tail: "On".' },
          { tipo: 'configmap-contem', configmap: 'fluent-bit-cluster-info', chave: 'read.tail', valor: 'On' }),
      ],
    }),

    exercicio({
      id: 'eks-fluentbit-daemonset',
      titulo: 'DaemonSet do Fluent Bit lendo a região do ConfigMap',
      dificuldade: 'medio',
      existentes: CONFIG_FLUENT,
      resumo: `
        <p>O ConfigMap <code>fluent-bit-cluster-info</code> já existe. O DaemonSet do Fluent Bit precisa ler <code>/var/log</code> de
        cada nó e pegar a região do ConfigMap, em vez de escrevê-la de novo.</p>
        <ol>
          <li>No container <code>fluent-bit</code>, a variável <code>AWS_REGION</code> vem de <code>valueFrom.configMapKeyRef</code>
            com <code>name: fluent-bit-cluster-info</code> e <code>key: logs.region</code>.</li>
          <li>O volume <code>varlog</code> é um <code>hostPath</code> com <code>path: /var/log</code>.</li>
          <li>Monte <code>varlog</code> em <code>/var/log</code>, com <code>readOnly: true</code>.</li>
        </ol>
        <p><b>No cluster:</b> um Pod do Fluent Bit nasce em cada nó (inclusive nos novos que o Karpenter criar) e envia os logs daquele nó
        para a região do ConfigMap.</p>`,
      inicial: `
        apiVersion: apps/v1
        kind: DaemonSet
        metadata:
          name: fluent-bit
          namespace: amazon-cloudwatch
        spec:
          selector:
            matchLabels:
              app: fluent-bit
          template:
            metadata:
              labels:
                app: fluent-bit
            spec:
              serviceAccountName: fluent-bit
              tolerations:
                - operator: Exists
              containers:
                - name: fluent-bit
                  image: public.ecr.aws/aws-observability/aws-for-fluent-bit:2.32.2
                  env:
                    - name: AWS_REGION
                      # TODO: valueFrom.configMapKeyRef com o ConfigMap e a chave logs.region
                  volumeMounts:
                    - name: varlog
                      mountPath: /var/log
                      # TODO: readOnly: true
              volumes:
                - name: varlog
                  # TODO: hostPath com path /var/log
      `,
      dica: [
        'É a mesma variável vinda de ConfigMap dos Fundamentos, e o mesmo hostPath do coletor de logs de Recursos Avançados.',
        'configMapKeyRef tem name (o ConfigMap) e key (a chave dentro dele).',
        'valueFrom:\n  configMapKeyRef:\n    name: fluent-bit-cluster-info\n    key: logs.region\n...\nhostPath:\n  path: /var/log',
      ],
      solucao: `
        apiVersion: apps/v1
        kind: DaemonSet
        metadata:
          name: fluent-bit
          namespace: amazon-cloudwatch
        spec:
          selector:
            matchLabels:
              app: fluent-bit
          template:
            metadata:
              labels:
                app: fluent-bit
            spec:
              serviceAccountName: fluent-bit
              tolerations:
                - operator: Exists
              containers:
                - name: fluent-bit
                  image: public.ecr.aws/aws-observability/aws-for-fluent-bit:2.32.2
                  env:
                    - name: AWS_REGION
                      valueFrom:
                        configMapKeyRef:
                          name: fluent-bit-cluster-info
                          key: logs.region
                  volumeMounts:
                    - name: varlog
                      mountPath: /var/log
                      readOnly: true
              volumes:
                - name: varlog
                  hostPath:
                    path: /var/log
      `,
      testes: [
        teste({ descricao: 'A região vem do ConfigMap', dica: 'Em env AWS_REGION: valueFrom.configMapKeyRef com name: fluent-bit-cluster-info e key: logs.region.' },
          existe('DaemonSet', 'fluent-bit'),
          campo('DaemonSet', 'fluent-bit', 'spec.template.spec.containers[0].env[name=AWS_REGION].valueFrom.configMapKeyRef.key', { valor: 'logs.region' })),
        teste({ descricao: 'Lê /var/log do nó', dica: 'No volume varlog, escreva hostPath com path: /var/log.' },
          campo('DaemonSet', 'fluent-bit', 'spec.template.spec.volumes[name=varlog].hostPath.path', { valor: '/var/log' })),
        teste({ descricao: 'Só lê, não escreve nos logs do nó', dica: 'No volumeMounts de varlog, escreva readOnly: true.' },
          campo('DaemonSet', 'fluent-bit', 'spec.template.spec.containers[0].volumeMounts[name=varlog].readOnly', { valor: true })),
      ],
    }),

    exercicio({
      id: 'eks-adot-collector',
      titulo: 'Coletor do ADOT mandando traces ao X-Ray',
      dificuldade: 'medio',
      resumo: `
        <p>As aplicações já mandam traces em OTLP. Falta o coletor do ADOT entregar ao X-Ray.</p>
        <ol>
          <li>No <code>OpenTelemetryCollector</code> <code>adot</code>, escreva <code>mode: deployment</code>.</li>
          <li>Em <code>config.exporters</code>, o exporter <code>awsxray</code> com <code>region: us-east-1</code>.</li>
          <li>Em <code>config.service.pipelines.traces</code>: <code>receivers: [otlp]</code> e <code>exporters: [awsxray]</code>.</li>
        </ol>
        <p><b>No cluster:</b> o operador cria o Deployment <code>adot-collector</code> e o Service <code>adot-collector</code> na porta 4317.
        Cada trace recebido aparece no mapa de serviços do X-Ray.</p>`,
      inicial: `
        apiVersion: opentelemetry.io/v1beta1
        kind: OpenTelemetryCollector
        metadata:
          name: adot
        spec:
          mode:                # TODO: deployment
          serviceAccount: adot-collector
          config:
            receivers:
              otlp:
                protocols:
                  grpc:
                    endpoint: 0.0.0.0:4317
            # TODO: exporters com awsxray na região us-east-1 (passo 2)
            service:
              pipelines:
                traces:
                  receivers: [otlp]
                  exporters:   # TODO: [awsxray]
      `,
      dica: [
        'O exemplo da lição "Observabilidade no EKS" tem o coletor completo.',
        'exporters fica alinhado com receivers, dentro de config.',
        'mode: deployment\n...\nexporters:\n  awsxray:\n    region: us-east-1\n...\nexporters: [awsxray]',
      ],
      solucao: `
        apiVersion: opentelemetry.io/v1beta1
        kind: OpenTelemetryCollector
        metadata:
          name: adot
        spec:
          mode: deployment
          serviceAccount: adot-collector
          config:
            receivers:
              otlp:
                protocols:
                  grpc:
                    endpoint: 0.0.0.0:4317
            exporters:
              awsxray:
                region: us-east-1
            service:
              pipelines:
                traces:
                  receivers: [otlp]
                  exporters: [awsxray]
      `,
      testes: [
        teste({ descricao: 'O coletor roda como Deployment', dica: 'Em spec, escreva mode: deployment.' },
          existe('OpenTelemetryCollector', 'adot'),
          campo('OpenTelemetryCollector', 'adot', 'spec.mode', { valor: 'deployment' })),
        teste({ descricao: 'Tem o exporter do X-Ray', dica: 'Em config.exporters, crie awsxray com region: us-east-1.' },
          campo('OpenTelemetryCollector', 'adot', 'spec.config.exporters.awsxray.region', { valor: 'us-east-1' })),
        teste({ descricao: 'O pipeline de traces termina no X-Ray', dica: 'Em service.pipelines.traces, escreva exporters: [awsxray].' },
          campo('OpenTelemetryCollector', 'adot', 'spec.config.service.pipelines.traces.exporters', { contem: 'awsxray' })),
      ],
    }),

    exercicio({
      id: 'eks-instrumentation',
      titulo: 'Traces de uma aplicação Java sem mudar o código',
      dificuldade: 'dificil',
      resumo: `
        <p>A API de pedidos é Java e ninguém quer mexer no código só para ter traces. O operador do OpenTelemetry injeta o agente sozinho.</p>
        <ol>
          <li>Crie o <code>Instrumentation</code> <code>java-padrao</code> com <code>exporter.endpoint: http://adot-collector:4317</code>.</li>
          <li>Em <code>propagators</code>, a lista <code>tracecontext</code> e <code>baggage</code>.</li>
          <li>No Deployment <code>pedidos</code>, em <code>template.metadata.annotations</code>, escreva
            <code>instrumentation.opentelemetry.io/inject-java: "true"</code>.</li>
        </ol>
        <p><b>No cluster:</b> quando os Pods de pedidos são recriados, o operador acrescenta um init container que copia o agente Java e
        ajusta <code>JAVA_TOOL_OPTIONS</code>. Os traces vão para o coletor e de lá para o X-Ray.</p>`,
      inicial: `
        apiVersion: opentelemetry.io/v1alpha1
        kind: Instrumentation
        metadata:
          name: java-padrao
        spec:
          exporter:
            endpoint:          # TODO: http://adot-collector:4317
          # TODO: propagators com tracecontext e baggage
        ---
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: pedidos
        spec:
          replicas: 2
          selector:
            matchLabels:
              app: pedidos
          template:
            metadata:
              labels:
                app: pedidos
              # TODO: annotations com instrumentation.opentelemetry.io/inject-java: "true"
            spec:
              containers:
                - name: pedidos
                  image: public.ecr.aws/docker/library/eclipse-temurin:21-jre
      `,
      dica: [
        'A annotation vai no template do Pod (template.metadata), e não no metadata do Deployment: quem é instrumentado é o Pod.',
        'propagators é uma lista no spec do Instrumentation, alinhada com exporter.',
        'exporter:\n  endpoint: http://adot-collector:4317\npropagators:\n  - tracecontext\n  - baggage\n...\nannotations:\n  instrumentation.opentelemetry.io/inject-java: "true"',
      ],
      solucao: `
        apiVersion: opentelemetry.io/v1alpha1
        kind: Instrumentation
        metadata:
          name: java-padrao
        spec:
          exporter:
            endpoint: http://adot-collector:4317
          propagators:
            - tracecontext
            - baggage
        ---
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: pedidos
        spec:
          replicas: 2
          selector:
            matchLabels:
              app: pedidos
          template:
            metadata:
              labels:
                app: pedidos
              annotations:
                instrumentation.opentelemetry.io/inject-java: "true"
            spec:
              containers:
                - name: pedidos
                  image: public.ecr.aws/docker/library/eclipse-temurin:21-jre
      `,
      testes: [
        teste({ descricao: 'O Instrumentation manda ao coletor', dica: 'Em spec.exporter, escreva endpoint: http://adot-collector:4317.' },
          campo('Instrumentation', 'java-padrao', 'spec.exporter.endpoint', { valor: 'http://adot-collector:4317' })),
        teste({ descricao: 'Propaga o contexto dos traces', dica: 'Em spec.propagators, a lista com tracecontext e baggage.' },
          campo('Instrumentation', 'java-padrao', 'spec.propagators', { contem: 'tracecontext' }),
          campo('Instrumentation', 'java-padrao', 'spec.propagators', { contem: 'baggage' })),
        teste({ descricao: 'Os Pods de pedidos recebem o agente Java', dica: 'Em template.metadata.annotations: instrumentation.opentelemetry.io/inject-java: "true".' },
          campo('Deployment', 'pedidos', 'spec.template.metadata.annotations["instrumentation.opentelemetry.io/inject-java"]', { valor: 'true' })),
      ],
    }),

    licao('eks-pss-licao', 'Pod Security Standards: regras de segurança por namespace', 'medio', `
      <p>Você já viu o <code>securityContext</code> nos Fundamentos. O <b>Pod Security Admission</b> (do próprio Kubernetes, ligado
      em todo EKS) é o <b>fiscal da obra</b> que confere esses campos na entrada: um Pod que não segue as regras do namespace
      nem é criado.</p>
      <ul>
        <li>Três níveis (os <b>Pod Security Standards</b>): <code>privileged</code> (sem regras), <code>baseline</code> (proíbe o
          perigoso: <code>privileged: true</code>, <code>hostNetwork</code>, volumes <code>hostPath</code>...) e
          <code>restricted</code> (o mais rígido).</li>
        <li>O <code>restricted</code> exige em cada container: <code>allowPrivilegeEscalation: false</code>,
          <code>capabilities.drop: ["ALL"]</code>, <code>runAsNonRoot: true</code> e
          <code>seccompProfile.type: RuntimeDefault</code>.</li>
        <li>O nível vai numa <b>label do Namespace</b>, em três modos: <code>pod-security.kubernetes.io/enforce</code> (recusa),
          <code>audit</code> (anota no log de auditoria) e <code>warn</code> (avisa no kubectl, mas deixa passar).</li>
        <li>Para migrar sem quebrar nada: <code>enforce</code> num nível mais leve e <code>warn</code>/<code>audit</code> no mais
          rígido, até ninguém mais receber aviso.</li>
      </ul>
      <p><b>No cluster:</b> um Pod que viola o nível <code>enforce</code> recebe <code>Error from server (Forbidden): ... violates
      PodSecurity "restricted:latest"</code>, com a lista do que falta.</p>`,
    `
      apiVersion: v1
      kind: Namespace
      metadata:
        name: pagamentos
        labels:
          # recusa qualquer Pod fora do nível restricted
          pod-security.kubernetes.io/enforce: restricted
      ---
      # Um Pod que passa no restricted
      apiVersion: v1
      kind: Pod
      metadata:
        name: api
        namespace: pagamentos
      spec:
        securityContext:
          runAsNonRoot: true              # nada de root
          seccompProfile:
            type: RuntimeDefault          # filtro de chamadas do sistema
        containers:
          - name: app
            image: nginxinc/nginx-unprivileged:1.27   # imagem que roda sem root
            securityContext:
              allowPrivilegeEscalation: false
              capabilities:
                drop: ["ALL"]             # tira todos os superpoderes
    `),

    exercicio({
      id: 'eks-pss-namespace',
      titulo: 'Namespace no nível restricted',
      dificuldade: 'facil',
      resumo: `
        <p>O namespace de pagamentos guarda dados de cartão. Nenhum Pod fora do nível mais rígido pode rodar lá.</p>
        <ol>
          <li>Crie o Namespace <code>pagamentos</code>.</li>
          <li>Em <code>metadata.labels</code>, <code>pod-security.kubernetes.io/enforce: restricted</code>.</li>
          <li>Acrescente <code>pod-security.kubernetes.io/warn: restricted</code>, para o kubectl avisar também.</li>
        </ol>
        <p><b>No cluster:</b> a partir de agora, todo Pod novo em <code>pagamentos</code> é conferido. Os que já rodavam continuam, mas o
        kubectl avisa quais violam.</p>`,
      inicial: `
        apiVersion: v1
        kind: Namespace
        metadata:
          name: pagamentos
          labels:
            # TODO: enforce restricted (passo 2)
            # TODO: warn restricted (passo 3)
      `,
      dica: [
        'O exemplo da lição "Pod Security Standards" começa com este Namespace.',
        'As duas labels começam com pod-security.kubernetes.io/ e terminam no modo: enforce e warn.',
        'labels:\n  pod-security.kubernetes.io/enforce: restricted\n  pod-security.kubernetes.io/warn: restricted',
      ],
      solucao: `
        apiVersion: v1
        kind: Namespace
        metadata:
          name: pagamentos
          labels:
            pod-security.kubernetes.io/enforce: restricted
            pod-security.kubernetes.io/warn: restricted
      `,
      testes: [
        teste({ descricao: 'O namespace recusa Pods fora do restricted', dica: 'Em metadata.labels, escreva pod-security.kubernetes.io/enforce: restricted.' },
          existe('Namespace', 'pagamentos'),
          campo('Namespace', 'pagamentos', 'metadata.labels["pod-security.kubernetes.io/enforce"]', { valor: 'restricted' })),
        teste({ descricao: 'O kubectl avisa as violações', dica: 'Em metadata.labels, escreva pod-security.kubernetes.io/warn: restricted.' },
          campo('Namespace', 'pagamentos', 'metadata.labels["pod-security.kubernetes.io/warn"]', { valor: 'restricted' })),
      ],
    }),

    exercicio({
      id: 'eks-pss-baseline-audit',
      titulo: 'Migrando um namespace antigo sem quebrar',
      dificuldade: 'medio',
      resumo: `
        <p>O namespace <code>legado</code> tem aplicações antigas que rodam como root. Elas não podem cair hoje, mas o time quer saber o
        que precisa mudar para chegar ao restricted.</p>
        <ol>
          <li>No Namespace <code>legado</code>, <code>pod-security.kubernetes.io/enforce: baseline</code> (recusa só o perigoso).</li>
          <li><code>pod-security.kubernetes.io/audit: restricted</code> (anota no log de auditoria).</li>
          <li><code>pod-security.kubernetes.io/warn: restricted</code> (avisa no kubectl).</li>
        </ol>
        <p><b>No cluster:</b> Pods privilegiados são recusados; os que rodam como root ainda entram, mas aparecem no log de auditoria do
        EKS (CloudWatch) e geram aviso a cada apply.</p>`,
      inicial: `
        apiVersion: v1
        kind: Namespace
        metadata:
          name: legado
          labels:
            pod-security.kubernetes.io/enforce:   # TODO: baseline
            # TODO: audit e warn no nível restricted
      `,
      dica: [
        'São três labels com o mesmo prefixo, uma por modo: enforce, audit e warn.',
        'O enforce fica no nível mais leve (baseline); audit e warn, no que se quer alcançar (restricted).',
        'pod-security.kubernetes.io/enforce: baseline\npod-security.kubernetes.io/audit: restricted\npod-security.kubernetes.io/warn: restricted',
      ],
      solucao: `
        apiVersion: v1
        kind: Namespace
        metadata:
          name: legado
          labels:
            pod-security.kubernetes.io/enforce: baseline
            pod-security.kubernetes.io/audit: restricted
            pod-security.kubernetes.io/warn: restricted
      `,
      testes: [
        teste({ descricao: 'Recusa só o perigoso', dica: 'Escreva pod-security.kubernetes.io/enforce: baseline (o valor vazio é recusado).' },
          campo('Namespace', 'legado', 'metadata.labels["pod-security.kubernetes.io/enforce"]', { valor: 'baseline' })),
        teste({ descricao: 'Audita e avisa no nível restricted', dica: 'Escreva as labels audit e warn com o valor restricted.' },
          campo('Namespace', 'legado', 'metadata.labels["pod-security.kubernetes.io/audit"]', { valor: 'restricted' }),
          campo('Namespace', 'legado', 'metadata.labels["pod-security.kubernetes.io/warn"]', { valor: 'restricted' })),
      ],
    }),

    exercicio({
      id: 'eks-pss-pod-restrito',
      titulo: 'Um Pod que passa no restricted',
      dificuldade: 'dificil',
      existentes: NS_RESTRITO,
      resumo: `
        <p>O namespace <code>pagamentos</code> já está no nível <code>restricted</code>. Aplique o esqueleto e veja o erro: ele lista tudo
        o que falta. Corrija até o Pod entrar.</p>
        <ol>
          <li>No spec do Pod <code>api</code>: <code>securityContext.runAsNonRoot: true</code> e
            <code>seccompProfile.type: RuntimeDefault</code>.</li>
          <li>No container <code>app</code>: <code>securityContext.allowPrivilegeEscalation: false</code>.</li>
          <li>Também no container: <code>capabilities.drop: ["ALL"]</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Pod Security Admission confere os quatro campos e deixa o Pod entrar. A imagem
        <code>nginxinc/nginx-unprivileged</code> já roda com um usuário comum, na porta 8080.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: api
          namespace: pagamentos
        spec:
          securityContext:
            # TODO: runAsNonRoot e seccompProfile (passo 1)
          containers:
            - name: app
              image: nginxinc/nginx-unprivileged:1.27
              ports:
                - containerPort: 8080
              securityContext:
                # TODO: allowPrivilegeEscalation (passo 2)
                # TODO: capabilities.drop (passo 3)
      `,
      dica: [
        'Aplique o esqueleto: a mensagem Forbidden diz exatamente quais campos faltam.',
        'runAsNonRoot e seccompProfile podem ficar no securityContext do Pod; allowPrivilegeEscalation e capabilities, no do container.',
        'securityContext:\n  runAsNonRoot: true\n  seccompProfile:\n    type: RuntimeDefault\n...\nsecurityContext:\n  allowPrivilegeEscalation: false\n  capabilities:\n    drop: ["ALL"]',
      ],
      solucao: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: api
          namespace: pagamentos
        spec:
          securityContext:
            runAsNonRoot: true
            seccompProfile:
              type: RuntimeDefault
          containers:
            - name: app
              image: nginxinc/nginx-unprivileged:1.27
              ports:
                - containerPort: 8080
              securityContext:
                allowPrivilegeEscalation: false
                capabilities:
                  drop: ["ALL"]
      `,
      testes: [
        teste({ descricao: 'O Pod foi aceito no namespace restricted', dica: 'Leia a mensagem Forbidden do apply e preencha cada campo que ela cita.' },
          existe('Pod', 'api')),
        teste({ descricao: 'Não roda como root e usa o seccomp padrão', dica: 'No securityContext do Pod: runAsNonRoot: true e seccompProfile.type: RuntimeDefault.' },
          campo('Pod', 'api', 'spec.securityContext.runAsNonRoot', { valor: true }),
          campo('Pod', 'api', 'spec.securityContext.seccompProfile.type', { valor: 'RuntimeDefault' })),
        teste({ descricao: 'O container não ganha superpoderes', dica: 'No securityContext do container: allowPrivilegeEscalation: false e capabilities.drop: ["ALL"].' },
          campo('Pod', 'api', 'spec.containers[name=app].securityContext.allowPrivilegeEscalation', { valor: false }),
          campo('Pod', 'api', 'spec.containers[name=app].securityContext.capabilities.drop', { contem: 'ALL' })),
      ],
    }),

    licao('eks-segredos-licao', 'Segredos da AWS: Secrets Manager no Pod', 'dificil', `
      <p>Um Secret do Kubernetes fica guardado no etcd do cluster. Muitas empresas preferem o <b>AWS Secrets Manager</b>: um
      <b>cofre</b> fora do cluster, com rotação automática de senhas e registro de quem leu. O Pod busca a senha no cofre na hora
      de subir.</p>
      <ul>
        <li>O <b>Secrets Store CSI Driver</b> com o provedor da AWS (ASCP) monta os segredos como <b>arquivos</b> num volume
          <code>csi</code> (<code>driver: secrets-store.csi.k8s.io</code>).</li>
        <li>A <b>SecretProviderClass</b> diz o que buscar: <code>provider: aws</code> e, em <code>parameters.objects</code>, um
          texto YAML com cada <code>objectName</code> e <code>objectType</code> (<code>secretsmanager</code> ou
          <code>ssmparameter</code>). Com <code>jmesPath</code>, uma chave de um segredo JSON vira um arquivo próprio.</li>
        <li>O Pod lê o cofre com a <b>identidade dele</b> (IRSA ou Pod Identity): a role precisa de
          <code>secretsmanager:GetSecretValue</code>.</li>
        <li><code>secretObjects</code> copia o segredo para um <b>Secret do Kubernetes</b>, para usar em variáveis de ambiente
          (a cópia só acontece enquanto algum Pod monta o volume).</li>
      </ul>
      <p><b>No cluster:</b> ao subir o Pod, o driver busca o segredo com a role da ServiceAccount e grava o arquivo em
      <code>/mnt/segredos</code>. Sem permissão no cofre, o Pod fica em <code>ContainerCreating</code> com o erro no describe.</p>`,
    `
      apiVersion: secrets-store.csi.x-k8s.io/v1
      kind: SecretProviderClass
      metadata:
        name: banco-aws
      spec:
        provider: aws                   # o provedor da AWS (ASCP)
        parameters:
          objects: |                    # um texto YAML com a lista do que buscar
            - objectName: "prod/loja/banco"
              objectType: "secretsmanager"
      ---
      # No Deployment, o volume que traz os arquivos do cofre:
      #   volumes:
      #     - name: segredos
      #       csi:
      #         driver: secrets-store.csi.k8s.io
      #         readOnly: true
      #         volumeAttributes:
      #           secretProviderClass: banco-aws
    `),

    exercicio({
      id: 'eks-secrets-manager-spc',
      titulo: 'SecretProviderClass do Secrets Manager',
      dificuldade: 'medio',
      resumo: `
        <p>A senha do banco da loja está no Secrets Manager com o nome <code>prod/loja/banco</code>. Diga ao driver como buscá-la.</p>
        <ol>
          <li>Crie a <code>SecretProviderClass</code> <code>banco-aws</code> com <code>provider: aws</code>.</li>
          <li>Em <code>parameters.objects</code>, depois do <code>|</code>, o item com <code>objectName: "prod/loja/banco"</code> e
            <code>objectType: "secretsmanager"</code>.</li>
        </ol>
        <p><b>No cluster:</b> nada é buscado ainda: o driver só lê o cofre quando um Pod monta um volume com esta classe.</p>`,
      inicial: `
        apiVersion: secrets-store.csi.x-k8s.io/v1
        kind: SecretProviderClass
        metadata:
          name: banco-aws
        spec:
          provider:            # TODO: aws
          parameters:
            # TODO: objects: | e, recuado embaixo, o item com objectName e objectType
      `,
      dica: [
        'O exemplo da lição "Segredos da AWS" tem esta classe.',
        'Depois de "objects: |", o texto é YAML: um item de lista com objectName e objectType, recuado.',
        'provider: aws\nparameters:\n  objects: |\n    - objectName: "prod/loja/banco"\n      objectType: "secretsmanager"',
      ],
      solucao: spcBanco(),
      testes: [
        teste({ descricao: 'A classe usa o provedor da AWS', dica: 'provider é obrigatório: escreva provider: aws.' },
          existe('SecretProviderClass', 'banco-aws'),
          campo('SecretProviderClass', 'banco-aws', 'spec.provider', { valor: 'aws' })),
        teste({ descricao: 'Busca o segredo prod/loja/banco', dica: 'Em parameters.objects, escreva o item com objectName: "prod/loja/banco".' },
          campo('SecretProviderClass', 'banco-aws', 'spec.parameters.objects', { contem: 'prod/loja/banco' })),
        teste({ descricao: 'O segredo é do Secrets Manager', dica: 'No item, escreva objectType: "secretsmanager".' },
          campo('SecretProviderClass', 'banco-aws', 'spec.parameters.objects', { contem: 'secretsmanager' })),
      ],
    }),

    exercicio({
      id: 'eks-secrets-manager-pod',
      titulo: 'Montando o segredo do cofre no Pod',
      dificuldade: 'dificil',
      existentes: docs(spcBanco(), SA_BANCO),
      resumo: `
        <p>A SecretProviderClass <code>banco-aws</code> e a ServiceAccount <code>loja-banco</code> (com IRSA na role que lê o cofre) já
        existem. Falta o Deployment montar o segredo.</p>
        <ol>
          <li>No Deployment <code>loja</code>, use <code>serviceAccountName: loja-banco</code>.</li>
          <li>Declare o volume <code>segredos</code> do tipo <code>csi</code>: <code>driver: secrets-store.csi.k8s.io</code>,
            <code>readOnly: true</code> e <code>volumeAttributes.secretProviderClass: banco-aws</code>.</li>
          <li>Monte <code>segredos</code> em <code>/mnt/segredos</code> com <code>readOnly: true</code>.</li>
        </ol>
        <p><b>No cluster:</b> o arquivo <code>/mnt/segredos/prod_loja_banco</code> aparece no container com a senha. Quando a senha é rotacionada
        no cofre, o driver atualiza o arquivo.</p>`,
      inicial: `
        apiVersion: apps/v1
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
              # TODO: a ServiceAccount com acesso ao cofre (passo 1)
              containers:
                - name: loja
                  image: nginx:1.27
                  volumeMounts:
                    - name: segredos
                      mountPath:   # TODO: /mnt/segredos
                      readOnly: true
              volumes:
                - name: segredos
                  # TODO: csi com driver, readOnly e volumeAttributes (passo 2)
      `,
      dica: [
        'O fim do exemplo da lição "Segredos da AWS" (nos comentários) mostra o volume csi.',
        'Sem a ServiceAccount do IRSA, o Pod não tem permissão no cofre e fica em ContainerCreating.',
        'serviceAccountName: loja-banco\n...\ncsi:\n  driver: secrets-store.csi.k8s.io\n  readOnly: true\n  volumeAttributes:\n    secretProviderClass: banco-aws',
      ],
      solucao: `
        apiVersion: apps/v1
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
              serviceAccountName: loja-banco
              containers:
                - name: loja
                  image: nginx:1.27
                  volumeMounts:
                    - name: segredos
                      mountPath: /mnt/segredos
                      readOnly: true
              volumes:
                - name: segredos
                  csi:
                    driver: secrets-store.csi.k8s.io
                    readOnly: true
                    volumeAttributes:
                      secretProviderClass: banco-aws
      `,
      testes: [
        teste({ descricao: 'Os Pods leem o cofre com a role certa', dica: 'Em template.spec, escreva serviceAccountName: loja-banco.' },
          campo('Deployment', 'loja', 'spec.template.spec.serviceAccountName', { valor: 'loja-banco' })),
        teste({ descricao: 'O volume vem do Secrets Store CSI', dica: 'No volume segredos: csi com driver: secrets-store.csi.k8s.io e secretProviderClass: banco-aws.' },
          campo('Deployment', 'loja', 'spec.template.spec.volumes[name=segredos].csi.driver', { valor: 'secrets-store.csi.k8s.io' }),
          campo('Deployment', 'loja', 'spec.template.spec.volumes[name=segredos].csi.volumeAttributes.secretProviderClass', { valor: 'banco-aws' })),
        teste({ descricao: 'O segredo aparece em /mnt/segredos', dica: 'No volumeMounts de segredos, mountPath: /mnt/segredos.' },
          { tipo: 'volume-montado', pod: 'loja', container: 'loja', volume: 'segredos', caminho: '/mnt/segredos' }),
      ],
    }),

    exercicio({
      id: 'eks-secrets-sync',
      titulo: 'Do cofre para uma variável de ambiente',
      dificuldade: 'dificil',
      existentes: SA_BANCO,
      resumo: `
        <p>A aplicação lê a senha da variável <code>DB_SENHA</code>, e não de um arquivo. O segredo no cofre é um JSON com a chave
        <code>senha</code>. O driver pode extrair a chave e copiá-la para um Secret do Kubernetes.</p>
        <ol>
          <li>Na SecretProviderClass <code>banco-aws</code>, o item de <code>objects</code> já tem um <code>jmesPath</code> que cria o arquivo <code>senha</code>.</li>
          <li>Em <code>secretObjects</code> (no spec): <code>secretName: banco-credenciais</code>, <code>type: Opaque</code> e, em
            <code>data</code>, <code>objectName: senha</code> com <code>key: senha</code>.</li>
          <li>No Deployment <code>loja</code>, a variável <code>DB_SENHA</code> vem de <code>secretKeyRef</code> com
            <code>name: banco-credenciais</code> e <code>key: senha</code>.</li>
        </ol>
        <p><b>No cluster:</b> quando o primeiro Pod monta o volume, o driver cria o Secret <code>banco-credenciais</code> e o kubelet preenche a
        variável. Por isso o volume csi continua no Deployment, mesmo que a aplicação não leia o arquivo.</p>`,
      inicial: `
        apiVersion: secrets-store.csi.x-k8s.io/v1
        kind: SecretProviderClass
        metadata:
          name: banco-aws
        spec:
          provider: aws
          parameters:
            objects: |
              - objectName: "prod/loja/banco"
                objectType: "secretsmanager"
                jmesPath:
                  - path: senha
                    objectAlias: senha
          # TODO: secretObjects com secretName banco-credenciais, type Opaque e data (passo 2)
        ---
        apiVersion: apps/v1
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
              serviceAccountName: loja-banco
              containers:
                - name: loja
                  image: nginx:1.27
                  env:
                    - name: DB_SENHA
                      # TODO: valueFrom.secretKeyRef com banco-credenciais e senha (passo 3)
                  volumeMounts:
                    - name: segredos
                      mountPath: /mnt/segredos
                      readOnly: true
              volumes:
                - name: segredos
                  csi:
                    driver: secrets-store.csi.k8s.io
                    readOnly: true
                    volumeAttributes:
                      secretProviderClass: banco-aws
      `,
      dica: [
        'secretObjects fica no spec da SecretProviderClass, alinhado com provider e parameters.',
        'O objectName do secretObjects é o nome do arquivo (o objectAlias do jmesPath).',
        'secretObjects:\n  - secretName: banco-credenciais\n    type: Opaque\n    data:\n      - objectName: senha\n        key: senha\n...\nvalueFrom:\n  secretKeyRef:\n    name: banco-credenciais\n    key: senha',
      ],
      solucao: `
        apiVersion: secrets-store.csi.x-k8s.io/v1
        kind: SecretProviderClass
        metadata:
          name: banco-aws
        spec:
          provider: aws
          parameters:
            objects: |
              - objectName: "prod/loja/banco"
                objectType: "secretsmanager"
                jmesPath:
                  - path: senha
                    objectAlias: senha
          secretObjects:
            - secretName: banco-credenciais
              type: Opaque
              data:
                - objectName: senha
                  key: senha
        ---
        apiVersion: apps/v1
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
              serviceAccountName: loja-banco
              containers:
                - name: loja
                  image: nginx:1.27
                  env:
                    - name: DB_SENHA
                      valueFrom:
                        secretKeyRef:
                          name: banco-credenciais
                          key: senha
                  volumeMounts:
                    - name: segredos
                      mountPath: /mnt/segredos
                      readOnly: true
              volumes:
                - name: segredos
                  csi:
                    driver: secrets-store.csi.k8s.io
                    readOnly: true
                    volumeAttributes:
                      secretProviderClass: banco-aws
      `,
      testes: [
        teste({ descricao: 'O driver copia a senha para o Secret banco-credenciais', dica: 'Em spec.secretObjects: secretName: banco-credenciais e type: Opaque.' },
          campo('SecretProviderClass', 'banco-aws', 'spec.secretObjects[0].secretName', { valor: 'banco-credenciais' }),
          campo('SecretProviderClass', 'banco-aws', 'spec.secretObjects[0].type', { valor: 'Opaque' })),
        teste({ descricao: 'A chave senha vem do arquivo senha', dica: 'Em secretObjects[0].data: objectName: senha e key: senha.' },
          campo('SecretProviderClass', 'banco-aws', 'spec.secretObjects[0].data[0].objectName', { valor: 'senha' }),
          campo('SecretProviderClass', 'banco-aws', 'spec.secretObjects[0].data[0].key', { valor: 'senha' })),
        teste({ descricao: 'DB_SENHA vem do Secret', dica: 'Em env DB_SENHA: valueFrom.secretKeyRef com name: banco-credenciais e key: senha.' },
          campo('Deployment', 'loja', 'spec.template.spec.containers[0].env[name=DB_SENHA].valueFrom.secretKeyRef.name', { valor: 'banco-credenciais' }),
          campo('Deployment', 'loja', 'spec.template.spec.containers[0].env[name=DB_SENHA].valueFrom.secretKeyRef.key', { valor: 'senha' })),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'eks-fluentbit-config': { dica: 'Confira as chaves do passo 3, uma a uma, com aspas.', regras: [{ tipo: 'configmap-contem', configmap: 'fluent-bit-cluster-info', chave: 'read.head', valor: 'Off' }, { tipo: 'configmap-contem', configmap: 'fluent-bit-cluster-info', chave: 'http.server', valor: 'On' }] },
    'eks-fluentbit-daemonset': { dica: 'Confira o nome do ConfigMap no configMapKeyRef e o caminho da montagem.', regras: [campo('DaemonSet', 'fluent-bit', 'spec.template.spec.containers[0].env[name=AWS_REGION].valueFrom.configMapKeyRef.name', { valor: 'fluent-bit-cluster-info' }), campo('DaemonSet', 'fluent-bit', 'spec.template.spec.containers[0].volumeMounts[name=varlog].mountPath', { valor: '/var/log' })] },
    'eks-adot-collector': { dica: 'O pipeline de traces continua recebendo em OTLP.', regras: [campo('OpenTelemetryCollector', 'adot', 'spec.config.service.pipelines.traces.receivers', { contem: 'otlp' }), campo('OpenTelemetryCollector', 'adot', 'spec.serviceAccount', { valor: 'adot-collector' })] },
    'eks-instrumentation': { dica: 'A annotation fica no template do Pod, não no metadata do Deployment.', regras: [campo('Deployment', 'pedidos', 'metadata.annotations', { ausente: true })] },
    'eks-pss-namespace': { dica: 'O nível do namespace é o mesmo nos dois modos.', regras: [campo('Namespace', 'pagamentos', 'metadata.labels["pod-security.kubernetes.io/enforce"]', { naoContem: 'baseline' })] },
    'eks-pss-baseline-audit': { dica: 'O namespace tem o nome pedido no enunciado.', regras: [existe('Namespace', 'legado')] },
    'eks-pss-pod-restrito': { dica: 'O Pod fica no namespace pagamentos, com a imagem que roda sem root.', regras: [campo('Pod', 'api', 'metadata.namespace', { valor: 'pagamentos' }), campo('Pod', 'api', 'spec.containers[name=app].image', { valor: 'nginxinc/nginx-unprivileged:1.27' })] },
    'eks-secrets-manager-spc': { dica: 'O segredo é do Secrets Manager, e não do Parameter Store.', regras: [campo('SecretProviderClass', 'banco-aws', 'spec.parameters.objects', { naoContem: 'ssmparameter' })] },
    'eks-secrets-manager-pod': { dica: 'O volume csi é só de leitura, como pede o passo 2.', regras: [campo('Deployment', 'loja', 'spec.template.spec.volumes[name=segredos].csi.readOnly', { valor: true })] },
    'eks-secrets-sync': { dica: 'O volume csi continua no Deployment: sem ele, o Secret não é criado.', regras: [campo('Deployment', 'loja', 'spec.template.spec.volumes[name=segredos].csi.volumeAttributes.secretProviderClass', { valor: 'banco-aws' })] },
  },
};
