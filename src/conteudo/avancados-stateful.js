// Recursos Avançados: StatefulSet, DaemonSet e armazenamento persistente.
// Segue docs/didatica.md. Ordem: primeiro o disco (StorageClass e PVC), depois o DaemonSet,
// e por fim o StatefulSet, que junta disco por réplica, Service headless e Secret.
import { licao, exercicio, teste, existe, campo } from './util.js';

export const avancadosStateful = {
  id: 'stateful',
  titulo: 'StatefulSet, DaemonSet e Storage',
  itens: [
    licao('stateful-conceitos', 'Workloads com estado e um Pod por nó', 'medio', `
      <p>O Deployment trata os Pods como gado: qualquer um substitui qualquer outro, e o disco deles é descartável. Alguns
      sistemas precisam de mais:</p>
      <ul>
        <li><b>PersistentVolumeClaim (PVC)</b>: o <b>pedido de disco</b> ("quero 5Gi da classe rápida"). O disco sobrevive ao Pod;
          o Pod só monta o PVC, como um volume qualquer.</li>
        <li><b>StorageClass</b>: o cardápio de discos. Diz qual driver (<code>provisioner</code>) cria o volume,
          <code>reclaimPolicy</code> (apagar ou manter o disco quando o PVC some) e <code>volumeBindingMode</code>.
          <code>WaitForFirstConsumer</code> só cria o disco quando o Pod for agendado, na mesma zona do nó: evita disco numa
          zona e Pod em outra.</li>
        <li><b>StatefulSet</b>: os Pods são como <b>cadeiras numeradas</b> num auditório. Cada um tem nome fixo
          (<code>postgres-0</code>, <code>postgres-1</code>), sobe em ordem e recebe o <b>próprio disco</b> pelos
          <code>volumeClaimTemplates</code> (um molde de PVC). Se o <code>postgres-1</code> cair, volta com o mesmo nome e o mesmo disco.</li>
        <li><b>Service headless</b> (<code>clusterIP: None</code>, visto em Services): o DNS devolve o endereço de cada Pod
          (<code>postgres-0.postgres.default.svc.cluster.local</code>). O StatefulSet aponta para ele em <code>serviceName</code>.</li>
        <li><b>DaemonSet</b> (visto em Deployments): <b>um Pod em cada nó</b>. Com <code>tolerations</code>, ele também roda nos
          nós marcados com <b>taints</b> (uma placa de "acesso restrito", como a dos nós do control plane).</li>
      </ul>`,
    `
      apiVersion: storage.k8s.io/v1
      kind: StorageClass
      metadata:
        name: economico
      provisioner: rancher.io/local-path      # quem cria o disco (sem spec: campos na raiz)
      reclaimPolicy: Retain                   # apagou o PVC? o disco fica guardado
      volumeBindingMode: WaitForFirstConsumer # só cria quando um Pod precisar
      ---
      apiVersion: v1
      kind: PersistentVolumeClaim
      metadata:
        name: arquivo-morto
      spec:
        storageClassName: economico           # de qual "cardápio"
        accessModes: ["ReadWriteOnce"]        # um nó por vez lendo e escrevendo
        resources:
          requests:
            storage: 1Gi                      # o tamanho pedido
    `),

    exercicio({
      id: 'storage-storageclass-pvc',
      titulo: 'StorageClass com WaitForFirstConsumer e PVC',
      dificuldade: 'medio',
      resumo: `
        <p>Crie uma classe de disco e um pedido de disco que use essa classe.</p>
        <ol>
          <li>StorageClass <code>rapido</code> (<code>apiVersion: storage.k8s.io/v1</code>) com
            <code>provisioner: rancher.io/local-path</code> (o provisionador do kind e do k3s), <code>reclaimPolicy: Delete</code>
            e <code>volumeBindingMode: WaitForFirstConsumer</code>, na raiz do manifesto.</li>
          <li>PVC <code>dados-app</code> com <code>storageClassName: rapido</code>, <code>accessModes: [ReadWriteOnce]</code> e
            <code>5Gi</code> em <code>resources.requests.storage</code>.</li>
        </ol>
        <p><b>No cluster:</b> o PVC fica <code>Pending</code> até um Pod usá-lo; aí o provisionador cria o disco no nó do Pod. Se
        o PVC for apagado, o disco também é (<code>Delete</code>).</p>`,
      inicial: `
        apiVersion: storage.k8s.io/v1
        kind: StorageClass
        metadata:
          name: rapido
        provisioner:           # TODO: rancher.io/local-path
        # TODO: reclaimPolicy: Delete e volumeBindingMode: WaitForFirstConsumer (na raiz)
        ---
        apiVersion: v1
        kind: PersistentVolumeClaim
        metadata:
          name: dados-app
        spec:
          storageClassName:    # TODO: rapido
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage:         # TODO: 5Gi
      `,
      dica: [
        'Compare com o exemplo da lição: StorageClass sem spec, PVC com spec.',
        'reclaimPolicy e volumeBindingMode ficam encostados na margem, como provisioner.',
      ],
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
        teste({ descricao: 'A StorageClass cria o disco só quando o Pod for agendado', dica: 'Na raiz da StorageClass: volumeBindingMode: WaitForFirstConsumer e reclaimPolicy: Delete.' },
          existe('StorageClass', 'rapido'),
          campo('StorageClass', 'rapido', 'volumeBindingMode', { valor: 'WaitForFirstConsumer' }),
          campo('StorageClass', 'rapido', 'reclaimPolicy', { valor: 'Delete' })),
        teste({ descricao: 'O PVC pede 5Gi da classe rapido', dica: 'No PVC: storageClassName: rapido e resources.requests.storage: 5Gi.' },
          { tipo: 'pvc-existe', pvc: 'dados-app', storageClass: 'rapido' }, campo('PersistentVolumeClaim', 'dados-app', 'spec.resources.requests.storage', { valor: '5Gi' })),
      ],
    }),

    exercicio({
      id: 'stateful-daemonset-logs',
      titulo: 'DaemonSet coletor de logs em todos os nós',
      dificuldade: 'medio',
      resumo: `
        <p>Um coletor de logs precisa ler <code>/var/log</code> de <b>cada</b> nó, inclusive dos nós com taint.</p>
        <ol>
          <li>O DaemonSet <code>coletor-logs</code> (namespace <code>logging</code>) usa a label <code>app: coletor-logs</code> e o
            container <code>fluent-bit</code> com a imagem <code>fluent/fluent-bit:3.1</code>.</li>
          <li>Em <code>template.spec.tolerations</code>, um item com <code>operator: Exists</code> (aceita qualquer taint).</li>
          <li>Declare o volume <code>varlog</code> do tipo <code>hostPath</code> com <code>path: /var/log</code>.</li>
          <li>Monte <code>varlog</code> em <code>/var/log</code> com <code>readOnly: true</code>.</li>
          <li>Em <code>resources.limits</code>, <code>memory: 200Mi</code>.</li>
        </ol>
        <p><b>No cluster:</b> um Pod do Fluent Bit nasce em cada nó (até nos do control plane) e lê os arquivos de log da máquina
        sem poder alterá-los.</p>`,
      inicial: `
        apiVersion: apps/v1
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
              # TODO: tolerations com um item operator: Exists
              containers:
                - name: fluent-bit
                  image: fluent/fluent-bit:3.1
                  resources:
                    requests:
                      cpu: 50m
                      memory: 100Mi
                    # TODO: limits com memory: 200Mi
                  volumeMounts:
                    - name: varlog
                      mountPath: /var/log
                      # TODO: readOnly: true
              volumes:
                - name: varlog
                  # TODO: hostPath com path: /var/log
      `,
      dica: [
        'tolerations é uma lista no spec do Pod, alinhada com containers: - operator: Exists.',
        'readOnly fica no item do volumeMounts, junto de name e mountPath.',
        'volumes:\n  - name: varlog\n    hostPath:\n      path: /var/log',
      ],
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
        teste({ descricao: 'O DaemonSet usa a imagem do Fluent Bit', dica: 'Preencha os TODO: um volume sem tipo impede o apply.' },
          existe('DaemonSet', 'coletor-logs'), { tipo: 'container-imagem', pod: 'coletor-logs', container: 'fluent-bit', imagem: 'fluent/fluent-bit:3.1' }),
        teste({ descricao: 'Roda em todos os nós, inclusive com taint', dica: 'Em template.spec: tolerations:\n  - operator: Exists' },
          campo('DaemonSet', 'coletor-logs', 'spec.template.spec.tolerations[0].operator', { valor: 'Exists' })),
        teste({ descricao: 'Lê /var/log do nó sem poder escrever', dica: 'Volume varlog com hostPath.path: /var/log e, no volumeMounts, readOnly: true.' },
          campo('DaemonSet', 'coletor-logs', 'spec.template.spec.volumes[name=varlog].hostPath.path', { valor: '/var/log' }),
          campo('DaemonSet', 'coletor-logs', 'spec.template.spec.containers[0].volumeMounts[name=varlog].readOnly', { valor: true })),
        teste({ descricao: 'A memória é limitada a 200Mi', dica: 'Em resources, alinhado com requests: limits:\n  memory: 200Mi' },
          { tipo: 'resource-limits', pod: 'coletor-logs', container: 'fluent-bit', memory: '200Mi' }),
      ],
    }),

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
      resumo: `
        <p>Suba um PostgreSQL com 3 réplicas, cada uma com o próprio disco. Este exercício junta o que você já viu: Service
        headless, PVC (agora como molde) e uma variável lida de outro recurso. O Secret <code>postgres-auth</code> já existe
        (um Secret é como um ConfigMap para senhas; você vai estudá-los no tópico "Secrets e Segurança").</p>
        <ol>
          <li>Service headless <code>postgres</code>: <code>clusterIP: None</code>, porta 5432, selector <code>app: postgres</code>.</li>
          <li>StatefulSet <code>postgres</code>: <code>serviceName: postgres</code>, <code>replicas: 3</code>, label <code>app: postgres</code>,
            container <code>postgres</code> com a imagem <code>postgres:16</code> e porta 5432.</li>
          <li>Variável <code>POSTGRES_PASSWORD</code> com <code>valueFrom.secretKeyRef</code> (igual ao <code>configMapKeyRef</code>):
            <code>name: postgres-auth</code> e <code>key: password</code>.</li>
          <li>Em <code>volumeClaimTemplates</code>, o molde <code>dados</code>: <code>ReadWriteOnce</code> e <code>10Gi</code>, montado
            no container em <code>/var/lib/postgresql/data</code>.</li>
        </ol>
        <p><b>No cluster:</b> nascem <code>postgres-0</code>, <code>postgres-1</code> e <code>postgres-2</code>, nessa ordem, cada um
        com o PVC <code>dados-postgres-N</code>. Se um cair, volta com o mesmo nome e o mesmo disco.</p>`,
      inicial: `
        apiVersion: v1
        kind: Service
        metadata:
          name: postgres
        spec:
          # TODO: clusterIP: None (headless)
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
          serviceName:         # TODO: postgres (o Service headless)
          replicas:            # TODO: 3
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
                      # TODO: valueFrom.secretKeyRef com name: postgres-auth e key: password
                    - name: PGDATA
                      value: /var/lib/postgresql/data/pgdata
                  volumeMounts:
                    - name: dados
                      mountPath: /var/lib/postgresql/data
          volumeClaimTemplates:
            - metadata:
                name: dados
              spec:
                # TODO: accessModes ["ReadWriteOnce"] e resources.requests.storage: 10Gi
      `,
      dica: [
        'O spec do volumeClaimTemplate é igual ao spec de um PVC (veja o exercício anterior).',
        'secretKeyRef tem o mesmo formato do configMapKeyRef: valueFrom:\n  secretKeyRef:\n    name: postgres-auth\n    key: password',
        'O nome do volumeMount é o nome do volumeClaimTemplate (dados); o StatefulSet cria um PVC dados-postgres-0, dados-postgres-1...',
      ],
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
        teste({ descricao: 'O Service postgres é headless', dica: 'No Service: clusterIP: None.' },
          existe('Service', 'postgres'), campo('Service', 'postgres', 'spec.clusterIP', { valor: 'None' })),
        teste({ descricao: 'O StatefulSet tem 3 réplicas e usa o Service headless', dica: 'No StatefulSet: serviceName: postgres e replicas: 3.' },
          existe('StatefulSet', 'postgres'),
          campo('StatefulSet', 'postgres', 'spec.serviceName', { valor: 'postgres' }),
          campo('StatefulSet', 'postgres', 'spec.replicas', { valor: 3 })),
        teste({ descricao: 'A senha vem do Secret', dica: 'Em POSTGRES_PASSWORD: valueFrom.secretKeyRef com name: postgres-auth e key: password.' },
          campo('StatefulSet', 'postgres', 'spec.template.spec.containers[name=postgres].env[name=POSTGRES_PASSWORD].valueFrom.secretKeyRef.name', { valor: 'postgres-auth' })),
        teste({ descricao: 'Cada réplica tem um disco de 10Gi montado no diretório de dados', dica: 'No volumeClaimTemplate dados: accessModes ["ReadWriteOnce"] e resources.requests.storage: 10Gi.' },
          campo('StatefulSet', 'postgres', 'spec.volumeClaimTemplates[0].spec.resources.requests.storage', { valor: '10Gi' }),
          { tipo: 'volume-montado', pod: 'postgres', container: 'postgres', volume: 'dados', mountPath: '/var/lib/postgresql/data' }),
      ],
    }),
  ],
};
