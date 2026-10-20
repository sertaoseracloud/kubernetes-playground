// Módulo Azure, tópico 4: discos e arquivos no AKS (Azure Disk CSI, SKUs, snapshots e Azure Files).
// Segue docs/didatica.md: lição com exemplo comentado, passos, esqueleto, dicas e "como corrigir".
import { licao, exercicio, teste, existe, campo, docs } from './util.js';

/** Uma StorageClass do Azure Disk CSI que espera o primeiro Pod; `parametros` vão em parameters e `extra` na raiz. */
const storageClassDisco = (nome, parametros, extra = '') => `
  apiVersion: storage.k8s.io/v1
  kind: StorageClass
  metadata:
    name: ${nome}
  provisioner: disk.csi.azure.com
  volumeBindingMode: WaitForFirstConsumer
${extra}  parameters:
${parametros}
`;

const PVC_BANCO = `
  apiVersion: v1
  kind: PersistentVolumeClaim
  metadata:
    name: banco-pvc
  spec:
    accessModes:
      - ReadWriteOnce
    storageClassName: managed-csi-premium
    resources:
      requests:
        storage: 32Gi
`;

const SNAPSHOT_CLASS = `
  apiVersion: snapshot.storage.k8s.io/v1
  kind: VolumeSnapshotClass
  metadata:
    name: disco-snap
  driver: disk.csi.azure.com
  deletionPolicy: Delete
  parameters:
    incremental: "true"
`;

const SNAPSHOT = `
  apiVersion: snapshot.storage.k8s.io/v1
  kind: VolumeSnapshot
  metadata:
    name: banco-snap
  spec:
    volumeSnapshotClassName: disco-snap
    source:
      persistentVolumeClaimName: banco-pvc
`;

