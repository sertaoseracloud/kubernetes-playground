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
      resumo: `<p>Crie um PersistentVolumeClaim chamado <code>dados-pvc</code> que solicita 10Gi de armazenamento usando a StorageClass <code>ebs-gp3</code> com modo de acesso <code>ReadWriteOnce</code>.</p>`,
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
          regras: [{ tipo: 'recurso-existe', kind: 'PersistentVolumeClaim', nome: 'dados-pvc' }],
        },
        {
          descricao: 'O PVC usa a StorageClass ebs-gp3',
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
      resumo: `<p>Crie um Pod chamado <code>app-com-dados</code> usando a imagem <code>nginx:1.25</code> que monta o PVC <code>dados-pvc</code> no caminho <code>/usr/share/nginx/html</code>.</p>
        <p>O volume deve se chamar <code>dados</code>.</p>`,
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
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'app-com-dados' }],
        },
        {
          descricao: 'O volume dados está montado no container nginx',
          regras: [{ tipo: 'volume-montado', pod: 'app-com-dados', container: 'nginx', volume: 'dados', caminho: '/usr/share/nginx/html' }],
        },
      ],
    },
  ],
};