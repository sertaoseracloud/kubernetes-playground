// Módulo 1, tópico 2: Pods e Containers.
// Ciclo de vida, probes, volumes, vários containers no mesmo Pod, agendamento, segurança e
// depuração. Segue docs/didatica.md: cada conceito novo tem lição antes do exercício.
import { licao, exercicio, teste, existe, campo } from './util.js';

export const pods = {
  id: 'pods',
  titulo: 'Pods e Containers',
  descricao: 'Ciclo de vida dos Pods, health checks, volumes, padrões multi-container, agendamento e segurança.',
  icone: '📦',
  itens: [
    licao('pods-ciclo-de-vida', 'Ciclo de vida do Pod', 'facil', `
      <p>Um Pod nasce, vive e morre. No caminho, ele passa por <b>fases</b> que você vê na coluna <code>STATUS</code> do
      <code>kubectl get pods</code>:</p>
      <dl>
        <dt><b>Pending</b></dt><dd>Aceito, mas ainda não rodando: o Scheduler está escolhendo um nó ou a imagem está sendo baixada.</dd>
        <dt><b>Running</b></dt><dd>Pelo menos um container está rodando.</dd>
        <dt><b>Succeeded</b></dt><dd>Todos os containers terminaram sem erro (código de saída 0). Comum em tarefas que acabam.</dd>
        <dt><b>Failed</b></dt><dd>Um container terminou com erro e não vai ser reiniciado.</dd>
      </dl>
      <p>Quem decide se um container que terminou volta a rodar é a <b>restartPolicy</b>, um campo do <code>spec</code> do Pod
      (vale para todos os containers dele). Pense na regra de um despertador:</p>
      <ul>
        <li><code>Always</code> (padrão): reinicia sempre, mesmo se terminou bem. Para servidores, que nunca deveriam parar.</li>
        <li><code>OnFailure</code>: reinicia só se terminou com erro (código diferente de 0). Para tarefas que podem falhar e tentar de novo.</li>
        <li><code>Never</code>: nunca reinicia. Para tarefas em que você quer ver a falha.</li>
      </ul>
      <p><b>No cluster:</b> quem reinicia é o <b>kubelet</b> do nó. Se o container cai seguidas vezes, o intervalo entre as
      tentativas aumenta e o status mostra <code>CrashLoopBackOff</code>: é o sinal de que algo está errado na aplicação.</p>`,
    `
      apiVersion: v1
      kind: Pod
      metadata:
        name: tarefa-unica
      spec:
        restartPolicy: Never     # terminou? fica terminado (Succeeded ou Failed)
        containers:
          - name: tarefa
            image: busybox:1.36
            # command troca o programa que a imagem rodaria: aqui, um comando de shell
            command: ['sh', '-c', 'echo "pronto!"']
    `),

    exercicio({
      id: 'pods-restart-policy',
      titulo: 'Restart Policy OnFailure',
      dificuldade: 'facil',
      resumo: `
        <p>Você vai rodar uma tarefa que falha de propósito (<code>exit 1</code>) e pedir ao Kubernetes que tente de novo
        somente quando houver erro.</p>
        <ol>
          <li>O Pod se chama <code>job-pod</code>; o container, <code>worker</code>, com a imagem <code>busybox:1.36</code>.</li>
          <li>O <code>command</code> já está pronto: imprime "trabalhando" e sai com erro.</li>
          <li>No <code>spec</code> do Pod (fora de <code>containers</code>), defina <code>restartPolicy: OnFailure</code>.</li>
        </ol>
        <p><b>No cluster:</b> a cada falha o kubelet reinicia o container, esperando cada vez mais entre as tentativas. Se a
        tarefa terminasse com sucesso, ele não reiniciaria.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: job-pod
        spec:
          # TODO: restartPolicy: OnFailure (alinhado com containers)
          containers:
            - name: worker
              image:           # TODO: busybox:1.36
              command: ['sh', '-c', 'echo trabalhando && exit 1']
      `,
      dica: [
        'restartPolicy é do Pod, não do container: fica direto dentro de spec.',
        'spec:\n  restartPolicy: OnFailure\n  containers: ...',
      ],
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
        teste({ descricao: 'O Pod job-pod existe', dica: 'Mantenha metadata.name: job-pod e preencha a imagem.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'job-pod' }),
        teste({ descricao: 'O container usa a imagem busybox:1.36', dica: 'No container worker, escreva image: busybox:1.36.' },
          { tipo: 'container-imagem', pod: 'job-pod', container: 'worker', imagem: 'busybox:1.36' }),
        teste({ descricao: 'A restartPolicy é OnFailure', dica: 'Em spec (alinhado com containers), escreva restartPolicy: OnFailure.' },
          campo('Pod', 'job-pod', 'spec.restartPolicy', { valor: 'OnFailure' })),
      ],
    }),

    exercicio({
      id: 'pods-campos-obrigatorios',
      titulo: 'Corrigindo Campos Obrigatórios',
      dificuldade: 'facil',
      resumo: `
        <p>O YAML do editor tem <b>erros de digitação</b> nos nomes dos campos. O simulador avisa com mensagens como
        <code>Missing required argument "image"</code> (falta um campo) ou <code>Unknown field ... Did you mean ...?</code>
        (campo com nome errado e a sugestão certa).</p>
        <ol>
          <li>Clique em <b>▶ Apply</b> e leia a mensagem de erro no terminal e na aba 🧪 Testes.</li>
          <li>Corrija o campo apontado e aplique de novo.</li>
          <li>Repita até o Pod <code>pod-corrigido</code> ser criado com o container <code>nginx</code>, a imagem <code>nginx:1.25</code> e a porta 80.</li>
        </ol>
        <p><b>Por que isso importa:</b> o Kubernetes recusa o manifesto inteiro se um campo obrigatório faltar. Ler a mensagem de
        erro com calma é a habilidade mais útil de quem trabalha com YAML.</p>`,
      inicial: `
        # Este manifesto tem 2 nomes de campo errados. Rode ▶ Apply e siga as mensagens de erro.
        apiVersion: v1
        kind: Pod
        metadata:
          name: pod-corrigido
        spec:
          containers:
            - name: nginx
              imagem: nginx:1.25
              ports:
                - contanerPort: 80
      `,
      dica: [
        'Os campos do Kubernetes são em inglês. Compare cada nome com o exemplo da lição "Anatomia de um manifesto".',
        'Um container precisa de name e image (não "imagem").',
        'Os dois erros: imagem → image e contanerPort → containerPort.',
      ],
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
        teste({ descricao: 'O Pod pod-corrigido existe', dica: 'Leia o erro do apply: ele diz qual campo falta ou está com o nome errado.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'pod-corrigido' }),
        teste({ descricao: 'O container nginx usa a imagem nginx:1.25', dica: 'O campo da imagem se chama image, em inglês.' },
          { tipo: 'container-imagem', pod: 'pod-corrigido', container: 'nginx', imagem: 'nginx:1.25' }),
        teste({ descricao: 'A porta 80 está exposta', dica: 'O campo da porta se chama containerPort (com "i" em container).' },
          { tipo: 'container-porta', pod: 'pod-corrigido', container: 'nginx', porta: 80 }),
      ],
    }),

    licao('pods-probes', 'Liveness e Readiness Probes', 'medio', `
      <p>Um container pode estar "ligado" e mesmo assim travado, ou ainda carregando. Para saber a verdade, o kubelet faz
      <b>probes</b> (sondas): perguntas periódicas ao container. É o médico medindo o pulso.</p>
      <dl>
        <dt><b>livenessProbe</b>: "você está vivo?"</dt><dd>Se falhar várias vezes seguidas, o kubelet <b>reinicia</b> o container.</dd>
        <dt><b>readinessProbe</b>: "pode receber clientes?"</dt><dd>Se falhar, o Pod <b>sai do Service</b> (não recebe tráfego)
          até voltar a responder. Ninguém é reiniciado.</dd>
      </dl>
      <p>Três jeitos de perguntar:</p>
      <ul>
        <li><code>httpGet</code>: acessa um caminho (<code>path</code>) numa porta; respostas 200 a 399 contam como sucesso.</li>
        <li><code>tcpSocket</code>: só tenta abrir uma conexão na porta.</li>
        <li><code>exec</code>: roda um comando dentro do container; código de saída 0 é sucesso.</li>
      </ul>
      <p>E três números de tempo:</p>
      <ul>
        <li><code>initialDelaySeconds</code>: quanto esperar antes da primeira pergunta (dá tempo de a aplicação subir).</li>
        <li><code>periodSeconds</code>: de quanto em quanto tempo perguntar (padrão: 10).</li>
        <li><code>failureThreshold</code>: quantas falhas seguidas até agir (padrão: 3).</li>
      </ul>`,
    `
      apiVersion: v1
      kind: Pod
      metadata:
        name: com-pulso
      spec:
        containers:
          - name: web
            image: nginx:1.25
            ports:
              - containerPort: 80
            livenessProbe:          # "está vivo?" falhou 3x: reinicia
              httpGet:
                path: /             # o caminho que o kubelet acessa
                port: 80
              periodSeconds: 10     # pergunta a cada 10 s
            readinessProbe:         # "pode receber tráfego?" falhou: sai do Service
              tcpSocket:
                port: 80
              initialDelaySeconds: 5   # espera 5 s antes da primeira
    `),

    exercicio({
      id: 'pods-health-check',
      titulo: 'Pod com Health Check',
      dificuldade: 'medio',
      resumo: `
        <p>Você vai ensinar o Kubernetes a conferir a saúde de um nginx: reiniciar se travar e só mandar tráfego quando ele
        estiver pronto.</p>
        <ol>
          <li>O Pod se chama <code>app-saudavel</code>, com o container <code>nginx</code> e a imagem <code>nginx:1.25</code>.</li>
          <li>Crie uma <code>livenessProbe</code> com <code>httpGet</code> no <code>path: /</code> e <code>port: 80</code>, e
            <code>periodSeconds: 10</code>.</li>
          <li>Crie uma <code>readinessProbe</code> também com <code>httpGet</code> no <code>/</code> e porta 80, com
            <code>initialDelaySeconds: 5</code>.</li>
        </ol>
        <p><b>No cluster:</b> 5 segundos depois de ligar, o kubelet começa a perguntar "está pronto?". Enquanto não estiver, o
        Service não manda clientes para este Pod. Se o nginx travar, a liveness falha 3 vezes e o container é reiniciado.</p>`,
      inicial: `
        apiVersion: v1
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
                  path:        # TODO: /
                  port:        # TODO: 80
                periodSeconds: 10
              # TODO: readinessProbe com httpGet (path / e port 80) e initialDelaySeconds: 5
      `,
      dica: [
        'As duas probes ficam dentro do container, alinhadas com image e ports.',
        'A readinessProbe tem o mesmo formato da livenessProbe; só troque periodSeconds por initialDelaySeconds: 5.',
        'readinessProbe:\n  httpGet:\n    path: /\n    port: 80\n  initialDelaySeconds: 5',
      ],
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
        teste({ descricao: 'O Pod app-saudavel existe', dica: 'Preencha os TODO de path e port: um campo vazio impede o apply.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'app-saudavel' }),
        teste({ descricao: 'A livenessProbe está configurada', dica: 'Em livenessProbe.httpGet, use path: / e port: 80.' },
          { tipo: 'probe-configurada', pod: 'app-saudavel', container: 'nginx', tipo_probe: 'liveness' }),
        teste({ descricao: 'A readinessProbe está configurada com espera inicial de 5 s', dica: 'Crie readinessProbe (alinhada com livenessProbe) com httpGet e initialDelaySeconds: 5.' },
          { tipo: 'probe-configurada', pod: 'app-saudavel', container: 'nginx', tipo_probe: 'readiness' },
          campo('Pod', 'app-saudavel', 'spec.containers[name=nginx].readinessProbe.initialDelaySeconds', { valor: 5 })),
      ],
    }),

    licao('pods-volumes-configmaps', 'Volumes: guardar e compartilhar arquivos', 'medio', `
      <p>O disco de um container é <b>descartável</b>: se ele reinicia, os arquivos que criou somem. E dois containers não
      enxergam o disco um do outro. Os <b>volumes</b> resolvem isso.</p>
      <p>Usar um volume tem <b>duas partes</b>, e é aqui que muita gente se perde:</p>
      <ol>
        <li><b>Declarar</b> o volume no Pod, em <code>spec.volumes</code>: um <code>name</code> e o tipo.</li>
        <li><b>Montar</b> o volume em cada container que precisa dele, em <code>volumeMounts</code>: o mesmo <code>name</code>
          e o <code>mountPath</code> (a pasta onde ele aparece dentro do container).</li>
      </ol>
      <p>É uma gaveta: o Pod tem a gaveta (volumes), e cada container decide em que lugar da mesa ela fica (mountPath).</p>
      <p>Os tipos mais comuns:</p>
      <ul>
        <li><code>emptyDir</code>: uma pasta vazia criada com o Pod e apagada com ele. Para containers do mesmo Pod trocarem arquivos.</li>
        <li><code>hostPath</code>: uma pasta do <b>nó</b>. Útil para ler logs da máquina; evite em produção (prende o Pod àquele nó).</li>
        <li><code>configMap</code>: as chaves de um ConfigMap viram arquivos.</li>
        <li><code>projected</code>: junta várias fontes (ConfigMap, Secret, informações do Pod) numa pasta só.</li>
      </ul>
      <p><b>No cluster:</b> o kubelet cria o volume antes de ligar os containers e o monta no caminho pedido. Se o
      <code>name</code> do volumeMount não bater com nenhum volume declarado, o Pod não é criado.</p>`,
    `
      apiVersion: v1
      kind: Pod
      metadata:
        name: com-gaveta
      spec:
        volumes:                 # parte 1: declarar (o Pod tem a gaveta)
          - name: gaveta
            emptyDir: {}         # {} = sem opções extras
        containers:
          - name: web
            image: nginx:1.25
            volumeMounts:        # parte 2: montar (onde a gaveta aparece)
              - name: gaveta     # o mesmo nome do volume
                mountPath: /dados
    `),

    exercicio({
      id: 'pods-emptydir-volume',
      titulo: 'Volume emptyDir Compartilhado',
      dificuldade: 'medio',
      resumo: `
        <p>Dois containers no mesmo Pod: um escreve um arquivo e o outro lê. Para isso funcionar, os dois montam o mesmo volume.</p>
        <ol>
          <li>Em <code>spec.volumes</code>, declare o volume <code>shared-vol</code> do tipo <code>emptyDir: {}</code>.</li>
          <li>No container <code>writer</code>, monte <code>shared-vol</code> em <code>/shared</code>.</li>
          <li>No container <code>reader</code>, monte o mesmo <code>shared-vol</code> também em <code>/shared</code>.</li>
        </ol>
        <p><b>No cluster:</b> o <code>writer</code> grava <code>/shared/data.txt</code> e o <code>reader</code> enxerga o mesmo
        arquivo, porque <code>/shared</code> é a mesma pasta nos dois. Se o Pod for apagado, o arquivo vai junto.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: shared-pod
        spec:
          volumes:
            # TODO: - name: shared-vol com emptyDir: {}
          containers:
            - name: writer
              image: busybox:1.36
              command: ['sh', '-c', 'echo dados > /shared/data.txt && sleep 3600']
              volumeMounts:
                - name:        # TODO: shared-vol
                  mountPath:   # TODO: /shared
            - name: reader
              image: busybox:1.36
              command: ['sh', '-c', 'cat /shared/data.txt && sleep 3600']
              # TODO: volumeMounts com o mesmo volume em /shared
      `,
      dica: [
        'Volume em duas partes: declarar em spec.volumes e montar em volumeMounts de cada container.',
        'O name do volumeMount precisa ser igual ao name do volume: shared-vol.',
        'volumes:\n  - name: shared-vol\n    emptyDir: {}\n(e nos dois containers) volumeMounts:\n  - name: shared-vol\n    mountPath: /shared',
      ],
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
        teste({ descricao: 'O Pod shared-pod existe', dica: 'Declare o volume em spec.volumes e preencha os TODO do writer.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'shared-pod' }),
        teste({ descricao: 'O volume shared-vol está montado no container writer', dica: 'No writer, volumeMounts com name: shared-vol e mountPath: /shared.' },
          { tipo: 'volume-montado', pod: 'shared-pod', container: 'writer', volume: 'shared-vol' }),
        teste({ descricao: 'O volume shared-vol está montado no container reader', dica: 'No reader, crie volumeMounts igual ao do writer (alinhado com command).' },
          { tipo: 'volume-montado', pod: 'shared-pod', container: 'reader', volume: 'shared-vol' }),
      ],
    }),

    licao('pods-multi-container-licao', 'Vários containers no mesmo Pod: sidecar e init', 'medio', `
      <p>Quase sempre um Pod tem um container só. Mas às vezes dois programas precisam viver <b>grudados</b>: dividir os
      mesmos arquivos e o mesmo endereço de rede. Aí eles vão no mesmo Pod. Há dois padrões:</p>
      <dl>
        <dt><b>Sidecar</b> (o carrinho lateral da moto)</dt>
        <dd>Um container auxiliar que roda <b>ao lado</b> do principal o tempo todo: lê os logs dele e envia para fora, faz
          proxy, renova certificados. Os dois ficam em <code>spec.containers</code> e trocam arquivos por um volume.</dd>
        <dt><b>Init container</b> (quem arruma a mesa antes do jantar)</dt>
        <dd>Roda <b>antes</b> dos containers principais, faz uma preparação e <b>termina</b>. Fica em
          <code>spec.initContainers</code>, com o mesmo formato de um container. Os principais só ligam quando todos os init
          containers terminarem com sucesso.</dd>
      </dl>
      <p><b>No cluster:</b> todos os containers de um Pod rodam no mesmo nó, com o mesmo IP (um fala com o outro por
      <code>localhost</code>). Se um init container falhar, o Pod fica em <code>Init:Error</code> e os principais nem começam.</p>`,
    `
      apiVersion: v1
      kind: Pod
      metadata:
        name: jantar
      spec:
        volumes:
          - name: mesa
            emptyDir: {}
        initContainers:          # roda ANTES e termina
          - name: arrumar
            image: busybox:1.36
            command: ['sh', '-c', 'echo "mesa posta" > /mesa/aviso.txt']
            volumeMounts:
              - name: mesa
                mountPath: /mesa
        containers:              # rodam DEPOIS, juntos, o tempo todo
          - name: anfitriao      # o principal
            image: nginx:1.25
            volumeMounts:
              - name: mesa
                mountPath: /mesa
          - name: garcom         # o sidecar
            image: busybox:1.36
            command: ['sh', '-c', 'cat /mesa/aviso.txt && sleep 3600']
            volumeMounts:
              - name: mesa
                mountPath: /mesa
    `),

    exercicio({
      id: 'pods-sidecar',
      titulo: 'Multi-container Pod (Sidecar)',
      dificuldade: 'dificil',
      resumo: `
        <p>Um nginx grava os acessos em <code>/var/log/nginx/access.log</code>. Você vai pôr um sidecar que lê esse arquivo
        em tempo real, como faria um coletor de logs.</p>
        <ol>
          <li>Em <code>spec.volumes</code>, declare <code>log-volume</code> do tipo <code>emptyDir: {}</code>.</li>
          <li>O container <code>app</code> (imagem <code>nginx:1.25</code>, porta 80) monta <code>log-volume</code> em <code>/var/log/nginx</code>.</li>
          <li>Crie o segundo container, <code>logger</code>, com a imagem <code>busybox:1.36</code> e o comando
            <code>['sh', '-c', 'tail -f /var/log/nginx/access.log']</code>.</li>
          <li>O <code>logger</code> monta o mesmo <code>log-volume</code> no mesmo caminho.</li>
        </ol>
        <p><b>No cluster:</b> os dois containers ligam juntos, no mesmo nó. Cada acesso ao nginx aparece no
        <code>logger</code>, porque os dois leem a mesma pasta.</p>`,
      inicial: `
        apiVersion: v1
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
            # TODO: o segundo item da lista: - name: logger, image: busybox:1.36,
            #       command: ['sh', '-c', 'tail -f /var/log/nginx/access.log'] e o mesmo volumeMounts
      `,
      dica: [
        'O sidecar é só mais um item na lista containers: comece com "- name: logger" alinhado com "- name: app".',
        'Copie o volumeMounts do app para o logger: mesmo name, mesmo mountPath.',
      ],
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
        teste({ descricao: 'O Pod app-com-log existe', dica: 'Mantenha metadata.name: app-com-log.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'app-com-log' }),
        teste({ descricao: 'O container app usa a imagem nginx:1.25', dica: 'Não mude o container app.' },
          { tipo: 'container-imagem', pod: 'app-com-log', container: 'app', imagem: 'nginx:1.25' }),
        teste({ descricao: 'O sidecar logger usa busybox:1.36 e lê o mesmo volume', dica: 'Acrescente o item - name: logger em containers, com image: busybox:1.36 e volumeMounts de log-volume em /var/log/nginx.' },
          { tipo: 'container-imagem', pod: 'app-com-log', container: 'logger', imagem: 'busybox:1.36' },
          { tipo: 'volume-montado', pod: 'app-com-log', container: 'logger', volume: 'log-volume' }),
      ],
    }),

    exercicio({
      id: 'basico-init-container',
      titulo: 'Pod com Init Container',
      dificuldade: 'dificil',
      resumo: `
        <p>Antes de o servidor ligar, uma preparação precisa gravar um arquivo de status. Isso é trabalho para um init container.</p>
        <ol>
          <li>Declare o volume <code>work-dir</code> do tipo <code>emptyDir: {}</code>.</li>
          <li>Em <code>spec.initContainers</code>, crie <code>init-setup</code> (imagem <code>busybox:1.36</code>) com o comando
            <code>['sh', '-c', 'echo "inicializando" &gt; /work/status.txt']</code>, montando <code>work-dir</code> em <code>/work</code>.</li>
          <li>Em <code>spec.containers</code>, o container <code>app</code> (imagem <code>nginx:1.25</code>, porta 80) também monta
            <code>work-dir</code> em <code>/work</code>.</li>
        </ol>
        <p><b>No cluster:</b> o <code>init-setup</code> roda, grava o arquivo e termina. Só então o <code>app</code> liga, e
        já encontra <code>/work/status.txt</code> pronto.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: init-pod
        spec:
          volumes:
            # TODO: - name: work-dir com emptyDir: {}
          initContainers:
            - name: init-setup
              image: busybox:1.36
              command: ['sh', '-c', 'echo "inicializando" > /work/status.txt']
              # TODO: volumeMounts com work-dir em /work
          containers:
            - name: app
              image:           # TODO: nginx:1.25
              ports:
                - containerPort: 80
              # TODO: volumeMounts com work-dir em /work
      `,
      dica: [
        'Releia o exemplo da lição "Vários containers no mesmo Pod": o init container "arrumar" faz o mesmo papel.',
        'initContainers e containers ficam no mesmo nível, dentro de spec. Os dois montam o mesmo volume.',
        'volumes:\n  - name: work-dir\n    emptyDir: {}\n(nos dois) volumeMounts:\n  - name: work-dir\n    mountPath: /work',
      ],
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
        teste({ descricao: 'O Pod init-pod existe', dica: 'Declare o volume work-dir e preencha a imagem do app.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'init-pod' }),
        teste({ descricao: 'O container app usa a imagem nginx:1.25', dica: 'No container app, escreva image: nginx:1.25.' },
          { tipo: 'container-imagem', pod: 'init-pod', container: 'app', imagem: 'nginx:1.25' }),
        teste({ descricao: 'O volume work-dir está montado no container app', dica: 'No app, volumeMounts com name: work-dir e mountPath: /work.' },
          { tipo: 'volume-montado', pod: 'init-pod', container: 'app', volume: 'work-dir' }),
        teste({ descricao: 'O init container init-setup prepara o volume', dica: 'No init-setup, acrescente volumeMounts com work-dir em /work.' },
          campo('Pod', 'init-pod', 'spec.initContainers[name=init-setup].volumeMounts[name=work-dir].mountPath', { valor: '/work' })),
      ],
    }),

    exercicio({
      id: 'pods-hostpath-volume',
      titulo: 'Volume hostPath para Logs',
      dificuldade: 'medio',
      resumo: `
        <p>Às vezes um container precisa ler arquivos do próprio <b>nó</b>, como os logs do sistema. O volume
        <code>hostPath</code> monta uma pasta da máquina dentro do container.</p>
        <ol>
          <li>Declare o volume <code>node-logs</code> do tipo <code>hostPath</code>, com <code>path: /var/log</code>.</li>
          <li>No container <code>nginx</code> (imagem <code>nginx:1.25</code>), monte <code>node-logs</code> em <code>/logs</code>.</li>
        </ol>
        <p><b>No cluster:</b> o container enxerga em <code>/logs</code> o que está em <code>/var/log</code> do nó onde ele caiu.
        Cuidado: se o Pod for para outro nó, vê outros arquivos. E dá acesso a dados da máquina, por isso é evitado em produção.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: log-pod
        spec:
          volumes:
            - name: node-logs
              # TODO: hostPath: e, dentro dele, path: /var/log
          containers:
            - name: nginx
              image: nginx:1.25
              ports:
                - containerPort: 80
              volumeMounts:
                - name:        # TODO: node-logs
                  mountPath:   # TODO: /logs
      `,
      dica: [
        'hostPath é o tipo do volume (no lugar de emptyDir) e tem uma opção: path.',
        'hostPath:\n  path: /var/log',
      ],
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
        teste({ descricao: 'O Pod log-pod existe', dica: 'Preencha os TODO: um campo vazio impede o apply.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'log-pod' }),
        teste({ descricao: 'O container usa a imagem nginx:1.25', dica: 'Não mude a imagem do container nginx.' },
          { tipo: 'container-imagem', pod: 'log-pod', container: 'nginx', imagem: 'nginx:1.25' }),
        teste({ descricao: 'O volume node-logs (pasta /var/log do nó) está montado no container nginx', dica: 'Volume node-logs com hostPath.path: /var/log, e volumeMounts com name: node-logs e mountPath: /logs.' },
          { tipo: 'volume-montado', pod: 'log-pod', container: 'nginx', volume: 'node-logs' },
          campo('Pod', 'log-pod', 'spec.volumes[name=node-logs].hostPath.path', { valor: '/var/log' })),
      ],
    }),

    exercicio({
      id: 'pods-projected-volume',
      titulo: 'Volume Projetado',
      dificuldade: 'dificil',
      resumo: `
        <p>Um volume <code>projected</code> junta várias fontes numa pasta só. Aqui você vai usar uma fonte, um ConfigMap, para
        a aplicação ler a configuração como <b>arquivo</b> (e não como variável).</p>
        <ol>
          <li>No ConfigMap <code>proj-config</code>, crie a chave <code>app.properties</code> com o valor <code>mode=prod</code>.</li>
          <li>No Pod <code>proj-pod</code>, declare o volume <code>all-sources</code> do tipo <code>projected</code>.</li>
          <li>Em <code>projected.sources</code>, acrescente o item <code>configMap</code> com <code>name: proj-config</code>.</li>
          <li>No container <code>app</code> (imagem <code>busybox:1.36</code>), monte <code>all-sources</code> em <code>/etc/projected</code>.</li>
        </ol>
        <p><b>No cluster:</b> dentro do container aparece o arquivo <code>/etc/projected/app.properties</code> com o texto
        <code>mode=prod</code>. Para juntar um Secret na mesma pasta, bastaria mais um item em <code>sources</code>.</p>`,
      inicial: `
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: proj-config
        data:
          # TODO: app.properties: mode=prod
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
                  # TODO: - configMap: com name: proj-config
          containers:
            - name: app
              image: busybox:1.36
              command: ['sh', '-c', 'sleep 3600']
              volumeMounts:
                - name: all-sources
                  mountPath:   # TODO: /etc/projected
      `,
      dica: [
        'sources é uma lista: cada fonte é um item que começa com "- ".',
        '- configMap:\n    name: proj-config',
      ],
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
        teste({ descricao: 'O ConfigMap proj-config existe com app.properties', dica: 'Em data do ConfigMap, escreva app.properties: mode=prod.' },
          { tipo: 'configmap-contem', configmap: 'proj-config', chave: 'app.properties' }),
        teste({ descricao: 'O Pod proj-pod existe', dica: 'Preencha os TODO do Pod: sources e mountPath.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'proj-pod' }),
        teste({ descricao: 'O volume all-sources está montado no container app', dica: 'No container app, monte all-sources em /etc/projected.' },
          { tipo: 'volume-montado', pod: 'proj-pod', container: 'app', volume: 'all-sources' }),
      ],
    }),

    licao('pods-downward-licao', 'Downward API: o Pod sabe quem ele é', 'facil', `
      <p>Às vezes a aplicação precisa saber o próprio nome, o namespace ou o nó em que está (para colocar nos logs, por
      exemplo). Mas esses dados só existem depois que o Pod é criado. A <b>Downward API</b> entrega essas informações
      ao container, de "cima para baixo" (downward).</p>
      <ul>
        <li>Numa variável de ambiente, use <code>valueFrom.fieldRef.fieldPath</code> com o caminho do campo, como
          <code>metadata.name</code>, <code>metadata.namespace</code> ou <code>spec.nodeName</code>.</li>
        <li>É como o crachá que o RH entrega no primeiro dia: você não escolhe o número, mas pode lê-lo.</li>
      </ul>
      <p>Compare com a lição de ConfigMaps: lá era <code>valueFrom.configMapKeyRef</code> (ler de um ConfigMap); aqui é
      <code>valueFrom.fieldRef</code> (ler do próprio Pod).</p>`,
    `
      apiVersion: v1
      kind: Pod
      metadata:
        name: cracha
      spec:
        containers:
          - name: app
            image: busybox:1.36
            command: ['sh', '-c', 'echo "Eu sou $MEU_NAMESPACE" && sleep 3600']
            env:
              - name: MEU_NAMESPACE
                valueFrom:
                  fieldRef:                       # ler um campo do próprio Pod
                    fieldPath: metadata.namespace # qual campo
    `),

    exercicio({
      id: 'pods-downward-api',
      titulo: 'Downward API como Variáveis',
      dificuldade: 'medio',
      resumo: `
        <p>Você vai entregar ao container o nome do próprio Pod, numa variável de ambiente.</p>
        <ol>
          <li>O Pod se chama <code>downward-pod</code>, com o container <code>app</code> e a imagem <code>busybox:1.36</code>.</li>
          <li>Em <code>env</code>, crie a variável <code>MY_POD_NAME</code>.</li>
          <li>Em vez de <code>value</code>, use <code>valueFrom.fieldRef.fieldPath: metadata.name</code>.</li>
        </ol>
        <p><b>No cluster:</b> o kubelet preenche <code>MY_POD_NAME=downward-pod</code> quando o container liga. Se o Pod fosse
        criado por um Deployment, cada cópia receberia o próprio nome (que é gerado na hora).</p>`,
      inicial: `
        apiVersion: v1
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
                  # TODO: valueFrom: > fieldRef: > fieldPath: metadata.name
      `,
      dica: [
        'O formato é o do exemplo da lição "Downward API", trocando o campo lido.',
        'valueFrom:\n  fieldRef:\n    fieldPath: metadata.name',
      ],
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
        teste({ descricao: 'O Pod downward-pod existe', dica: 'Mantenha metadata.name: downward-pod.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'downward-pod' }),
        teste({ descricao: 'O container usa a imagem busybox:1.36', dica: 'Não mude a imagem do container app.' },
          { tipo: 'container-imagem', pod: 'downward-pod', container: 'app', imagem: 'busybox:1.36' }),
        teste({ descricao: 'MY_POD_NAME vem de metadata.name', dica: 'Embaixo de - name: MY_POD_NAME, use valueFrom.fieldRef.fieldPath: metadata.name.' },
          campo('Pod', 'downward-pod', 'spec.containers[0].env[name=MY_POD_NAME].valueFrom.fieldRef.fieldPath', { valor: 'metadata.name' })),
      ],
    }),

    licao('pods-quota-licao', 'ResourceQuota: o orçamento do namespace', 'medio', `
      <p>Você já viu <b>requests e limits</b> (o quanto <i>um</i> container reserva e pode usar). A <b>ResourceQuota</b> é um
      teto para o <b>namespace inteiro</b>, como o orçamento mensal de um departamento: cada pessoa gasta, mas a soma não
      passa do valor combinado.</p>
      <ul>
        <li>A quota pode limitar a soma de <code>requests.cpu</code>, <code>requests.memory</code>, <code>limits.cpu</code>,
          <code>limits.memory</code> e até o número de Pods.</li>
        <li>Num namespace com quota de CPU e memória, <b>todo Pod precisa declarar requests e limits</b>. Sem eles, o API
          Server recusa o Pod.</li>
        <li>Se um Pod novo fizer a soma passar do teto, ele também é recusado (<code>exceeded quota</code>).</li>
      </ul>
      <p><b>No cluster:</b> é assim que times dividem o mesmo cluster sem que um consuma tudo.</p>`,
    `
      apiVersion: v1
      kind: ResourceQuota
      metadata:
        name: orcamento
        namespace: time-a        # vale para tudo dentro de time-a
      spec:
        hard:                    # os tetos
          requests.cpu: "1"      # soma das reservas: 1 núcleo
          requests.memory: 1Gi
          limits.cpu: "2"
          limits.memory: 2Gi
          pods: "10"             # no máximo 10 Pods
    `),

    exercicio({
      id: 'pods-resource-quota',
      titulo: 'Pod com Resource Quota Awareness',
      dificuldade: 'medio',
      resumo: `
        <p>Você vai preparar um Pod para morar num namespace com quota: ele precisa declarar quanto reserva e quanto pode usar.
        Este exercício junta duas coisas que você já praticou: namespace e requests/limits.</p>
        <ol>
          <li>Crie o Namespace <code>quota-ns</code>.</li>
          <li>Crie o Pod <code>quota-pod</code> <b>dentro</b> de <code>quota-ns</code> (<code>metadata.namespace</code>), com o
            container <code>nginx</code> e a imagem <code>nginx:1.25</code>.</li>
          <li>Em <code>resources.requests</code>: <code>cpu: "100m"</code> e <code>memory: "128Mi"</code>.</li>
          <li>Em <code>resources.limits</code>: <code>cpu: "200m"</code> e <code>memory: "256Mi"</code>.</li>
        </ol>
        <p><b>No cluster:</b> se o namespace tivesse uma quota de CPU, um Pod sem esses números seria recusado na hora.</p>`,
      inicial: `
        apiVersion: v1
        kind: Namespace
        metadata:
          name:                # TODO: quota-ns
        ---
        apiVersion: v1
        kind: Pod
        metadata:
          name: quota-pod
          # TODO: namespace: quota-ns
        spec:
          containers:
            - name: nginx
              image: nginx:1.25
              ports:
                - containerPort: 80
              # TODO: resources com requests (cpu "100m", memory "128Mi") e limits (cpu "200m", memory "256Mi")
      `,
      dica: [
        'Reveja os exercícios "Criando um Namespace" e "Resource Requests e Limits": este junta os dois.',
        'resources fica dentro do container, alinhado com image. requests e limits ficam dentro de resources.',
        'resources:\n  requests: { cpu: "100m", memory: "128Mi" }\n  limits: { cpu: "200m", memory: "256Mi" }',
      ],
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
        teste({ descricao: 'O Namespace quota-ns existe', dica: 'No documento kind: Namespace, escreva metadata.name: quota-ns.' },
          { tipo: 'recurso-existe', kind: 'Namespace', nome: 'quota-ns' }),
        teste({ descricao: 'O Pod quota-pod existe no namespace quota-ns', dica: 'No metadata do Pod, acrescente namespace: quota-ns.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'quota-pod' },
          campo('Pod', 'quota-pod', 'metadata.namespace', { valor: 'quota-ns' })),
        teste({ descricao: 'O container tem requests e limits definidos', dica: 'No container nginx, crie resources com requests e limits.' },
          { tipo: 'resource-limits', pod: 'quota-pod', container: 'nginx' }),
      ],
    }),

    licao('pods-afinidade-licao', 'Afinidade: escolhendo onde o Pod roda', 'dificil', `
      <p>Normalmente o Scheduler escolhe o nó sozinho. Mas você pode dar <b>preferências</b> ou <b>exigências</b>, como ao
      escolher a mesa no restaurante: "de preferência perto da janela" ou "precisa ser acessível".</p>
      <ul>
        <li><code>nodeAffinity</code>: prefere ou exige nós com certas labels (por exemplo, nós com SSD).</li>
        <li><code>podAffinity</code>: quer ficar <b>perto</b> de Pods com certas labels (o frontend perto do backend, para responder mais rápido).</li>
        <li><code>podAntiAffinity</code>: quer ficar <b>longe</b> (duas cópias do banco em máquinas diferentes, para uma queda não levar as duas).</li>
      </ul>
      <p>Os nomes são longos, mas dizem tudo:</p>
      <ul>
        <li><code>requiredDuringSchedulingIgnoredDuringExecution</code>: <b>obrigatório</b> na hora de agendar.</li>
        <li><code>preferredDuringSchedulingIgnoredDuringExecution</code>: <b>preferência</b>, com um peso (<code>weight</code>, de 1 a 100).</li>
        <li><code>topologyKey</code>: o que conta como "perto": o mesmo nó (<code>kubernetes.io/hostname</code>) ou a mesma zona
          (<code>topology.kubernetes.io/zone</code>).</li>
      </ul>`,
    `
      apiVersion: v1
      kind: Pod
      metadata:
        name: perto-do-cache
      spec:
        affinity:
          podAffinity:                                    # quero ficar PERTO de...
            preferredDuringSchedulingIgnoredDuringExecution:  # ...de preferência
              - weight: 50                                # força da preferência (1 a 100)
                podAffinityTerm:
                  labelSelector:
                    matchLabels:
                      app: cache                          # ...dos Pods com app: cache
                  topologyKey: kubernetes.io/hostname     # "perto" = no mesmo nó
        containers:
          - name: web
            image: nginx:1.25
    `),

    exercicio({
      id: 'pods-affinity',
      titulo: 'Pod Affinity e Anti-Affinity',
      dificuldade: 'dificil',
      resumo: `
        <p>O frontend responde mais rápido se estiver na mesma zona do backend. Você vai pedir isso ao Scheduler, como
        <b>preferência</b> (se não der, ele agenda mesmo assim).</p>
        <ol>
          <li>O Pod <code>affinity-pod</code> tem a label <code>app: frontend</code> e o container <code>nginx</code> com a imagem <code>nginx:1.25</code>.</li>
          <li>Em <code>spec.affinity.podAffinity</code>, use <code>preferredDuringSchedulingIgnoredDuringExecution</code> com <code>weight: 100</code>.</li>
          <li>No <code>podAffinityTerm</code>, selecione os Pods com <code>app: backend</code> (<code>labelSelector.matchLabels</code>).</li>
          <li>Use <code>topologyKey: topology.kubernetes.io/zone</code> (perto = mesma zona).</li>
        </ol>
        <p><b>No cluster:</b> o Scheduler dá pontos extras às zonas que já têm um Pod com <code>app: backend</code> e escolhe
        um nó numa delas, se houver espaço.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: affinity-pod
          labels:
            app: frontend
        spec:
          affinity:
            podAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
                - weight:          # TODO: 100
                  podAffinityTerm:
                    labelSelector:
                      matchLabels:
                        # TODO: app: backend
                    topologyKey:   # TODO: topology.kubernetes.io/zone
          containers:
            - name: nginx
              image: nginx:1.25
              ports:
                - containerPort: 80
      `,
      dica: [
        'Compare com o exemplo da lição "Afinidade": a estrutura é a mesma, mudam os valores.',
        'matchLabels recebe as labels dos Pods vizinhos desejados: app: backend.',
      ],
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
        teste({ descricao: 'O Pod affinity-pod existe', dica: 'Preencha os TODO: weight, matchLabels e topologyKey.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'affinity-pod' }),
        teste({ descricao: 'O container usa a imagem nginx:1.25', dica: 'Não mude o container nginx.' },
          { tipo: 'container-imagem', pod: 'affinity-pod', container: 'nginx', imagem: 'nginx:1.25' }),
        teste({ descricao: 'O Pod prefere ficar na zona dos Pods app=backend', dica: 'Em podAffinityTerm: labelSelector.matchLabels com app: backend e topologyKey: topology.kubernetes.io/zone.' },
          campo('Pod', 'affinity-pod', 'spec.affinity.podAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].podAffinityTerm.topologyKey', { valor: 'topology.kubernetes.io/zone' }),
          campo('Pod', 'affinity-pod', 'spec.affinity.podAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].podAffinityTerm.labelSelector.matchLabels.app', { valor: 'backend' })),
      ],
    }),

    licao('pods-seguranca-licao', 'securityContext: menos poder, menos risco', 'medio', `
      <p>Por padrão, muitos containers rodam como <b>root</b> (o administrador da máquina). Se alguém invadir a aplicação,
      herda esse poder. O <b>securityContext</b> tira o que o container não precisa, como um crachá de visitante: entra no
      prédio, mas não abre todas as portas.</p>
      <p>Ele existe em <b>dois lugares</b>:</p>
      <dl>
        <dt>No Pod (<code>spec.securityContext</code>): vale para todos os containers</dt>
        <dd><code>runAsNonRoot: true</code> (recusa rodar como root), <code>runAsUser: 10001</code> (o número do usuário) e
          <code>seccompProfile.type: RuntimeDefault</code> (bloqueia chamadas perigosas ao sistema).</dd>
        <dt>No container (<code>spec.containers[].securityContext</code>): só para ele</dt>
        <dd><code>allowPrivilegeEscalation: false</code> (não pode ganhar mais poder depois), <code>readOnlyRootFilesystem: true</code>
          (o disco do container fica só leitura) e <code>capabilities.drop: ["ALL"]</code> (tira os poderes especiais do Linux).</dd>
      </dl>
      <p><b>Cuidado na prática:</b> com o disco só leitura, o programa precisa de algum lugar para escrever arquivos
      temporários. A solução é montar um <code>emptyDir</code> em <code>/tmp</code>. E a imagem precisa funcionar sem root:
      por isso existe a <code>nginxinc/nginx-unprivileged</code>, que escuta na porta 8080 (portas abaixo de 1024 exigem root).</p>`),

    exercicio({
      id: 'pods-security-context',
      titulo: 'Pod endurecido com securityContext',
      dificuldade: 'medio',
      resumo: `
        <p>Você vai "endurecer" um servidor web: sem root, sem privilégios extras e com o disco só leitura.</p>
        <ol>
          <li>No <code>securityContext</code> do <b>Pod</b>: <code>runAsNonRoot: true</code>, <code>runAsUser: 10001</code> e
            <code>seccompProfile.type: RuntimeDefault</code>.</li>
          <li>No <code>securityContext</code> do <b>container</b> <code>web</code>: <code>allowPrivilegeEscalation: false</code>,
            <code>readOnlyRootFilesystem: true</code> e <code>capabilities.drop: ["ALL"]</code>.</li>
          <li>Monte o volume <code>emptyDir</code> chamado <code>tmp</code> em <code>/tmp</code> (já declarado no esqueleto).</li>
        </ol>
        <p><b>No cluster:</b> se a imagem tentar rodar como root, o kubelet recusa ligar o container. Com o disco só leitura,
        um invasor não consegue instalar nada; só <code>/tmp</code> aceita escrita.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: app-seguro
        spec:
          securityContext:     # vale para o Pod inteiro
            # TODO: runAsNonRoot: true, runAsUser: 10001 e seccompProfile com type: RuntimeDefault
          containers:
            - name: web
              image: nginxinc/nginx-unprivileged:1.27
              ports:
                - containerPort: 8080
              securityContext: # só deste container
                # TODO: allowPrivilegeEscalation: false, readOnlyRootFilesystem: true e capabilities.drop: ["ALL"]
              volumeMounts:
                # TODO: o volume tmp em /tmp
          volumes:
            - name: tmp
              emptyDir: {}
      `,
      dica: [
        'Há dois securityContext: o do Pod (spec.securityContext) e o de cada container (spec.containers[].securityContext).',
        'seccompProfile e capabilities são objetos: seccompProfile:\n  type: RuntimeDefault   e   capabilities:\n  drop: ["ALL"]',
      ],
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: app-seguro
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: web
      image: nginxinc/nginx-unprivileged:1.27
      ports:
        - containerPort: 8080
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
      volumeMounts:
        - name: tmp
          mountPath: /tmp
  volumes:
    - name: tmp
      emptyDir: {}`,
      testes: [
        teste({ descricao: 'O Pod não roda como root', dica: 'Em spec.securityContext: runAsNonRoot: true e seccompProfile.type: RuntimeDefault.' },
          existe('Pod', 'app-seguro'), campo('Pod', 'app-seguro', 'spec.securityContext.runAsNonRoot', { valor: true }), campo('Pod', 'app-seguro', 'spec.securityContext.seccompProfile.type', { valor: 'RuntimeDefault' })),
        teste({ descricao: 'O container não ganha privilégios nem escreve no sistema de arquivos', dica: 'No securityContext do container web: allowPrivilegeEscalation: false, readOnlyRootFilesystem: true e capabilities.drop: ["ALL"].' },
          campo('Pod', 'app-seguro', 'spec.containers[name=web].securityContext.allowPrivilegeEscalation', { valor: false }),
          campo('Pod', 'app-seguro', 'spec.containers[name=web].securityContext.readOnlyRootFilesystem', { valor: true }),
          campo('Pod', 'app-seguro', 'spec.containers[name=web].securityContext.capabilities.drop', { contem: 'ALL' })),
        teste({ descricao: '/tmp continua gravável', dica: 'Em volumeMounts do container web: name: tmp e mountPath: /tmp.' },
          { tipo: 'volume-montado', pod: 'app-seguro', container: 'web', volume: 'tmp', mountPath: '/tmp' }),
      ],
    }),

    licao('pods-desligamento-licao', 'Desligar sem derrubar ninguém', 'medio', `
      <p>Quando um Pod é apagado (numa atualização, por exemplo), acontecem duas coisas <b>ao mesmo tempo</b>: o container
      recebe o aviso para encerrar (o sinal <code>SIGTERM</code>) e o Service começa a tirá-lo da lista de destinos. Essa
      segunda parte leva alguns segundos. Se o programa fechar na hora, os clientes que ainda chegam recebem erro.</p>
      <p>É como fechar uma loja: primeiro você vira a placa para "fechado" e espera os clientes de dentro saírem, só depois
      apaga a luz.</p>
      <ul>
        <li><code>lifecycle.preStop</code> (no container): um comando que roda <b>antes</b> do aviso de encerrar. Um
          <code>sleep</code> curto dá tempo de o Service parar de mandar tráfego.</li>
        <li><code>terminationGracePeriodSeconds</code> (no Pod): o tempo total que o Kubernetes espera (padrão: 30). Passou
          disso, o container é encerrado à força. Ele precisa ser maior que o preStop.</li>
      </ul>`,
    `
      apiVersion: v1
      kind: Pod
      metadata:
        name: loja
      spec:
        terminationGracePeriodSeconds: 30    # prazo total para fechar a loja
        containers:
          - name: web
            image: nginx:1.27
            lifecycle:
              preStop:                       # antes de fechar...
                exec:
                  command: ["sh", "-c", "sleep 5"]   # ...espera 5 s com a placa virada
    `),

    exercicio({
      id: 'pods-desligamento-gracioso',
      titulo: 'Desligamento gracioso com preStop',
      dificuldade: 'medio',
      resumo: `
        <p>Você vai dar a um servidor web tempo para terminar os atendimentos antes de desligar.</p>
        <ol>
          <li>No <code>spec</code> do Pod <code>app-gracioso</code>, defina <code>terminationGracePeriodSeconds: 45</code>.</li>
          <li>No container <code>web</code> (imagem <code>nginx:1.27</code>), crie <code>lifecycle.preStop.exec.command</code> com
            <code>["sh", "-c", "sleep 10"]</code>.</li>
        </ol>
        <p><b>No cluster:</b> ao apagar o Pod, o kubelet roda o <code>sleep 10</code> enquanto o Service o retira da lista;
        depois envia o aviso de encerrar. Se em 45 segundos o nginx não tiver fechado, ele é encerrado à força.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: app-gracioso
        spec:
          # TODO: terminationGracePeriodSeconds: 45
          containers:
            - name: web
              image: nginx:1.27
              ports:
                - containerPort: 80
              # TODO: lifecycle: > preStop: > exec: > command: ["sh", "-c", "sleep 10"]
      `,
      dica: [
        'terminationGracePeriodSeconds é do Pod (dentro de spec); lifecycle é do container (alinhado com image).',
        'lifecycle:\n  preStop:\n    exec:\n      command: ["sh", "-c", "sleep 10"]',
      ],
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: app-gracioso
spec:
  terminationGracePeriodSeconds: 45
  containers:
    - name: web
      image: nginx:1.27
      ports:
        - containerPort: 80
      lifecycle:
        preStop:
          exec:
            command: ["sh", "-c", "sleep 10"]`,
      testes: [
        teste({ descricao: 'O Pod tem 45 segundos para encerrar', dica: 'Em spec (alinhado com containers): terminationGracePeriodSeconds: 45.' },
          existe('Pod', 'app-gracioso'), campo('Pod', 'app-gracioso', 'spec.terminationGracePeriodSeconds', { valor: 45 })),
        teste({ descricao: 'O preStop espera 10 segundos', dica: 'No container web: lifecycle.preStop.exec.command: ["sh", "-c", "sleep 10"].' },
          campo('Pod', 'app-gracioso', 'spec.containers[name=web].lifecycle.preStop.exec.command', { contem: 'sleep 10' })),
      ],
    }),

    licao('pods-debug-licao', 'Investigando um Pod com problema', 'medio', `
      <p>Quando um Pod não fica <code>Running</code>, siga sempre a mesma ordem, como um médico que primeiro olha, depois
      pergunta e só então examina:</p>
      <ol>
        <li><code>kubectl get pods</code>: qual é o <code>STATUS</code>? (<code>Pending</code>, <code>CrashLoopBackOff</code>,
          <code>ImagePullBackOff</code>...)</li>
        <li><code>kubectl describe pod NOME</code>: a seção <b>Events</b>, no fim, quase sempre diz o motivo (imagem não
          encontrada, falta de memória no nó, probe falhando).</li>
        <li><code>kubectl logs NOME</code>: o que o programa escreveu antes de cair.</li>
        <li><code>kubectl exec -it NOME -- sh</code>: entrar no container e olhar por dentro.</li>
      </ol>
      <p>E se a imagem não tiver nem <code>sh</code> (as imagens "distroless" são assim, por segurança)? Aí entra o
      <b>container efêmero</b>: <code>kubectl debug -it NOME --image=busybox:1.36 --target=CONTAINER</code> acrescenta, <b>com o Pod
      rodando</b>, um container temporário com ferramentas, que enxerga os processos do container alvo. Ele não faz parte
      do YAML: é criado pelo comando e some quando o Pod é recriado.</p>
      <p>Neste playground, o terminal aceita <code>kubectl get</code>, <code>kubectl describe</code> e <code>kubectl explain</code>.
      Os comandos <code>logs</code>, <code>exec</code> e <code>debug</code> você vai usar num cluster de verdade.</p>`),

    exercicio({
      id: 'pods-ephemeral-container',
      titulo: 'Ephemeral Container para Debug',
      dificuldade: 'dificil',
      resumo: `
        <p>Para depurar com um container efêmero, primeiro é preciso um Pod alvo rodando. Você vai criá-lo e investigá-lo com
        os comandos de diagnóstico.</p>
        <ol>
          <li>Crie o Pod <code>debug-target</code> com o container <code>nginx</code>, a imagem <code>nginx:1.25</code> e a porta 80.</li>
          <li>Aplique e rode <code>kubectl describe pod debug-target</code> no terminal: veja o nó, o IP e os eventos.</li>
          <li>Num cluster de verdade, o próximo passo seria
            <code>kubectl debug -it debug-target --image=busybox:1.36 --target=nginx</code>.</li>
        </ol>
        <p><b>No cluster:</b> o container efêmero entra no Pod já rodando, sem reiniciá-lo, e compartilha os processos do
        <code>nginx</code>. Por isso o YAML do Pod não muda.</p>`,
      inicial: `
        # O Pod alvo da depuração. O container efêmero não entra aqui: ele é criado pelo kubectl debug.
        apiVersion: v1
        kind: Pod
        metadata:
          name:                # TODO: debug-target
        spec:
          containers:
            - name:            # TODO: nginx
              image:           # TODO: nginx:1.25
              ports:
                - containerPort:   # TODO: 80
      `,
      dica: [
        'É um Pod simples, como o do primeiro exercício, com outro nome.',
        'O --target do kubectl debug é o nome do container: por isso ele precisa se chamar nginx.',
      ],
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
        teste({ descricao: 'O Pod debug-target existe', dica: 'Escreva metadata.name: debug-target.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'debug-target' }),
        teste({ descricao: 'O container nginx usa a imagem nginx:1.25', dica: 'O container se chama nginx e usa image: nginx:1.25.' },
          { tipo: 'container-imagem', pod: 'debug-target', container: 'nginx', imagem: 'nginx:1.25' }),
        teste({ descricao: 'A porta 80 está exposta', dica: 'Em ports: - containerPort: 80.' },
          { tipo: 'container-porta', pod: 'debug-target', container: 'nginx', porta: 80 }),
      ],
    }),
  ],
};
