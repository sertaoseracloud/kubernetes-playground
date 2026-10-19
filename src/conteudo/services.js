// Módulo 1, tópico 3: Services e Networking.
// Tipos de Service, DNS interno, endpoints e Ingress. Segue docs/didatica.md.
import { licao, exercicio, teste } from './util.js';

/** Pods de exemplo que alguns exercícios já encontram no cluster. */
const POD_BACKEND = `apiVersion: v1
kind: Pod
metadata:
  name: backend-pod
  labels:
    app: backend
spec:
  containers:
    - name: api
      image: nginx:1.25
      ports:
        - containerPort: 8080`;

const SVC_WEB = `apiVersion: v1
kind: Service
metadata:
  name: web-svc
spec:
  type: ClusterIP
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80`;

/** Um Service ClusterIP sem os valores: o esqueleto dos exercícios deste tópico. */
const esqueletoService = (extras = '') => `
  apiVersion: v1
  kind: Service
  metadata:
    name:              # TODO: o nome pedido
  spec:
    type:              # TODO: o tipo pedido${extras}
    selector:
      # TODO: a label dos Pods (chave: valor)
    ports:
      - port:          # TODO: a porta do Service
        targetPort:    # TODO: a porta do container
`;

export const services = {
  id: 'services',
  titulo: 'Services e Networking',
  descricao: 'Conectando aplicações dentro e fora do cluster com Services, DNS e Ingress.',
  icone: '🔗',
  itens: [
    licao('svc-tipos', 'Services: o telefone fixo dos Pods', 'facil', `
      <p>Pods são passageiros: quando um é recriado, ganha outro IP. Se o frontend guardasse o IP do backend, quebraria a
      cada atualização. O <b>Service</b> resolve isso: é um <b>endereço fixo</b> (nome e IP) na frente de um grupo de Pods,
      como o telefone fixo de uma empresa, que continua o mesmo quando os atendentes mudam.</p>
      <p>Você já viu os campos principais na lição de labels:</p>
      <ul>
        <li><code>selector</code>: as labels dos Pods que ele atende. Pod novo com a label certa entra sozinho no grupo.</li>
        <li><code>port</code>: a porta em que o Service atende. <code>targetPort</code>: a porta do container (a <code>containerPort</code>).
          Podem ser diferentes: o Service atende na 80 e entrega na 8080.</li>
        <li><code>type</code>: <b>quem</b> consegue chegar no Service.</li>
      </ul>
      <p>Os quatro tipos, do mais fechado ao mais aberto:</p>
      <dl>
        <dt><b>ClusterIP</b> (padrão)</dt><dd>Só dentro do cluster. O ramal interno da empresa.</dd>
        <dt><b>NodePort</b></dt><dd>Abre a mesma porta (de 30000 a 32767) em todos os nós: dá para acessar de fora pelo IP de
          qualquer nó. Uma porta lateral numerada em todos os prédios do condomínio.</dd>
        <dt><b>LoadBalancer</b></dt><dd>Pede à nuvem (AWS, Azure, GCP) um balanceador com IP público. É o jeito comum de
          expor um serviço na internet.</dd>
        <dt><b>ExternalName</b></dt><dd>Não aponta para Pods: é um apelido para um nome de fora (um banco gerenciado, uma API
          externa). Não tem selector nem portas.</dd>
      </dl>
      <p><b>No cluster:</b> o kube-proxy de cada nó configura a rede para que o IP do Service distribua as conexões entre
      os Pods selecionados.</p>`,
    `
      apiVersion: v1
      kind: Service
      metadata:
        name: atendimento
      spec:
        type: ClusterIP          # só dentro do cluster (é o padrão; pode omitir)
        selector:
          app: atendimento       # entrega para os Pods com esta label
        ports:
          - port: 80             # a porta em que o Service atende
            targetPort: 8080     # a porta do container que recebe
    `),

    exercicio({
      id: 'svc-clusterip-exercicio',
      titulo: 'Service ClusterIP',
      dificuldade: 'facil',
      resumo: `
        <p>Você vai dar um endereço interno fixo aos Pods do site, para outros Pods do cluster acessarem pelo nome.</p>
        <ol>
          <li>O Service se chama <code>web-svc</code>.</li>
          <li>Em <code>type</code>, escreva <code>ClusterIP</code>.</li>
          <li>Em <code>selector</code>, escreva <code>app: web</code>.</li>
          <li>Em <code>ports</code>, use <code>port: 80</code> e <code>targetPort: 80</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Service ganha um IP interno e o nome <code>web-svc</code>. Todo Pod com <code>app: web</code>
        passa a receber o tráfego, mesmo os que forem criados depois.</p>`,
      inicial: esqueletoService(),
      dica: [
        'Compare com o exemplo da lição "Services": é a mesma estrutura.',
        'selector é um mapa: na linha de baixo e 2 espaços para dentro, app: web.',
        'type: ClusterIP / selector: app: web / ports: - port: 80, targetPort: 80.',
      ],
      solucao: `apiVersion: v1
kind: Service
metadata:
  name: web-svc
spec:
  type: ClusterIP
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80`,
      testes: [
        teste({ descricao: 'O Service web-svc existe', dica: 'Preencha metadata.name: web-svc e todos os TODO (um valor vazio impede o apply).' },
          { tipo: 'recurso-existe', kind: 'Service', nome: 'web-svc' }),
        teste({ descricao: 'O Service é do tipo ClusterIP', dica: 'Em spec, escreva type: ClusterIP (C, I e P maiúsculos).' },
          { tipo: 'service-tipo', service: 'web-svc', serviceType: 'ClusterIP' }),
        teste({ descricao: 'O Service seleciona pods com app=web', dica: 'Em spec.selector, escreva app: web.' },
          { tipo: 'service-selector', service: 'web-svc', selector: { app: 'web' } }),
      ],
    }),

    exercicio({
      id: 'svc-datasource-pod',
      titulo: 'Service apontando para Pod existente',
      dificuldade: 'medio',
      existentes: POD_BACKEND,
      resumo: `
        <p>Outro time já criou um Pod chamado <code>backend-pod</code>. Você não sabe as labels dele de cabeça: vai
        <b>consultar o cluster</b> antes de escrever o Service.</p>
        <ol>
          <li>No terminal, rode <code>kubectl describe pod backend-pod</code> (ou <code>kubectl get pods --show-labels</code>) e
            anote a label e a porta do container.</li>
          <li>Crie o Service <code>backend-svc</code> do tipo <code>ClusterIP</code>.</li>
          <li>No <code>selector</code>, use a label que você encontrou.</li>
          <li>O Service atende na porta <code>80</code> e entrega na porta do container (<code>targetPort</code>) que você encontrou.</li>
        </ol>
        <p><b>No cluster:</b> se o selector não bater com a label do Pod, o Service é criado mas fica sem destino (sem
        endpoints). É um erro silencioso: por isso se olha o cluster antes.</p>`,
      inicial: esqueletoService(),
      dica: [
        'A label e a porta estão na saída do kubectl describe pod backend-pod (Labels e Port).',
        'A label é app: backend e o container escuta na 8080.',
        'selector: app: backend / ports: - port: 80, targetPort: 8080.',
      ],
      solucao: `apiVersion: v1
kind: Service
metadata:
  name: backend-svc
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
    - port: 80
      targetPort: 8080`,
      testes: [
        teste({ descricao: 'O Service backend-svc existe', dica: 'Preencha metadata.name: backend-svc e todos os TODO.' },
          { tipo: 'recurso-existe', kind: 'Service', nome: 'backend-svc' }),
        teste({ descricao: 'O Service é do tipo ClusterIP', dica: 'Em spec, escreva type: ClusterIP.' },
          { tipo: 'service-tipo', nome: 'backend-svc', serviceType: 'ClusterIP' }),
        teste({ descricao: 'O Service seleciona pods com app=backend e entrega na 8080', dica: 'Use a label do Pod existente (app: backend) no selector e targetPort: 8080.' },
          { tipo: 'service-selector', nome: 'backend-svc', chave: 'app', valor: 'backend' },
          { tipo: 'campo', kind: 'Service', nome: 'backend-svc', caminho: 'spec.ports[0].targetPort', valor: 8080 }),
      ],
    }),

    exercicio({
      id: 'svc-multi-port',
      titulo: 'Service com Múltiplas Portas',
      dificuldade: 'medio',
      resumo: `
        <p>Uma aplicação atende os clientes numa porta e mostra métricas de monitoramento em outra. Um Service pode expor as
        duas. Quando há mais de uma porta, <b>cada uma precisa de um <code>name</code></b>.</p>
        <ol>
          <li>Crie o Service <code>multi-svc</code>, tipo <code>ClusterIP</code>, com <code>selector</code> <code>app: multi</code>.</li>
          <li>Primeira porta: <code>name: http</code>, <code>port: 80</code>, <code>targetPort: 8080</code>.</li>
          <li>Segunda porta (outro item da lista): <code>name: metrics</code>, <code>port: 9090</code>, <code>targetPort: 9090</code>.</li>
        </ol>
        <p><b>No cluster:</b> o mesmo endereço <code>multi-svc</code> atende nas duas portas. O Prometheus, por exemplo, procura
        a porta pelo nome <code>metrics</code>.</p>`,
      inicial: `
        apiVersion: v1
        kind: Service
        metadata:
          name: multi-svc
        spec:
          type: ClusterIP
          selector:
            app: multi
          ports:
            - name: http
              port:            # TODO: 80
              targetPort:      # TODO: 8080
            # TODO: o segundo item: name: metrics, port: 9090 e targetPort: 9090
      `,
      dica: [
        'ports é uma lista: a segunda porta começa com outro "- " alinhado com o primeiro.',
        '- name: metrics\n  port: 9090\n  targetPort: 9090',
      ],
      solucao: `apiVersion: v1
kind: Service
metadata:
  name: multi-svc
spec:
  type: ClusterIP
  selector:
    app: multi
  ports:
    - name: http
      port: 80
      targetPort: 8080
    - name: metrics
      port: 9090
      targetPort: 9090`,
      testes: [
        teste({ descricao: 'O Service multi-svc existe', dica: 'Preencha os TODO da porta http.' },
          { tipo: 'recurso-existe', kind: 'Service', nome: 'multi-svc' }),
        teste({ descricao: 'O Service é do tipo ClusterIP', dica: 'Mantenha type: ClusterIP.' },
          { tipo: 'service-tipo', service: 'multi-svc', serviceType: 'ClusterIP' }),
        teste({ descricao: 'O Service seleciona pods com app=multi e tem a porta metrics', dica: 'Acrescente o item - name: metrics com port: 9090 e targetPort: 9090.' },
          { tipo: 'service-selector', service: 'multi-svc', selector: { app: 'multi' } },
          { tipo: 'campo', kind: 'Service', nome: 'multi-svc', caminho: 'spec.ports[name=metrics].port', valor: 9090 }),
      ],
    }),

    exercicio({
      id: 'svc-nodeport',
      titulo: 'Service NodePort',
      dificuldade: 'medio',
      resumo: `
        <p>Para testar de fora do cluster sem balanceador, use um <b>NodePort</b>: a mesma porta fica aberta em todos os nós.</p>
        <ol>
          <li>Crie o Service <code>web-nodeport</code> com <code>type: NodePort</code>.</li>
          <li>Selecione os Pods com <code>app: web</code>.</li>
          <li>O Service atende na porta <code>80</code> e entrega na porta <code>8080</code> dos Pods.</li>
        </ol>
        <p><b>No cluster:</b> o Kubernetes escolhe uma porta entre 30000 e 32767 (o <code>nodePort</code>) e a abre em todos os
        nós. Quem acessar <code>IP-de-qualquer-nó:nodePort</code> chega nos Pods. Veja a porta escolhida com
        <code>kubectl get svc web-nodeport</code>.</p>`,
      inicial: esqueletoService(),
      dica: [
        'É um Service como o ClusterIP; só muda o type.',
        'type: NodePort / selector: app: web / port: 80 / targetPort: 8080.',
      ],
      solucao: `apiVersion: v1
kind: Service
metadata:
  name: web-nodeport
spec:
  type: NodePort
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080`,
      testes: [
        teste({ descricao: 'O Service web-nodeport existe', dica: 'Preencha metadata.name: web-nodeport e todos os TODO.' },
          { tipo: 'recurso-existe', kind: 'Service', nome: 'web-nodeport' }),
        teste({ descricao: 'O Service é do tipo NodePort', dica: 'Em spec, escreva type: NodePort (N e P maiúsculos).' },
          { tipo: 'service-tipo', service: 'web-nodeport', serviceType: 'NodePort' }),
        teste({ descricao: 'O Service seleciona pods com app=web', dica: 'Em spec.selector, escreva app: web.' },
          { tipo: 'service-selector', service: 'web-nodeport', selector: { app: 'web' } }),
      ],
    }),

    exercicio({
      id: 'svc-loadbalancer',
      titulo: 'Service LoadBalancer',
      dificuldade: 'medio',
      resumo: `
        <p>Para publicar uma API na internet, peça à nuvem um balanceador com <b>LoadBalancer</b>. Aqui a API usa HTTPS.</p>
        <ol>
          <li>Crie o Service <code>api-lb</code> com <code>type: LoadBalancer</code>.</li>
          <li>Selecione os Pods com <code>app: api</code>.</li>
          <li>O Service atende na porta <code>443</code> (a do HTTPS) e entrega na <code>8443</code> dos Pods.</li>
        </ol>
        <p><b>No cluster:</b> o controlador da nuvem cria o balanceador e coloca o IP público em <code>EXTERNAL-IP</code>
        (<code>kubectl get svc api-lb</code>). Enquanto isso, aparece <code>&lt;pending&gt;</code>.</p>`,
      inicial: esqueletoService(),
      dica: [
        'Mesma estrutura do ClusterIP; mudam o type e as portas.',
        'type: LoadBalancer / selector: app: api / port: 443 / targetPort: 8443.',
      ],
      solucao: `apiVersion: v1
kind: Service
metadata:
  name: api-lb
spec:
  type: LoadBalancer
  selector:
    app: api
  ports:
    - port: 443
      targetPort: 8443`,
      testes: [
        teste({ descricao: 'O Service api-lb existe', dica: 'Preencha metadata.name: api-lb e todos os TODO.' },
          { tipo: 'recurso-existe', kind: 'Service', nome: 'api-lb' }),
        teste({ descricao: 'O Service é do tipo LoadBalancer', dica: 'Em spec, escreva type: LoadBalancer (L e B maiúsculos).' },
          { tipo: 'service-tipo', service: 'api-lb', serviceType: 'LoadBalancer' }),
        teste({ descricao: 'O Service seleciona pods com app=api', dica: 'Em spec.selector, escreva app: api.' },
          { tipo: 'service-selector', service: 'api-lb', selector: { app: 'api' } }),
      ],
    }),

    exercicio({
      id: 'svc-externalname',
      titulo: 'ExternalName Service',
      dificuldade: 'medio',
      resumo: `
        <p>Sua aplicação usa uma API de fora do cluster. Em vez de espalhar o endereço <code>api.externo.com</code> pelo código,
        crie um apelido interno. Se o endereço mudar, você muda só o Service.</p>
        <ol>
          <li>Crie o Service <code>ext-api</code> com <code>type: ExternalName</code>.</li>
          <li>Em <code>spec</code>, escreva <code>externalName: api.externo.com</code>.</li>
          <li>Não use <code>selector</code> nem <code>ports</code>: este tipo não aponta para Pods.</li>
        </ol>
        <p><b>No cluster:</b> o DNS do cluster responde ao nome <code>ext-api</code> com um apelido (CNAME) para
        <code>api.externo.com</code>. Não há IP do Service nem repasse de tráfego.</p>`,
      inicial: `
        apiVersion: v1
        kind: Service
        metadata:
          name: ext-api
        spec:
          type:                # TODO: ExternalName
          # TODO: externalName: api.externo.com
      `,
      dica: [
        'Este Service tem só dois campos em spec: type e externalName.',
        'spec:\n  type: ExternalName\n  externalName: api.externo.com',
      ],
      solucao: `apiVersion: v1
kind: Service
metadata:
  name: ext-api
spec:
  type: ExternalName
  externalName: api.externo.com`,
      testes: [
        teste({ descricao: 'O Service ext-api existe', dica: 'Preencha o type: um valor vazio impede o apply.' },
          { tipo: 'recurso-existe', kind: 'Service', nome: 'ext-api' }),
        teste({ descricao: 'O Service é do tipo ExternalName e aponta para api.externo.com', dica: 'Em spec: type: ExternalName e externalName: api.externo.com.' },
          { tipo: 'service-tipo', service: 'ext-api', serviceType: 'ExternalName' },
          { tipo: 'campo', kind: 'Service', nome: 'ext-api', caminho: 'spec.externalName', valor: 'api.externo.com' }),
      ],
    }),

    licao('svc-dns', 'DNS interno: chamando pelo nome', 'medio', `
      <p>Decorar IPs não funciona num cluster onde tudo muda. Por isso o Kubernetes tem um <b>DNS interno</b> (o CoreDNS): cada
      Service ganha um nome, como na agenda do celular você liga para "Maria", e não para o número.</p>
      <ul>
        <li>Dentro do mesmo namespace, basta o nome: <code>http://api-svc</code>.</li>
        <li>De outro namespace: <code>api-svc.loja</code> (serviço.namespace).</li>
        <li>O nome completo: <code>api-svc.loja.svc.cluster.local</code>.</li>
      </ul>
      <p><b>Headless Service</b> (<code>clusterIP: None</code>): às vezes você não quer um IP único na frente dos Pods, e sim
      falar com <b>cada</b> Pod (cada réplica de um banco de dados, por exemplo). Sem IP do Service, o DNS responde com a lista
      de IPs dos Pods.</p>
      <p><b>Portas com nome e registros SRV:</b> quando a porta tem <code>name</code> (como <code>http</code>), o DNS também
      publica um registro SRV, <code>_http._tcp.api-svc.loja.svc.cluster.local</code>, que diz a porta além do endereço.
      Ferramentas de descoberta usam isso para achar "a porta http do serviço".</p>`,
    `
      apiVersion: v1
      kind: Service
      metadata:
        name: banco
      spec:
        clusterIP: None          # headless: o DNS devolve o IP de cada Pod
        selector:
          app: banco
        ports:
          - name: postgres       # porta com nome: gera o registro SRV _postgres._tcp.banco...
            port: 5432
            targetPort: 5432
    `),

    exercicio({
      id: 'svc-headless',
      titulo: 'Headless Service',
      dificuldade: 'medio',
      resumo: `
        <p>Um banco de dados com várias réplicas precisa que cada uma seja encontrada pelo nome, sem balanceamento no meio.
        Crie um Service headless para ele.</p>
        <ol>
          <li>Crie o Service <code>db-headless</code>.</li>
          <li>Em <code>spec</code>, escreva <code>clusterIP: None</code> (sem IP do Service).</li>
          <li>Selecione os Pods com <code>app: database</code>.</li>
          <li>Porta <code>5432</code> (a do PostgreSQL) no Service e no container.</li>
        </ol>
        <p><b>No cluster:</b> uma consulta de DNS a <code>db-headless</code> devolve o IP de cada Pod do banco. É o que o
        StatefulSet usa para dar nomes fixos a cada réplica.</p>`,
      inicial: `
        apiVersion: v1
        kind: Service
        metadata:
          name: db-headless
        spec:
          # TODO: clusterIP: None
          selector:
            # TODO: app: database
          ports:
            - port: 5432
              targetPort: 5432
      `,
      dica: [
        'Headless é um Service comum com uma linha a mais em spec.',
        'spec:\n  clusterIP: None\n  selector:\n    app: database',
      ],
      solucao: `apiVersion: v1
kind: Service
metadata:
  name: db-headless
spec:
  clusterIP: None
  selector:
    app: database
  ports:
    - port: 5432
      targetPort: 5432`,
      testes: [
        teste({ descricao: 'O Service db-headless existe', dica: 'Preencha o selector: um selector vazio impede o apply.' },
          { tipo: 'recurso-existe', kind: 'Service', nome: 'db-headless' }),
        teste({ descricao: 'O Service seleciona pods com app=database e não tem IP próprio', dica: 'Em spec: clusterIP: None e selector com app: database.' },
          { tipo: 'service-selector', service: 'db-headless', selector: { app: 'database' } },
          { tipo: 'campo', kind: 'Service', nome: 'db-headless', caminho: 'spec.clusterIP', valor: 'None' }),
      ],
    }),

    exercicio({
      id: 'svc-dns-srv',
      titulo: 'DNS SRV Records',
      dificuldade: 'dificil',
      resumo: `
        <p>Uma ferramenta de descoberta procura "a porta <code>http</code> do serviço" pelo registro SRV. Para o DNS publicar esse
        registro, a porta precisa de nome.</p>
        <ol>
          <li>Crie o Service <code>srv-svc</code>, tipo <code>ClusterIP</code>, com <code>selector</code> <code>app: srv-app</code>.</li>
          <li>Na porta, acrescente <code>name: http</code>, com <code>port: 80</code> e <code>targetPort: 80</code>.</li>
        </ol>
        <p><b>No cluster:</b> o CoreDNS publica <code>_http._tcp.srv-svc.default.svc.cluster.local</code>, que responde com o
        endereço e a porta 80.</p>`,
      inicial: esqueletoService(),
      dica: [
        'O nome da porta vai dentro do item da lista ports, junto de port e targetPort.',
        'ports:\n  - name: http\n    port: 80\n    targetPort: 80',
      ],
      solucao: `apiVersion: v1
kind: Service
metadata:
  name: srv-svc
spec:
  type: ClusterIP
  selector:
    app: srv-app
  ports:
    - name: http
      port: 80
      targetPort: 80`,
      testes: [
        teste({ descricao: 'O Service srv-svc existe', dica: 'Preencha metadata.name: srv-svc e todos os TODO.' },
          { tipo: 'recurso-existe', kind: 'Service', nome: 'srv-svc' }),
        teste({ descricao: 'O Service é do tipo ClusterIP', dica: 'Em spec, escreva type: ClusterIP.' },
          { tipo: 'service-tipo', service: 'srv-svc', serviceType: 'ClusterIP' }),
        teste({ descricao: 'O Service seleciona pods com app=srv-app e a porta se chama http', dica: 'selector com app: srv-app e, no item da porta, name: http.' },
          { tipo: 'service-selector', service: 'srv-svc', selector: { app: 'srv-app' } },
          { tipo: 'campo', kind: 'Service', nome: 'srv-svc', caminho: 'spec.ports[0].name', valor: 'http' }),
      ],
    }),

    licao('svc-endpoints-licao', 'Por trás do Service: EndpointSlices e topologia', 'dificil', `
      <p>Como o Service sabe para onde mandar o tráfego? Um controlador observa os Pods que batem com o <code>selector</code>
      e estão prontos (passaram na readinessProbe) e escreve a lista de IPs deles em objetos chamados <b>EndpointSlices</b>.
      É a lista de chamada da turma, atualizada a cada entrada e saída.</p>
      <ul>
        <li>Você não cria EndpointSlices à mão: basta o Service ter <code>selector</code>.</li>
        <li><code>kubectl get endpointslices</code> mostra a lista. Lista vazia = selector errado ou nenhum Pod pronto.</li>
      </ul>
      <p><b>Roteamento por topologia:</b> num cluster espalhado por várias zonas (prédios diferentes do datacenter), mandar o
      tráfego para um Pod de outra zona é mais lento e, na nuvem, custa mais. A annotation
      <code>service.kubernetes.io/topology-mode: Auto</code> pede ao Kubernetes que prefira os Pods da <b>mesma zona</b> de
      quem chamou, quando houver Pods suficientes nela.</p>
      <p>Annotations você já conhece: ficam em <code>metadata.annotations</code>. Esta é lida pelo controlador de
      EndpointSlices.</p>`,
    `
      apiVersion: v1
      kind: Service
      metadata:
        name: perto-de-mim
        annotations:
          service.kubernetes.io/topology-mode: Auto   # prefira Pods da mesma zona
      spec:
        selector:
          app: loja              # o controlador lista os Pods prontos com esta label nas EndpointSlices
        ports:
          - port: 80
            targetPort: 80
    `),

    exercicio({
      id: 'svc-endpoint-slices',
      titulo: 'EndpointSlices Awareness',
      dificuldade: 'dificil',
      resumo: `
        <p>As EndpointSlices nascem do <code>selector</code> do Service. Crie o Service que ativa esse mecanismo e depois
        confira o que o cluster calculou.</p>
        <ol>
          <li>Crie o Service <code>slice-svc</code>, tipo <code>ClusterIP</code>, com <code>selector</code> <code>app: slice-app</code>.</li>
          <li>Porta <code>80</code> no Service e no container.</li>
          <li>Aplique e rode <code>kubectl describe svc slice-svc</code>: veja a linha <code>Endpoints</code>.</li>
        </ol>
        <p><b>No cluster:</b> enquanto não houver Pods com <code>app: slice-app</code>, a lista fica vazia. Quando um Pod com
        essa label ficar pronto, o IP dele entra sozinho na EndpointSlice.</p>`,
      inicial: esqueletoService(),
      dica: [
        'Sem selector não há EndpointSlice automática: ele é a peça principal aqui.',
        'type: ClusterIP / selector: app: slice-app / port: 80 / targetPort: 80.',
      ],
      solucao: `apiVersion: v1
kind: Service
metadata:
  name: slice-svc
spec:
  type: ClusterIP
  selector:
    app: slice-app
  ports:
    - port: 80
      targetPort: 80`,
      testes: [
        teste({ descricao: 'O Service slice-svc existe', dica: 'Preencha metadata.name: slice-svc e todos os TODO.' },
          { tipo: 'recurso-existe', kind: 'Service', nome: 'slice-svc' }),
        teste({ descricao: 'O Service é do tipo ClusterIP', dica: 'Em spec, escreva type: ClusterIP.' },
          { tipo: 'service-tipo', service: 'slice-svc', serviceType: 'ClusterIP' }),
        teste({ descricao: 'O Service seleciona pods com app=slice-app', dica: 'Em spec.selector, escreva app: slice-app.' },
          { tipo: 'service-selector', service: 'slice-svc', selector: { app: 'slice-app' } }),
      ],
    }),

    exercicio({
      id: 'svc-topology',
      titulo: 'Service Topology Awareness',
      dificuldade: 'dificil',
      resumo: `
        <p>Seu cluster tem nós em três zonas. Peça ao Kubernetes que mantenha o tráfego na mesma zona sempre que possível.</p>
        <ol>
          <li>Crie o Service <code>topo-svc</code>, tipo <code>ClusterIP</code>, com <code>selector</code> <code>app: topo</code> e porta 80.</li>
          <li>Em <code>metadata.annotations</code>, escreva <code>service.kubernetes.io/topology-mode: Auto</code>.</li>
        </ol>
        <p><b>No cluster:</b> o controlador marca em cada endpoint a zona preferida, e o kube-proxy de cada nó passa a
        escolher os Pods da própria zona.</p>`,
      inicial: `
        apiVersion: v1
        kind: Service
        metadata:
          name: topo-svc
          # TODO: annotations: com service.kubernetes.io/topology-mode: Auto
        spec:
          type: ClusterIP
          selector:
            app: topo
          ports:
            - port: 80
              targetPort: 80
      `,
      dica: [
        'annotations fica em metadata, alinhado com name, como no exercício de annotations do tópico Básico.',
        'metadata:\n  name: topo-svc\n  annotations:\n    service.kubernetes.io/topology-mode: Auto',
      ],
      solucao: `apiVersion: v1
kind: Service
metadata:
  name: topo-svc
  annotations:
    service.kubernetes.io/topology-mode: Auto
spec:
  type: ClusterIP
  selector:
    app: topo
  ports:
    - port: 80
      targetPort: 80`,
      testes: [
        teste({ descricao: 'O Service topo-svc existe', dica: 'Mantenha metadata.name: topo-svc.' },
          { tipo: 'recurso-existe', kind: 'Service', nome: 'topo-svc' }),
        teste({ descricao: 'O Service é do tipo ClusterIP', dica: 'Mantenha type: ClusterIP.' },
          { tipo: 'service-tipo', service: 'topo-svc', serviceType: 'ClusterIP' }),
        teste({ descricao: 'O Service seleciona pods com app=topo e pede roteamento por zona', dica: 'Em metadata.annotations: service.kubernetes.io/topology-mode: Auto.' },
          { tipo: 'service-selector', service: 'topo-svc', selector: { app: 'topo' } },
          { tipo: 'campo', kind: 'Service', nome: 'topo-svc', caminho: 'metadata.annotations["service.kubernetes.io/topology-mode"]', valor: 'Auto' }),
      ],
    }),

    licao('svc-ingress', 'Ingress: a placa de direção na entrada', 'medio', `
      <p>Com um LoadBalancer por serviço, dez serviços viram dez IPs públicos (e dez contas para pagar). O <b>Ingress</b> põe
      <b>uma entrada só</b> na frente de vários Services e decide, pelo <b>endereço</b> (host) e pelo <b>caminho</b> (path)
      da requisição HTTP, para onde mandar. É a placa na entrada do hospital: "Pediatria, 2º andar; Raio-X, térreo".</p>
      <ul>
        <li>O Ingress é só a <b>regra</b>. Quem a executa é um <b>Ingress Controller</b> (NGINX, Traefik, o ALB da AWS, o
          Application Gateway da Azure), que precisa estar instalado no cluster.</li>
        <li><code>apiVersion: networking.k8s.io/v1</code> e <code>kind: Ingress</code>.</li>
        <li><code>rules[].host</code>: o domínio. <code>paths[].path</code>: o caminho. <code>pathType: Prefix</code>: vale para
          tudo que começa com esse caminho.</li>
        <li><code>backend.service.name</code> e <code>backend.service.port.number</code>: para qual Service e porta mandar.</li>
        <li>HTTPS: um bloco <code>tls</code> com o nome de um Secret que guarda o certificado.</li>
      </ul>`,
    `
      apiVersion: networking.k8s.io/v1
      kind: Ingress
      metadata:
        name: hospital
      spec:
        rules:
          - host: hospital.exemplo.com   # para este domínio...
            http:
              paths:
                - path: /pediatria       # ...e este caminho (e tudo abaixo dele)...
                  pathType: Prefix
                  backend:
                    service:
                      name: pediatria-svc  # ...mande para este Service
                      port:
                        number: 80         # na porta 80 dele
    `),

    exercicio({
      id: 'svc-ingress-exercicio',
      titulo: 'Ingress com regra de host',
      dificuldade: 'dificil',
      resumo: `
        <p>O site deve responder em <code>app.exemplo.com</code>. Você vai criar a regra de entrada que leva esse endereço ao
        Service <code>web-svc</code>.</p>
        <ol>
          <li>Crie o Ingress <code>meu-ingress</code> com <code>apiVersion: networking.k8s.io/v1</code>.</li>
          <li>Em <code>rules</code>, um item com <code>host: app.exemplo.com</code>.</li>
          <li>No caminho, <code>path: /</code> e <code>pathType: Prefix</code> (o site inteiro).</li>
          <li>No <code>backend</code>, o Service <code>web-svc</code> na porta <code>80</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Ingress Controller lê a regra e passa a encaminhar toda requisição para
        <code>app.exemplo.com</code> ao <code>web-svc</code>, que entrega a um dos Pods.</p>`,
      inicial: `
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: meu-ingress
        spec:
          rules:
            - host:            # TODO: app.exemplo.com
              http:
                paths:
                  - path:      # TODO: /
                    pathType:  # TODO: Prefix
                    backend:
                      service:
                        name:  # TODO: web-svc
                        port:
                          number:   # TODO: 80
      `,
      dica: [
        'Compare com o exemplo da lição "Ingress": a estrutura é a mesma.',
        'Os valores: host app.exemplo.com, path /, pathType Prefix, service web-svc, port.number 80.',
      ],
      solucao: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: meu-ingress
spec:
  rules:
    - host: app.exemplo.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-svc
                port:
                  number: 80`,
      testes: [
        teste({ descricao: 'O Ingress meu-ingress existe', dica: 'Preencha todos os TODO: um campo vazio impede o apply.' },
          { tipo: 'recurso-existe', kind: 'Ingress', nome: 'meu-ingress' }),
        teste({ descricao: 'O Ingress tem regra para app.exemplo.com que leva ao web-svc', dica: 'Em rules, host: app.exemplo.com e backend.service.name: web-svc.' },
          { tipo: 'ingress-existe', ingress: 'meu-ingress', host: 'app.exemplo.com' },
          { tipo: 'campo', kind: 'Ingress', nome: 'meu-ingress', caminho: 'spec.rules[0].http.paths[0].backend.service.name', valor: 'web-svc' }),
      ],
    }),

    licao('svc-outputs-dependencias', 'Valores que o cluster preenche', 'medio', `
      <p>Alguns campos você <b>não</b> escreve: o cluster preenche quando cria o recurso. Por exemplo:</p>
      <ul>
        <li><code>spec.clusterIP</code> do Service: o IP interno sorteado.</li>
        <li><code>spec.ports[].nodePort</code> de um NodePort: a porta escolhida entre 30000 e 32767.</li>
        <li><code>status.loadBalancer</code> de um LoadBalancer: o IP público, quando a nuvem terminar de criar.</li>
        <li><code>status.availableReplicas</code> de um Deployment: quantas cópias estão prontas.</li>
      </ul>
      <p>Você vê esses valores com <code>kubectl get svc NOME -o yaml</code> ou na aba <b>📦 Estado</b>.</p>
      <p><b>Como um recurso usa o outro?</b> No Kubernetes, quase sempre <b>pelo nome</b>: o Ingress aponta para o Service
      <code>web-svc</code>, e o Service acha os Pods pelas labels. Ninguém precisa saber o IP. Se o Service for recriado com
      outro IP, o Ingress continua funcionando.</p>
      <p>Para quem vem do Terraform: lá a ligação é explícita (<code>aws_lb.web.dns_name</code>) e o <code>output</code>
      mostra os valores calculados. Aqui a ligação é por nome e label, e os valores calculados ficam em <code>status</code>
      e em alguns campos de <code>spec</code>.</p>`),

    exercicio({
      id: 'svc-ingress-output-exercicio',
      titulo: 'Ingress referenciando Service existente',
      dificuldade: 'medio',
      xp: 20,
      existentes: SVC_WEB,
      resumo: `
        <p>O Service <code>web-svc</code> já existe no cluster. Você vai publicá-lo em <code>web.exemplo.com</code> sem saber o IP
        dele: o Ingress o encontra pelo nome.</p>
        <ol>
          <li>Rode <code>kubectl get svc web-svc</code> no terminal: veja o <code>CLUSTER-IP</code> que o cluster preencheu e a porta.</li>
          <li>Crie o Ingress <code>web-ingress</code> com <code>host: web.exemplo.com</code>, <code>path: /</code> e <code>pathType: Prefix</code>.</li>
          <li>No <code>backend</code>, use o <b>nome</b> <code>web-svc</code> e a porta <code>80</code> (não o IP).</li>
        </ol>
        <p><b>No cluster:</b> o Ingress Controller pergunta ao cluster quem é <code>web-svc</code> e encaminha para ele. Se o
        Service for recriado com outro IP, nada precisa mudar no Ingress.</p>`,
      inicial: `
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: web-ingress
        spec:
          rules:
            - host:            # TODO: web.exemplo.com
              http:
                paths:
                  - path: /
                    pathType: Prefix
                    backend:
                      service:
                        name:  # TODO: o NOME do Service que já existe
                        port:
                          number: 80
      `,
      dica: [
        'O Ingress aponta para o Service pelo nome, nunca pelo IP.',
        'host: web.exemplo.com e backend.service.name: web-svc.',
      ],
      solucao: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
spec:
  rules:
    - host: web.exemplo.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-svc
                port:
                  number: 80`,
      testes: [
        teste({ descricao: 'O Ingress web-ingress existe', dica: 'Preencha os TODO: um campo vazio impede o apply.' },
          { tipo: 'recurso-existe', kind: 'Ingress', nome: 'web-ingress' }),
        teste({ descricao: 'O Ingress tem regra para web.exemplo.com apontando para web-svc', dica: 'host: web.exemplo.com e backend.service.name: web-svc.' },
          { tipo: 'ingress-existe', ingress: 'web-ingress', host: 'web.exemplo.com' },
          { tipo: 'campo', kind: 'Ingress', nome: 'web-ingress', caminho: 'spec.rules[0].http.paths[0].backend.service.name', valor: 'web-svc' }),
      ],
    }),
  ],
};