export const azureStorage = {
  id: 'azure-storage',
  titulo: 'Storage no AKS',
  descricao: 'Azure Disk CSI e seus SKUs, snapshots e compartilhamentos com Azure Files.',
  icone: '💾',
  itens: [
    licao('azure-disk-csi', 'Azure Disk CSI e StorageClass', 'medio', `
      <p>Um <b>Azure Disk</b> é o HD externo da Azure: ligado a um nó por vez (<code>ReadWriteOnce</code>), numa zona. Quem cria e liga os
      discos é o <b>Azure Disk CSI Driver</b> (<code>provisioner: disk.csi.azure.com</code>), já instalado em todo AKS.</p>
      <ul>
        <li>O AKS já traz StorageClasses prontas: <code>managed-csi</code> (SSD padrão) e <code>managed-csi-premium</code> (SSD premium).</li>
        <li>Para criar a sua, o tipo do disco vai em <code>parameters.skuName</code>: <code>StandardSSD_LRS</code>,
          <code>Premium_LRS</code>, <code>Premium_ZRS</code> (copiado em três zonas: sobrevive à queda de uma) ou
          <code>PremiumV2_LRS</code> (você escolhe IOPS e MB/s com <code>DiskIOPSReadWrite</code> e <code>DiskMBpsReadWrite</code>, e
          precisa de <code>cachingMode: None</code>).</li>
        <li><code>volumeBindingMode: WaitForFirstConsumer</code>: o disco nasce na zona do nó do Pod.</li>
        <li><code>allowVolumeExpansion: true</code>: o PVC pode crescer depois.</li>
      </ul>
      <p>Valores de <code>parameters</code> são texto: <code>"5000"</code>, <code>"true"</code>.</p>
      <p><b>No cluster:</b> quando o Pod usa o PVC, o driver cria o disco gerenciado no resource group dos nós e o anexa à máquina.</p>`,
    `
      apiVersion: storage.k8s.io/v1
      kind: StorageClass
      metadata:
        name: disco-premium
      provisioner: disk.csi.azure.com          # o driver do Azure Disk
      volumeBindingMode: WaitForFirstConsumer  # disco na zona do Pod
      allowVolumeExpansion: true               # o PVC pode crescer
      parameters:
        skuName: Premium_LRS                   # SSD premium, numa zona
    `),

    exercicio({
      id: 'aks-sc-premium',
      titulo: 'StorageClass de SSD premium',
      dificuldade: 'facil',
      resumo: `
        <p>O banco de dados precisa de disco rápido. Crie uma StorageClass de SSD premium que espera o Pod.</p>
        <ol>
          <li>Crie a StorageClass <code>disco-premium</code> com <code>provisioner: disk.csi.azure.com</code>.</li>
          <li><code>volumeBindingMode: WaitForFirstConsumer</code>.</li>
          <li>Em <code>parameters</code>, <code>skuName: Premium_LRS</code>.</li>
        </ol>
        <p><b>No cluster:</b> cada PVC desta classe vira um disco Premium SSD na zona do nó que receber o Pod.</p>`,
      inicial: `
        apiVersion: storage.k8s.io/v1
        kind: StorageClass
        metadata:
          name: disco-premium
        provisioner:           # TODO: disk.csi.azure.com
        # TODO: volumeBindingMode: WaitForFirstConsumer
        parameters:
          skuName:             # TODO: Premium_LRS
      `,
      dica: [
        'O exemplo da lição "Azure Disk CSI" tem esta classe (sem o passo da expansão).',
        'provisioner: disk.csi.azure.com\nvolumeBindingMode: WaitForFirstConsumer\nparameters:\n  skuName: Premium_LRS',
      ],
      solucao: storageClassDisco('disco-premium', '    skuName: Premium_LRS'),
      testes: [
        teste({ descricao: 'A classe usa o Azure Disk CSI', dica: 'provisioner é obrigatório: escreva disk.csi.azure.com.' },
          campo('StorageClass', 'disco-premium', 'provisioner', { valor: 'disk.csi.azure.com' })),
        teste({ descricao: 'Os discos são Premium SSD', dica: 'Em parameters: skuName: Premium_LRS.' },
          campo('StorageClass', 'disco-premium', 'parameters.skuName', { valor: 'Premium_LRS' })),
        teste({ descricao: 'O disco nasce na zona do Pod', dica: 'Na raiz: volumeBindingMode: WaitForFirstConsumer.' },
          campo('StorageClass', 'disco-premium', 'volumeBindingMode', { valor: 'WaitForFirstConsumer' })),
      ],
    }),

    {
      id: 'azure-pvc-disk',
      tipo: 'exercicio',
      titulo: 'PVC com Azure Disk',
      dificuldade: 'medio',
      xp: 15,
      resumo: `
        <p>Na Azure, discos de bloco são <b>Azure Disks</b>, criados pelo driver CSI a partir da StorageClass <code>managed-csi</code> (que já vem no AKS).</p>
        <ol>
          <li>Crie o PVC <code>azure-disk-pvc</code>.</li>
          <li><code>accessModes: [ReadWriteOnce]</code> (um disco se liga a um nó por vez).</li>
          <li><code>storageClassName: managed-csi</code> e <code>10Gi</code> em <code>resources.requests.storage</code>.</li>
        </ol>
        <p><b>No cluster:</b> quando um Pod usar o PVC, o driver cria um Azure Disk de 10 GiB e o anexa ao nó do Pod.</p>`,
      inicial: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: azure-disk-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName:      # TODO: managed-csi
  resources:
    requests:
      storage:           # TODO: 10Gi
`,
      dica: [
        "É um PVC como o da lição \"Workloads com estado\", com a StorageClass da Azure.",
        "storageClassName: managed-csi e storage: 10Gi.",
      ],
      solucao: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: azure-disk-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: managed-csi
  resources:
    requests:
      storage: 10Gi`,
      testes: [
        {
          descricao: 'O PersistentVolumeClaim azure-disk-pvc existe',
          dica: "Preencha os TODO: um campo vazio impede o apply.",
          regras: [{ tipo: 'recurso-existe', kind: 'PersistentVolumeClaim', nome: 'azure-disk-pvc' }],
        },
        {
          descricao: 'O PVC está configurado com StorageClass Azure',
          dica: "Em spec: storageClassName: managed-csi.",
          regras: [{ tipo: 'pvc-existe', nome: 'azure-disk-pvc', storageClass: 'managed-csi' }],
        },
      ],
    },

    exercicio({
      id: 'aks-sc-zrs',
      titulo: 'Disco que sobrevive à queda de uma zona',
      dificuldade: 'medio',
      resumo: `
        <p>Com um disco <code>Premium_LRS</code>, se a zona cair, o Pod fica preso nela. Um disco <b>ZRS</b> é copiado em três zonas e pode
        ser ligado a um nó de outra zona.</p>
        <ol>
          <li>Na StorageClass <code>disco-zrs</code>, em <code>parameters</code>, <code>skuName: Premium_ZRS</code>.</li>
          <li>Na raiz, <code>allowVolumeExpansion: true</code>.</li>
        </ol>
        <p><b>No cluster:</b> se a zona do nó cair, o Pod é recriado em outra zona e o mesmo disco é anexado lá, com os dados.</p>`,
      inicial: storageClassDisco('disco-zrs', '    skuName:             # TODO: Premium_ZRS', '  # TODO: allowVolumeExpansion: true\n'),
      dica: [
        'O SKU muda só a última parte: LRS (uma zona) para ZRS (três zonas).',
        'allowVolumeExpansion fica na raiz, como provisioner.',
        'allowVolumeExpansion: true\nparameters:\n  skuName: Premium_ZRS',
      ],
      solucao: storageClassDisco('disco-zrs', '    skuName: Premium_ZRS', '  allowVolumeExpansion: true\n'),
      testes: [
        teste({ descricao: 'Os discos são copiados em três zonas', dica: 'Em parameters: skuName: Premium_ZRS.' },
          existe('StorageClass', 'disco-zrs'),
          campo('StorageClass', 'disco-zrs', 'parameters.skuName', { valor: 'Premium_ZRS' })),
        teste({ descricao: 'Os discos podem crescer', dica: 'Na raiz: allowVolumeExpansion: true.' },
          campo('StorageClass', 'disco-zrs', 'allowVolumeExpansion', { valor: true })),
      ],
    }),

    exercicio({
      id: 'aks-sc-premiumv2',
      titulo: 'Premium SSD v2 com IOPS sob medida',
      dificuldade: 'medio',
      resumo: `
        <p>O banco precisa de 5000 IOPS e 200 MB/s, mas só de 64 GiB. No Premium SSD v2, o desempenho é escolhido à parte do tamanho.</p>
        <ol>
          <li>Na StorageClass <code>disco-v2</code>, em <code>parameters</code>, <code>skuName: PremiumV2_LRS</code> e <code>cachingMode: None</code>.</li>
          <li><code>DiskIOPSReadWrite: "5000"</code> e <code>DiskMBpsReadWrite: "200"</code> (texto, entre aspas).</li>
        </ol>
        <p><b>No cluster:</b> o driver cria um disco v2 com o desempenho pedido. O Premium SSD v2 não aceita cache de host, por isso o
        <code>cachingMode: None</code>.</p>`,
      inicial: storageClassDisco('disco-v2', `    skuName: PremiumV2_LRS
    # TODO: cachingMode None
    # TODO: DiskIOPSReadWrite "5000" e DiskMBpsReadWrite "200"`),
      dica: [
        'Os três parâmetros ficam em parameters, alinhados com skuName.',
        'Os nomes têm maiúsculas: DiskIOPSReadWrite e DiskMBpsReadWrite.',
        'cachingMode: None\nDiskIOPSReadWrite: "5000"\nDiskMBpsReadWrite: "200"',
      ],
      solucao: storageClassDisco('disco-v2', `    skuName: PremiumV2_LRS
    cachingMode: None
    DiskIOPSReadWrite: "5000"
    DiskMBpsReadWrite: "200"`),
      testes: [
        teste({ descricao: 'É um disco Premium SSD v2 sem cache', dica: 'Em parameters: skuName: PremiumV2_LRS e cachingMode: None.' },
          campo('StorageClass', 'disco-v2', 'parameters.skuName', { valor: 'PremiumV2_LRS' }),
          campo('StorageClass', 'disco-v2', 'parameters.cachingMode', { valor: 'None' })),
        teste({ descricao: 'Com 5000 IOPS e 200 MB/s', dica: 'Em parameters: DiskIOPSReadWrite: "5000" e DiskMBpsReadWrite: "200".' },
          campo('StorageClass', 'disco-v2', 'parameters.DiskIOPSReadWrite', { valor: '5000' }),
          campo('StorageClass', 'disco-v2', 'parameters.DiskMBpsReadWrite', { valor: '200' })),
      ],
    }),

    licao('azure-snapshot-licao', 'Snapshots de Azure Disk', 'medio', `
      <p>O <b>snapshot</b> é a foto do disco num instante, que você já viu no módulo da AWS. No AKS, o driver do Azure Disk tira a foto, e os
      recursos são os mesmos: <code>VolumeSnapshotClass</code>, <code>VolumeSnapshot</code> e o PVC com <code>dataSource</code>.</p>
      <ul>
        <li>Na VolumeSnapshotClass, <code>driver: disk.csi.azure.com</code>.</li>
        <li><code>parameters.incremental: "true"</code>: a foto guarda só o que mudou desde a anterior (mais barato e rápido). É o padrão
          recomendado.</li>
        <li><code>deletionPolicy</code>: <code>Delete</code> apaga a foto na Azure junto com o recurso; <code>Retain</code> guarda.</li>
      </ul>
      <p><b>No cluster:</b> o snapshot aparece no resource group dos nós, no portal da Azure, e <code>kubectl get volumesnapshot</code> mostra
      <code>READYTOUSE: true</code> quando ele termina.</p>`,
    `
      apiVersion: snapshot.storage.k8s.io/v1
      kind: VolumeSnapshotClass
      metadata:
        name: disco-snap
      driver: disk.csi.azure.com   # quem tira a foto
      deletionPolicy: Delete
      parameters:
        incremental: "true"        # só o que mudou
      ---
      apiVersion: snapshot.storage.k8s.io/v1
      kind: VolumeSnapshot
      metadata:
        name: banco-snap
      spec:
        volumeSnapshotClassName: disco-snap
        source:
          persistentVolumeClaimName: banco-pvc
    `),

    exercicio({
      id: 'aks-snapshotclass',
      titulo: 'Classe de snapshots incrementais',
      dificuldade: 'facil',
      resumo: `
        <p>Os backups diários dos discos devem ser incrementais, para não pagar a foto inteira todo dia.</p>
        <ol>
          <li>Crie a <code>VolumeSnapshotClass</code> <code>disco-snap</code> com <code>driver: disk.csi.azure.com</code> e
            <code>deletionPolicy: Delete</code>.</li>
          <li>Em <code>parameters</code>, <code>incremental: "true"</code>.</li>
        </ol>
        <p><b>No cluster:</b> cada VolumeSnapshot desta classe vira um snapshot incremental do disco na Azure.</p>`,
      inicial: `
        apiVersion: snapshot.storage.k8s.io/v1
        kind: VolumeSnapshotClass
        metadata:
          name: disco-snap
        driver:                # TODO: disk.csi.azure.com
        deletionPolicy: Delete
        parameters:
          incremental:         # TODO: "true"
      `,
      dica: [
        'O exemplo da lição "Snapshots de Azure Disk" começa com esta classe.',
        'driver: disk.csi.azure.com\nparameters:\n  incremental: "true"',
      ],
      solucao: SNAPSHOT_CLASS,
      testes: [
        teste({ descricao: 'Usa o driver do Azure Disk', dica: 'driver é obrigatório: escreva disk.csi.azure.com.' },
          existe('VolumeSnapshotClass', 'disco-snap'),
          campo('VolumeSnapshotClass', 'disco-snap', 'driver', { valor: 'disk.csi.azure.com' })),
        teste({ descricao: 'As fotos são incrementais', dica: 'Em parameters: incremental: "true" (com aspas).' },
          campo('VolumeSnapshotClass', 'disco-snap', 'parameters.incremental', { valor: 'true' })),
      ],
    }),

    exercicio({
      id: 'aks-snapshot',
      titulo: 'Foto do disco do banco',
      dificuldade: 'medio',
      existentes: docs(PVC_BANCO, SNAPSHOT_CLASS),
      resumo: `
        <p>Antes da migração do banco, uma foto do disco <code>banco-pvc</code>.</p>
        <ol>
          <li>Crie o <code>VolumeSnapshot</code> <code>banco-snap</code> com <code>volumeSnapshotClassName: disco-snap</code>.</li>
          <li>Em <code>source</code>, <code>persistentVolumeClaimName: banco-pvc</code>.</li>
        </ol>
        <p><b>No cluster:</b> o driver pede à Azure um snapshot incremental do disco do PVC, sem parar o Pod.</p>`,
      inicial: `
        apiVersion: snapshot.storage.k8s.io/v1
        kind: VolumeSnapshot
        metadata:
          name: banco-snap
        spec:
          volumeSnapshotClassName:   # TODO: disco-snap
          source:
            # TODO: persistentVolumeClaimName: banco-pvc
      `,
      dica: [
        'É o segundo recurso do exemplo da lição "Snapshots de Azure Disk".',
        'volumeSnapshotClassName: disco-snap\nsource:\n  persistentVolumeClaimName: banco-pvc',
      ],
      solucao: SNAPSHOT,
      testes: [
        teste({ descricao: 'O VolumeSnapshot existe', dica: 'source precisa de persistentVolumeClaimName: sem ele o apply é recusado.' }, existe('VolumeSnapshot', 'banco-snap')),
        teste({ descricao: 'A foto é do disco do banco', dica: 'Em spec.source: persistentVolumeClaimName: banco-pvc.' },
          campo('VolumeSnapshot', 'banco-snap', 'spec.source.persistentVolumeClaimName', { valor: 'banco-pvc' })),
        teste({ descricao: 'Usa a classe incremental', dica: 'Em spec: volumeSnapshotClassName: disco-snap.' },
          campo('VolumeSnapshot', 'banco-snap', 'spec.volumeSnapshotClassName', { valor: 'disco-snap' })),
      ],
    }),

    exercicio({
      id: 'aks-restore',
      titulo: 'Disco novo a partir da foto',
      dificuldade: 'dificil',
      existentes: docs(PVC_BANCO, SNAPSHOT_CLASS, SNAPSHOT),
      resumo: `
        <p>O time de dados quer uma cópia do banco para testes, a partir da foto <code>banco-snap</code>.</p>
        <ol>
          <li>Crie o PVC <code>banco-copia</code> (<code>ReadWriteOnce</code>, <code>managed-csi-premium</code>, <code>32Gi</code>).</li>
          <li>Em <code>spec.dataSource</code>: <code>name: banco-snap</code>, <code>kind: VolumeSnapshot</code> e
            <code>apiGroup: snapshot.storage.k8s.io</code>.</li>
        </ol>
        <p><b>No cluster:</b> o driver cria um disco novo com os dados da foto. O disco do banco de produção não é tocado.</p>`,
      inicial: `
        apiVersion: v1
        kind: PersistentVolumeClaim
        metadata:
          name: banco-copia
        spec:
          accessModes:
            - ReadWriteOnce
          storageClassName: managed-csi-premium
          resources:
            requests:
              storage: 32Gi
          # TODO: dataSource com name, kind e apiGroup (passo 2)
      `,
      dica: [
        'É como o PVC restaurado do módulo da AWS, com o snapshot do Azure Disk.',
        'dataSource fica no spec do PVC, alinhado com resources.',
        'dataSource:\n  name: banco-snap\n  kind: VolumeSnapshot\n  apiGroup: snapshot.storage.k8s.io',
      ],
      solucao: `
        apiVersion: v1
        kind: PersistentVolumeClaim
        metadata:
          name: banco-copia
        spec:
          accessModes:
            - ReadWriteOnce
          storageClassName: managed-csi-premium
          resources:
            requests:
              storage: 32Gi
          dataSource:
            name: banco-snap
            kind: VolumeSnapshot
            apiGroup: snapshot.storage.k8s.io
      `,
      testes: [
        teste({ descricao: 'O PVC novo existe', dica: 'Mantenha storageClassName: managed-csi-premium e 32Gi.' },
          { tipo: 'pvc-existe', pvc: 'banco-copia', storageClass: 'managed-csi-premium' }),
        teste({ descricao: 'Nasce da foto banco-snap', dica: 'Em spec.dataSource: name: banco-snap, kind: VolumeSnapshot e apiGroup: snapshot.storage.k8s.io.' },
          campo('PersistentVolumeClaim', 'banco-copia', 'spec.dataSource.name', { valor: 'banco-snap' }),
          campo('PersistentVolumeClaim', 'banco-copia', 'spec.dataSource.kind', { valor: 'VolumeSnapshot' }),
          campo('PersistentVolumeClaim', 'banco-copia', 'spec.dataSource.apiGroup', { valor: 'snapshot.storage.k8s.io' })),
      ],
    }),

    licao('azure-files-rwx', 'Azure Files para RWX', 'dificil', `
      <p>O <b>Azure Files</b> é a pasta compartilhada da rede do escritório: vários Pods, em vários nós, leem e escrevem ao mesmo tempo
      (<code>ReadWriteMany</code>). Quem cria os compartilhamentos é o <b>Azure Files CSI Driver</b>
      (<code>provisioner: file.csi.azure.com</code>).</p>
      <ul>
        <li>O AKS já traz as classes <code>azurefile-csi</code> (SMB, padrão) e <code>azurefile-csi-premium</code>.</li>
        <li>Para criar a sua: <code>parameters.skuName</code> (<code>Standard_LRS</code>, <code>Premium_LRS</code>...) e
          <code>parameters.protocol</code>: <code>smb</code> (Windows e Linux) ou <code>nfs</code> (só Linux, mais rápido; exige
          <code>Premium_LRS</code>).</li>
        <li>No PVC, <code>accessModes: [ReadWriteMany]</code>. O tamanho pedido vira a cota do compartilhamento (no premium, você paga pela cota).</li>
      </ul>
      <p>Bom para arquivos enviados por usuários e conteúdo de várias réplicas; para banco de dados, use Azure Disk.</p>
      <p><b>No cluster:</b> o driver cria o compartilhamento numa Storage Account e todos os Pods montam a mesma pasta pela rede.</p>`,
    `
      apiVersion: storage.k8s.io/v1
      kind: StorageClass
      metadata:
        name: arquivos-nfs
      provisioner: file.csi.azure.com   # o driver do Azure Files
      parameters:
        skuName: Premium_LRS            # NFS exige premium
        protocol: nfs                   # NFS (Linux) em vez de SMB
      ---
      apiVersion: v1
      kind: PersistentVolumeClaim
      metadata:
        name: fotos
      spec:
        accessModes: ["ReadWriteMany"]  # vários Pods, vários nós
        storageClassName: arquivos-nfs
        resources:
          requests:
            storage: 100Gi              # a cota do compartilhamento
    `),

    exercicio({
      id: 'aks-files-sc',
      titulo: 'StorageClass do Azure Files com NFS',
      dificuldade: 'medio',
      resumo: `
        <p>Os Pods Linux do site vão compartilhar as fotos dos produtos por NFS, que é mais rápido que SMB.</p>
        <ol>
          <li>Crie a StorageClass <code>arquivos-nfs</code> com <code>provisioner: file.csi.azure.com</code>.</li>
          <li>Em <code>parameters</code>: <code>skuName: Premium_LRS</code> e <code>protocol: nfs</code>.</li>
        </ol>
        <p><b>No cluster:</b> cada PVC desta classe vira um compartilhamento NFS premium, montado pelos Pods sem senha da Storage Account.</p>`,
      inicial: `
        apiVersion: storage.k8s.io/v1
        kind: StorageClass
        metadata:
          name: arquivos-nfs
        provisioner:           # TODO: file.csi.azure.com
        parameters:
          skuName: Premium_LRS
          # TODO: protocol nfs
      `,
      dica: [
        'O exemplo da lição "Azure Files para RWX" começa com esta classe.',
        'provisioner: file.csi.azure.com\nparameters:\n  skuName: Premium_LRS\n  protocol: nfs',
      ],
      solucao: `
        apiVersion: storage.k8s.io/v1
        kind: StorageClass
        metadata:
          name: arquivos-nfs
        provisioner: file.csi.azure.com
        parameters:
          skuName: Premium_LRS
          protocol: nfs
      `,
      testes: [
        teste({ descricao: 'A classe usa o Azure Files CSI', dica: 'provisioner é obrigatório: escreva file.csi.azure.com.' },
          campo('StorageClass', 'arquivos-nfs', 'provisioner', { valor: 'file.csi.azure.com' })),
        teste({ descricao: 'O protocolo é NFS', dica: 'Em parameters: protocol: nfs.' },
          campo('StorageClass', 'arquivos-nfs', 'parameters.protocol', { valor: 'nfs' })),
      ],
    }),

    {
      id: 'azure-pod-files',
      tipo: 'exercicio',
      titulo: 'Pod com Azure Files compartilhado',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `
        <p>O PVC <code>azure-files-pvc</code> (um compartilhamento do <b>Azure Files</b>, que vários Pods podem usar ao mesmo tempo) já
        existe no cluster. Monte-o num Pod.</p>
        <ol>
          <li>No Pod <code>app-azure-files</code> (container <code>app</code>, imagem <code>nginx:1.25</code>), declare o volume <code>azure-share</code>.</li>
          <li>O tipo do volume é <code>persistentVolumeClaim</code>, com <code>claimName: azure-files-pvc</code>.</li>
          <li>Monte <code>azure-share</code> em <code>/mnt/azure</code>.</li>
        </ol>
        <p><b>No cluster:</b> o compartilhamento é montado por rede (SMB ou NFS). Outros Pods, até em outros nós, podem montar o mesmo PVC.</p>`,
      inicial: `apiVersion: v1
kind: Pod
metadata:
  name: app-azure-files
spec:
  containers:
    - name: app
      image: nginx:1.25
      volumeMounts:
        - name: azure-share
          mountPath:     # TODO: /mnt/azure
  volumes:
    - name: azure-share
      # TODO: persistentVolumeClaim com claimName: azure-files-pvc
`,
      existentes: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: azure-files-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: azurefile-csi
  resources:
    requests:
      storage: 5Gi`,
      dica: [
        "Volume em duas partes: declarar (volumes) e montar (volumeMounts).",
        "persistentVolumeClaim:\n  claimName: azure-files-pvc",
      ],
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: app-azure-files
spec:
  containers:
    - name: app
      image: nginx:1.25
      volumeMounts:
        - name: azure-share
          mountPath: /mnt/azure
  volumes:
    - name: azure-share
      persistentVolumeClaim:
        claimName: azure-files-pvc`,
      testes: [
        {
          descricao: 'O Pod app-azure-files existe',
          dica: "Preencha os TODO: um volume sem tipo impede o apply.",
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'app-azure-files' }],
        },
        {
          descricao: 'O volume Azure Files está montado no container',
          dica: "volumeMounts com name: azure-share e mountPath: /mnt/azure.",
          regras: [{ tipo: 'volume-montado', pod: 'app-azure-files', container: 'app', mountPath: '/mnt/azure' }],
        },
      ],
    },

    exercicio({
      id: 'aks-files-deploy',
      titulo: 'Três réplicas com a mesma pasta de fotos',
      dificuldade: 'dificil',
      resumo: `
        <p>As 3 réplicas do site precisam ver as mesmas fotos de produtos, em qualquer nó.</p>
        <ol>
          <li>Crie o PVC <code>fotos</code> com <code>accessModes: [ReadWriteMany]</code>, <code>storageClassName: arquivos-nfs</code> e <code>100Gi</code>.</li>
          <li>No Deployment <code>site</code> (3 réplicas), declare o volume <code>fotos</code> do tipo <code>persistentVolumeClaim</code>
            com <code>claimName: fotos</code>.</li>
          <li>Monte o volume em <code>/usr/share/nginx/html/fotos</code> no container <code>site</code>.</li>
        </ol>
        <p><b>No cluster:</b> os 3 Pods montam o mesmo compartilhamento NFS. Uma foto enviada por um aparece para os outros na hora.</p>`,
      inicial: `
        apiVersion: v1
        kind: PersistentVolumeClaim
        metadata:
          name: fotos
        spec:
          accessModes:
            - # TODO: ReadWriteMany
          storageClassName: arquivos-nfs
          resources:
            requests:
              storage: 100Gi
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
                    - name: fotos
                      mountPath:     # TODO: /usr/share/nginx/html/fotos
              volumes:
                - name: fotos
                  # TODO: persistentVolumeClaim com claimName: fotos
      `,
      dica: [
        'O PVC é o do exemplo da lição "Azure Files para RWX"; o volume no Deployment é como o do exercício "Pod com Azure Files compartilhado".',
        'ReadWriteMany deixa vários nós montarem o mesmo volume.',
        'accessModes:\n  - ReadWriteMany\n...\nmountPath: /usr/share/nginx/html/fotos\n...\npersistentVolumeClaim:\n  claimName: fotos',
      ],
      solucao: `
        apiVersion: v1
        kind: PersistentVolumeClaim
        metadata:
          name: fotos
        spec:
          accessModes:
            - ReadWriteMany
          storageClassName: arquivos-nfs
          resources:
            requests:
              storage: 100Gi
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
                    - name: fotos
                      mountPath: /usr/share/nginx/html/fotos
              volumes:
                - name: fotos
                  persistentVolumeClaim:
                    claimName: fotos
      `,
      testes: [
        teste({ descricao: 'O PVC permite vários nós', dica: 'Em accessModes do PVC: - ReadWriteMany.' },
          campo('PersistentVolumeClaim', 'fotos', 'spec.accessModes', { contem: 'ReadWriteMany' }),
          { tipo: 'pvc-existe', pvc: 'fotos', storageClass: 'arquivos-nfs' }),
        teste({ descricao: 'O Deployment usa o PVC fotos', dica: 'Em volumes: persistentVolumeClaim com claimName: fotos.' },
          campo('Deployment', 'site', 'spec.template.spec.volumes[name=fotos].persistentVolumeClaim.claimName', { valor: 'fotos' })),
        teste({ descricao: 'A pasta está montada no site', dica: 'Em volumeMounts do container site: mountPath: /usr/share/nginx/html/fotos.' },
          campo('Deployment', 'site', 'spec.template.spec.containers[name=site].volumeMounts[name=fotos].mountPath', { valor: '/usr/share/nginx/html/fotos' })),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'aks-sc-premium': { dica: 'A StorageClass tem o nome do passo 1.', regras: [existe('StorageClass', 'disco-premium')] },
    'azure-pvc-disk': { dica: 'Confira o tamanho e o modo de acesso pedidos.', regras: [campo('PersistentVolumeClaim', 'azure-disk-pvc', 'spec.resources.requests.storage', { valor: '10Gi' }), campo('PersistentVolumeClaim', 'azure-disk-pvc', 'spec.accessModes', { contem: 'ReadWriteOnce' })] },
    'aks-sc-zrs': { dica: 'A classe continua sendo do Azure Disk, esperando o Pod.', regras: [campo('StorageClass', 'disco-zrs', 'provisioner', { valor: 'disk.csi.azure.com' }), campo('StorageClass', 'disco-zrs', 'volumeBindingMode', { valor: 'WaitForFirstConsumer' })] },
    'aks-sc-premiumv2': { dica: 'A classe continua sendo do Azure Disk.', regras: [campo('StorageClass', 'disco-v2', 'provisioner', { valor: 'disk.csi.azure.com' })] },
    'aks-snapshotclass': { dica: 'Confira a política de exclusão do passo 1.', regras: [campo('VolumeSnapshotClass', 'disco-snap', 'deletionPolicy', { valor: 'Delete' })] },
    'aks-snapshot': { dica: 'A foto vem de um PVC.', regras: [campo('VolumeSnapshot', 'banco-snap', 'spec.source.volumeSnapshotContentName', { ausente: true })] },
    'aks-restore': { dica: 'Confira o tamanho e o modo de acesso do passo 1.', regras: [campo('PersistentVolumeClaim', 'banco-copia', 'spec.resources.requests.storage', { valor: '32Gi' }), campo('PersistentVolumeClaim', 'banco-copia', 'spec.accessModes', { contem: 'ReadWriteOnce' })] },
    'aks-files-sc': { dica: 'NFS exige o SKU premium.', regras: [campo('StorageClass', 'arquivos-nfs', 'parameters.skuName', { valor: 'Premium_LRS' })] },
    'azure-pod-files': { dica: 'O volume usa o PVC que já existe, e o container a imagem do passo 1.', regras: [campo('Pod', 'app-azure-files', 'spec.volumes[name=azure-share].persistentVolumeClaim.claimName', { valor: 'azure-files-pvc' }), campo('Pod', 'app-azure-files', 'spec.containers[name=app].image', { valor: 'nginx:1.25' })] },
    'aks-files-deploy': { dica: 'Confira as réplicas e o tamanho do PVC.', regras: [campo('Deployment', 'site', 'spec.replicas', { valor: 3 }), campo('PersistentVolumeClaim', 'fotos', 'spec.resources.requests.storage', { valor: '100Gi' })] },
  },
};
