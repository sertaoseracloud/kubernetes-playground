// Módulo 1, tópico 1: Fundamentos Básicos. É por aqui que o iniciante entra na trilha.
// Segue o padrão de docs/didatica.md: lição antes de cada conceito novo (com analogia e
// exemplo comentado), enunciado em passos, esqueleto com # TODO, dicas progressivas e
// "como corrigir" em cada caso de teste. Os ids dos exercícios não mudam (progresso e
// certificados dependem deles).
import { licao, exercicio, teste } from './util.js';

export const basico = {
  id: 'basico',
  titulo: 'Fundamentos do Kubernetes',
  descricao: 'O que é Kubernetes, arquitetura básica, o primeiro YAML e os primeiros comandos kubectl.',
  icone: '☸️',
  itens: [
    licao('k8s-o-que-e', 'O que é Kubernetes', 'facil', `
      <p>Antes do Kubernetes, duas palavras:</p>
      <ul>
        <li><b>Imagem</b>: um programa empacotado com tudo de que precisa (como <code>nginx:1.25</code>, um servidor web na versão 1.25).
          É a <i>receita</i>.</li>
        <li><b>Container</b>: a imagem rodando. É o <i>prato feito</i> a partir da receita. Da mesma imagem saem quantos containers você quiser.</li>
      </ul>
      <p>Rodar um container no seu computador é fácil. Difícil é rodar <b>centenas</b>, em <b>várias máquinas</b>, e
      religar sozinho o que cair às 3h da manhã. É isso que o <b>Kubernetes</b> (ou <b>K8s</b>) faz: ele é um
      <b>orquestrador de containers</b>. Você diz <i>o que</i> quer ("3 cópias do nginx:1.25, acessíveis na porta 80")
      e ele decide <i>onde</i> rodar cada uma, vigia e corrige.</p>
      <p>Pense num maestro: você escreve a partitura (um arquivo <b>YAML</b>, chamado <b>manifesto</b>) e ele garante
      que cada músico toque na hora certa. Se um músico sai, ele chama outro.</p>
      <p>Os três recursos que você vai usar o tempo todo:</p>
      <ul>
        <li><b>Pod</b>: a menor unidade. Um ou mais containers que rodam juntos. É o que você cria primeiro.</li>
        <li><b>Service</b>: um endereço fixo para chegar nos Pods, mesmo quando eles são recriados.</li>
        <li><b>Deployment</b>: quem cria e mantém várias cópias de um Pod e troca a versão sem parar o serviço.</li>
      </ul>
      <p><b>Neste playground</b> tudo é simulado no navegador: nada é cobrado e nada quebra de verdade. Escreva o YAML no
      editor, clique em <b>▶ Apply</b> e veja o resultado no terminal e na aba <b>📦 Estado</b>.</p>`),

    licao('k8s-arquitetura', 'Arquitetura básica', 'facil', `
      <p>Um <b>cluster</b> é um grupo de máquinas que o Kubernetes administra como se fossem uma só. Ele tem duas partes,
      como um aeroporto:</p>
      <dl>
        <dt><b>Control plane</b> (a torre de controle)</dt>
        <dd>Decide tudo, mas não roda a sua aplicação. Tem quatro peças:
          <ul>
            <li><b>API Server</b>: o balcão de atendimento. Todo pedido (o seu <code>kubectl apply</code>) chega por ele.</li>
            <li><b>etcd</b>: o caderno onde fica anotado o que foi pedido.</li>
            <li><b>Scheduler</b>: escolhe em qual máquina cada Pod novo vai rodar.</li>
            <li><b>Controladores</b>: conferem sem parar se o que existe bate com o que foi pedido.</li>
          </ul>
        </dd>
        <dt><b>Nós</b> (as pistas e os aviões)</dt>
        <dd>As máquinas onde os Pods rodam. Em cada nó há o <b>kubelet</b> (liga e vigia os containers daquele nó),
          o <b>kube-proxy</b> (cuida da rede) e o <b>runtime de containers</b> (quem de fato executa a imagem).</dd>
      </dl>
      <p><b>O caminho de um pedido:</b> você roda <code>kubectl apply</code> → o API Server valida e grava no etcd → o
      Scheduler escolhe um nó → o kubelet desse nó baixa a imagem e liga o container → o Pod fica <code>Running</code>.</p>`),

    licao('k8s-state-management', 'Estado desejado e estado real', 'facil', `
      <p>O Kubernetes é <b>declarativo</b>: você não dá ordens passo a passo ("ligue um container, depois outro"), você
      descreve o resultado ("quero 3 cópias"). É como o termostato do ar-condicionado: você diz 23 °C e ele liga e
      desliga sozinho até chegar lá.</p>
      <dl>
        <dt><b>Estado desejado</b></dt><dd>O que está escrito no seu YAML: "quero 3 réplicas do nginx:1.25".</dd>
        <dt><b>Estado real</b></dt><dd>O que existe agora no cluster: pode haver só 2 Pods, porque um nó caiu.</dd>
        <dt><b>Reconciliação</b></dt><dd>O ciclo dos controladores: perceber a diferença e agir (criar o 3º Pod). Nunca para.</dd>
      </dl>
      <p>Se você já usou Terraform: é parecido com o <code>terraform plan</code> + <code>apply</code>, só que o Kubernetes
      faz a comparação sozinho, o tempo todo.</p>
      <p>A aba <b>📦 Estado</b> deste playground mostra o estado real do cluster simulado e o que mudou (adicionado,
      removido, alterado) a cada apply.</p>`),

    licao('basico-yaml-em-5-minutos', 'YAML em 5 minutos', 'facil', `
      <p>Todo manifesto é escrito em <b>YAML</b>, um formato de texto feito para gente ler. Só quatro regras:</p>
      <ol>
        <li><b>chave: valor</b>, com um espaço depois dos dois-pontos: <code>name: nginx-demo</code>.</li>
        <li><b>A indentação (os espaços à esquerda) diz o que está dentro de quê.</b> Use sempre 2 espaços, nunca TAB.
          Como num índice de livro: o que está recuado é subitem do de cima.</li>
        <li><b>Listas</b> usam um traço e um espaço: <code>- item</code>. Cada traço é um item novo da lista.</li>
        <li><b><code>---</code></b> separa dois manifestos no mesmo arquivo. <b><code>#</code></b> começa um comentário (o Kubernetes ignora).</li>
      </ol>
      <p>O erro mais comum de quem começa é a indentação errada: <code>name</code> encostado na margem deixa de ser parte de
      <code>metadata</code>, e o Kubernetes reclama que falta o nome. O exemplo no editor mostra cada regra com um comentário.</p>`,
    `
      # Regra 1: chave: valor
      cidade: Recife

      # Regra 2: indentação de 2 espaços = "está dentro de"
      endereco:
        rua: Rua da Aurora     # "rua" está dentro de "endereco"
        numero: 10

      # Regra 3: listas com "- "
      frutas:
        - caju
        - umbu

      # Uma lista de objetos: cada "- " abre um objeto novo
      pessoas:
        - nome: Ana
          idade: 30            # alinhado com "nome": é do mesmo objeto
        - nome: Bia
          idade: 25
      ---
      # Regra 4: "---" começa um segundo documento no mesmo arquivo
      outro: documento
    `),

    licao('basico-anatomia-manifesto', 'Anatomia de um manifesto', 'facil', `
      <p>Todo manifesto do Kubernetes tem as mesmas <b>quatro partes</b>, como um formulário de cartório:</p>
      <dl>
        <dt><code>apiVersion</code></dt><dd>A versão do "modelo do formulário". Para Pod, Service, Namespace e ConfigMap é
          <code>v1</code>; para Deployment é <code>apps/v1</code>.</dd>
        <dt><code>kind</code></dt><dd>O tipo do recurso: <code>Pod</code>, <code>Service</code>, <code>Deployment</code>... Com letra maiúscula.</dd>
        <dt><code>metadata</code></dt><dd>A identificação: <code>name</code> (obrigatório e único), e opcionalmente
          <code>namespace</code>, <code>labels</code> e <code>annotations</code>.</dd>
        <dt><code>spec</code></dt><dd>A especificação: <b>o que você quer</b>. Num Pod, a lista de containers.</dd>
      </dl>
      <p>Dentro do <code>spec</code> de um Pod, cada container tem:</p>
      <ul>
        <li><code>name</code>: um apelido para o container (só letras minúsculas, números e <code>-</code>).</li>
        <li><code>image</code>: a imagem e a versão, como <code>nginx:1.25</code>.</li>
        <li><code>ports</code> → <code>containerPort</code>: a porta em que o programa escuta (o nginx escuta na 80).</li>
      </ul>
      <p><b>No cluster:</b> ao aplicar, o API Server confere essas partes. Faltou <code>name</code> ou <code>containers</code>?
      O apply falha e o terminal diz o que falta. Deu certo? O Pod aparece como <code>Running</code>. Experimente com o exemplo
      do editor: clique em <b>▶ Apply</b> e depois digite <code>kubectl get pods</code> no terminal.</p>`,
    `
      # Parte 1: qual versão da API descreve este tipo de recurso
      apiVersion: v1
      # Parte 2: o tipo do recurso
      kind: Pod
      # Parte 3: a identificação
      metadata:
        name: ola-pod          # nome único (minúsculas, números e -)
      # Parte 4: o que você quer
      spec:
        containers:            # lista de containers: cada um começa com "- "
          - name: web          # apelido do container
            image: nginx:1.25  # imagem:versão
            ports:
              - containerPort: 80   # o nginx escuta na porta 80
    `),

    exercicio({
      id: 'k8s-primeiro-yaml',
      titulo: 'Primeiro Pod em YAML',
      dificuldade: 'facil',
      resumo: `
        <p>Hora de criar o seu primeiro Pod: um servidor web nginx. O editor já tem o esqueleto do manifesto; troque cada
        <code># TODO</code> pelo valor pedido.</p>
        <ol>
          <li>Em <code>apiVersion</code>, escreva <code>v1</code>.</li>
          <li>Em <code>kind</code>, escreva <code>Pod</code>.</li>
          <li>Em <code>metadata.name</code>, escreva <code>nginx-demo</code>.</li>
          <li>No container, use <code>name: nginx</code> e <code>image: nginx:1.25</code>.</li>
          <li>Em <code>containerPort</code>, escreva <code>80</code>.</li>
          <li>Clique em <b>▶ Apply</b>, confira os ✅ e depois em <b>⬆ Enviar</b>.</li>
        </ol>
        <p><b>No cluster:</b> o Scheduler escolhe um nó, o kubelet baixa a imagem <code>nginx:1.25</code> e liga o container.
        Digite <code>kubectl get pods</code> no terminal para ver o Pod <code>Running</code>.</p>`,
      inicial: `
        # Seu primeiro Pod. Troque cada # TODO pelo valor pedido e clique em ▶ Apply.
        apiVersion:            # TODO: v1 (a versão da API de Pod)
        kind:                  # TODO: Pod
        metadata:
          name:                # TODO: nginx-demo
        spec:
          containers:          # a lista de containers do Pod
            - name:            # TODO: nginx
              image:           # TODO: nginx:1.25
              ports:
                - containerPort:   # TODO: 80
      `,
      dica: [
        'Releia a lição "Anatomia de um manifesto": o exemplo dela é quase igual a este exercício.',
        'Cada TODO vira um valor depois dos dois-pontos, na mesma linha: apiVersion: v1, kind: Pod...',
        'Ficou assim: apiVersion: v1 / kind: Pod / metadata.name: nginx-demo / container nginx com image: nginx:1.25 e containerPort: 80.',
      ],
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
        teste({ descricao: 'O Pod nginx-demo existe e está Running', dica: 'Confira apiVersion: v1, kind: Pod e metadata.name: nginx-demo (com 2 espaços antes de name).' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'nginx-demo', status: 'Running' }),
        teste({ descricao: 'O container usa a imagem nginx:1.25', dica: 'No container, escreva image: nginx:1.25 (com os dois-pontos entre o nome e a versão).' },
          { tipo: 'container-imagem', pod: 'nginx-demo', container: 'nginx', imagem: 'nginx:1.25' }),
        teste({ descricao: 'A porta 80 está exposta', dica: 'Dentro de ports, a linha deve ser - containerPort: 80 (um número, sem aspas).' },
          { tipo: 'container-porta', pod: 'nginx-demo', container: 'nginx', porta: 80 }),
      ],
    }),

    exercicio({
      id: 'basico-debug-yaml',
      titulo: 'Debugging de YAML Inválido',
      dificuldade: 'medio',
      resumo: `
        <p>O YAML do editor está <b>sem nenhuma indentação</b>. Para o YAML, isso quer dizer que <code>name</code>,
        <code>containers</code> e <code>image</code> estão todos "soltos" no nível de cima, e não dentro de
        <code>metadata</code> e <code>spec</code>. Clique em <b>▶ Apply</b> primeiro para ver o erro e depois corrija.</p>
        <ol>
          <li>Clique em <b>▶ Apply</b> e leia o erro no terminal.</li>
          <li>Recue <code>name: debug-pod</code> 2 espaços, para ficar dentro de <code>metadata</code>.</li>
          <li>Recue <code>containers:</code> 2 espaços, para ficar dentro de <code>spec</code>.</li>
          <li>Recue o item <code>- name: nginx</code> mais 2 espaços (4 no total), e alinhe <code>image</code> e <code>ports</code>
            com o <code>name</code> desse item (6 espaços).</li>
          <li>Recue <code>- containerPort: 80</code> para dentro de <code>ports</code> (8 espaços) e aplique de novo.</li>
        </ol>
        <p><b>Por que isso importa:</b> no dia a dia, a maior parte dos erros de manifesto é de indentação. O Kubernetes não
        "adivinha": se <code>name</code> não está dentro de <code>metadata</code>, para ele o Pod não tem nome.</p>`,
      inicial: `
        # Este manifesto está sem indentação. Rode ▶ Apply, leia o erro e corrija os recuos.
        apiVersion: v1
        kind: Pod
        metadata:
        name: debug-pod
        spec:
        containers:
        - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
      `,
      dica: [
        'Use 2 espaços por nível. Pergunte para cada linha: "isto está dentro de quê?".',
        'name fica dentro de metadata (2 espaços); containers fica dentro de spec (2 espaços); o item "- name: nginx" fica dentro de containers (4 espaços).',
        'image e ports alinham com o "name" do item (6 espaços), e "- containerPort: 80" fica dentro de ports (8 espaços).',
      ],
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
        teste({ descricao: 'O Pod debug-pod existe', dica: 'Recue "name: debug-pod" 2 espaços, para ficar dentro de metadata.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'debug-pod' }),
        teste({ descricao: 'O container usa a imagem nginx:1.25', dica: 'Alinhe "image: nginx:1.25" com o "name: nginx" do item da lista (6 espaços).' },
          { tipo: 'container-imagem', pod: 'debug-pod', container: 'nginx', imagem: 'nginx:1.25' }),
        teste({ descricao: 'A porta 80 está exposta', dica: '"ports:" alinha com image, e "- containerPort: 80" fica 2 espaços mais para dentro.' },
          { tipo: 'container-porta', pod: 'debug-pod', container: 'nginx', porta: 80 }),
      ],
    }),

    exercicio({
      id: 'basico-multi-document',
      titulo: 'YAML Multi-documento',
      dificuldade: 'medio',
      resumo: `
        <p>Um arquivo pode ter vários manifestos, separados por uma linha com <code>---</code> (regra 4 da lição de YAML).
        O editor já tem o <code>pod-a</code> pronto.</p>
        <ol>
          <li>Depois do <code>pod-a</code>, escreva uma linha só com <code>---</code>.</li>
          <li>Abaixo dela, crie o Pod <code>pod-b</code> com o container <code>nginx</code> e a imagem <code>nginx:1.25</code>
            (dica: é o <code>pod-a</code> com outro nome).</li>
          <li>Aplique e rode <code>kubectl get pods</code> no terminal: os dois aparecem.</li>
        </ol>
        <p><b>No cluster:</b> um único apply cria os dois Pods. É assim que se entrega uma aplicação inteira (Pods, Services,
        configurações) num arquivo só.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: pod-a
        spec:
          containers:
            - name: nginx
              image: nginx:1.25
              ports:
                - containerPort: 80
        # TODO: uma linha com --- e, abaixo dela, o Pod pod-b (igual ao pod-a, com outro nome)
      `,
      dica: [
        'O separador é uma linha que contém só três traços: ---',
        'Copie todo o pod-a, cole depois do --- e troque o name de pod-a para pod-b.',
      ],
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
        teste({ descricao: 'O Pod pod-a existe', dica: 'Mantenha o pod-a como veio no editor.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'pod-a' }),
        teste({ descricao: 'O Pod pod-b existe', dica: 'Escreva uma linha com --- e, abaixo, um Pod completo com metadata.name: pod-b.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'pod-b' }),
        teste({ descricao: 'Os dois usam a imagem nginx:1.25', dica: 'No pod-b, use o container nginx com image: nginx:1.25.' },
          { tipo: 'container-imagem', pod: 'pod-a', container: 'nginx', imagem: 'nginx:1.25' },
          { tipo: 'container-imagem', pod: 'pod-b', container: 'nginx', imagem: 'nginx:1.25' }),
      ],
    }),

    licao('basico-namespaces-licao', 'Namespaces: as pastas do cluster', 'facil', `
      <p>Num cluster de empresa, vários times e ambientes dividem as mesmas máquinas. Para não virar bagunça, existem os
      <b>Namespaces</b>: divisões lógicas do cluster, como as <b>pastas</b> do computador.</p>
      <ul>
        <li>Cada recurso mora em um namespace. Se você não disser qual, ele vai para o <code>default</code>.</li>
        <li>O nome só precisa ser único <b>dentro</b> do namespace: pode haver um Pod <code>web</code> em <code>dev</code> e outro em <code>prod</code>.</li>
        <li>Para colocar um recurso num namespace, escreva <code>namespace: nome</code> dentro de <code>metadata</code>.</li>
        <li>O namespace precisa existir antes. Ele é um recurso como outro qualquer: <code>kind: Namespace</code>.</li>
      </ul>
      <p><b>No cluster:</b> <code>kubectl get pods</code> mostra só o namespace atual; <code>kubectl get pods -n dev-env</code>
      mostra os do <code>dev-env</code>. Times diferentes podem ter permissões e cotas diferentes por namespace.</p>`,
    `
      # Um Namespace: só precisa de nome
      apiVersion: v1
      kind: Namespace
      metadata:
        name: loja
      ---
      # Um Pod DENTRO do namespace "loja"
      apiVersion: v1
      kind: Pod
      metadata:
        name: vitrine
        namespace: loja        # aqui: em qual "pasta" o Pod fica
      spec:
        containers:
          - name: web
            image: nginx:1.25
    `),

    exercicio({
      id: 'basico-namespace',
      titulo: 'Criando um Namespace',
      dificuldade: 'facil',
      resumo: `
        <p>Você vai separar um ambiente de desenvolvimento num namespace próprio e colocar um Pod dentro dele.</p>
        <ol>
          <li>Complete o Namespace com <code>name: dev-env</code>.</li>
          <li>No Pod, complete <code>name: nginx-dev</code>.</li>
          <li>No <code>metadata</code> do Pod, acrescente <code>namespace: dev-env</code>.</li>
          <li>Complete a imagem do container: <code>nginx:1.25</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Namespace é criado primeiro (por isso ele vem antes, no mesmo arquivo) e o Pod nasce dentro dele.
        Experimente <code>kubectl get pods -n dev-env</code>.</p>`,
      inicial: `
        # 1. O Namespace (a "pasta")
        apiVersion: v1
        kind: Namespace
        metadata:
          name:                # TODO: dev-env
        ---
        # 2. O Pod dentro dele
        apiVersion: v1
        kind: Pod
        metadata:
          name:                # TODO: nginx-dev
          # TODO: namespace: dev-env
        spec:
          containers:
            - name: nginx
              image:           # TODO: nginx:1.25
              ports:
                - containerPort: 80
      `,
      dica: [
        'Releia o exemplo da lição "Namespaces": ele tem exatamente esta estrutura.',
        'namespace é um campo de metadata, alinhado com name (2 espaços).',
        'metadata do Pod: name: nginx-dev e, na linha de baixo, namespace: dev-env.',
      ],
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
        teste({ descricao: 'O Namespace dev-env existe', dica: 'No primeiro documento (kind: Namespace), escreva metadata.name: dev-env.' },
          { tipo: 'recurso-existe', kind: 'Namespace', nome: 'dev-env' }),
        teste({ descricao: 'O Pod nginx-dev existe no namespace dev-env', dica: 'No metadata do Pod, use name: nginx-dev e namespace: dev-env, alinhados.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'nginx-dev' },
          { tipo: 'campo', kind: 'Pod', nome: 'nginx-dev', caminho: 'metadata.namespace', valor: 'dev-env' }),
        teste({ descricao: 'O container usa a imagem nginx:1.25', dica: 'No container nginx, escreva image: nginx:1.25.' },
          { tipo: 'container-imagem', pod: 'nginx-dev', container: 'nginx', imagem: 'nginx:1.25' }),
      ],
    }),

    licao('basico-labels-licao', 'Labels, selectors e annotations', 'facil', `
      <p>Num cluster com centenas de Pods, como dizer "estes aqui são da API"? Com <b>labels</b> (rótulos): pares
      <code>chave: valor</code> que você cola no <code>metadata</code>, como as etiquetas coloridas de pastas.</p>
      <ul>
        <li><b>Label</b>: identifica e agrupa. Ex.: <code>app: api</code>, <code>env: production</code>.</li>
        <li><b>Selector</b>: um filtro de labels. "Todos os Pods com <code>app: api</code>." É assim que um recurso encontra
          os Pods de que cuida.</li>
        <li><b>Annotation</b>: um post-it com informação extra (descrição, autor, configuração de ferramenta). Não serve para filtrar.</li>
      </ul>
      <p><b>Um primeiro olhar no Service.</b> Os Pods mudam de IP quando são recriados. O <b>Service</b> dá a eles um endereço
      fixo, e descobre <i>quais</i> Pods atender pelo <code>selector</code>. Você vai estudar os Services a fundo no tópico
      "Services e Networking"; por enquanto, basta saber três campos:</p>
      <ul>
        <li><code>spec.selector</code>: as labels dos Pods que ele atende.</li>
        <li><code>ports[].port</code>: a porta em que o Service atende.</li>
        <li><code>ports[].targetPort</code>: a porta do container para onde ele encaminha (a <code>containerPort</code>).</li>
      </ul>
      <p><b>No cluster:</b> se o selector não bater com nenhuma label, o Service existe mas não tem para onde mandar o tráfego.
      Esse é um dos erros mais comuns em produção.</p>`,
    `
      apiVersion: v1
      kind: Pod
      metadata:
        name: cardapio
        labels:                  # etiquetas: servem para filtrar
          app: cardapio
          time: cozinha
        annotations:             # post-its: só informação extra
          responsavel: "Dona Maria"
      spec:
        containers:
          - name: web
            image: nginx:1.25
            ports:
              - containerPort: 80
      ---
      apiVersion: v1
      kind: Service
      metadata:
        name: cardapio-svc
      spec:
        selector:                # "atenda os Pods com app: cardapio"
          app: cardapio
        ports:
          - port: 80             # a porta do Service
            targetPort: 80       # a containerPort dos Pods
    `),

    exercicio({
      id: 'basico-annotations',
      titulo: 'Annotations em Recursos',
      dificuldade: 'facil',
      resumo: `
        <p>Annotations guardam informação para pessoas e ferramentas, sem influenciar a seleção de Pods. Você vai descrever
        para que serve um Pod de teste.</p>
        <ol>
          <li>Complete o nome do Pod: <code>annotated-pod</code>.</li>
          <li>Dentro de <code>metadata</code>, crie <code>annotations:</code>.</li>
          <li>Dentro de <code>annotations</code>, escreva <code>description: "Servidor web de teste"</code> (com aspas, porque o texto tem espaços).</li>
          <li>Use a imagem <code>nginx:1.25</code> no container <code>nginx</code>.</li>
        </ol>
        <p><b>No cluster:</b> <code>kubectl describe pod annotated-pod</code> mostra a annotation. Ferramentas como o Ingress
        Controller e o Prometheus leem annotations para saber como tratar o recurso.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name:                # TODO: annotated-pod
          # TODO: annotations: e, dentro dela (2 espaços a mais), description: "Servidor web de teste"
        spec:
          containers:
            - name: nginx
              image:           # TODO: nginx:1.25
              ports:
                - containerPort: 80
      `,
      dica: [
        'annotations fica dentro de metadata, no mesmo nível de name.',
        'É um mapa: annotations: na linha de cima e, 2 espaços mais para dentro, description: "Servidor web de teste".',
      ],
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
        teste({ descricao: 'O Pod annotated-pod existe', dica: 'Escreva metadata.name: annotated-pod.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'annotated-pod' }),
        teste({ descricao: 'O Pod tem a annotation description', dica: 'Dentro de metadata, crie annotations: e, dentro dela, description: "Servidor web de teste".' },
          { tipo: 'campo', kind: 'Pod', nome: 'annotated-pod', caminho: 'metadata.annotations.description', valor: 'Servidor web de teste' }),
        teste({ descricao: 'O container usa a imagem nginx:1.25', dica: 'No container nginx, escreva image: nginx:1.25.' },
          { tipo: 'container-imagem', pod: 'annotated-pod', container: 'nginx', imagem: 'nginx:1.25' }),
      ],
    }),

    exercicio({
      id: 'basico-labels-selectors',
      titulo: 'Labels e Selectors',
      dificuldade: 'facil',
      resumo: `
        <p>Você vai etiquetar um Pod e criar um Service que o encontra pela etiqueta. É o padrão que se repete em todo o
        Kubernetes: <b>labels</b> no Pod, <b>selector</b> em quem procura.</p>
        <ol>
          <li>No Pod <code>api-pod</code>, crie <code>labels</code> com <code>app: api</code> e <code>env: production</code>.</li>
          <li>Depois do <code>---</code>, complete o Service <code>api-svc</code>.</li>
          <li>No <code>spec.selector</code> do Service, escreva <code>app: api</code>.</li>
          <li>Nas portas do Service, use <code>port: 80</code> e <code>targetPort: 80</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Service passa a mandar o tráfego para todo Pod com <code>app: api</code>. A label <code>env</code>
        não entra no selector: ela serve para você filtrar, por exemplo com <code>kubectl get pods -l env=production</code>.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: api-pod
          # TODO: labels: com app: api e env: production (cada uma numa linha, 2 espaços a mais)
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
          name:                # TODO: api-svc
        spec:
          selector:
            # TODO: app: api (a mesma label do Pod)
          ports:
            - port:            # TODO: 80
              targetPort:      # TODO: 80
      `,
      dica: [
        'Releia o exemplo da lição "Labels, selectors e annotations": o par Pod + Service é igual.',
        'labels fica dentro de metadata do Pod; selector fica dentro de spec do Service.',
        'Pod: metadata.labels com app: api e env: production. Service: spec.selector com app: api.',
      ],
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
        teste({ descricao: 'O Pod api-pod existe com as labels app=api e env=production', dica: 'No metadata do Pod, crie labels: com app: api e env: production, uma por linha.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'api-pod' },
          { tipo: 'campo', kind: 'Pod', nome: 'api-pod', caminho: 'metadata.labels', valor: { app: 'api', env: 'production' } }),
        teste({ descricao: 'O Service api-svc seleciona pods com app=api', dica: 'No Service, dentro de spec.selector, escreva app: api (igual à label do Pod).' },
          { tipo: 'service-selector', service: 'api-svc', selector: { app: 'api' } }),
      ],
    }),

    licao('basico-config-licao', 'Variáveis de ambiente e ConfigMaps', 'facil', `
      <p>O mesmo programa costuma rodar de jeitos diferentes em cada ambiente: em teste fala com um banco, em produção com
      outro. Em vez de criar uma imagem para cada caso, passamos <b>configurações</b> de fora.</p>
      <ul>
        <li><b>Variável de ambiente</b>: um par <code>NOME=valor</code> que o programa lê ao iniciar. No container, fica na
          lista <code>env</code>, com <code>name</code> e <code>value</code>. É o bilhete deixado para quem cuida da casa.</li>
        <li><b>ConfigMap</b>: um recurso só para guardar configurações (<code>data</code> com chave: valor). Vários Pods podem ler
          o mesmo ConfigMap. É o quadro de avisos da empresa.</li>
        <li>Para um container ler uma chave do ConfigMap: <code>valueFrom</code> → <code>configMapKeyRef</code>, com o
          <code>name</code> do ConfigMap e a <code>key</code> (a chave).</li>
      </ul>
      <p>Valores de texto que parecem números ou <code>true</code> devem ir entre aspas (<code>"8080"</code>), porque variáveis
      de ambiente são sempre texto.</p>
      <p><b>No cluster:</b> o kubelet monta as variáveis no momento em que o container liga. Se o ConfigMap ou a chave não
      existir, o Pod não inicia (fica em <code>CreateContainerConfigError</code>).</p>`,
    `
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: loja-config
      data:                      # as configurações, chave: valor
        MOEDA: BRL
      ---
      apiVersion: v1
      kind: Pod
      metadata:
        name: caixa
      spec:
        containers:
          - name: app
            image: busybox:1.36
            command: ['sh', '-c', 'printenv && sleep 3600']   # mostra as variáveis e espera
            env:
              - name: MODO       # variável com valor direto
                value: "teste"
              - name: MOEDA      # variável lida do ConfigMap
                valueFrom:
                  configMapKeyRef:
                    name: loja-config   # qual ConfigMap
                    key: MOEDA          # qual chave
    `),

    exercicio({
      id: 'basico-env-vars',
      titulo: 'Variáveis de Ambiente',
      dificuldade: 'facil',
      resumo: `
        <p>Você vai rodar um container <code>busybox</code> (uma imagem mínima, com comandos básicos de Linux) que imprime as
        variáveis de ambiente, e dizer a ele que está em produção.</p>
        <ol>
          <li>Complete o nome do Pod: <code>env-pod</code>.</li>
          <li>Use a imagem <code>busybox:1.36</code> no container <code>busybox</code>.</li>
          <li>O <code>command</code> já está pronto: imprime as variáveis (<code>printenv</code>) e espera.</li>
          <li>Na lista <code>env</code>, crie a variável <code>APP_MODE</code> com <code>value: "production"</code>.</li>
        </ol>
        <p><b>No cluster:</b> o programa dentro do container lê <code>APP_MODE</code> ao iniciar. Para mudar o modo, basta mudar
        o YAML, sem gerar uma imagem nova.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name:                # TODO: env-pod
        spec:
          containers:
            - name: busybox
              image:           # TODO: busybox:1.36
              command: ['sh', '-c', 'printenv && sleep 3600']
              env:
                # TODO: um item com name: APP_MODE e value: "production"
      `,
      dica: [
        'env é uma lista: cada variável começa com "- ".',
        'O item tem duas chaves alinhadas: name e value.',
        'env:\n  - name: APP_MODE\n    value: "production"',
      ],
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
        teste({ descricao: 'O Pod env-pod existe', dica: 'Escreva metadata.name: env-pod.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'env-pod' }),
        teste({ descricao: 'O container usa a imagem busybox:1.36', dica: 'No container busybox, escreva image: busybox:1.36.' },
          { tipo: 'container-imagem', pod: 'env-pod', container: 'busybox', imagem: 'busybox:1.36' }),
        teste({ descricao: 'A variável APP_MODE vale production', dica: 'Em env, crie o item - name: APP_MODE com value: "production" alinhado embaixo de name.' },
          { tipo: 'campo', kind: 'Pod', nome: 'env-pod', caminho: 'spec.containers[0].env[name=APP_MODE].value', valor: 'production' }),
      ],
    }),

    exercicio({
      id: 'basico-configmap-env',
      titulo: 'ConfigMap como Variável de Ambiente',
      dificuldade: 'medio',
      resumo: `
        <p>Agora a configuração sai do Pod e vai para um ConfigMap, que vários Pods podem compartilhar. Você vai guardar o
        endereço do banco de dados e fazer o Pod ler esse valor.</p>
        <ol>
          <li>No ConfigMap <code>app-config</code>, em <code>data</code>, crie <code>DATABASE_HOST: db.exemplo.com</code>.</li>
          <li>No Pod <code>config-pod</code> (imagem <code>busybox:1.36</code>), crie em <code>env</code> a variável
            <code>DATABASE_HOST</code>.</li>
          <li>Em vez de <code>value</code>, use <code>valueFrom.configMapKeyRef</code> com <code>name: app-config</code> e
            <code>key: DATABASE_HOST</code>.</li>
        </ol>
        <p><b>No cluster:</b> quando o container liga, o kubelet busca a chave no ConfigMap e entrega como variável. Para trocar
        o banco, você muda só o ConfigMap e recria o Pod.</p>`,
      inicial: `
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: app-config
        data:
          # TODO: DATABASE_HOST: db.exemplo.com
        ---
        apiVersion: v1
        kind: Pod
        metadata:
          name: config-pod
        spec:
          containers:
            - name: busybox
              image:           # TODO: busybox:1.36
              command: ['sh', '-c', 'sleep 3600']
              env:
                - name: DATABASE_HOST
                  # TODO: valueFrom: > configMapKeyRef: > name: app-config e key: DATABASE_HOST
      `,
      dica: [
        'Releia o exemplo da lição "Variáveis de ambiente e ConfigMaps": a variável MOEDA faz exatamente isto.',
        'São três níveis: valueFrom: → configMapKeyRef: → name e key (cada nível 2 espaços mais para dentro).',
        'valueFrom:\n  configMapKeyRef:\n    name: app-config\n    key: DATABASE_HOST',
      ],
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
        teste({ descricao: 'O ConfigMap app-config existe e contém DATABASE_HOST', dica: 'Em data do ConfigMap, escreva DATABASE_HOST: db.exemplo.com (2 espaços antes).' },
          { tipo: 'configmap-contem', configmap: 'app-config', chave: 'DATABASE_HOST' }),
        teste({ descricao: 'O Pod config-pod existe', dica: 'Mantenha metadata.name: config-pod.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'config-pod' }),
        teste({ descricao: 'O container usa a imagem busybox:1.36', dica: 'No container busybox, escreva image: busybox:1.36.' },
          { tipo: 'container-imagem', pod: 'config-pod', container: 'busybox', imagem: 'busybox:1.36' }),
        teste({ descricao: 'A variável DATABASE_HOST vem do ConfigMap app-config', dica: 'Embaixo de - name: DATABASE_HOST, use valueFrom.configMapKeyRef com name: app-config e key: DATABASE_HOST.' },
          { tipo: 'campo', kind: 'Pod', nome: 'config-pod', caminho: 'spec.containers[0].env[name=DATABASE_HOST].valueFrom.configMapKeyRef', valor: { name: 'app-config', key: 'DATABASE_HOST' } }),
      ],
    }),

    licao('basico-recursos-licao', 'CPU e memória: requests e limits', 'facil', `
      <p>Vários Pods dividem o mesmo nó. Sem regras, um Pod guloso pode usar toda a memória e derrubar os vizinhos. Por isso
      cada container pode declarar dois números, em <code>resources</code>:</p>
      <dl>
        <dt><code>requests</code> (a reserva)</dt><dd>O mínimo garantido. O Scheduler só põe o Pod num nó que tenha esse tanto livre.
          Como reservar uma mesa no restaurante.</dd>
        <dt><code>limits</code> (o teto)</dt><dd>O máximo que o container pode usar. Passou da memória? O container é encerrado
          (<code>OOMKilled</code>). Passou da CPU? Ele fica mais lento, mas não morre.</dd>
      </dl>
      <p><b>As unidades:</b></p>
      <ul>
        <li>CPU em <b>milicores</b>: <code>1000m</code> = 1 núcleo inteiro; <code>100m</code> = um décimo de núcleo.</li>
        <li>Memória em <b>Mi</b> (mebibytes) ou <b>Gi</b>: <code>128Mi</code> ≈ 134 MB.</li>
      </ul>
      <p>Regra prática: o limit é maior ou igual ao request. Use aspas nos valores (<code>"100m"</code>) para o YAML não
      tentar interpretá-los como número.</p>`,
    `
      apiVersion: v1
      kind: Pod
      metadata:
        name: economico
      spec:
        containers:
          - name: web
            image: nginx:1.25
            resources:
              requests:          # reserva garantida
                cpu: "50m"       # 5% de um núcleo
                memory: "64Mi"
              limits:            # teto: daqui não passa
                cpu: "100m"
                memory: "128Mi"
    `),

    exercicio({
      id: 'basico-resource-limits',
      titulo: 'Resource Requests e Limits',
      dificuldade: 'medio',
      resumo: `
        <p>Você vai reservar um pouco de CPU e memória para um servidor web e limitar quanto ele pode usar, para ele não
        atrapalhar os vizinhos no nó.</p>
        <ol>
          <li>O Pod se chama <code>limited-pod</code>, com o container <code>nginx</code> e a imagem <code>nginx:1.25</code>.</li>
          <li>No container, crie <code>resources</code>.</li>
          <li>Em <code>requests</code>: <code>cpu: "100m"</code> e <code>memory: "128Mi"</code>.</li>
          <li>Em <code>limits</code>: <code>cpu: "250m"</code> e <code>memory: "256Mi"</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Scheduler só escolhe um nó com 100m de CPU e 128Mi livres. Se o nginx passar de 256Mi, o kubelet
        encerra o container e o reinicia.</p>`,
      inicial: `
        apiVersion: v1
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
                  cpu:         # TODO: "100m"
                  memory:      # TODO: "128Mi"
                # TODO: limits: com cpu: "250m" e memory: "256Mi"
      `,
      dica: [
        'limits fica alinhado com requests, os dois dentro de resources.',
        'limits:\n  cpu: "250m"\n  memory: "256Mi"',
      ],
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
        teste({ descricao: 'O Pod limited-pod existe', dica: 'Mantenha metadata.name: limited-pod e preencha todos os TODO (um valor vazio impede o apply).' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'limited-pod' }),
        teste({ descricao: 'O container tem requests e limits definidos', dica: 'Dentro de resources, preencha requests (cpu "100m", memory "128Mi") e crie limits (cpu "250m", memory "256Mi").' },
          { tipo: 'resource-limits', pod: 'limited-pod', container: 'nginx' },
          { tipo: 'campo', kind: 'Pod', nome: 'limited-pod', caminho: 'spec.containers[0].resources.limits.memory', valor: '256Mi' }),
      ],
    }),

    licao('basico-data-sources', 'Olhar antes de mexer: get, Diff e Drift', 'facil', `
      <p>No trabalho de verdade, você quase nunca começa do zero: o cluster já tem coisas rodando. Antes de aplicar algo,
      é preciso <b>olhar o que existe</b> e <b>prever o que vai mudar</b>.</p>
      <ul>
        <li><b>Consultar</b>: <code>kubectl get pods</code> lista; <code>kubectl get pod web -o yaml</code> mostra o YAML do que
          está rodando; <code>kubectl describe pod web</code> explica em detalhes (labels, eventos, erros).</li>
        <li><b>🔍 Diff</b> (prever): mostra o que o apply <i>vai</i> fazer: criar, alterar ou remover. Como conferir o carrinho
          antes de pagar. No mundo real: <code>kubectl diff -f arquivo.yaml</code>.</li>
        <li><b>🔎 Drift</b> (conferir): mostra onde o cluster ficou <i>diferente</i> do YAML (alguém mudou à mão, por exemplo).
          A planta da casa diz parede branca, mas alguém pintou de azul.</li>
      </ul>
      <p>Alguns exercícios começam com <b>recursos que já existem</b> no cluster simulado, como se outro time tivesse criado.
      Use o terminal (<code>kubectl get</code>) e a aba <b>📦 Estado</b> para descobrir nomes e labels antes de escrever o seu YAML.</p>
      <p>Para quem conhece Terraform: o Diff é o <code>terraform plan</code>, e ler o que existe é parecido com um
      <code>data source</code>.</p>`),

    exercicio({
      id: 'basico-diff-plan',
      titulo: 'Preveja as mudanças',
      dificuldade: 'medio',
      existentes: `apiVersion: v1
kind: Pod
metadata:
  name: nginx-demo
  labels:
    app: nginx
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80`,
      resumo: `
        <p>O cluster já tem o Pod <code>nginx-demo</code> rodando <code>nginx:1.25</code>. Você vai atualizar a imagem e criar
        um Service, mas <b>antes de aplicar</b> vai prever o que muda, com o botão <b>🔍 Diff</b>.</p>
        <ol>
          <li>Digite <code>kubectl get pods</code> no terminal para ver o Pod que já existe.</li>
          <li>No editor, troque a imagem do Pod para <code>nginx:1.27</code>.</li>
          <li>Complete o Service <code>nginx-svc</code> com <code>selector</code> <code>app: nginx</code> e porta <code>80</code>.</li>
          <li>Clique em <b>🔍 Diff</b> e confira: uma <b>alteração</b> no Pod (a imagem) e uma <b>criação</b> (o Service).</li>
          <li>Só então clique em <b>▶ Apply</b> e em <b>⬆ Enviar</b>.</li>
        </ol>
        <p><b>Por que isso importa:</b> em produção, um apply errado derruba um serviço. Olhar o diff antes é o hábito que evita
        surpresas, igual ao <code>terraform plan</code>.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: nginx-demo
          labels:
            app: nginx
        spec:
          containers:
            - name: nginx
              image: nginx:1.25    # TODO: troque para nginx:1.27
              ports:
                - containerPort: 80
        ---
        apiVersion: v1
        kind: Service
        metadata:
          name: nginx-svc
        spec:
          selector:
            # TODO: app: nginx (a label do Pod)
          ports:
            - port: 80
              targetPort: 80
      `,
      dica: [
        'Primeiro edite, depois clique em 🔍 Diff, e só então em ▶ Apply. A ordem é o que o exercício confere.',
        'Se você já aplicou sem o Diff, clique em 🔍 Diff e depois aplique de novo.',
        'Imagem: nginx:1.27. Service: spec.selector com app: nginx.',
      ],
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: nginx-demo
  labels:
    app: nginx
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
        teste({ descricao: 'Você usou 🔍 Diff antes de aplicar', dica: 'Clique em 🔍 Diff antes de ▶ Apply.' },
          { tipo: 'diff-usado' }),
        teste({ descricao: 'O Pod nginx-demo foi atualizado com imagem nginx:1.27', dica: 'No Pod, troque image: nginx:1.25 por image: nginx:1.27.' },
          { tipo: 'container-imagem', pod: 'nginx-demo', container: 'nginx', imagem: 'nginx:1.27' }),
        teste({ descricao: 'O Service nginx-svc foi criado e seleciona app=nginx', dica: 'No Service, em spec.selector, escreva app: nginx.' },
          { tipo: 'recurso-existe', kind: 'Service', nome: 'nginx-svc' },
          { tipo: 'service-selector', service: 'nginx-svc', selector: { app: 'nginx' } }),
      ],
    }),

    exercicio({
      id: 'basico-drift-detection',
      titulo: 'Encontre o Drift',
      dificuldade: 'medio',
      existentes: `apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80`,
      resumo: `
        <p>O cluster já tem o Pod <code>web-app</code> rodando <code>nginx:1.25</code>. Mas o YAML que você recebeu (no editor)
        está <b>desatualizado</b>: diz <code>nginx:1.24</code>. Se alguém aplicasse esse arquivo, faria a aplicação voltar de versão sem querer.</p>
        <ol>
          <li>Clique em <b>🔎 Drift</b> (sem aplicar) e leia a divergência: a imagem do YAML não bate com a do cluster.</li>
          <li>Confira no terminal: <code>kubectl get pod web-app -o yaml</code> mostra a imagem que está rodando.</li>
          <li>Corrija o YAML para <code>nginx:1.25</code>.</li>
          <li>Clique em <b>🔎 Drift</b> de novo: agora está sincronizado. Aplique e envie.</li>
        </ol>
        <p><b>Por que isso importa:</b> ferramentas de GitOps como Argo CD e Flux fazem essa comparação o tempo todo e avisam
        quando o cluster e o repositório divergem.</p>`,
      inicial: `
        # YAML desatualizado: compare com o cluster usando 🔎 Drift antes de aplicar.
        apiVersion: v1
        kind: Pod
        metadata:
          name: web-app
        spec:
          containers:
            - name: nginx
              image: nginx:1.24    # TODO: o cluster roda outra versão. Qual?
              ports:
                - containerPort: 80
      `,
      dica: [
        'O botão 🔎 Drift compara o editor com o que está rodando. Ele mostra o campo que difere.',
        'O cluster roda nginx:1.25. Deixe o YAML igual ao que está rodando.',
      ],
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
        teste({ descricao: 'O Pod web-app existe no cluster', dica: 'Mantenha metadata.name: web-app.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'web-app' }),
        teste({ descricao: 'A imagem foi corrigida para nginx:1.25', dica: 'O cluster roda nginx:1.25; troque image: nginx:1.24 por image: nginx:1.25.' },
          { tipo: 'container-imagem', pod: 'web-app', container: 'nginx', imagem: 'nginx:1.25' }),
      ],
    }),
  ],
};
