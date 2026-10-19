// Módulo AWS: Storage para Kubernetes na AWS.
// Lições e exercícios sobre EBS CSI Driver, StorageClass e EFS.

export const awsStorage = {
  id: 'aws-storage',
  titulo: 'Storage AWS para K8s',
  descricao: 'EBS CSI Driver, StorageClasses e volumes compartilhados com EFS.',
  icone: '💾',
  itens: [
    {
      id: 'aws-ebs-csi',
      tipo: 'licao',
      titulo: 'EBS CSI Driver e StorageClass',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O <b>EBS CSI Driver</b> é o componente que provisiona volumes EBS dinamicamente no EKS. Ele substitui o plugin in-tree deprecated e oferece suporte completo aos tipos de volume da AWS.</p>
        <p>Tipos de StorageClass comuns:</p>
        <dl>
          <dt><b>gp3</b></dt><dd>SSD de uso geral, balanceado entre custo e performance.</dd>
          <dt><b>io2</b></dt><dd>SSD provisionado para cargas críticas com IOPS garantidos.</dd>
        </dl>
        <p>O <b>volume binding mode</b> recomendado é <code>WaitForFirstConsumer</code>, que adia a criação do PV até que um Pod seja agendado, garantindo que o volume fique na mesma AZ do nó.</p>`,
    },
    {
      id: 'aws-efs-shared',
      tipo: 'licao',
      titulo: 'EFS para volumes compartilhados',
      dificuldade: 'dificil',
      xp: 5,
      resumo: `<p>O <b>EFS CSI Driver</b> permite montar sistemas de arquivos Elastic File System como volumes persistentes com modo <code>ReadWriteMany</code>.</p>
        <p>Diferente do EBS (que é ReadWriteOnce), o EFS suporta múltiplos pods em múltiplos nós acessando o mesmo volume simultaneamente.</p>
        <p>Conceitos importantes:</p>
        <ul>
          <li><b>Access Points</b>: pontos de entrada isolados com permissões POSIX independentes.</li>
          <li><b>Dynamic provisioning</b>: cria subdiretórios automaticamente via StorageClass.</li>
          <li><b>Throughput modes</b>: bursting ou provisioned para diferentes cargas.</li>
        </ul>
        <p>Ideal para conteúdo compartilhado, logs centralizados e dados de treinamento de ML.</p>`,
    },
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
  ],
};