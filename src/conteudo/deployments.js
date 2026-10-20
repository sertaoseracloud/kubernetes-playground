// Módulo 1, tópico 4: Deployments e Escalabilidade.
// Deployments, estratégias de atualização, escala automática, disponibilidade e DaemonSets.
// Segue docs/didatica.md: cada conceito novo tem lição antes do exercício.
import { licao, exercicio, teste, campo } from './util.js';

/** O Deployment do HPA: já existe no cluster quando o exercício abre. */
const WEB_DEPLOY = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          resources:
            requests:
              cpu: "100m"`;

/**
 * Esqueleto de um Deployment: o aluno preenche nome, réplicas e a label (nos dois lugares).
 * `extraSpec` entra em spec (estratégia, histórico); `extraPod` no spec do Pod (template).
 */
const esqueletoDeployment = ({ extraSpec = '', extraPod = '', container = '' } = {}) => `
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name:                # TODO: o nome pedido
  spec:
    replicas:            # TODO: quantas cópias${extraSpec}
    selector:
      matchLabels:
        # TODO: a label dos Pods (chave: valor)
    template:            # o molde dos Pods
      metadata:
        labels:
          # TODO: a MESMA label do selector
      spec:${extraPod}
        containers:
          - name: nginx
            image: nginx:1.25
            ports:
              - containerPort: 80${container}
