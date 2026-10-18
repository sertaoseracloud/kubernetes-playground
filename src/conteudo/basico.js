// Módulo 1: Fundamentos do Kubernetes.
// Lições e exercícios introdutórios: o que é K8s, arquitetura, primeiro YAML.
// Cada exercício tem `solucao` (código de referência) e `testes` (casos visíveis e ocultos).

export const basico = {
  id: 'basico',
  titulo: 'Fundamentos do Kubernetes',
  descricao: 'O que é Kubernetes, arquitetura básica e primeiros comandos kubectl.',
  icone: '☸️',
  itens: [
    {
      id: 'k8s-o-que-e',
      tipo: 'licao',
      titulo: 'O que é Kubernetes',
      dificuldade: 'facil',
      xp: 5,
      resumo: `<p>Kubernetes (K8s) é um orquestrador de containers: ele decide <b>onde</b> rodar cada container,
        <b>quantas cópias</b> manter e <b>como conectá-los</b>. Pense nele como o maestro de uma orquestra:
        você escreve a partitura (o manifesto YAML) e ele garante que cada músico toque na hora certa.</p>
        <p>Os três conceitos mais importantes são:</p>
        <ul>
          <li><b>Pod</b>: a menor unidade — um ou mais containers que sempre rodam juntos.</li>
          <li><b>Service</b>: o endereço fixo que conecta pods, mesmo quando eles mudam de IP.</li>
          <li><b>Deployment</b>: o controlador que cria pods, escala e faz rolling updates.</li>
        </ul>`,
    },
    {
      id: 'k8s-arquitetura',
      tipo: 'licao',
      titulo: 'Arquitetura básica',
      dificuldade: 'facil',
      xp: 5,
      resumo: `<p>O cluster tem dois planos:</p>
        <dl>
          <dt><b>Control Plane</b></dt><dd>O "cérebro": API Server, etcd, Scheduler e Controller Manager.</dd>
          <dt><b>Data Plane</b></dt><dd>Os "músculos": kubelet, kube-proxy e o runtime de containers em cada nó.</dd>
        </dl>
        <p>Você fala com o <b>API Server</b> via <code>kubectl</code> (ou YAML). Ele grava o estado desejado no <b>etcd</b>,
        e os controladores trabalham sem parar para fazer o estado real bater com o desejado.</p>`,
    },
    {
      id: 'k8s-state-management',
      tipo: 'licao',
      titulo: 'Estado Desejado vs Estado Real',
      dificuldade: 'facil',
      xp: 5,
      resumo: `<p>O Kubernetes funciona com um modelo <b>declarativo</b>: você descreve o <i>estado desejado</i> (quantos pods, qual imagem, quais portas) e o cluster trabalha continuamente para fazer o <i>estado real</i> bater com o desejado. Esse ciclo é chamado de <b>reconciliação</b>.</p>
        <dl>
          <dt><b>Estado Desejado</b></dt><dd>O que está escrito no seu manifesto YAML — "quero 3 réplicas do nginx:1.25".</dd>
          <dt><b>Estado Real</b></dt><dd>O que realmente existe no cluster agora — pode ter 2 pods porque um nó caiu.</dd>
          <dt><b>Reconciliação</b></dt><dd>O loop dos controladores que detectam a diferença e agem para corrigir.</dd>
        </dl>
        <p>É parecido com o <code>terraform.tfstate</code> do Terraform: lá também existe um arquivo que guarda o estado real da infraestrutura, e o <code>plan</code> mostra a diferença entre o desejado e o real antes de aplicar. No Kubernetes, essa comparação acontece automaticamente e de forma contínua — você não precisa rodar um comando separado.</p>
        <p>A aba <b>📦 Estado</b> deste playground mostra exatamente isso: o JSON do cluster simulado e as mudanças (adicionados, removidos, alterados) entre cada apply.</p>`,
    },
    {
      id: 'k8s-primeiro-yaml',
      tipo: 'exercicio',
      titulo: 'Primeiro Pod em YAML',
      dificuldade: 'facil',
      xp: 10,
      resumo: `<p>Crie um Pod chamado <code>nginx-demo</code> com a imagem <code>nginx:1.25</code> expondo a porta 80.</p>
        <p>Dica: todo recurso Kubernetes tem <code>apiVersion</code>, <code>kind</code>, <code>metadata</code> e <code>spec</code>.</p>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: nginx-demo
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80`,
      testes: [
        {
          descricao: 'O Pod nginx-demo existe e está Running',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'nginx-demo', status: 'Running' }],
        },
        {
          descricao: 'O container usa a imagem nginx:1.25',
          regras: [{ tipo: 'container-imagem', pod: 'nginx-demo', container: 'nginx', imagem: 'nginx:1.25' }],
        },
        {
          descricao: 'A porta 80 está exposta',
          regras: [{ tipo: 'container-porta', pod: 'nginx-demo', container: 'nginx', porta: 80 }],
        },
      ],
    },
    {
      id: 'basico-namespace',
      tipo: 'exercicio',
      titulo: 'Criando um Namespace',
      dificuldade: 'facil',
      xp: 10,
      resumo: `<p>Crie um Namespace chamado <code>dev-env</code> e um Pod chamado <code>nginx-dev</code> dentro dele, usando a imagem <code>nginx:1.25</code>.</p>
        <p>Dica: use o campo <code>metadata.namespace</code> no Pod para colocá-lo no namespace correto.</p>`,
      solucao: `apiVersion: v1
kind: Namespace
metadata:
  name: dev-env
---
apiVersion: v1
kind: Pod
metadata:
  name: nginx-dev
  namespace: dev-env
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80`,
      testes: [
        {
          descricao: 'O Namespace dev-env existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Namespace', nome: 'dev-env' }],
        },
        {
          descricao: 'O Pod nginx-dev existe no namespace dev-env',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'nginx-dev' }],
        },
        {
          descricao: 'O container usa a imagem nginx:1.25',
          regras: [{ tipo: 'container-imagem', pod: 'nginx-dev', container: 'nginx', imagem: 'nginx:1.25' }],
        },
      ],
    },
    {
      id: 'basico-labels-selectors',
      tipo: 'exercicio',
      titulo: 'Labels e Selectors',
      dificuldade: 'facil',
      xp: 10,
      resumo: `<p>Crie um Pod chamado <code>api-pod</code> com a imagem <code>nginx:1.25</code> e as labels <code>app: api</code> e <code>env: production</code>.</p>
        <p>Em seguida, crie um Service chamado <code>api-svc</code> que selecione pods com a label <code>app: api</code>.</p>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: api-pod
  labels:
    app: api
    env: production
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: api-svc
spec:
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 80`,
      testes: [
        {
          descricao: 'O Pod api-pod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'api-pod' }],
        },
        {
          descricao: 'O Service api-svc seleciona pods com app=api',
          regras: [{ tipo: 'service-selector', service: 'api-svc', selector: { app: 'api' } }],
        },
      ],
    },
    {
      id: 'basico-data-sources',
      tipo: 'licao',
      titulo: 'Lendo recursos existentes',
      dificuldade: 'facil',
      xp: 5,
      resumo: `<p>No mundo real, você raramente cria todos os recursos do zero. Muitas vezes precisa <b>consultar</b> o que já existe antes de criar algo novo — descobrir as labels de um Pod para configurar um Service, ou verificar as chaves de um ConfigMap antes de referenciá-lo.</p>
        <p>No Kubernetes, isso é feito com comandos como <code>kubectl get pod meu-pod -o yaml</code> ou <code>kubectl describe configmap app-config</code>. Você inspeciona o estado atual do cluster para tomar decisões informadas.</p>
        <p>Esse conceito tem paralelo direto com o <b>Terraform</b>, onde usamos <code>data sources</code> para ler recursos externos sem gerenciá-los:</p>
        <pre><code># Terraform: lendo um Pod existente
data "kubernetes_pod" "existente" {
  metadata {
    name = "meu-pod"
  }
}

# Depois referencia os atributos lidos
resource "kubernetes_service" "svc" {
  spec {
    selector = data.kubernetes_pod.existente.metadata[0].labels
  }
}</code></pre>
        <p>Neste playground, os exercícios podem apresentar recursos pré-existentes no enunciado. Sua tarefa é usar essa informação (como se tivesse feito um <code>kubectl get</code>) para criar novos recursos que se conectem corretamente aos existentes.</p>`,
    },
    {
      id: 'basico-annotations',
      tipo: 'exercicio',
      titulo: 'Annotations em Recursos',
      dificuldade: 'facil',
      xp: 10,
      resumo: `<p>Crie um Pod chamado <code>annotated-pod</code> com a imagem <code>nginx:1.25</code> e a annotation <code>description: "Servidor web de teste"</code>.</p>
        <p>Annotations são metadados não-identificadores usados para armazenar informações auxiliares.</p>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: annotated-pod
  annotations:
    description: "Servidor web de teste"
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80`,
      testes: [
        {
          descricao: 'O Pod annotated-pod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'annotated-pod' }],
        },
        {
          descricao: 'O container usa a imagem nginx:1.25',
          regras: [{ tipo: 'container-imagem', pod: 'annotated-pod', container: 'nginx', imagem: 'nginx:1.25' }],
        },
      ],
    },
    {
      id: 'basico-resource-limits',
      tipo: 'exercicio',
      titulo: 'Resource Requests e Limits',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Pod chamado <code>limited-pod</code> com a imagem <code>nginx:1.25</code> e defina:</p>
        <ul>
          <li>Requests: CPU <code>100m</code>, memória <code>128Mi</code>.</li>
          <li>Limits: CPU <code>250m</code>, memória <code>256Mi</code>.</li>
        </ul>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: limited-pod
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
          cpu: "250m"
          memory: "256Mi"`,
      testes: [
        {
          descricao: 'O Pod limited-pod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'limited-pod' }],
        },
        {
          descricao: 'O container tem resource limits definidos',
          regras: [{ tipo: 'resource-limits', pod: 'limited-pod', container: 'nginx' }],
        },
      ],
    },
    {
      id: 'basico-env-vars',
      tipo: 'exercicio',
      titulo: 'Variáveis de Ambiente',
      dificuldade: 'facil',
      xp: 10,
      resumo: `<p>Crie um Pod chamado <code>env-pod</code> com a imagem <code>busybox:1.36</code> que rode o comando <code>printenv</code> e tenha a variável de ambiente <code>APP_MODE=production</code>.</p>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: env-pod
spec:
  containers:
    - name: busybox
      image: busybox:1.36
      command: ['sh', '-c', 'printenv && sleep 3600']
      env:
        - name: APP_MODE
          value: "production"`,
      testes: [
        {
          descricao: 'O Pod env-pod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'env-pod' }],
        },
        {
          descricao: 'O container usa a imagem busybox:1.36',
          regras: [{ tipo: 'container-imagem', pod: 'env-pod', container: 'busybox', imagem: 'busybox:1.36' }],
        },
      ],
    },
    {
      id: 'basico-configmap-env',
      tipo: 'exercicio',
      titulo: 'ConfigMap como Variável de Ambiente',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um ConfigMap chamado <code>app-config</code> com a chave <code>DATABASE_HOST</code> e valor <code>db.exemplo.com</code>.</p>
        <p>Depois, crie um Pod chamado <code>config-pod</code> com a imagem <code>busybox:1.36</code> que injete essa chave como variável de ambiente.</p>`,
      solucao: `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_HOST: db.exemplo.com
---
apiVersion: v1
kind: Pod
metadata:
  name: config-pod
spec:
  containers:
    - name: busybox
      image: busybox:1.36
      command: ['sh', '-c', 'sleep 3600']
      env:
        - name: DATABASE_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DATABASE_HOST`,
      testes: [
        {
          descricao: 'O ConfigMap app-config existe e contém DATABASE_HOST',
          regras: [{ tipo: 'configmap-contem', configmap: 'app-config', chave: 'DATABASE_HOST' }],
        },
        {
          descricao: 'O Pod config-pod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'config-pod' }],
        },
        {
          descricao: 'O container usa a imagem busybox:1.36',
          regras: [{ tipo: 'container-imagem', pod: 'config-pod', container: 'busybox', imagem: 'busybox:1.36' }],
        },
      ],
    },
    {
      id: 'basico-multi-document',
      tipo: 'exercicio',
      titulo: 'YAML Multi-documento',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie dois Pods em um único arquivo YAML usando o separador <code>---</code>:</p>
        <ul>
          <li><code>pod-a</code> com imagem <code>nginx:1.25</code>.</li>
          <li><code>pod-b</code> com imagem <code>nginx:1.25</code>.</li>
        </ul>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: pod-a
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80
---
apiVersion: v1
kind: Pod
metadata:
  name: pod-b
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80`,
      testes: [
        {
          descricao: 'O Pod pod-a existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'pod-a' }],
        },
        {
          descricao: 'O Pod pod-b existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'pod-b' }],
        },
        {
          descricao: 'Ambos usam a imagem nginx:1.25',
          regras: [{ tipo: 'container-imagem', pod: 'pod-a', container: 'nginx', imagem: 'nginx:1.25' }],
        },
      ],
    },
    {
      id: 'basico-debug-yaml',
      tipo: 'exercicio',
      titulo: 'Debugging de YAML Inválido',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>O YAML abaixo tem erros de indentação e estrutura. Corrija-o para criar um Pod válido chamado <code>debug-pod</code> com a imagem <code>nginx:1.25</code> e porta 80.</p>
        <pre><code>apiVersion: v1
kind: Pod
metadata:
name: debug-pod
spec:
containers:
- name: nginx
image: nginx:1.25
ports:
- containerPort: 80</code></pre>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: debug-pod
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80`,
      testes: [
        {
          descricao: 'O Pod debug-pod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'debug-pod' }],
        },
        {
          descricao: 'O container usa a imagem nginx:1.25',
          regras: [{ tipo: 'container-imagem', pod: 'debug-pod', container: 'nginx', imagem: 'nginx:1.25' }],
        },
        {
          descricao: 'A porta 80 está exposta',
          regras: [{ tipo: 'container-porta', pod: 'debug-pod', container: 'nginx', porta: 80 }],
        },
      ],
    },
    {
      id: 'basico-drift-detection',
      tipo: 'exercicio',
      titulo: 'Encontre o Drift',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>O cluster já tem um Pod chamado <code>web-app</code> rodando a imagem <code>nginx:1.25</code>. Porém, o YAML que você recebeu está desatualizado e usa a imagem <code>nginx:1.24</code>.</p>
        <p>Sua tarefa é usar o botão <b>🔎 Drift</b> para detectar a divergência entre o YAML e o estado atual do cluster.</p>
        <p>No mundo real, isso é equivalente ao <code>terraform plan</code>: antes de aplicar mudanças, você verifica o que será criado, modificado ou destruído. O Kubernetes faz essa reconciliação continuamente, mas ferramentas como ArgoCD e Flux expõem o drift de forma explícita para operadores.</p>
        <p><b>Dica:</b> aplique primeiro o YAML desatualizado para criar o recurso no cluster, depois edite-o para simular o drift e clique em "Drift".</p>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80`,
      testes: [
        {
          descricao: 'O Pod web-app existe no cluster',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'web-app' }],
        },
        {
          descricao: 'A imagem foi corrigida para nginx:1.25',
          regras: [{ tipo: 'container-imagem', pod: 'web-app', container: 'nginx', imagem: 'nginx:1.25' }],
        },
      ],
    },
    {
      id: 'basico-init-container',
      tipo: 'exercicio',
      titulo: 'Pod com Init Container',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie um Pod chamado <code>init-pod</code> com:</p>
        <ul>
          <li>Um <b>initContainer</b> chamado <code>init-setup</code> com imagem <code>busybox:1.36</code> que rode <code>echo "inicializando" > /work/status.txt</code>.</li>
          <li>Um container principal chamado <code>app</code> com imagem <code>nginx:1.25</code>.</li>
          <li>Um volume <code>emptyDir</code> chamado <code>work-dir</code> compartilhado entre ambos.</li>
        </ul>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: init-pod
spec:
  initContainers:
    - name: init-setup
      image: busybox:1.36
      command: ['sh', '-c', 'echo "inicializando" > /work/status.txt']
      volumeMounts:
        - name: work-dir
          mountPath: /work
  containers:
    - name: app
      image: nginx:1.25
      ports:
        - containerPort: 80
      volumeMounts:
        - name: work-dir
          mountPath: /work
  volumes:
    - name: work-dir
      emptyDir: {}`,
      testes: [
        {
          descricao: 'O Pod init-pod existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'init-pod' }],
        },
        {
          descricao: 'O container app usa a imagem nginx:1.25',
          regras: [{ tipo: 'container-imagem', pod: 'init-pod', container: 'app', imagem: 'nginx:1.25' }],
        },
        {
          descricao: 'O volume work-dir está montado no container app',
          regras: [{ tipo: 'volume-montado', pod: 'init-pod', container: 'app', volume: 'work-dir' }],
        },
      ],
    },
    {
      id: 'basico-diff-plan',
      tipo: 'exercicio',
      titulo: 'Preveja as mudanças',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Antes de aplicar um manifesto, é boa prática <b>prever</b> o que vai mudar — igual ao <code>terraform plan</code>. Neste exercício, você vai usar o botão <b>🔍 Diff</b> para ver quais recursos serão criados, atualizados ou destruídos.</p>
        <p>O cluster já tem um Pod chamado <code>nginx-demo</code> rodando. O YAML abaixo muda a imagem desse Pod e adiciona um novo Service.</p>
        <p><b>Sua tarefa:</b> clique em 🔍 Diff antes de ▶ Apply. Observe o plano de mudanças no painel de Estado e confirme que ele mostra:</p>
        <ul>
          <li>Uma <b>atualização</b> no Pod nginx-demo (imagem mudou).</li>
          <li>Uma <b>criação</b> do Service nginx-svc.</li>
        </ul>
        <p>Depois de revisar o diff, aplique o manifesto.</p>`,
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: nginx-demo
spec:
  containers:
    - name: nginx
      image: nginx:1.27
      ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-svc
spec:
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80`,
      testes: [
        {
          descricao: 'Você usou 🔍 Diff antes de aplicar',
          regras: [{ tipo: 'diff-usado' }],
        },
        {
          descricao: 'O Pod nginx-demo foi atualizado com imagem nginx:1.27',
          regras: [{ tipo: 'container-imagem', pod: 'nginx-demo', container: 'nginx', imagem: 'nginx:1.27' }],
        },
        {
          descricao: 'O Service nginx-svc foi criado',
          regras: [{ tipo: 'recurso-existe', kind: 'Service', nome: 'nginx-svc' }],
        },
      ],
    },
  ],
};