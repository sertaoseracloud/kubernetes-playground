// Recursos Avançados: StatefulSet, DaemonSet e armazenamento persistente.
import { licao, exercicio, teste, existe, campo } from './util.js';

export const avancadosStateful = {
  id: 'stateful',
  titulo: 'StatefulSet, DaemonSet e Storage',
  itens: [
    licao('stateful-conceitos', 'Workloads com estado e um Pod por nó', 'medio', `
      <p>O Deployment trata os Pods como gado: qualquer um substitui qualquer outro. Alguns sistemas precisam de mais:</p>
      <ul>
        <li><b>StatefulSet</b>: os Pods são como <b>cadeiras numeradas</b> num auditório. Cada um tem nome fixo
          (<code>postgres-0</code>, <code>postgres-1</code>), sobe em ordem e recebe o <b>próprio disco</b> pelos
          <code>volumeClaimTemplates</code>. Se o <code>postgres-1</code> cair, volta com o mesmo nome e o mesmo disco.</li>
        <li><b>Service headless</b> (<code>clusterIP: None</code>): em vez de um IP só, o DNS devolve o endereço de cada Pod
          (<code>postgres-0.postgres.default.svc.cluster.local</code>). O StatefulSet aponta para ele em <code>serviceName</code>.</li>
        <li><b>DaemonSet</b>: <b>um Pod em cada nó</b>, como um extintor por andar. Usado por agentes de log, métricas e rede.
          Com <code>tolerations</code>, ele também roda nos nós com taints (como os do control plane).</li>
        <li><b>StorageClass</b>: o cardápio de discos. Diz qual driver (<code>provisioner</code>) cria o volume,
          <code>reclaimPolicy</code> (apagar ou manter o disco quando o PVC some) e <code>volumeBindingMode</code>.</li>
        <li><code>WaitForFirstConsumer</code> só cria o disco quando o Pod for agendado, na mesma zona do nó: evita disco numa
          zona e Pod em outra.</li>
        <li><b>PersistentVolumeClaim (PVC)</b>: o pedido de disco ("quero 5Gi da classe rápida"); o Pod monta o PVC.</li>
      </ul>`),
    exercicio({
      id: 'stateful-statefulset',
      titulo: 'StatefulSet do PostgreSQL com disco por réplica',
      dificuldade: 'dificil',
      existentes: `apiVersion: v1
kind: Secret
metadata:
  name: postgres-auth
type: Opaque
stringData:
  password: troque-esta-senha-de-exemplo`,
      resumo: `<p>Suba um PostgreSQL com 3 réplicas, cada uma com o próprio disco. O Secret <code>postgres-auth</code> já existe.</p>
        <ol>
          <li>Service headless <code>postgres</code>: <code>clusterIP: None</code>, porta 5432, selector <code>app: postgres</code>.</li>
          <li>StatefulSet <code>postgres</code>: <code>serviceName: postgres</code>, 3 réplicas, label <code>app: postgres</code>,
            container <code>postgres</code> com a imagem <code>postgres:16</code> e porta 5432.</li>
          <li>Variável <code>POSTGRES_PASSWORD</code> lida do Secret <code>postgres-auth</code> (chave <code>password</code>).</li>
          <li><code>volumeClaimTemplates</code> chamado <code>dados</code>: <code>ReadWriteOnce</code>, <code>10Gi</code>, montado em
            <code>/var/lib/postgresql/data</code>.</li>
        </ol>`,
      dica: 'O nome do volumeMount é o nome do volumeClaimTemplate (dados); o StatefulSet cria um PVC dados-postgres-0, dados-postgres-1...',
      solucao: `apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-auth
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: dados
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: dados
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi`,
      testes: [
        teste('O Service postgres é headless', existe('Service', 'postgres'), campo('Service', 'postgres', 'spec.clusterIP', { valor: 'None' })),
        teste('O StatefulSet tem 3 réplicas e usa o Service headless',
          existe('StatefulSet', 'postgres'),
          campo('StatefulSet', 'postgres', 'spec.serviceName', { valor: 'postgres' }),
          campo('StatefulSet', 'postgres', 'spec.replicas', { valor: 3 })),
        teste('A senha vem do Secret', campo('StatefulSet', 'postgres', 'spec.template.spec.containers[name=postgres].env[name=POSTGRES_PASSWORD].valueFrom.secretKeyRef.name', { valor: 'postgres-auth' })),
        teste('Cada réplica tem um disco de 10Gi montado no diretório de dados',
          campo('StatefulSet', 'postgres', 'spec.volumeClaimTemplates[0].spec.resources.requests.storage', { valor: '10Gi' }),
          { tipo: 'volume-montado', pod: 'postgres', container: 'postgres', volume: 'dados', mountPath: '/var/lib/postgresql/data' }),
      ],
    }),
    exercicio({
      id: 'stateful-daemonset-logs',
      titulo: 'DaemonSet coletor de logs em todos os nós',
      dificuldade: 'medio',
      resumo: `<p>Crie o DaemonSet <code>coletor-logs</code> no namespace <code>logging</code> para ler os logs de todos os nós:</p>
        <ul>
          <li>Label <code>app: coletor-logs</code>; container <code>fluent-bit</code> com a imagem <code>fluent/fluent-bit:3.1</code>.</li>
          <li>Toleration com <code>operator: Exists</code> (roda até nos nós com taint).</li>
          <li>Volume <code>hostPath</code> chamado <code>varlog</code> com <code>path: /var/log</code>, montado em <code>/var/log</code> como <b>somente leitura</b>.</li>
          <li>Limite de memória de <code>200Mi</code>.</li>
        </ul>`,
      solucao: `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: coletor-logs
  namespace: logging
spec:
  selector:
    matchLabels:
      app: coletor-logs
  template:
    metadata:
      labels:
        app: coletor-logs
    spec:
      tolerations:
        - operator: Exists
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:3.1
          resources:
            requests:
              cpu: 50m
              memory: 100Mi
            limits:
              memory: 200Mi
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
      volumes:
        - name: varlog
          hostPath:
            path: /var/log`,
      testes: [
        teste('O DaemonSet usa a imagem do Fluent Bit', existe('DaemonSet', 'coletor-logs'), { tipo: 'container-imagem', pod: 'coletor-logs', container: 'fluent-bit', imagem: 'fluent/fluent-bit:3.1' }),
        teste('Roda em todos os nós, inclusive com taint', campo('DaemonSet', 'coletor-logs', 'spec.template.spec.tolerations[0].operator', { valor: 'Exists' })),
        teste('Lê /var/log do nó sem poder escrever',
          campo('DaemonSet', 'coletor-logs', 'spec.template.spec.volumes[name=varlog].hostPath.path', { valor: '/var/log' }),
          campo('DaemonSet', 'coletor-logs', 'spec.template.spec.containers[0].volumeMounts[name=varlog].readOnly', { valor: true })),
        teste('A memória é limitada a 200Mi', { tipo: 'resource-limits', pod: 'coletor-logs', container: 'fluent-bit', memory: '200Mi' }),
      ],
    }),
    exercicio({
      id: 'storage-storageclass-pvc',
      titulo: 'StorageClass com WaitForFirstConsumer e PVC',
      dificuldade: 'medio',
      resumo: `<p>Crie uma classe de disco e um pedido de disco:</p>
        <ul>
          <li>StorageClass <code>rapido</code> com <code>provisioner: rancher.io/local-path</code> (o provisionador do kind e do k3s),
            <code>reclaimPolicy: Delete</code> e <code>volumeBindingMode: WaitForFirstConsumer</code>.</li>
          <li>PVC <code>dados-app</code> com <code>storageClassName: rapido</code>, <code>ReadWriteOnce</code> e <code>5Gi</code>.</li>
        </ul>`,
      solucao: `apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rapido
provisioner: rancher.io/local-path
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dados-app
spec:
  storageClassName: rapido
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi`,
      testes: [
        teste('A StorageClass cria o disco só quando o Pod for agendado',
          existe('StorageClass', 'rapido'),
          campo('StorageClass', 'rapido', 'volumeBindingMode', { valor: 'WaitForFirstConsumer' }),
          campo('StorageClass', 'rapido', 'reclaimPolicy', { valor: 'Delete' })),
        teste('O PVC pede 5Gi da classe rapido', { tipo: 'pvc-existe', pvc: 'dados-app', storageClass: 'rapido' }, campo('PersistentVolumeClaim', 'dados-app', 'spec.resources.requests.storage', { valor: '5Gi' })),
      ],
    }),
  ],
};
