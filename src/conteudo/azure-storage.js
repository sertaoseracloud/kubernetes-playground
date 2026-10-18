// Módulo Azure: Storage para Kubernetes.
// Lições sobre Azure Disk CSI, StorageClass e Azure Files.
// Exercícios com validação via recurso-existe, pvc-existe e volume-montado.

export const azureStorage = {
  id: 'azure-storage',
  titulo: 'Storage Azure para K8s',
  descricao: 'Armazenamento persistente no AKS com Azure Disk, Azure Files e CSI drivers.',
  icone: '💾',
  itens: [
    {
      id: 'azure-disk-csi',
      tipo: 'licao',
      titulo: 'Azure Disk CSI e StorageClass',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O <b>Azure Disk CSI Driver</b> provisiona discos gerenciados do Azure como volumes persistentes no Kubernetes:</p>
        <dl>
          <dt><b>StorageClasses pré-definidas</b></dt><dd>O AKS cria automaticamente classes como <code>managed-csi</code> (Standard LRS), <code>managed-csi-premium</code> (Premium SSD) e variantes ZRS para redundância zonal.</dd>
          <dt><b>Modos de binding</b></dt><dd>
            <ul>
              <li><code>WaitForFirstConsumer</code> (recomendado): o PVC só é provisionado quando um Pod o referencia, garantindo que o disco seja criado na zona correta.</li>
              <li><code>Immediate</code>: o disco é criado assim que o PVC é submetido, podendo ficar na zona errada.</li>
            </ul>
          </dd>
          <dt><b>Tipos de disco</b></dt><dd>
            <ul>
              <li><b>Standard HDD/LRS</b>: menor custo, para dev/test.</li>
              <li><b>Premium SSD/LRS</b>: alta performance, baixa latência, para bancos de dados.</li>
              <li><b>ZRS (Zone-Redundant)</b>: replicado entre zonas de disponibilidade, para workloads multi-zona.</li>
            </ul>
          </dd>
        </dl>
        <p>Azure Disks suportam apenas <b>ReadWriteOnce</b> (RWO). Para compartilhamento entre múltiplos pods, use Azure Files.</p>`,
    },
    {
      id: 'azure-files-rwx',
      tipo: 'licao',
      titulo: 'Azure Files para RWX',
      dificuldade: 'dificil',
      xp: 5,
      resumo: `<p>O <b>Azure Files CSI Driver</b> provisiona file shares do Azure como volumes persistentes com suporte a <b>ReadWriteMany (RWX)</b>:</p>
        <dl>
          <dt><b>Protocolos</b></dt><dd>
            <ul>
              <li><b>SMB</b>: protocolo padrão, compatível com Windows e Linux. StorageClass <code>azurefile</code>.</li>
              <li><b>NFS v4.1</b>: melhor performance para Linux, sem overhead SMB. StorageClass <code>azurefile-nfs</code>.</li>
            </ul>
          </dd>
          <dt><b>Casos de uso</b></dt><dd>Configurações compartilhadas, uploads de arquivos, logs centralizados, conteúdo estático servido por múltiplos pods.</dd>
          <dt><b>Limitações</b></dt><dd>Latência maior que Azure Disk, não recomendado para bancos de dados transacionais. Use para dados de arquivo, não para IOPS intensivo.</dd>
        </dl>
        <p><b>Boas práticas</b>:</p>
        <ul>
          <li>Use NFS para workloads Linux que precisam de alta throughput.</li>
          <li>Configure <code>volumeBindingMode: WaitForFirstConsumer</code> na StorageClass.</li>
          <li>Defina quotas no Azure File Share para evitar custos inesperados.</li>
          <li>Use Premium tier para workloads sensíveis a latência.</li>
        </ul>`,
    },
    {
      id: 'azure-pvc-disk',
      tipo: 'exercicio',
      titulo: 'PVC com Azure Disk',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um <b>PersistentVolumeClaim</b> chamado <code>azure-disk-pvc</code> usando a StorageClass <code>managed-csi</code>.</p>
        <ul>
          <li>Modo de acesso: <code>ReadWriteOnce</code></li>
          <li>Tamanho solicitado: <code>10Gi</code></li>
          <li>StorageClassName: <code>managed-csi</code></li>
        </ul>`,
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
          regras: [{ tipo: 'recurso-existe', kind: 'PersistentVolumeClaim', nome: 'azure-disk-pvc' }],
        },
        {
          descricao: 'O PVC está configurado com StorageClass Azure',
          regras: [{ tipo: 'pvc-existe', nome: 'azure-disk-pvc', storageClass: 'managed-csi' }],
        },
      ],
    },
    {
      id: 'azure-pod-files',
      tipo: 'exercicio',
      titulo: 'Pod com Azure Files compartilhado',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie um <b>Pod</b> chamado <code>app-azure-files</code> que monte um volume Azure Files.</p>
        <ul>
          <li>Imagem: <code>nginx:1.25</code></li>
          <li>Monte o volume no caminho <code>/mnt/azure</code></li>
          <li>Use um PVC chamado <code>azure-files-pvc</code> como fonte do volume</li>
        </ul>`,
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
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'app-azure-files' }],
        },
        {
          descricao: 'O volume Azure Files está montado no container',
          regras: [{ tipo: 'volume-montado', pod: 'app-azure-files', container: 'app', mountPath: '/mnt/azure' }],
        },
      ],
    },
  ],
};