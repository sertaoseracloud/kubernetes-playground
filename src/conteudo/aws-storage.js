// Módulo AWS, tópico 4: discos e arquivos no EKS (EBS CSI e gp3, criptografia, zonas, snapshots e EFS).
// Segue docs/didatica.md: lição com exemplo comentado, passos, esqueleto, dicas e "como corrigir".
import { licao, exercicio, teste, existe, campo, docs } from './util.js';

const KMS = 'arn:aws:kms:us-east-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab';
const EFS_ID = 'fs-0123456789abcdef0';

/** Uma StorageClass do EBS CSI (gp3, esperando o primeiro Pod); `extra` entra no fim. */
const storageClassEbs = (nome, extra = '') => `
  apiVersion: storage.k8s.io/v1
  kind: StorageClass
  metadata:
    name: ${nome}
  provisioner: ebs.csi.aws.com
  volumeBindingMode: WaitForFirstConsumer
  parameters:
    type: gp3
${extra}`;

const PVC_DADOS = `
  apiVersion: v1
  kind: PersistentVolumeClaim
  metadata:
    name: dados-pvc
  spec:
    accessModes:
      - ReadWriteOnce
    storageClassName: ebs-gp3
    resources:
      requests:
        storage: 10Gi
`;

const SNAPSHOT_CLASS = `
  apiVersion: snapshot.storage.k8s.io/v1
  kind: VolumeSnapshotClass
  metadata:
    name: ebs-snap
  driver: ebs.csi.aws.com
  deletionPolicy: Delete
`;

const SNAPSHOT = `
  apiVersion: snapshot.storage.k8s.io/v1
  kind: VolumeSnapshot
  metadata:
    name: dados-snap
  spec:
    volumeSnapshotClassName: ebs-snap
    source:
      persistentVolumeClaimName: dados-pvc
`;

