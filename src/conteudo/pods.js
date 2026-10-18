// Módulo 2: Pods e Containers.
// Lições e exercícios sobre ciclo de vida, volumes, probes e multi-container pods.

export const pods = {
  id: 'pods',
  titulo: 'Pods e Containers',
  descricao: 'Ciclo de vida dos Pods, volumes, health checks e padrões multi-container.',
  icone: '📦',
  itens: [
    {
      id: 'pods-ciclo-de-vida',
      tipo: 'licao',
      titulo: 'Ciclo de vida do Pod',
      dificuldade: 'facil',
      xp: 5,
      resumo: `<p>Um Pod passa por vários estados durante sua existência:</p>
        <dl>
          <dt><b>Pending</b></dt><dd>O Pod foi aceito, mas ainda não está rodando. O scheduler está escolhendo um nó ou baixando imagens.</dd>
          <dt><b>Running</b></dt><dd>Todos os containers estão rodando em pelo menos um nó.</dd>
          <dt><b>Succeeded</b></dt><dd>Todos os containers terminaram com sucesso (exit code 0). Comum em Jobs.</dd>
          <dt><b>Failed</b></dt><dd>Um container falhou e a restart policy não permitiu reinício.</dd>
        </dl>
        <p>A <b>restartPolicy</b> controla o que acontece quando um container falha:</p>
        <ul>
          <li><code>Always</code> (padrão): sempre reinicia — ideal para serviços de longa duração.</li>
          <li><code>OnFailure</code>: reinicia apenas se o exit code for diferente de zero.</li>
          <li><code>Never</code>: nunca reinicia — usado em Jobs que devem falhar visivelmente.</li>
        </ul>`,
    },
    {
      id: 'pods-volumes-configmaps',
      tipo: 'licao',
      titulo: 'Volumes e ConfigMaps',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>Containers são efêmeros: quando reiniciam, perdem todos os dados. <b>Volumes</b> resolvem isso montando armazenamento persistente ou compartilhado.</p>
        <p>Os tipos mais comuns são:</p>
        <ul>
          <li><b>emptyDir</b>: volume temporário criado junto com o Pod. Compartilhado entre containers do mesmo Pod, mas apagado quando o Pod é removido.</li>
          <li><b>hostPath</b>: monta um diretório do nó hospedeiro. Útil para logs e debugging, mas evita em produção.</li>
          <li><b>configMap</b>: injeta configurações como arquivos dentro do container. Atualiza automaticamente quando o ConfigMap muda.</li>
          <li><b>projected</b>: combina múltiplas fontes (ConfigMap, Secret, downward API) em um único ponto de montagem.</li>
        </ul>
        <p>Para usar um ConfigMap como volume:</p>
        <pre><code>volumes:
  - name: config
    configMap:
      name: app-config
containers:
  - name: app
    volumeMounts:
      - name: config
        mountPath: /etc/app</code></pre>`,
    },
    {
      id: 'pods-probes',
      tipo: 'licao',
      titulo: 'Liveness e Readiness Probes',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O Kubernetes precisa saber se seu container está <b>vivo</b> e se está <b>pronto</b> para receber tráfego. Para isso existem dois tipos de probe:</p>
        <dl>
          <dt><b>Liveness Probe</b></dt><dd>Verifica se o container está saudável. Se falhar repetidamente, o kubelet mata o container e aplica a restart policy.</dd>
          <dt><b>Readiness Probe</b></dt><dd>Verifica se o container pode receber tráfego. Se falhar, o Pod é removido dos endpoints do Service até recuperar.</dd>
        </dl>
        <p>Três mecanismos de verificação:</p>
        <ul>
          <li><b>HTTP GET</b>: faz uma requisição HTTP; qualquer código 2xx/3xx conta como sucesso.</li>
          <li><b>TCP Socket</b>: tenta abrir uma conexão TCP na porta especificada.</li>
          <li><b>Exec</b>: roda um comando dentro do container; exit code 0 = sucesso.</li>
        </ul>
        <p>Parâmetros importantes:</p>
        <ul>
          <li><code>initialDelaySeconds</code>: tempo antes da primeira verificação (evita falhas durante startup).</li>
          <li><code>periodSeconds</code>: intervalo entre verificações (padrão: 10s).</li>
          <li><code>failureThreshold</code>: quantas falhas consecutivas antes de agir (padrão: 3).</li>
        </ul>`,
    },
    {
      id: 'pods-health-check',
      tipo: 'exercicio',
      titulo: 'Pod com Health Check',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Pod chamado <code>app-saudavel</code> com a imagem <code>nginx:1.25</code> que tenha:</p>
        <ul>
          <li>Uma <b>livenessProbe</b> HTTP na porta 80, caminho <code>/</code>, verificando a cada 10 segundos.</li>
          <li>Uma <b>readinessProbe</b> HTTP na porta 80, caminho <code>/</code>, com delay inicial de 5 segundos.</li>
        </ul>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: app-saudavel
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80
      livenessProbe:
        httpGet:
          path: /
          port: 80
        periodSeconds: 10
        failureThreshold: 3
      readinessProbe:
        httpGet:
          path: /
          port: 80
        initialDelaySeconds: 5
        periodSeconds: 10`,
      testes: [
        {
          descricao: 'O Pod app-saudavel existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'app-saudavel' }],
        },
        {
          descricao: 'A livenessProbe está configurada',
          regras: [{ tipo: 'probe-configurada', pod: 'app-saudavel', container: 'nginx', tipo_probe: 'liveness' }],
        },
        {
          descricao: 'A readinessProbe está configurada',
          regras: [{ tipo: 'probe-configurada', pod: 'app-saudavel', container: 'nginx', tipo_probe: 'readiness' }],
        },
      ],
    },
    {
      id: 'pods-sidecar',
      tipo: 'exercicio',
      titulo: 'Multi-container Pod (Sidecar)',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie um Pod chamado <code>app-com-log</code> com dois containers:</p>
        <ul>
          <li><b>app</b>: imagem <code>nginx:1.25</code>, porta 80.</li>
          <li><b>logger</b>: imagem <code>busybox:1.36</code>, que rode o comando <code>tail -f /var/log/nginx/access.log</code>.</li>
        </ul>
        <p>Use um volume <code>emptyDir</code> chamado <code>log-volume</code> montado em <code>/var/log/nginx</code> em ambos os containers para compartilhar os logs.</p>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: app-com-log
spec:
  volumes:
    - name: log-volume
      emptyDir: {}
  containers:
    - name: app
      image: nginx:1.25
      ports:
        - containerPort: 80
      volumeMounts:
        - name: log-volume
          mountPath: /var/log/nginx
    - name: logger
      image: busybox:1.36
      command: ['sh', '-c', 'tail -f /var/log/nginx/access.log']
      volumeMounts:
        - name: log-volume
          mountPath: /var/log/nginx`,
      testes: [
        {
          descricao: 'O Pod app-com-log existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'app-com-log' }],
        },
        {
          descricao: 'O container app usa a imagem nginx:1.25',
          regras: [{ tipo: 'container-imagem', pod: 'app-com-log', container: 'app', imagem: 'nginx:1.25' }],
        },
        {
          descricao: 'O container logger usa a imagem busybox:1.36',
          regras: [{ tipo: 'container-imagem', pod: 'app-com-log', container: 'logger', imagem: 'busybox:1.36' }],
        },
      ],
    },
    {
      id: 'pods-restart-policy',
      tipo: 'exercicio',
      titulo: 'Restart Policy OnFailure',
      dificuldade: 'facil',
      xp: 10,
      resumo: `<p>Crie um Pod chamado <code>job-pod</code> com a imagem <code>busybox:1.36</code> que rode o comando <code>sh -c "echo trabalhando && exit 1"</code> e tenha restartPolicy <code>OnFailure</code>.</p>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: job-pod
spec:
  restartPolicy: OnFailure
  containers:
    - name: worker
      image: busybox:1.36
      command: ['sh', '-c', 'echo trabalhando && exit 1']`,
      testes: [
        {
          descricao: 'O Pod job-pod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'job-pod' }],
        },
        {
          descricao: 'O container usa a imagem busybox:1.36',
          regras: [{ tipo: 'container-imagem', pod: 'job-pod', container: 'worker', imagem: 'busybox:1.36' }],
        },
      ],
    },
    {
      id: 'pods-emptydir-volume',
      tipo: 'exercicio',
      titulo: 'Volume emptyDir Compartilhado',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Pod chamado <code>shared-pod</code> com dois containers:</p>
        <ul>
          <li><code>writer</code>: imagem <code>busybox:1.36</code>, roda <code>echo dados > /shared/data.txt && sleep 3600</code>.</li>
          <li><code>reader</code>: imagem <code>busybox:1.36</code>, roda <code>cat /shared/data.txt && sleep 3600</code>.</li>
        </ul>
        <p>Use um volume <code>emptyDir</code> chamado <code>shared-vol</code> montado em <code>/shared</code> em ambos.</p>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: shared-pod
spec:
  volumes:
    - name: shared-vol
      emptyDir: {}
  containers:
    - name: writer
      image: busybox:1.36
      command: ['sh', '-c', 'echo dados > /shared/data.txt && sleep 3600']
      volumeMounts:
        - name: shared-vol
          mountPath: /shared
    - name: reader
      image: busybox:1.36
      command: ['sh', '-c', 'cat /shared/data.txt && sleep 3600']
      volumeMounts:
        - name: shared-vol
          mountPath: /shared`,
      testes: [
        {
          descricao: 'O Pod shared-pod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'shared-pod' }],
        },
        {
          descricao: 'O volume shared-vol está montado no container writer',
          regras: [{ tipo: 'volume-montado', pod: 'shared-pod', container: 'writer', volume: 'shared-vol' }],
        },
        {
          descricao: 'O volume shared-vol está montado no container reader',
          regras: [{ tipo: 'volume-montado', pod: 'shared-pod', container: 'reader', volume: 'shared-vol' }],
        },
      ],
    },
    {
      id: 'pods-hostpath-volume',
      tipo: 'exercicio',
      titulo: 'Volume hostPath para Logs',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Pod chamado <code>log-pod</code> com a imagem <code>nginx:1.25</code> que monte o diretório do nó <code>/var/log</code> em <code>/logs</code> dentro do container usando um volume <code>hostPath</code> chamado <code>node-logs</code>.</p>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: log-pod
spec:
  volumes:
    - name: node-logs
      hostPath:
        path: /var/log
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80
      volumeMounts:
        - name: node-logs
          mountPath: /logs`,
      testes: [
        {
          descricao: 'O Pod log-pod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'log-pod' }],
        },
        {
          descricao: 'O container usa a imagem nginx:1.25',
          regras: [{ tipo: 'container-imagem', pod: 'log-pod', container: 'nginx', imagem: 'nginx:1.25' }],
        },
        {
          descricao: 'O volume node-logs está montado no container nginx',
          regras: [{ tipo: 'volume-montado', pod: 'log-pod', container: 'nginx', volume: 'node-logs' }],
        },
      ],
    },
    {
      id: 'pods-projected-volume',
      tipo: 'exercicio',
      titulo: 'Volume Projetado',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie um ConfigMap chamado <code>proj-config</code> com a chave <code>app.properties</code> e valor <code>mode=prod</code>.</p>
        <p>Depois crie um Pod chamado <code>proj-pod</code> com imagem <code>busybox:1.36</code> (comando <code>sleep 3600</code>) que use um volume <code>projected</code> chamado <code>all-sources</code> montando o ConfigMap em <code>/etc/projected</code>.</p>`,
      solucao: `apiVersion: v1
kind: ConfigMap
metadata:
  name: proj-config
data:
  app.properties: mode=prod
---
apiVersion: v1
kind: Pod
metadata:
  name: proj-pod
spec:
  volumes:
    - name: all-sources
      projected:
        sources:
          - configMap:
              name: proj-config
  containers:
    - name: app
      image: busybox:1.36
      command: ['sh', '-c', 'sleep 3600']
      volumeMounts:
        - name: all-sources
          mountPath: /etc/projected`,
      testes: [
        {
          descricao: 'O ConfigMap proj-config existe',
          regras: [{ tipo: 'configmap-contem', configmap: 'proj-config', chave: 'app.properties' }],
        },
        {
          descricao: 'O Pod proj-pod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'proj-pod' }],
        },
        {
          descricao: 'O volume all-sources está montado no container app',
          regras: [{ tipo: 'volume-montado', pod: 'proj-pod', container: 'app', volume: 'all-sources' }],
        },
      ],
    },
    {
      id: 'pods-downward-api',
      tipo: 'exercicio',
      titulo: 'Downward API como Variáveis',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Pod chamado <code>downward-pod</code> com a imagem <code>busybox:1.36</code> (comando <code>printenv && sleep 3600</code>) que injete o nome do Pod na variável de ambiente <code>MY_POD_NAME</code> usando a downward API (<code>fieldRef: fieldPath: metadata.name</code>).</p>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: downward-pod
spec:
  containers:
    - name: app
      image: busybox:1.36
      command: ['sh', '-c', 'printenv && sleep 3600']
      env:
        - name: MY_POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name`,
      testes: [
        {
          descricao: 'O Pod downward-pod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'downward-pod' }],
        },
        {
          descricao: 'O container usa a imagem busybox:1.36',
          regras: [{ tipo: 'container-imagem', pod: 'downward-pod', container: 'app', imagem: 'busybox:1.36' }],
        },
      ],
    },
    {
      id: 'pods-resource-quota',
      tipo: 'exercicio',
      titulo: 'Pod com Resource Quota Awareness',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Namespace chamado <code>quota-ns</code> e um Pod chamado <code>quota-pod</code> dentro dele com imagem <code>nginx:1.25</code>.</p>
        <p>O Pod deve definir requests (CPU <code>100m</code>, memória <code>128Mi</code>) e limits (CPU <code>200m</code>, memória <code>256Mi</code>), preparando-o para funcionar dentro de uma ResourceQuota.</p>`,
      solucao: `apiVersion: v1
kind: Namespace
metadata:
  name: quota-ns
---
apiVersion: v1
kind: Pod
metadata:
  name: quota-pod
  namespace: quota-ns
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "200m"
          memory: "256Mi"`,
      testes: [
        {
          descricao: 'O Namespace quota-ns existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Namespace', nome: 'quota-ns' }],
        },
        {
          descricao: 'O Pod quota-pod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'quota-pod' }],
        },
        {
          descricao: 'O container tem resource limits definidos',
          regras: [{ tipo: 'resource-limits', pod: 'quota-pod', container: 'nginx' }],
        },
      ],
    },
    {
      id: 'pods-affinity',
      tipo: 'exercicio',
      titulo: 'Pod Affinity e Anti-Affinity',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie um Pod chamado <code>affinity-pod</code> com imagem <code>nginx:1.25</code> e label <code>app: frontend</code>.</p>
        <p>Configure <code>podAffinity</code> para preferir nós que já tenham pods com label <code>app: backend</code> na mesma zona de topologia (<code>topologyKey: topology.kubernetes.io/zone</code>).</p>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: affinity-pod
  labels:
    app: frontend
spec:
  affinity:
    podAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app: backend
            topologyKey: topology.kubernetes.io/zone
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80`,
      testes: [
        {
          descricao: 'O Pod affinity-pod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'affinity-pod' }],
        },
        {
          descricao: 'O container usa a imagem nginx:1.25',
          regras: [{ tipo: 'container-imagem', pod: 'affinity-pod', container: 'nginx', imagem: 'nginx:1.25' }],
        },
      ],
    },
    {
      id: 'pods-campos-obrigatorios',
      tipo: 'exercicio',
      titulo: 'Corrigindo Campos Obrigatórios',
      dificuldade: 'facil',
      xp: 10,
      resumo: `<p>O YAML abaixo tem erros de campos obrigatórios. O simulador vai mostrar mensagens como <code>Missing required argument "image"</code> indicando o que falta.</p>
        <p><b>Sua tarefa:</b> leia as mensagens de erro, identifique os campos faltantes e corrija o YAML até que o Pod seja criado com sucesso.</p>
        <p>Dica: todo container precisa de <code>name</code> e <code>image</code>. Se o simulador sugerir um campo parecido (ex: "Did you mean ...?"), é porque há um erro de digitação.</p>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: pod-corrigido
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80`,
      testes: [
        {
          descricao: 'O Pod pod-corrigido existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'pod-corrigido' }],
        },
        {
          descricao: 'O container tem name definido',
          regras: [{ tipo: 'container-imagem', pod: 'pod-corrigido', container: 'nginx', imagem: 'nginx:1.25' }],
        },
      ],
    },
    {
      id: 'pods-ephemeral-container',
      tipo: 'exercicio',
      titulo: 'Ephemeral Container para Debug',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie um Pod chamado <code>debug-target</code> com a imagem <code>nginx:1.25</code> e porta 80.</p>
        <p>Este exercício foca na criação do Pod alvo. Ephemeral containers são adicionados via <code>kubectl debug</code> em runtime — não fazem parte do YAML declarativo, mas o Pod precisa existir primeiro.</p>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: debug-target
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80`,
      testes: [
        {
          descricao: 'O Pod debug-target existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'debug-target' }],
        },
        {
          descricao: 'O container usa a imagem nginx:1.25',
          regras: [{ tipo: 'container-imagem', pod: 'debug-target', container: 'nginx', imagem: 'nginx:1.25' }],
        },
        {
          descricao: 'A porta 80 está exposta',
          regras: [{ tipo: 'container-porta', pod: 'debug-target', container: 'nginx', porta: 80 }],
        },
      ],
    },
  ],
};