`;

export const deployments = {
  id: 'deployments',
  titulo: 'Deployments e Escalabilidade',
  descricao: 'Gerenciando aplicações em produção com Deployments, rolling updates e auto-scaling.',
  icone: '🚀',
  itens: [
    licao('deploy-replicasets', 'Deployments e ReplicaSets', 'facil', `
      <p>Até aqui você criou Pods "soltos". Se um deles cai, ninguém cria outro. Em produção, quem cuida disso é o
      <b>Deployment</b>: você diz "quero 3 cópias deste Pod" e ele garante que sempre haja 3, como o gerente de turno que
      mantém três caixas abertos e chama alguém quando um sai.</p>
      <p>Por baixo, a cadeia é <code>Deployment → ReplicaSet → Pods</code>. O <b>ReplicaSet</b> conta os Pods de uma versão; o
      Deployment cria um ReplicaSet novo a cada versão nova e cuida da troca.</p>
      <p>Os campos do Deployment (<code>apiVersion: apps/v1</code>):</p>
      <ul>
        <li><code>replicas</code>: quantas cópias (réplicas) manter.</li>
        <li><code>template</code>: o <b>molde</b> dos Pods. Dentro dele há um <code>metadata.labels</code> e um <code>spec</code>
          com <code>containers</code>, exatamente como num Pod.</li>
        <li><code>selector.matchLabels</code>: como o Deployment reconhece os Pods dele.</li>
      </ul>
      <p><b>A armadilha nº 1:</b> as labels de <code>selector.matchLabels</code> e de <code>template.metadata.labels</code>
      <b>precisam ser iguais</b>. Se não forem, o API Server recusa o Deployment, porque ele criaria Pods que não reconhece.</p>
      <p><b>No cluster:</b> apague um dos Pods e o ReplicaSet cria outro em segundos. É a reconciliação em ação.</p>`,
    `
      apiVersion: apps/v1          # Deployment mora em apps/v1
      kind: Deployment
      metadata:
        name: caixas
      spec:
        replicas: 3                # quero 3 cópias
        selector:
          matchLabels:
            app: caixa             # os Pods "meus" são os com app: caixa...
        template:                  # o molde de cada Pod
          metadata:
            labels:
              app: caixa           # ...e o molde carimba essa label (tem que ser igual!)
          spec:                    # daqui para baixo é igual ao spec de um Pod
            containers:
              - name: web
                image: nginx:1.25
    `),

    exercicio({
      id: 'deploy-3-replicas',
      titulo: 'Deployment com 3 réplicas',
      dificuldade: 'medio',
      resumo: `
        <p>Seu primeiro Deployment: três cópias de um nginx, cada uma limitada para não exagerar no consumo.</p>
        <ol>
          <li>O Deployment se chama <code>web-deploy</code>, com <code>replicas: 3</code>.</li>
          <li>Em <code>selector.matchLabels</code> e em <code>template.metadata.labels</code>, a mesma label: <code>app: web</code>.</li>
          <li>O container <code>nginx</code> (imagem <code>nginx:1.25</code>) tem <code>resources.limits</code> com
            <code>cpu: "250m"</code> e <code>memory: "256Mi"</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Deployment cria um ReplicaSet, que cria 3 Pods com nomes como <code>web-deploy-7d9f-abcde</code>.
        Rode <code>kubectl get pods</code> e veja os três.</p>`,
      inicial: esqueletoDeployment({ container: `
            resources:
              # TODO: limits com cpu: "250m" e memory: "256Mi"` }),
      dica: [
        'Releia o exemplo da lição "Deployments e ReplicaSets": a label aparece duas vezes, sempre igual.',
        'replicas: 3; matchLabels e template.metadata.labels com app: web.',
        'resources:\n  limits:\n    cpu: "250m"\n    memory: "256Mi"',
      ],
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-deploy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            limits:
              cpu: "250m"
              memory: "256Mi"`,
      testes: [
        teste({ descricao: 'O Deployment web-deploy existe', dica: 'Preencha o nome e os TODO; confira se matchLabels e template.metadata.labels têm a mesma label.' },
          { tipo: 'recurso-existe', kind: 'Deployment', nome: 'web-deploy' }),
        teste({ descricao: 'O Deployment tem 3 réplicas', dica: 'Em spec, escreva replicas: 3 (número, sem aspas).' },
          { tipo: 'deployment-replicas', deployment: 'web-deploy', replicas: 3 }),
        teste({ descricao: 'Os containers têm resource limits definidos', dica: 'No container nginx, resources.limits com cpu: "250m" e memory: "256Mi".' },
          { tipo: 'resource-limits', deployment: 'web-deploy', container: 'nginx' }),
      ],
    }),

    exercicio({
      id: 'deploy-resource-limits',
      titulo: 'Deployment com Resource Limits',
      dificuldade: 'medio',
      resumo: `
        <p>Agora com reserva (requests) e teto (limits), como no Pod do tópico Básico, mas dentro do molde do Deployment.</p>
        <ol>
          <li>O Deployment <code>limited-deploy</code> tem <code>replicas: 2</code> e a label <code>app: limited</code> (nos dois lugares).</li>
          <li>No container <code>nginx</code>: <code>requests</code> com <code>cpu: "250m"</code> e <code>memory: "256Mi"</code>.</li>
          <li>E <code>limits</code> com <code>cpu: "500m"</code> e <code>memory: "512Mi"</code>.</li>
        </ol>
        <p><b>No cluster:</b> cada uma das 2 cópias reserva 250m de CPU; o Scheduler só as coloca em nós com esse espaço livre.</p>`,
      inicial: esqueletoDeployment({ container: `
            # TODO: resources com requests (cpu "250m", memory "256Mi") e limits (cpu "500m", memory "512Mi")` }),
      dica: [
        'O resources do container fica no mesmo lugar que num Pod: alinhado com image, dentro de template.spec.containers.',
        'resources:\n  requests: { cpu: "250m", memory: "256Mi" }\n  limits: { cpu: "500m", memory: "512Mi" }',
      ],
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: limited-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: limited
  template:
    metadata:
      labels:
        app: limited
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"`,
      testes: [
        teste({ descricao: 'O Deployment limited-deploy existe', dica: 'Preencha o nome e os TODO; a label do selector e a do template precisam ser iguais.' },
          { tipo: 'recurso-existe', kind: 'Deployment', nome: 'limited-deploy' }),
        teste({ descricao: 'O Deployment tem 2 réplicas', dica: 'Em spec, escreva replicas: 2.' },
          { tipo: 'deployment-replicas', deployment: 'limited-deploy', replicas: 2 }),
        teste({ descricao: 'Os containers têm requests e limits definidos', dica: 'No container nginx, crie resources com requests e limits.' },
          { tipo: 'resource-limits', deployment: 'limited-deploy', container: 'nginx' }),
      ],
    }),

    exercicio({
      id: 'deploy-datasource-configmap',
      titulo: 'Deployment com ConfigMap existente como Volume',
      dificuldade: 'medio',
      // Já existe no cluster antes do apply do aluno: aplicado em cada execução.
      existentes: `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-settings
data:
  config.yaml: |
    server:
      port: 8080
  log-level: info
`,
      resumo: `
        <p>Outro time já criou o ConfigMap <code>app-settings</code> com a configuração da aplicação. Você vai entregá-lo como
        <b>arquivos</b> aos Pods do seu Deployment, usando um volume do tipo <code>configMap</code> (visto na lição de volumes).</p>
        <ol>
          <li>Rode <code>kubectl describe configmap app-settings</code> e veja as chaves.</li>
          <li>Crie o Deployment <code>app-deploy</code> com <code>replicas: 2</code> e a label <code>app: myapp</code>.</li>
          <li>No spec do Pod (dentro de <code>template</code>), declare o volume <code>config-volume</code> do tipo
            <code>configMap</code> com <code>name: app-settings</code>.</li>
          <li>No container <code>nginx</code>, monte <code>config-volume</code> em <code>/etc/config</code>.</li>
        </ol>
        <p><b>No cluster:</b> cada chave vira um arquivo: <code>/etc/config/config.yaml</code> e <code>/etc/config/log-level</code>.
        Se o ConfigMap mudar, os arquivos são atualizados sozinhos depois de alguns segundos.</p>`,
      inicial: esqueletoDeployment({
        extraPod: `
        volumes:
          - name: config-volume
            # TODO: configMap: com name: app-settings`,
        container: `
            volumeMounts:
              - name:      # TODO: config-volume
                mountPath: # TODO: /etc/config` }),
      dica: [
        'Volume em duas partes, como no Pod: declarar (template.spec.volumes) e montar (volumeMounts do container).',
        'configMap é o tipo do volume, no lugar de emptyDir: configMap:\n  name: app-settings',
      ],
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          volumeMounts:
            - name: config-volume
              mountPath: /etc/config
      volumes:
        - name: config-volume
          configMap:
            name: app-settings`,
      testes: [
        teste({ descricao: 'O Deployment app-deploy existe', dica: 'Preencha todos os TODO; a label do selector e a do template precisam ser iguais.' },
          { tipo: 'recurso-existe', kind: 'Deployment', nome: 'app-deploy' }),
        teste({ descricao: 'O Deployment tem 2 réplicas', dica: 'Em spec, escreva replicas: 2.' },
          { tipo: 'deployment-replicas', deployment: 'app-deploy', valor: 2 }),
        teste({ descricao: 'O ConfigMap app-settings está montado em /etc/config', dica: 'Volume config-volume com configMap.name: app-settings e volumeMounts em /etc/config.' },
          { tipo: 'recurso-existe', kind: 'ConfigMap', nome: 'app-settings' },
          { tipo: 'campo', kind: 'Deployment', nome: 'app-deploy', caminho: 'spec.template.spec.volumes[name=config-volume].configMap.name', valor: 'app-settings' }),
      ],
    }),

    licao('deploy-rolling-update', 'Rolling update, Recreate e rollback', 'medio', `
      <p>Trocar a imagem de <code>nginx:1.24</code> para <code>nginx:1.25</code> num Deployment não derruba tudo de uma vez.
      Por padrão, ele faz um <b>rolling update</b>: sobe um Pod novo, espera ficar pronto, tira um antigo, e repete. Como
      trocar os pneus de um ônibus um de cada vez, com o ônibus andando.</p>
      <p>Dois números controlam o ritmo, em <code>spec.strategy.rollingUpdate</code>:</p>
      <dl>
        <dt><code>maxSurge</code></dt><dd>Quantos Pods <b>a mais</b> que o pedido podem existir durante a troca (1 = um de folga).</dd>
        <dt><code>maxUnavailable</code></dt><dd>Quantos Pods <b>a menos</b> podem ficar fora do ar (0 = nunca abaixo do pedido).</dd>
      </dl>
      <p>A outra estratégia é <code>type: Recreate</code>: apaga <b>todos</b> os Pods antigos e só depois cria os novos. Fica
      fora do ar por alguns instantes, mas garante que duas versões nunca rodem juntas (útil quando a versão nova muda o
      banco de dados de um jeito que a antiga não entende).</p>
      <p><b>Rollback:</b> a versão nova deu problema? <code>kubectl rollout undo deployment/NOME</code> volta para a anterior.
      Isso funciona porque o Deployment guarda os ReplicaSets antigos (escalados para zero). Quantos guardar é o
      <code>revisionHistoryLimit</code> (padrão: 10).</p>`,
    `
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: onibus
      spec:
        replicas: 4
        revisionHistoryLimit: 3      # guarda 3 versões antigas para rollback
        strategy:
          type: RollingUpdate        # troca aos poucos (é o padrão)
          rollingUpdate:
            maxSurge: 1              # pode haver 5 Pods durante a troca
            maxUnavailable: 0        # nunca menos de 4 prontos
        selector:
          matchLabels:
            app: onibus
        template:
          metadata:
            labels:
              app: onibus
          spec:
            containers:
              - name: web
                image: nginx:1.25    # mude para 1.27 e aplique de novo: veja a troca no Estado
    `),

    exercicio({
      id: 'deploy-rolling-strategy',
      titulo: 'Rolling Update Strategy Personalizada',
      dificuldade: 'medio',
      resumo: `
        <p>Uma loja online não pode ficar fora do ar nem um segundo durante uma atualização. Configure o rolling update para
        nunca ter menos Pods prontos do que o pedido.</p>
        <ol>
          <li>O Deployment <code>rolling-deploy</code> tem <code>replicas: 3</code> e a label <code>app: rolling</code> (nos dois lugares).</li>
          <li>Em <code>spec.strategy</code>, use <code>type: RollingUpdate</code>.</li>
          <li>Em <code>strategy.rollingUpdate</code>: <code>maxSurge: 1</code> e <code>maxUnavailable: 0</code>.</li>
        </ol>
        <p><b>No cluster:</b> numa atualização, o Deployment sobe um 4º Pod com a versão nova, espera ele ficar pronto e só
        então desliga um antigo. Repete até os 3 estarem na versão nova.</p>`,
      inicial: esqueletoDeployment({ extraSpec: `
    strategy:
      # TODO: type: RollingUpdate e rollingUpdate com maxSurge: 1 e maxUnavailable: 0` }),
      dica: [
        'strategy fica direto em spec (não no template), alinhado com replicas.',
        'strategy:\n  type: RollingUpdate\n  rollingUpdate:\n    maxSurge: 1\n    maxUnavailable: 0',
      ],
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: rolling-deploy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rolling
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: rolling
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        teste({ descricao: 'O Deployment rolling-deploy existe', dica: 'Preencha todos os TODO; a label do selector e a do template precisam ser iguais.' },
          { tipo: 'recurso-existe', kind: 'Deployment', nome: 'rolling-deploy' }),
        teste({ descricao: 'O Deployment tem 3 réplicas e nunca fica abaixo delas', dica: 'replicas: 3 e strategy.rollingUpdate com maxSurge: 1 e maxUnavailable: 0.' },
          { tipo: 'deployment-replicas', deployment: 'rolling-deploy', replicas: 3 },
          { tipo: 'campo', kind: 'Deployment', nome: 'rolling-deploy', caminho: 'spec.strategy.rollingUpdate.maxUnavailable', valor: 0 }),
      ],
    }),

    exercicio({
      id: 'deploy-recreate-strategy',
      titulo: 'Recreate Strategy',
      dificuldade: 'medio',
      resumo: `
        <p>A versão nova desta aplicação muda o formato do banco de dados, e a versão antiga não pode rodar ao mesmo tempo.
        Use a estratégia que desliga tudo antes de subir o novo.</p>
        <ol>
          <li>O Deployment <code>recreate-deploy</code> tem <code>replicas: 2</code> e a label <code>app: recreate</code>.</li>
          <li>Em <code>spec.strategy</code>, use <code>type: Recreate</code> (sem <code>rollingUpdate</code>).</li>
        </ol>
        <p><b>No cluster:</b> numa atualização, os 2 Pods antigos são apagados, há um breve momento sem nenhum, e então os 2
        novos sobem.</p>`,
      inicial: esqueletoDeployment({ extraSpec: `
    strategy:
      type:              # TODO: Recreate` }),
      dica: [
        'Recreate não tem opções: basta o type.',
        'strategy:\n  type: Recreate',
      ],
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: recreate-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: recreate
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: recreate
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        teste({ descricao: 'O Deployment recreate-deploy existe', dica: 'Preencha todos os TODO; a label do selector e a do template precisam ser iguais.' },
          { tipo: 'recurso-existe', kind: 'Deployment', nome: 'recreate-deploy' }),
        teste({ descricao: 'O Deployment tem 2 réplicas e usa Recreate', dica: 'replicas: 2 e strategy.type: Recreate.' },
          { tipo: 'deployment-replicas', deployment: 'recreate-deploy', replicas: 2 },
          { tipo: 'campo', kind: 'Deployment', nome: 'recreate-deploy', caminho: 'spec.strategy.type', valor: 'Recreate' }),
      ],
    }),

    exercicio({
      id: 'deploy-rollback',
      titulo: 'Deployment com Revision History',
      dificuldade: 'medio',
      resumo: `
        <p>Para poder voltar atrás, o Deployment guarda versões antigas. Guardar demais ocupa espaço; de menos, impede o
        rollback. Configure um meio-termo.</p>
        <ol>
          <li>O Deployment <code>history-deploy</code> tem <code>replicas: 2</code> e a label <code>app: history</code>.</li>
          <li>Em <code>spec</code>, escreva <code>revisionHistoryLimit: 5</code>.</li>
        </ol>
        <p><b>No cluster:</b> a cada imagem nova, um ReplicaSet novo é criado e o antigo fica guardado com 0 réplicas. Passou
        de 5 guardados, o mais velho é apagado. <code>kubectl rollout history deployment/history-deploy</code> lista as versões.</p>`,
      inicial: esqueletoDeployment({ extraSpec: `
    # TODO: revisionHistoryLimit: 5` }),
      dica: [
        'revisionHistoryLimit fica direto em spec, alinhado com replicas.',
        'spec:\n  replicas: 2\n  revisionHistoryLimit: 5',
      ],
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: history-deploy
spec:
  replicas: 2
  revisionHistoryLimit: 5
  selector:
    matchLabels:
      app: history
  template:
    metadata:
      labels:
        app: history
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        teste({ descricao: 'O Deployment history-deploy existe', dica: 'Preencha todos os TODO; a label do selector e a do template precisam ser iguais.' },
          { tipo: 'recurso-existe', kind: 'Deployment', nome: 'history-deploy' }),
        teste({ descricao: 'O Deployment tem 2 réplicas e guarda 5 versões', dica: 'replicas: 2 e revisionHistoryLimit: 5, os dois em spec.' },
          { tipo: 'deployment-replicas', deployment: 'history-deploy', replicas: 2 },
          { tipo: 'campo', kind: 'Deployment', nome: 'history-deploy', caminho: 'spec.revisionHistoryLimit', valor: 5 }),
      ],
    }),

    licao('deploy-estrategias-licao', 'Canary e blue-green: lançar com segurança', 'dificil', `
      <p>O rolling update troca tudo em minutos. Às vezes você quer <b>testar a versão nova com poucos usuários</b> antes, ou
      <b>trocar tudo de uma vez</b> com a opção de voltar na hora. Os dois padrões usam o que você já sabe: dois Deployments
      e as labels que o Service seleciona.</p>
      <dl>
        <dt><b>Canary</b> (o canarinho da mina de carvão)</dt>
        <dd>Um Deployment <code>stable</code> com várias réplicas da versão atual e um <code>canary</code> com <b>uma</b> réplica
          da versão nova. Os dois têm a label <code>app: web</code>, que é a do Service; cada um tem também uma label própria
          (<code>track: stable</code> ou <code>track: canary</code>). Com 3 + 1 Pods, cerca de 1 em cada 4 acessos cai na versão nova.</dd>
        <dt><b>Blue-green</b></dt>
        <dd>Dois ambientes completos, <code>color: blue</code> (atual) e <code>color: green</code> (novo). O Service seleciona
          <code>color: blue</code>; para lançar, você troca o selector para <code>color: green</code>. Para voltar, troca de novo.</dd>
      </dl>
      <p><b>Detalhe importante:</b> cada Deployment precisa de um <code>selector.matchLabels</code> que <b>só pegue os Pods
      dele</b> (por isso <code>track</code> ou <code>color</code> entram no selector), senão os dois brigam pelos mesmos Pods.</p>`,
    `
      # O Service escolhe quem recebe tráfego:
      apiVersion: v1
      kind: Service
      metadata:
        name: loja
      spec:
        selector:
          app: loja
          color: blue          # troque para green para lançar a versão nova
        ports:
          - port: 80
    `),

    exercicio({
      id: 'deploy-canary',
      titulo: 'Canary Deployment',
      dificuldade: 'dificil',
      resumo: `
        <p>A versão <code>nginx:1.25</code> vai ser testada com cerca de 25% dos acessos antes de substituir a <code>1.24</code>.</p>
        <ol>
          <li><code>stable-deploy</code>: <code>replicas: 3</code>, imagem <code>nginx:1.24</code>, labels <code>app: web</code> e
            <code>track: stable</code> (no selector e no template).</li>
          <li>Depois do <code>---</code>, <code>canary-deploy</code>: <code>replicas: 1</code>, imagem <code>nginx:1.25</code>,
            labels <code>app: web</code> e <code>track: canary</code>.</li>
        </ol>
        <p><b>No cluster:</b> um Service com selector <code>app: web</code> enxerga os 4 Pods e distribui os acessos entre eles. Se
        o canary for bem, você aumenta as réplicas dele e diminui as do stable.</p>`,
      inicial: `
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: stable-deploy
        spec:
          replicas: 3
          selector:
            matchLabels:
              app: web
              track: stable
          template:
            metadata:
              labels:
                app: web
                track: stable
            spec:
              containers:
                - name: nginx
                  image: nginx:1.24
                  ports:
                    - containerPort: 80
        ---
        # TODO: o canary-deploy, igual ao stable, com replicas: 1, track: canary e image: nginx:1.25
      `,
      dica: [
        'Copie o stable-deploy depois do --- e mude só nome, réplicas, a label track e a imagem.',
        'track: canary aparece duas vezes: em selector.matchLabels e em template.metadata.labels.',
      ],
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: stable-deploy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
      track: stable
  template:
    metadata:
      labels:
        app: web
        track: stable
    spec:
      containers:
        - name: nginx
          image: nginx:1.24
          ports:
            - containerPort: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: canary-deploy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
      track: canary
  template:
    metadata:
      labels:
        app: web
        track: canary
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        teste({ descricao: 'O Deployment stable-deploy existe', dica: 'Mantenha o stable-deploy como veio no editor.' },
          { tipo: 'recurso-existe', kind: 'Deployment', nome: 'stable-deploy' }),
        teste({ descricao: 'O Deployment canary-deploy existe', dica: 'Depois do ---, crie um Deployment completo chamado canary-deploy.' },
          { tipo: 'recurso-existe', kind: 'Deployment', nome: 'canary-deploy' }),
        teste({ descricao: 'O canary-deploy tem 1 réplica da versão nova', dica: 'No canary-deploy: replicas: 1 e image: nginx:1.25.' },
          { tipo: 'deployment-replicas', deployment: 'canary-deploy', replicas: 1 },
          { tipo: 'container-imagem', pod: 'canary-deploy', container: 'nginx', imagem: 'nginx:1.25' }),
      ],
    }),

    exercicio({
      id: 'deploy-blue-green',
      titulo: 'Blue-Green Deployment',
      dificuldade: 'dificil',
      resumo: `
        <p>Monte os dois ambientes de um blue-green: o azul com a versão atual e o verde com a nova, prontos para a troca.</p>
        <ol>
          <li><code>blue-deploy</code>: <code>replicas: 2</code>, imagem <code>nginx:1.24</code>, labels <code>app: web</code> e
            <code>color: blue</code> (no selector e no template).</li>
          <li>Depois do <code>---</code>, <code>green-deploy</code>: <code>replicas: 2</code>, imagem <code>nginx:1.25</code>, labels
            <code>app: web</code> e <code>color: green</code>.</li>
        </ol>
        <p><b>No cluster:</b> os dois ambientes ficam rodando lado a lado. O lançamento é uma única mudança no selector do
        Service (de <code>color: blue</code> para <code>color: green</code>), e o rollback, a mudança de volta.</p>`,
      inicial: `
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: blue-deploy
        spec:
          replicas: 2
          selector:
            matchLabels:
              app: web
              color: blue
          template:
            metadata:
              labels:
                app: web
                color: blue
            spec:
              containers:
                - name: nginx
                  image: nginx:1.24
                  ports:
                    - containerPort: 80
        ---
        # TODO: o green-deploy, igual ao blue, com color: green e image: nginx:1.25
      `,
      dica: [
        'Copie o blue-deploy depois do --- e mude o nome, a label color e a imagem.',
        'color: green aparece duas vezes: em selector.matchLabels e em template.metadata.labels.',
      ],
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: blue-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
      color: blue
  template:
    metadata:
      labels:
        app: web
        color: blue
    spec:
      containers:
        - name: nginx
          image: nginx:1.24
          ports:
            - containerPort: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: green-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
      color: green
  template:
    metadata:
      labels:
        app: web
        color: green
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        teste({ descricao: 'O Deployment blue-deploy existe', dica: 'Mantenha o blue-deploy como veio no editor.' },
          { tipo: 'recurso-existe', kind: 'Deployment', nome: 'blue-deploy' }),
        teste({ descricao: 'O Deployment green-deploy existe', dica: 'Depois do ---, crie um Deployment completo chamado green-deploy.' },
          { tipo: 'recurso-existe', kind: 'Deployment', nome: 'green-deploy' }),
        teste({ descricao: 'O green-deploy tem 2 réplicas da versão nova', dica: 'No green-deploy: replicas: 2 e image: nginx:1.25.' },
          { tipo: 'deployment-replicas', deployment: 'green-deploy', replicas: 2 },
          { tipo: 'container-imagem', pod: 'green-deploy', container: 'nginx', imagem: 'nginx:1.25' }),
      ],
    }),

    licao('deploy-hpa-limits', 'HPA: escala automática', 'medio', `
      <p>Às 9h da manhã chegam mil clientes; às 3h, dez. Deixar 20 réplicas o dia todo desperdiça dinheiro; deixar 2 derruba
      o site no pico. O <b>HorizontalPodAutoscaler (HPA)</b> ajusta as réplicas sozinho, como o gerente que abre caixas quando a
      fila cresce e fecha quando esvazia.</p>
      <ul>
        <li><code>scaleTargetRef</code>: qual Deployment escalar (apiVersion, kind e name dele).</li>
        <li><code>minReplicas</code> e <code>maxReplicas</code>: o piso e o teto.</li>
        <li><code>metrics</code>: o que observar. O mais comum é CPU: <code>averageUtilization: 70</code> quer dizer "mantenha os
          Pods, em média, a 70% do que eles <b>reservaram</b> (requests)".</li>
      </ul>
      <p><b>Por isso o HPA depende de requests:</b> sem <code>resources.requests.cpu</code> no container, não há como calcular a
      porcentagem e o HPA não age. Revise a lição "CPU e memória: requests e limits" se precisar.</p>
      <p><b>No cluster:</b> a cada 15 segundos, o HPA lê o uso (via metrics-server), calcula quantas réplicas seriam
      necessárias e muda o <code>replicas</code> do Deployment.</p>`,
    `
      apiVersion: autoscaling/v2
      kind: HorizontalPodAutoscaler
      metadata:
        name: caixas-hpa
      spec:
        scaleTargetRef:            # quem escalar
          apiVersion: apps/v1
          kind: Deployment
          name: caixas
        minReplicas: 2             # nunca menos que 2
        maxReplicas: 8             # nunca mais que 8
        metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 60   # alvo: 60% da CPU reservada
    `),

    exercicio({
      id: 'deploy-hpa-exercicio',
      titulo: 'HPA configurado',
      dificuldade: 'dificil',
      existentes: WEB_DEPLOY,
      resumo: `
        <p>O Deployment <code>web-deploy</code> já roda no cluster (com <code>requests.cpu</code> definido). Faça ele escalar
        sozinho entre 2 e 10 réplicas, mirando 70% de CPU.</p>
        <ol>
          <li>Crie o HPA <code>web-hpa</code> com <code>apiVersion: autoscaling/v2</code>.</li>
          <li>Em <code>scaleTargetRef</code>, aponte para o Deployment <code>web-deploy</code> (<code>apiVersion: apps/v1</code>).</li>
          <li><code>minReplicas: 2</code> e <code>maxReplicas: 10</code>.</li>
          <li>Na métrica de CPU, <code>averageUtilization: 70</code>.</li>
        </ol>
        <p><b>No cluster:</b> se a média de CPU passar de 70% do reservado, o HPA aumenta as réplicas (até 10); se cair, diminui
        (até 2).</p>`,
      inicial: `
        apiVersion: autoscaling/v2
        kind: HorizontalPodAutoscaler
        metadata:
          name: web-hpa
        spec:
          scaleTargetRef:
            apiVersion: apps/v1
            kind: Deployment
            name:              # TODO: o Deployment que já existe
          minReplicas:         # TODO: 2
          maxReplicas:         # TODO: 10
          metrics:
            - type: Resource
              resource:
                name: cpu
                target:
                  type: Utilization
                  averageUtilization:   # TODO: 70
      `,
      dica: [
        'Rode kubectl get deployments para ver o nome do Deployment que já existe.',
        'name: web-deploy, minReplicas: 2, maxReplicas: 10, averageUtilization: 70.',
      ],
      solucao: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-deploy
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70`,
      testes: [
        teste({ descricao: 'O HPA web-hpa existe', dica: 'Preencha todos os TODO: um valor vazio impede o apply.' },
          { tipo: 'recurso-existe', kind: 'HorizontalPodAutoscaler', nome: 'web-hpa' }),
        teste({ descricao: 'O HPA escala o web-deploy entre 2 e 10 réplicas, mirando 70% de CPU', dica: 'scaleTargetRef.name: web-deploy, minReplicas: 2, maxReplicas: 10 e averageUtilization: 70.' },
          { tipo: 'hpa-configurado', hpa: 'web-hpa', min: 2, max: 10, target: 70 },
          { tipo: 'campo', kind: 'HorizontalPodAutoscaler', nome: 'web-hpa', caminho: 'spec.scaleTargetRef.name', valor: 'web-deploy' }),
      ],
    }),

    licao('deploy-disponibilidade-licao', 'Disponibilidade: PDB, espalhamento e prioridade', 'dificil', `
      <p>Ter 3 réplicas não adianta se as 3 estão no mesmo nó (ele cai, tudo cai) ou se uma manutenção desliga as 3 juntas.
      Três recursos cuidam disso:</p>
      <dl>
        <dt><b>PodDisruptionBudget (PDB)</b>, <code>apiVersion: policy/v1</code></dt>
        <dd>"Durante manutenções planejadas, mantenha pelo menos N Pods de pé." Como a regra do hospital: nunca menos de 2
          médicos de plantão, nem na troca de turno. Campos: <code>minAvailable</code> e um <code>selector.matchLabels</code>.
          Ao esvaziar um nó (<code>kubectl drain</code>), o Kubernetes espera em vez de violar o PDB.</dd>
        <dt><b>topologySpreadConstraints</b> (no spec do Pod)</dt>
        <dd>"Espalhe os Pods entre as zonas." <code>maxSkew: 1</code> = a diferença entre a zona mais cheia e a mais vazia é
          no máximo 1. <code>whenUnsatisfiable: DoNotSchedule</code> = se não der para espalhar, não agende.</dd>
        <dt><b>PriorityClass</b>, <code>apiVersion: scheduling.k8s.io/v1</code></dt>
        <dd>Um número de importância (<code>value</code>). Quando falta espaço no cluster, Pods de prioridade maior passam na
          frente e podem até tirar os de prioridade menor. O Pod usa com <code>priorityClassName</code>. Diferente dos
          outros, a PriorityClass não tem <code>spec</code>: <code>value</code> fica na raiz do manifesto.</dd>
      </dl>`,
    `
      apiVersion: policy/v1
      kind: PodDisruptionBudget
      metadata:
        name: plantao
      spec:
        minAvailable: 2          # nunca menos de 2 Pods de pé numa manutenção
        selector:
          matchLabels:
            app: hospital        # vale para os Pods com esta label
      ---
      apiVersion: scheduling.k8s.io/v1
      kind: PriorityClass
      metadata:
        name: emergencia
      value: 500000              # quanto maior, mais importante (fica na raiz, sem spec)
      globalDefault: false       # não vira a prioridade padrão de todo Pod
    `),

    exercicio({
      id: 'deploy-pdb',
      titulo: 'Pod Disruption Budget',
      dificuldade: 'dificil',
      resumo: `
        <p>Uma aplicação importante tem 3 réplicas. Garanta que, numa manutenção dos nós, pelo menos 2 continuem atendendo.</p>
        <ol>
          <li>Complete o Deployment <code>pdb-deploy</code>: <code>replicas: 3</code> e a label <code>app: protected</code>.</li>
          <li>Depois do <code>---</code>, crie o PodDisruptionBudget <code>pdb-budget</code> (<code>apiVersion: policy/v1</code>).</li>
          <li>No PDB: <code>minAvailable: 2</code> e <code>selector.matchLabels</code> com <code>app: protected</code>.</li>
        </ol>
        <p><b>No cluster:</b> se alguém esvaziar um nó com 2 desses Pods, o Kubernetes tira um, espera ele renascer em outro nó,
        e só então tira o segundo.</p>`,
      inicial: `${esqueletoDeployment()}
        ---
        apiVersion: policy/v1
        kind: PodDisruptionBudget
        metadata:
          name: pdb-budget
        spec:
          # TODO: minAvailable: 2 e selector.matchLabels com app: protected
      `,
      dica: [
        'Releia o exemplo da lição "Disponibilidade": o PDB "plantao" tem a mesma forma.',
        'O selector do PDB usa a mesma label dos Pods do Deployment: app: protected.',
        'spec:\n  minAvailable: 2\n  selector:\n    matchLabels:\n      app: protected',
      ],
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: pdb-deploy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: protected
  template:
    metadata:
      labels:
        app: protected
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: pdb-budget
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: protected`,
      testes: [
        teste({ descricao: 'O Deployment pdb-deploy existe', dica: 'Preencha os TODO do Deployment; a label do selector e a do template precisam ser iguais.' },
          { tipo: 'recurso-existe', kind: 'Deployment', nome: 'pdb-deploy' }),
        teste({ descricao: 'O Deployment tem 3 réplicas', dica: 'Em spec do Deployment, escreva replicas: 3.' },
          { tipo: 'deployment-replicas', deployment: 'pdb-deploy', replicas: 3 }),
        teste({ descricao: 'O PDB pdb-budget mantém 2 Pods app=protected', dica: 'No PDB: minAvailable: 2 e selector.matchLabels com app: protected.' },
          { tipo: 'recurso-existe', kind: 'PodDisruptionBudget', nome: 'pdb-budget' },
          { tipo: 'campo', kind: 'PodDisruptionBudget', nome: 'pdb-budget', caminho: 'spec.minAvailable', valor: 2 }),
      ],
    }),

    exercicio({
      id: 'deploy-topology-spread',
      titulo: 'Topology Spread Constraints',
      dificuldade: 'dificil',
      resumo: `
        <p>Com 4 réplicas e 2 zonas, o ideal é 2 em cada: se uma zona cair, metade continua de pé. Peça isso ao Scheduler.</p>
        <ol>
          <li>Complete o Deployment <code>spread-deploy</code>: <code>replicas: 4</code> e a label <code>app: spread</code>.</li>
          <li>No spec do Pod (dentro de <code>template</code>), crie <code>topologySpreadConstraints</code> com um item:
            <code>maxSkew: 1</code>, <code>topologyKey: topology.kubernetes.io/zone</code> e
            <code>whenUnsatisfiable: DoNotSchedule</code>.</li>
          <li>No mesmo item, <code>labelSelector.matchLabels</code> com <code>app: spread</code> (quais Pods contar).</li>
        </ol>
        <p><b>No cluster:</b> antes de pôr cada Pod, o Scheduler conta quantos <code>app: spread</code> há em cada zona e escolhe
        uma que mantenha a diferença em no máximo 1.</p>`,
      inicial: esqueletoDeployment({ extraPod: `
        topologySpreadConstraints:
          - maxSkew:               # TODO: 1
            topologyKey:           # TODO: topology.kubernetes.io/zone
            whenUnsatisfiable:     # TODO: DoNotSchedule
            labelSelector:
              matchLabels:
                # TODO: app: spread` }),
      dica: [
        'topologySpreadConstraints fica no spec do Pod (template.spec), alinhado com containers.',
        'O labelSelector diz quais Pods contar: os do próprio Deployment, app: spread.',
      ],
      solucao: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: spread-deploy
spec:
  replicas: 4
  selector:
    matchLabels:
      app: spread
  template:
    metadata:
      labels:
        app: spread
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: spread
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        teste({ descricao: 'O Deployment spread-deploy existe', dica: 'Preencha todos os TODO; a label do selector e a do template precisam ser iguais.' },
          { tipo: 'recurso-existe', kind: 'Deployment', nome: 'spread-deploy' }),
        teste({ descricao: 'O Deployment tem 4 réplicas espalhadas por zona', dica: 'replicas: 4 e, em topologySpreadConstraints, topologyKey: topology.kubernetes.io/zone.' },
          { tipo: 'deployment-replicas', deployment: 'spread-deploy', replicas: 4 },
          { tipo: 'campo', kind: 'Deployment', nome: 'spread-deploy', caminho: 'spec.template.spec.topologySpreadConstraints[0].topologyKey', valor: 'topology.kubernetes.io/zone' }),
      ],
    }),

    exercicio({
      id: 'deploy-priority-class',
      titulo: 'PriorityClass e Pods Prioritários',
      dificuldade: 'dificil',
      resumo: `
        <p>O serviço de pagamentos não pode ficar sem lugar no cluster. Dê a ele prioridade alta.</p>
        <ol>
          <li>Crie a PriorityClass <code>high-priority</code> (<code>apiVersion: scheduling.k8s.io/v1</code>) com
            <code>value: 1000000</code> e <code>globalDefault: false</code>, na raiz do manifesto (sem <code>spec</code>).</li>
          <li>Depois do <code>---</code>, complete o Deployment <code>priority-deploy</code>: <code>replicas: 2</code> e a label
            <code>app: priority</code>.</li>
          <li>No spec do Pod (dentro de <code>template</code>), escreva <code>priorityClassName: high-priority</code>.</li>
        </ol>
        <p><b>No cluster:</b> se faltar espaço, estes Pods entram na frente da fila do Scheduler e podem tirar Pods de
        prioridade menor para abrir lugar.</p>`,
      inicial: `
        apiVersion: scheduling.k8s.io/v1
        kind: PriorityClass
        metadata:
          name: high-priority
        # TODO: value: 1000000 e globalDefault: false (na raiz, sem spec)
        ---${esqueletoDeployment({ extraPod: `
        # TODO: priorityClassName: high-priority` })}`,
      dica: [
        'Na PriorityClass, value e globalDefault ficam encostados na margem, como apiVersion e kind.',
        'priorityClassName fica em template.spec, alinhado com containers.',
      ],
      solucao: `apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: priority-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: priority
  template:
    metadata:
      labels:
        app: priority
    spec:
      priorityClassName: high-priority
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80`,
      testes: [
        teste({ descricao: 'A PriorityClass high-priority existe', dica: 'Na raiz da PriorityClass: value: 1000000 e globalDefault: false.' },
          { tipo: 'recurso-existe', kind: 'PriorityClass', nome: 'high-priority' }),
        teste({ descricao: 'O Deployment priority-deploy existe e usa a prioridade alta', dica: 'Em template.spec, escreva priorityClassName: high-priority.' },
          { tipo: 'recurso-existe', kind: 'Deployment', nome: 'priority-deploy' },
          { tipo: 'campo', kind: 'Deployment', nome: 'priority-deploy', caminho: 'spec.template.spec.priorityClassName', valor: 'high-priority' }),
        teste({ descricao: 'O Deployment tem 2 réplicas', dica: 'Em spec do Deployment, escreva replicas: 2.' },
          { tipo: 'deployment-replicas', deployment: 'priority-deploy', replicas: 2 }),
      ],
    }),

    licao('deploy-daemonset-licao', 'DaemonSet: um Pod em cada nó', 'medio', `
      <p>Alguns programas precisam rodar em <b>todas</b> as máquinas: o coletor de logs, o agente de monitoramento, o plugin de
      rede. Para isso existe o <b>DaemonSet</b>: um Pod em cada nó, como um extintor em cada andar do prédio.</p>
      <ul>
        <li>É quase igual a um Deployment (<code>apiVersion: apps/v1</code>, <code>selector</code>, <code>template</code>),
          mas <b>não tem <code>replicas</code></b>: o número de Pods é o número de nós.</li>
        <li>Entrou um nó novo no cluster? O DaemonSet põe um Pod nele sozinho. Saiu um nó? O Pod vai junto.</li>
      </ul>
      <p><b>No cluster:</b> <code>kubectl get daemonsets</code> mostra <code>DESIRED</code> (quantos nós) e <code>READY</code>
      (quantos Pods prontos).</p>`,
    `
      apiVersion: apps/v1
      kind: DaemonSet
      metadata:
        name: extintor
      spec:                      # sem replicas: um Pod por nó
        selector:
          matchLabels:
            app: extintor
        template:
          metadata:
            labels:
              app: extintor
          spec:
            containers:
              - name: agente
                image: busybox:1.36
                command: ['sh', '-c', 'sleep 3600']
    `),

    exercicio({
      id: 'deploy-daemonset',
      titulo: 'DaemonSet Básico',
      dificuldade: 'medio',
      resumo: `
        <p>Você vai pôr um agente de monitoramento em todos os nós do cluster.</p>
        <ol>
          <li>Crie o DaemonSet <code>monitor-ds</code> com <code>apiVersion: apps/v1</code>.</li>
          <li>Use a label <code>app: monitor</code> em <code>selector.matchLabels</code> e em <code>template.metadata.labels</code>.</li>
          <li>O container <code>monitor</code> usa a imagem <code>busybox:1.36</code> e o comando <code>['sh', '-c', 'sleep 3600']</code>.</li>
          <li>Não escreva <code>replicas</code>.</li>
        </ol>
        <p><b>No cluster:</b> com 3 nós, nascem 3 Pods, um em cada. Rode <code>kubectl get daemonsets</code> depois do apply.</p>`,
      inicial: `
        apiVersion: apps/v1
        kind:                  # TODO: DaemonSet
        metadata:
          name: monitor-ds
        spec:
          selector:
            matchLabels:
              # TODO: app: monitor
          template:
            metadata:
              labels:
                # TODO: app: monitor
            spec:
              containers:
                - name: monitor
                  image:       # TODO: busybox:1.36
                  command: ['sh', '-c', 'sleep 3600']
      `,
      dica: [
        'Compare com o exemplo da lição "DaemonSet": só mudam os nomes.',
        'kind: DaemonSet, app: monitor nos dois lugares e image: busybox:1.36.',
      ],
      solucao: `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitor-ds
spec:
  selector:
    matchLabels:
      app: monitor
  template:
    metadata:
      labels:
        app: monitor
    spec:
      containers:
        - name: monitor
          image: busybox:1.36
          command: ['sh', '-c', 'sleep 3600']`,
      testes: [
        teste({ descricao: 'O DaemonSet monitor-ds existe', dica: 'kind: DaemonSet e todos os TODO preenchidos; a label do selector e a do template precisam ser iguais.' },
          { tipo: 'recurso-existe', kind: 'DaemonSet', nome: 'monitor-ds' }),
        teste({ descricao: 'O container usa a imagem busybox:1.36', dica: 'No container monitor, escreva image: busybox:1.36.' },
          { tipo: 'container-imagem', pod: 'monitor-ds', container: 'monitor', imagem: 'busybox:1.36' }),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'deploy-3-replicas': { dica: 'Releia os passos: algum valor pedido no Deployment web-deploy ainda não confere.', regras: [campo('Deployment', 'web-deploy', 'spec.template.spec.containers[name=nginx].image', { valor: 'nginx:1.25' }), campo('Deployment', 'web-deploy', 'spec.selector.matchLabels.app', { valor: 'web' })] },
    'deploy-resource-limits': { dica: 'Releia os passos: algum valor pedido no Deployment limited-deploy ainda não confere.', regras: [campo('Deployment', 'limited-deploy', 'spec.template.spec.containers[name=nginx].image', { valor: 'nginx:1.25' }), campo('Deployment', 'limited-deploy', 'spec.selector.matchLabels.app', { valor: 'limited' })] },
    'deploy-datasource-configmap': { dica: 'Releia os passos: algum valor pedido no Deployment app-deploy ainda não confere.', regras: [campo('Deployment', 'app-deploy', 'spec.template.spec.containers[name=nginx].volumeMounts[name=config-volume].mountPath', { valor: '/etc/config' }), campo('Deployment', 'app-deploy', 'spec.template.spec.containers[name=nginx].image', { valor: 'nginx:1.25' })] },
    'deploy-rolling-strategy': { dica: 'Releia os passos: algum valor pedido no Deployment rolling-deploy ainda não confere.', regras: [campo('Deployment', 'rolling-deploy', 'spec.strategy.type', { valor: 'RollingUpdate' }), campo('Deployment', 'rolling-deploy', 'spec.template.spec.containers[name=nginx].image', { valor: 'nginx:1.25' })] },
    'deploy-recreate-strategy': { dica: 'Releia os passos: algum valor pedido no Deployment recreate-deploy ainda não confere.', regras: [campo('Deployment', 'recreate-deploy', 'spec.template.spec.containers[name=nginx].image', { valor: 'nginx:1.25' }), campo('Deployment', 'recreate-deploy', 'spec.selector.matchLabels.app', { valor: 'recreate' })] },
    'deploy-rollback': { dica: 'Releia os passos: algum valor pedido no Deployment history-deploy ainda não confere.', regras: [campo('Deployment', 'history-deploy', 'spec.template.spec.containers[name=nginx].image', { valor: 'nginx:1.25' }), campo('Deployment', 'history-deploy', 'spec.selector.matchLabels.app', { valor: 'history' })] },
    'deploy-canary': { dica: 'Releia os passos: algum valor pedido no Deployment stable-deploy ainda não confere.', regras: [campo('Deployment', 'stable-deploy', 'spec.selector.matchLabels.track', { valor: 'stable' }), campo('Deployment', 'canary-deploy', 'spec.selector.matchLabels.track', { valor: 'canary' })] },
    'deploy-blue-green': { dica: 'Releia os passos: algum valor pedido no Deployment green-deploy ainda não confere.', regras: [campo('Deployment', 'green-deploy', 'spec.selector.matchLabels.color', { valor: 'green' }), campo('Deployment', 'blue-deploy', 'spec.selector.matchLabels.color', { valor: 'blue' })] },
    'deploy-hpa-exercicio': { dica: 'Releia os passos: algum valor pedido no HorizontalPodAutoscaler web-hpa ainda não confere.', regras: [campo('HorizontalPodAutoscaler', 'web-hpa', 'spec.metrics[0].resource.target.type', { valor: 'Utilization' }), campo('HorizontalPodAutoscaler', 'web-hpa', 'spec.scaleTargetRef.kind', { valor: 'Deployment' })] },
    'deploy-pdb': { dica: 'Releia os passos: algum valor pedido no Deployment pdb-deploy ainda não confere.', regras: [campo('Deployment', 'pdb-deploy', 'spec.template.spec.containers[name=nginx].image', { valor: 'nginx:1.25' }), campo('Deployment', 'pdb-deploy', 'spec.selector.matchLabels.app', { valor: 'protected' })] },
    'deploy-topology-spread': { dica: 'Releia os passos: algum valor pedido no Deployment spread-deploy ainda não confere.', regras: [campo('Deployment', 'spread-deploy', 'spec.template.spec.topologySpreadConstraints[0].whenUnsatisfiable', { valor: 'DoNotSchedule' }), campo('Deployment', 'spread-deploy', 'spec.template.spec.containers[name=nginx].image', { valor: 'nginx:1.25' })] },
    'deploy-priority-class': { dica: 'Releia os passos: algum valor pedido no Deployment priority-deploy ainda não confere.', regras: [campo('Deployment', 'priority-deploy', 'spec.template.spec.containers[name=nginx].image', { valor: 'nginx:1.25' }), campo('Deployment', 'priority-deploy', 'spec.selector.matchLabels.app', { valor: 'priority' })] },
    'deploy-daemonset': { dica: 'Releia os passos: algum valor pedido no DaemonSet monitor-ds ainda não confere.', regras: [campo('DaemonSet', 'monitor-ds', 'spec.selector.matchLabels.app', { valor: 'monitor' }), campo('DaemonSet', 'monitor-ds', 'spec.template.spec.containers[name=monitor].name', { valor: 'monitor' })] },
  },
};