export const awsStorage = {
  id: 'aws-storage',
  titulo: 'Storage no EKS',
  descricao: 'EBS CSI e gp3, criptografia, zonas, snapshots e volumes compartilhados com EFS.',
  icone: '💾',
  itens: [
    licao('aws-ebs-csi', 'EBS CSI Driver e StorageClass', 'medio', `
      <p>Um volume <b>EBS</b> é um <b>HD externo na nuvem</b>: ligado a uma máquina por vez, numa zona só. No EKS, quem cria,
      liga e desliga esses discos é o <b>EBS CSI Driver</b> (o add-on <code>aws-ebs-csi-driver</code>), e o Pod pede o disco com
      um PVC, como você viu em Recursos Avançados.</p>
      <ul>
        <li>A <b>StorageClass</b> é o cardápio de discos: <code>provisioner: ebs.csi.aws.com</code> e, em
          <code>parameters</code>, o tipo (<code>gp3</code>, SSD de uso geral; <code>io2</code>, SSD com IOPS garantidos).</li>
        <li><code>volumeBindingMode: WaitForFirstConsumer</code>: o disco só é criado quando o primeiro Pod é agendado, <b>na zona
          do nó dele</b>. Com <code>Immediate</code>, o disco pode nascer numa zona e o Pod ir para outra, e ele fica
          <code>Pending</code> para sempre.</li>
        <li><code>encrypted: "true"</code> e <code>kmsKeyId</code>: o disco nasce criptografado com uma chave do KMS.</li>
        <li><code>allowedTopologies</code>: restringe as zonas onde os discos podem nascer
          (label <code>topology.kubernetes.io/zone</code>).</li>
        <li><code>allowVolumeExpansion: true</code>: dá para aumentar o PVC depois, sem recriar.</li>
      </ul>
      <p>Valores de <code>parameters</code> são texto: <code>"true"</code>, <code>"3000"</code>.</p>
      <p><b>No cluster:</b> quando o Pod usa o PVC, o driver cria o EBS, anexa ao nó e monta no container. O PV aparece em
      <code>kubectl get pv</code> com o ID do volume (<code>vol-...</code>).</p>`,
    `
      apiVersion: storage.k8s.io/v1
      kind: StorageClass
      metadata:
        name: ebs-gp3
      provisioner: ebs.csi.aws.com            # o driver do EBS
      volumeBindingMode: WaitForFirstConsumer # cria o disco na zona do Pod
      allowVolumeExpansion: true              # o PVC pode crescer depois
      reclaimPolicy: Delete                   # apagou o PVC, apaga o disco
      parameters:                             # tudo em texto
        type: gp3
        encrypted: "true"
    `),

    exercicio({
      id: 'aws-storageclass-gp3',
      titulo: 'StorageClass gp3 que espera o Pod',
      dificuldade: 'facil',
      resumo: `
        <p>Os PVCs da loja vão usar discos gp3. A StorageClass precisa do driver certo e de esperar o Pod, para o disco nascer na
        zona dele.</p>
        <ol>
          <li>Crie a StorageClass <code>ebs-gp3</code> com <code>provisioner: ebs.csi.aws.com</code>.</li>
          <li>Em <code>parameters</code>, <code>type: gp3</code>.</li>
          <li><code>volumeBindingMode: WaitForFirstConsumer</code>.</li>
        </ol>
        <p><b>No cluster:</b> um PVC desta classe fica <code>Pending</code> até um Pod usá-lo; aí o driver cria o gp3 na zona do nó escolhido.</p>`,
      inicial: `
        apiVersion: storage.k8s.io/v1
        kind: StorageClass
        metadata:
          name: ebs-gp3
        provisioner: ebs.csi.aws.com
        # TODO: volumeBindingMode: WaitForFirstConsumer
        parameters:
          type:                # TODO: gp3
      `,
      dica: [
        'A StorageClass não tem spec: provisioner, volumeBindingMode e parameters ficam na raiz.',
        'volumeBindingMode: WaitForFirstConsumer\nparameters:\n  type: gp3',
      ],
      solucao: storageClassEbs('ebs-gp3'),
      testes: [
        teste({ descricao: 'A StorageClass usa o EBS CSI', dica: 'Mantenha provisioner: ebs.csi.aws.com.' },
          campo('StorageClass', 'ebs-gp3', 'provisioner', { valor: 'ebs.csi.aws.com' })),
        teste({ descricao: 'Os discos são gp3', dica: 'Em parameters, escreva type: gp3.' },
          campo('StorageClass', 'ebs-gp3', 'parameters.type', { valor: 'gp3' })),
        teste({ descricao: 'O disco nasce na zona do Pod', dica: 'Na raiz, escreva volumeBindingMode: WaitForFirstConsumer.' },
          campo('StorageClass', 'ebs-gp3', 'volumeBindingMode', { valor: 'WaitForFirstConsumer' })),
      ],
    }),

    {
      id: 'aws-pvc-ebs',
      tipo: 'exercicio',
      titulo: 'PVC com StorageClass EBS',
      dificuldade: 'medio',
      xp: 15,
      resumo: `
        <p>Na AWS, discos de bloco são volumes <b>EBS</b>, criados pelo driver EBS CSI a partir de uma StorageClass (aqui, <code>ebs-gp3</code>).</p>
        <ol>
          <li>Crie o PVC <code>dados-pvc</code>.</li>
          <li><code>accessModes: [ReadWriteOnce]</code> (um EBS se liga a um nó por vez).</li>
          <li><code>storageClassName: ebs-gp3</code> e <code>10Gi</code> em <code>resources.requests.storage</code>.</li>
        </ol>
        <p><b>No cluster:</b> quando um Pod usar o PVC, o driver cria um volume gp3 de 10 GiB na mesma zona do nó e o anexa à máquina.</p>`,
      inicial: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dados-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName:      # TODO: ebs-gp3
  resources:
    requests:
      storage:           # TODO: 10Gi
`,
      dica: [
        "É um PVC como o da lição \"Workloads com estado\", com outra StorageClass.",
        "storageClassName: ebs-gp3 e storage: 10Gi.",
      ],
      solucao: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dados-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ebs-gp3
  resources:
    requests:
      storage: 10Gi`,
      testes: [
        {
          descricao: 'O PersistentVolumeClaim dados-pvc existe',
          dica: "Preencha os TODO: um campo vazio impede o apply.",
          regras: [{ tipo: 'recurso-existe', kind: 'PersistentVolumeClaim', nome: 'dados-pvc' }],
        },
        {
          descricao: 'O PVC usa a StorageClass ebs-gp3',
          dica: "Em spec: storageClassName: ebs-gp3.",
          regras: [{ tipo: 'pvc-existe', pvc: 'dados-pvc', storageClass: 'ebs-gp3' }],
        },
      ],
    },
    {
      id: 'aws-pod-volume',
      tipo: 'exercicio',
      titulo: 'Pod com volume persistente',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `
        <p>O PVC <code>dados-pvc</code> já existe no cluster. Agora um Pod vai usar esse disco para guardar as páginas do site.</p>
        <ol>
          <li>No Pod <code>app-com-dados</code> (container <code>nginx</code>, imagem <code>nginx:1.25</code>), declare o volume <code>dados</code>.</li>
          <li>O tipo do volume é <code>persistentVolumeClaim</code>, com <code>claimName: dados-pvc</code>.</li>
          <li>Monte <code>dados</code> em <code>/usr/share/nginx/html</code>.</li>
        </ol>
        <p><b>No cluster:</b> o volume EBS é anexado ao nó do Pod. Se o Pod for recriado (no mesmo nó ou em outro da mesma zona), os
        arquivos continuam lá.</p>`,
      inicial: `apiVersion: v1
kind: Pod
metadata:
  name: app-com-dados
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      volumeMounts:
        - name: dados
          mountPath:     # TODO: /usr/share/nginx/html
  volumes:
    - name: dados
      # TODO: persistentVolumeClaim com claimName: dados-pvc
`,
      existentes: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dados-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ebs-gp3
  resources:
    requests:
      storage: 10Gi`,
      dica: [
        "Volume em duas partes: declarar (volumes) e montar (volumeMounts).",
        "persistentVolumeClaim:\n  claimName: dados-pvc",
      ],
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: app-com-dados
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      volumeMounts:
        - name: dados
          mountPath: /usr/share/nginx/html
  volumes:
    - name: dados
      persistentVolumeClaim:
        claimName: dados-pvc`,
      testes: [
        {
          descricao: 'O Pod app-com-dados existe',
          dica: "Preencha os TODO: um volume sem tipo impede o apply.",
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'app-com-dados' }],
        },
        {
          descricao: 'O volume dados está montado no container nginx',
          dica: "volumeMounts com name: dados e mountPath: /usr/share/nginx/html.",
          regras: [{ tipo: 'volume-montado', pod: 'app-com-dados', container: 'nginx', volume: 'dados', caminho: '/usr/share/nginx/html' }],
        },
      ],
    },

    exercicio({
      id: 'aws-storageclass-criptografada',
      titulo: 'Discos criptografados com a chave da empresa',
      dificuldade: 'medio',
      resumo: `
        <p>A auditoria exige que todo disco de banco de dados seja criptografado com a chave do KMS da empresa, e não com a chave
        padrão da AWS.</p>
        <ol>
          <li>Na StorageClass <code>ebs-cripto</code>, em <code>parameters</code>, escreva <code>encrypted: "true"</code>.</li>
          <li>Também em <code>parameters</code>, <code>kmsKeyId</code> com <code>${KMS}</code>.</li>
        </ol>
        <p><b>No cluster:</b> todo EBS criado por esta classe nasce criptografado com essa chave. Quem não tem permissão na chave não consegue
        ler o disco nem os snapshots dele.</p>`,
      inicial: storageClassEbs('ebs-cripto', `
    # TODO: encrypted "true" (passo 1)
    # TODO: kmsKeyId com o ARN da chave (passo 2)
`),
      dica: [
        'Os dois campos ficam em parameters, alinhados com type.',
        'Em parameters tudo é texto: "true" com aspas.',
        `encrypted: "true"\nkmsKeyId: ${KMS}`,
      ],
      solucao: storageClassEbs('ebs-cripto', `
    encrypted: "true"
    kmsKeyId: ${KMS}
`),
      testes: [
        teste({ descricao: 'Os discos nascem criptografados', dica: 'Em parameters, escreva encrypted: "true".' },
          existe('StorageClass', 'ebs-cripto'),
          campo('StorageClass', 'ebs-cripto', 'parameters.encrypted', { valor: 'true' })),
        teste({ descricao: 'Com a chave do KMS da empresa', dica: 'Em parameters, escreva kmsKeyId com o ARN completo da chave.' },
          campo('StorageClass', 'ebs-cripto', 'parameters.kmsKeyId', { valor: KMS })),
      ],
    }),

    exercicio({
      id: 'aws-ebs-topologia',
      titulo: 'Discos só nas zonas onde há nós',
      dificuldade: 'dificil',
      resumo: `
        <p>O cluster só tem nós nas zonas <code>us-east-1a</code> e <code>us-east-1b</code>. Um disco criado na <code>us-east-1c</code>
        nunca seria usado. A StorageClass pode restringir as zonas.</p>
        <ol>
          <li>Na StorageClass <code>ebs-zonas</code>, crie <code>allowedTopologies</code> (na raiz).</li>
          <li>Um item com <code>matchLabelExpressions</code>: <code>key: topology.kubernetes.io/zone</code> e
            <code>values: ["us-east-1a", "us-east-1b"]</code>.</li>
          <li>Acrescente <code>allowVolumeExpansion: true</code>, para aumentar os discos sem recriar.</li>
        </ol>
        <p><b>No cluster:</b> o scheduler só põe os Pods com esses PVCs nas duas zonas, e o driver só cria discos nelas. Um
        <code>kubectl edit pvc</code> com tamanho maior faz o EBS crescer sem desligar o Pod.</p>`,
      inicial: `${storageClassEbs('ebs-zonas')}
  # TODO: allowVolumeExpansion: true
  allowedTopologies:
    - matchLabelExpressions:
        - key:           # TODO: topology.kubernetes.io/zone
          values:        # TODO: as duas zonas com nós
`,
      dica: [
        'allowedTopologies e allowVolumeExpansion ficam na raiz da StorageClass, como provisioner.',
        'values é a lista das zonas permitidas.',
        'allowVolumeExpansion: true\nallowedTopologies:\n  - matchLabelExpressions:\n      - key: topology.kubernetes.io/zone\n        values: ["us-east-1a", "us-east-1b"]',
      ],
      solucao: `${storageClassEbs('ebs-zonas')}
  allowVolumeExpansion: true
  allowedTopologies:
    - matchLabelExpressions:
        - key: topology.kubernetes.io/zone
          values: ["us-east-1a", "us-east-1b"]
`,
      testes: [
        teste({ descricao: 'Os discos só nascem nas zonas com nós', dica: 'Em allowedTopologies, a key topology.kubernetes.io/zone com us-east-1a e us-east-1b.' },
          campo('StorageClass', 'ebs-zonas', 'allowedTopologies[0].matchLabelExpressions[0].key', { valor: 'topology.kubernetes.io/zone' }),
          campo('StorageClass', 'ebs-zonas', 'allowedTopologies[0].matchLabelExpressions[0].values', { valor: ['us-east-1a', 'us-east-1b'] })),
        teste({ descricao: 'Os discos podem crescer', dica: 'Na raiz, escreva allowVolumeExpansion: true.' },
          campo('StorageClass', 'ebs-zonas', 'allowVolumeExpansion', { valor: true })),
      ],
    }),

    licao('aws-ebs-snapshot-licao', 'Snapshots: a foto do disco', 'medio', `
      <p>Um <b>snapshot</b> é uma <b>foto</b> do disco num instante. Dá para voltar àquela foto depois (um backup) ou criar um
      disco novo a partir dela (copiar dados para outro ambiente). No Kubernetes, isso também é YAML:</p>
      <ul>
        <li><b>VolumeSnapshotClass</b>: o "como" das fotos, igual à StorageClass para discos. Diz o <code>driver</code>
          (<code>ebs.csi.aws.com</code>) e o <code>deletionPolicy</code>: <code>Delete</code> apaga o snapshot da AWS junto
          com o recurso; <code>Retain</code> guarda.</li>
        <li><b>VolumeSnapshot</b>: o pedido de uma foto de um PVC (<code>source.persistentVolumeClaimName</code>).</li>
        <li>Para <b>restaurar</b>, um PVC novo usa <code>dataSource</code> apontando para o VolumeSnapshot. O disco novo nasce
          com os dados da foto (e não pode ser menor que ela).</li>
      </ul>
      <p>Esses kinds vêm do <b>external-snapshotter</b> (CRDs em <code>snapshot.storage.k8s.io/v1</code>), que o add-on do EBS
      CSI usa.</p>
      <p><b>No cluster:</b> <code>kubectl get volumesnapshot</code> mostra <code>READYTOUSE: true</code> quando a AWS termina a
      foto, e o snapshot aparece no console do EC2 (<code>snap-...</code>).</p>`,
    `
      apiVersion: snapshot.storage.k8s.io/v1
      kind: VolumeSnapshotClass
      metadata:
        name: ebs-snap
      driver: ebs.csi.aws.com      # quem tira a foto
      deletionPolicy: Delete       # apagou o VolumeSnapshot, apaga a foto
      ---
      apiVersion: snapshot.storage.k8s.io/v1
      kind: VolumeSnapshot
      metadata:
        name: dados-snap
      spec:
        volumeSnapshotClassName: ebs-snap
        source:
          persistentVolumeClaimName: dados-pvc   # a foto de qual disco
      ---
      # Um disco novo a partir da foto
      apiVersion: v1
      kind: PersistentVolumeClaim
      metadata:
        name: dados-copia
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: ebs-gp3
        resources:
          requests:
            storage: 10Gi
        dataSource:
          name: dados-snap
          kind: VolumeSnapshot
          apiGroup: snapshot.storage.k8s.io
    `),

    exercicio({
      id: 'aws-snapshotclass',
      titulo: 'Classe de snapshots que guarda as fotos',
      dificuldade: 'facil',
      resumo: `
        <p>Os snapshots de produção não podem sumir se alguém apagar o recurso por engano.</p>
        <ol>
          <li>Crie a <code>VolumeSnapshotClass</code> <code>ebs-retem</code> com <code>driver: ebs.csi.aws.com</code>.</li>
          <li><code>deletionPolicy: Retain</code>.</li>
        </ol>
        <p><b>No cluster:</b> se o VolumeSnapshot for apagado, o snapshot continua na AWS, e dá para trazê-lo de volta com um
        VolumeSnapshotContent.</p>`,
      inicial: `
        apiVersion: snapshot.storage.k8s.io/v1
        kind: VolumeSnapshotClass
        metadata:
          name: ebs-retem
        driver:                # TODO: ebs.csi.aws.com
        deletionPolicy:        # TODO: Retain
      `,
      dica: [
        'Como a StorageClass, a VolumeSnapshotClass não tem spec: os campos ficam na raiz.',
        'driver: ebs.csi.aws.com\ndeletionPolicy: Retain',
      ],
      solucao: SNAPSHOT_CLASS.replace('ebs-snap', 'ebs-retem').replace('Delete', 'Retain'),
      testes: [
        teste({ descricao: 'A classe de snapshots existe', dica: 'driver e deletionPolicy são obrigatórios: preencha os dois.' }, existe('VolumeSnapshotClass', 'ebs-retem')),
        teste({ descricao: 'Usa o driver do EBS', dica: 'Na raiz, escreva driver: ebs.csi.aws.com.' },
          campo('VolumeSnapshotClass', 'ebs-retem', 'driver', { valor: 'ebs.csi.aws.com' })),
        teste({ descricao: 'Guarda as fotos', dica: 'Na raiz, escreva deletionPolicy: Retain.' },
          campo('VolumeSnapshotClass', 'ebs-retem', 'deletionPolicy', { valor: 'Retain' })),
      ],
    }),

    exercicio({
      id: 'aws-snapshot-pvc',
      titulo: 'Foto do disco antes da atualização',
      dificuldade: 'medio',
      existentes: docs(PVC_DADOS, SNAPSHOT_CLASS),
      resumo: `
        <p>Hoje à noite o banco muda de versão. Antes, uma foto do disco: se algo der errado, dá para voltar.</p>
        <ol>
          <li>Crie o <code>VolumeSnapshot</code> <code>dados-snap</code>.</li>
          <li>Em <code>spec</code>, <code>volumeSnapshotClassName: ebs-snap</code> (já existe).</li>
          <li>Em <code>spec.source</code>, <code>persistentVolumeClaimName: dados-pvc</code> (já existe).</li>
        </ol>
        <p><b>No cluster:</b> o driver pede à AWS um snapshot do EBS do PVC. Enquanto ele é tirado, o Pod continua escrevendo
        normalmente.</p>`,
      inicial: `
        apiVersion: snapshot.storage.k8s.io/v1
        kind: VolumeSnapshot
        metadata:
          name: dados-snap
        spec:
          volumeSnapshotClassName:   # TODO: ebs-snap
          source:
            # TODO: persistentVolumeClaimName: dados-pvc
      `,
      dica: [
        'O exemplo da lição "Snapshots" tem o VolumeSnapshot no meio.',
        'source diz de qual PVC é a foto.',
        'volumeSnapshotClassName: ebs-snap\nsource:\n  persistentVolumeClaimName: dados-pvc',
      ],
      solucao: SNAPSHOT,
      testes: [
        teste({ descricao: 'O VolumeSnapshot existe', dica: 'source precisa de persistentVolumeClaimName: sem ele o apply é recusado.' }, existe('VolumeSnapshot', 'dados-snap')),
        teste({ descricao: 'A foto é do PVC dados-pvc', dica: 'Em spec.source, escreva persistentVolumeClaimName: dados-pvc.' },
          campo('VolumeSnapshot', 'dados-snap', 'spec.source.persistentVolumeClaimName', { valor: 'dados-pvc' })),
        teste({ descricao: 'Usa a classe ebs-snap', dica: 'Em spec, escreva volumeSnapshotClassName: ebs-snap.' },
          campo('VolumeSnapshot', 'dados-snap', 'spec.volumeSnapshotClassName', { valor: 'ebs-snap' })),
      ],
    }),

    exercicio({
      id: 'aws-pvc-restore',
      titulo: 'Restaurando um disco a partir do snapshot',
      dificuldade: 'dificil',
      existentes: docs(PVC_DADOS, SNAPSHOT_CLASS, SNAPSHOT),
      resumo: `
        <p>A atualização deu errado. O time quer um disco novo com os dados da foto <code>dados-snap</code>, para comparar com o atual.</p>
        <ol>
          <li>Crie o PVC <code>dados-restaurado</code> (<code>ReadWriteOnce</code>, <code>storageClassName: ebs-gp3</code>, <code>10Gi</code>).</li>
          <li>Em <code>spec.dataSource</code>: <code>name: dados-snap</code>, <code>kind: VolumeSnapshot</code> e
            <code>apiGroup: snapshot.storage.k8s.io</code>.</li>
        </ol>
        <p><b>No cluster:</b> quando um Pod usar o PVC, o driver cria um EBS novo a partir do snapshot. O disco original não muda.</p>`,
      inicial: `
        apiVersion: v1
        kind: PersistentVolumeClaim
        metadata:
          name: dados-restaurado
        spec:
          accessModes:
            - ReadWriteOnce
          storageClassName: ebs-gp3
          resources:
            requests:
              storage: 10Gi
          # TODO: dataSource com name, kind e apiGroup do snapshot (passo 2)
      `,
      dica: [
        'O último recurso do exemplo da lição "Snapshots" é um PVC restaurado.',
        'dataSource fica no spec do PVC, alinhado com resources.',
        'dataSource:\n  name: dados-snap\n  kind: VolumeSnapshot\n  apiGroup: snapshot.storage.k8s.io',
      ],
      solucao: `
        apiVersion: v1
        kind: PersistentVolumeClaim
        metadata:
          name: dados-restaurado
        spec:
          accessModes:
            - ReadWriteOnce
          storageClassName: ebs-gp3
          resources:
            requests:
              storage: 10Gi
          dataSource:
            name: dados-snap
            kind: VolumeSnapshot
            apiGroup: snapshot.storage.k8s.io
      `,
      testes: [
        teste({ descricao: 'O PVC novo existe com 10Gi', dica: 'Mantenha storage: 10Gi: o disco não pode ser menor que a foto.' },
          { tipo: 'pvc-existe', pvc: 'dados-restaurado', storageClass: 'ebs-gp3' },
          campo('PersistentVolumeClaim', 'dados-restaurado', 'spec.resources.requests.storage', { valor: '10Gi' })),
        teste({ descricao: 'O PVC nasce da foto dados-snap', dica: 'Em spec.dataSource: name: dados-snap, kind: VolumeSnapshot e apiGroup: snapshot.storage.k8s.io.' },
          campo('PersistentVolumeClaim', 'dados-restaurado', 'spec.dataSource.name', { valor: 'dados-snap' }),
          campo('PersistentVolumeClaim', 'dados-restaurado', 'spec.dataSource.kind', { valor: 'VolumeSnapshot' }),
          campo('PersistentVolumeClaim', 'dados-restaurado', 'spec.dataSource.apiGroup', { valor: 'snapshot.storage.k8s.io' })),
      ],
    }),

    licao('aws-efs-shared', 'EFS para volumes compartilhados', 'dificil', `
      <p>O EBS é um HD externo: uma máquina por vez. O <b>EFS</b> (Elastic File System) é uma <b>pasta compartilhada na rede do
      escritório</b>: vários Pods, em vários nós e em várias zonas, leem e escrevem nela ao mesmo tempo
      (<code>ReadWriteMany</code>).</p>
      <ul>
        <li>O sistema de arquivos EFS é criado fora do cluster (Terraform ou console) e tem um ID, como <code>${EFS_ID}</code>.</li>
        <li>O <b>EFS CSI Driver</b> (<code>provisioner: efs.csi.aws.com</code>) cria, para cada PVC, um <b>access point</b>: uma
          subpasta isolada, com dono e permissões próprios. Isso é o <code>provisioningMode: efs-ap</code>.</li>
        <li><code>directoryPerms</code> são as permissões da subpasta (<code>"700"</code>: só o dono).</li>
        <li>O tamanho pedido no PVC é obrigatório, mas o EFS cresce sozinho: você paga pelo que usar.</li>
      </ul>
      <p>Bom para conteúdo enviado por usuários, arquivos de várias réplicas e dados de treino. Para banco de dados, o EBS é mais
      rápido.</p>
      <p><b>No cluster:</b> os Pods de todas as réplicas montam o mesmo volume; um arquivo salvo por um aparece na hora para os outros.</p>`,
    `
      apiVersion: storage.k8s.io/v1
      kind: StorageClass
      metadata:
        name: efs-sc
      provisioner: efs.csi.aws.com          # o driver do EFS
      parameters:
        provisioningMode: efs-ap            # um access point por PVC
        fileSystemId: ${EFS_ID}  # o EFS criado fora do cluster
        directoryPerms: "700"               # texto, entre aspas
      ---
      apiVersion: v1
      kind: PersistentVolumeClaim
      metadata:
        name: uploads
      spec:
        accessModes: ["ReadWriteMany"]      # vários Pods, vários nós
        storageClassName: efs-sc
        resources:
          requests:
            storage: 5Gi                    # obrigatório, mas o EFS cresce sozinho
    `),

    exercicio({
      id: 'aws-efs-storageclass',
      titulo: 'StorageClass do EFS com access points',
      dificuldade: 'medio',
      resumo: `
        <p>O EFS <code>${EFS_ID}</code> já foi criado pelo time de infraestrutura. Falta a StorageClass que cria uma subpasta
        isolada para cada PVC.</p>
        <ol>
          <li>Crie a StorageClass <code>efs-sc</code> com <code>provisioner: efs.csi.aws.com</code>.</li>
          <li>Em <code>parameters</code>: <code>provisioningMode: efs-ap</code> e <code>fileSystemId: ${EFS_ID}</code>.</li>
          <li>Ainda em <code>parameters</code>, <code>directoryPerms: "700"</code>.</li>
        </ol>
        <p><b>No cluster:</b> cada PVC desta classe ganha um access point no EFS, com uma pasta própria que os outros PVCs não enxergam.</p>`,
      inicial: `
        apiVersion: storage.k8s.io/v1
        kind: StorageClass
        metadata:
          name: efs-sc
        provisioner:           # TODO: efs.csi.aws.com
        parameters:
          provisioningMode:    # TODO: efs-ap
          fileSystemId:        # TODO: o ID do EFS
          # TODO: directoryPerms "700"
      `,
      dica: [
        'O exemplo da lição "EFS" tem esta StorageClass.',
        'Em parameters tudo é texto: "700" com aspas.',
        `provisioner: efs.csi.aws.com\nparameters:\n  provisioningMode: efs-ap\n  fileSystemId: ${EFS_ID}\n  directoryPerms: "700"`,
      ],
      solucao: `
        apiVersion: storage.k8s.io/v1
        kind: StorageClass
        metadata:
          name: efs-sc
        provisioner: efs.csi.aws.com
        parameters:
          provisioningMode: efs-ap
          fileSystemId: ${EFS_ID}
          directoryPerms: "700"
      `,
      testes: [
        teste({ descricao: 'A StorageClass usa o EFS CSI', dica: 'provisioner é obrigatório: escreva efs.csi.aws.com.' },
          campo('StorageClass', 'efs-sc', 'provisioner', { valor: 'efs.csi.aws.com' })),
        teste({ descricao: 'Cria um access point no EFS certo', dica: `Em parameters: provisioningMode: efs-ap e fileSystemId: ${EFS_ID}.` },
          campo('StorageClass', 'efs-sc', 'parameters.provisioningMode', { valor: 'efs-ap' }),
          campo('StorageClass', 'efs-sc', 'parameters.fileSystemId', { valor: EFS_ID })),
        teste({ descricao: 'A pasta é só do dono', dica: 'Em parameters, escreva directoryPerms: "700".' },
          campo('StorageClass', 'efs-sc', 'parameters.directoryPerms', { valor: '700' })),
      ],
    }),

    exercicio({
      id: 'aws-efs-rwx-deploy',
      titulo: 'Três réplicas escrevendo na mesma pasta',
      dificuldade: 'dificil',
      resumo: `
        <p>As 3 réplicas do site recebem fotos enviadas pelos clientes. Todas precisam ver as mesmas fotos, mesmo em nós de zonas
        diferentes.</p>
        <ol>
          <li>Crie o PVC <code>uploads</code> com <code>accessModes: [ReadWriteMany]</code>, <code>storageClassName: efs-sc</code> e <code>5Gi</code>.</li>
          <li>No Deployment <code>site</code> (3 réplicas), declare o volume <code>uploads</code> do tipo
            <code>persistentVolumeClaim</code> com <code>claimName: uploads</code>.</li>
          <li>Monte o volume em <code>/var/www/uploads</code> no container <code>site</code>.</li>
        </ol>
        <p><b>No cluster:</b> os 3 Pods montam o mesmo access point do EFS. Com <code>ReadWriteOnce</code> (EBS), as réplicas em outros nós
        ficariam presas em <code>ContainerCreating</code>.</p>`,
      inicial: `
        apiVersion: v1
        kind: PersistentVolumeClaim
        metadata:
          name: uploads
        spec:
          accessModes:
            - # TODO: ReadWriteMany
          storageClassName: efs-sc
          resources:
            requests:
              storage: 5Gi
        ---
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: site
        spec:
          replicas: 3
          selector:
            matchLabels:
              app: site
          template:
            metadata:
              labels:
                app: site
            spec:
              containers:
                - name: site
                  image: nginx:1.27
                  volumeMounts:
                    - name: uploads
                      mountPath:     # TODO: /var/www/uploads
              volumes:
                - name: uploads
                  # TODO: persistentVolumeClaim com claimName: uploads
      `,
      dica: [
        'O PVC é o do exemplo da lição "EFS"; o volume no Deployment é como o do exercício "Pod com volume persistente".',
        'ReadWriteMany é o modo que deixa vários nós montarem o mesmo volume.',
        'accessModes:\n  - ReadWriteMany\n...\nmountPath: /var/www/uploads\n...\npersistentVolumeClaim:\n  claimName: uploads',
      ],
      solucao: `
        apiVersion: v1
        kind: PersistentVolumeClaim
        metadata:
          name: uploads
        spec:
          accessModes:
            - ReadWriteMany
          storageClassName: efs-sc
          resources:
            requests:
              storage: 5Gi
        ---
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: site
        spec:
          replicas: 3
          selector:
            matchLabels:
              app: site
          template:
            metadata:
              labels:
                app: site
            spec:
              containers:
                - name: site
                  image: nginx:1.27
                  volumeMounts:
                    - name: uploads
                      mountPath: /var/www/uploads
              volumes:
                - name: uploads
                  persistentVolumeClaim:
                    claimName: uploads
      `,
      testes: [
        teste({ descricao: 'O PVC permite vários nós', dica: 'Em accessModes do PVC, escreva - ReadWriteMany.' },
          campo('PersistentVolumeClaim', 'uploads', 'spec.accessModes', { contem: 'ReadWriteMany' }),
          { tipo: 'pvc-existe', pvc: 'uploads', storageClass: 'efs-sc' }),
        teste({ descricao: 'O Deployment usa o PVC uploads', dica: 'Em volumes: persistentVolumeClaim com claimName: uploads.' },
          campo('Deployment', 'site', 'spec.template.spec.volumes[name=uploads].persistentVolumeClaim.claimName', { valor: 'uploads' })),
        teste({ descricao: 'O volume está montado em /var/www/uploads', dica: 'Em volumeMounts do container site, mountPath: /var/www/uploads.' },
          campo('Deployment', 'site', 'spec.template.spec.containers[name=site].volumeMounts[name=uploads].mountPath', { valor: '/var/www/uploads' })),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'aws-pvc-ebs': { dica: 'Confira o tamanho e o modo de acesso pedidos.', regras: [campo('PersistentVolumeClaim', 'dados-pvc', 'spec.resources.requests.storage', { valor: '10Gi' }), campo('PersistentVolumeClaim', 'dados-pvc', 'spec.accessModes', { contem: 'ReadWriteOnce' })] },
    'aws-pod-volume': { dica: 'O volume usa o PVC que já existe, e o container a imagem do passo 1.', regras: [campo('Pod', 'app-com-dados', 'spec.volumes[name=dados].persistentVolumeClaim.claimName', { valor: 'dados-pvc' }), campo('Pod', 'app-com-dados', 'spec.containers[name=nginx].image', { valor: 'nginx:1.25' })] },
    'aws-storageclass-gp3': { dica: 'A StorageClass tem o nome pedido no passo 1.', regras: [existe('StorageClass', 'ebs-gp3')] },
    'aws-storageclass-criptografada': { dica: 'A classe continua sendo do EBS, com discos gp3.', regras: [campo('StorageClass', 'ebs-cripto', 'provisioner', { valor: 'ebs.csi.aws.com' }), campo('StorageClass', 'ebs-cripto', 'parameters.type', { valor: 'gp3' })] },
    'aws-ebs-topologia': { dica: 'A classe continua esperando o primeiro Pod para criar o disco.', regras: [campo('StorageClass', 'ebs-zonas', 'volumeBindingMode', { valor: 'WaitForFirstConsumer' }), campo('StorageClass', 'ebs-zonas', 'allowedTopologies[0].matchLabelExpressions[0].values', { naoContem: 'us-east-1c' })] },
    'aws-snapshotclass': { dica: 'A classe não tem spec: driver e deletionPolicy ficam na raiz.', regras: [campo('VolumeSnapshotClass', 'ebs-retem', 'spec', { ausente: true })] },
    'aws-snapshot-pvc': { dica: 'A foto vem de um PVC, não de um conteúdo já existente.', regras: [campo('VolumeSnapshot', 'dados-snap', 'spec.source.volumeSnapshotContentName', { ausente: true })] },
    'aws-pvc-restore': { dica: 'Confira o modo de acesso pedido no passo 1.', regras: [campo('PersistentVolumeClaim', 'dados-restaurado', 'spec.accessModes', { contem: 'ReadWriteOnce' })] },
    'aws-efs-storageclass': { dica: 'A StorageClass tem o nome pedido no passo 1.', regras: [existe('StorageClass', 'efs-sc')] },
    'aws-efs-rwx-deploy': { dica: 'Confira as réplicas e o tamanho pedido para o PVC.', regras: [campo('Deployment', 'site', 'spec.replicas', { valor: 3 }), campo('PersistentVolumeClaim', 'uploads', 'spec.resources.requests.storage', { valor: '5Gi' })] },
  },
};
