// Módulo 3: Services e Networking.
// Lições e exercícios sobre tipos de Service, DNS interno e Ingress.

export const services = {
  id: 'services',
  titulo: 'Services e Networking',
  descricao: 'Conectando aplicações dentro e fora do cluster com Services, DNS e Ingress.',
  icone: '🔗',
  itens: [
    {
      id: 'svc-tipos',
      tipo: 'licao',
      titulo: 'Tipos de Service',
      dificuldade: 'facil',
      xp: 5,
      resumo: `<p>Um <b>Service</b> é um endereço fixo que conecta pods, mesmo quando eles mudam de IP. Existem quatro tipos principais:</p>
        <dl>
          <dt><b>ClusterIP</b></dt><dd>(padrão) Expõe o serviço apenas dentro do cluster. Outros pods podem acessar via nome ou IP virtual.</dd>
          <dt><b>NodePort</b></dt><dd>Abre uma porta (30000-32767) em todos os nós do cluster. Permite acesso externo direto pelo IP do nó.</dd>
          <dt><b>LoadBalancer</b></dt><dd>Cria um balanceador de carga na nuvem provedora (AWS ELB, GCP LB). É a forma mais comum de expor serviços em produção.</dd>
          <dt><b>ExternalName</b></dt><dd>Mapeia o service para um DNS externo (CNAME). Não cria proxy nem endpoints — apenas redireciona o nome.</dd>
        </dl>
        <p>O Service usa <b>selectors</b> para encontrar os pods alvo. Qualquer pod com labels que batem com o selector entra automaticamente no grupo.</p>`,
    },
    {
      id: 'svc-dns',
      tipo: 'licao',
      titulo: 'DNS interno e descoberta',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O Kubernetes roda um servidor DNS interno (CoreDNS) que dá um nome estável a cada Service:</p>
        <ul>
          <li><code>&lt;service&gt;.&lt;namespace&gt;.svc.cluster.local</code> — nome completo (FQDN).</li>
          <li><code>&lt;service&gt;</code> — atalho dentro do mesmo namespace.</li>
        </ul>
        <p>Isso permite que pods se comuniquem por nome, sem precisar saber IPs. Exemplo: um pod no namespace <code>default</code> acessa <code>api-svc</code> simplesmente usando <code>http://api-svc</code>.</p>
        <p><b>Headless Services</b> (<code>clusterIP: None</code>) não recebem IP virtual. Em vez disso, o DNS retorna os IPs individuais dos pods. Útil para bancos de dados StatefulSet onde cada réplica precisa de identidade própria.</p>
        <p>A descoberta de serviços também funciona via <b>Environment Variables</b>: o kubelet injeta variáveis como <code>SERVICE_NAME_SERVICE_HOST</code> em cada pod, mas o DNS é preferido por ser dinâmico.</p>`,
    },
    {
      id: 'svc-ingress',
      tipo: 'licao',
      titulo: 'Ingress e regras de roteamento',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>O <b>Ingress</b> é um recurso de camada 7 (HTTP/HTTPS) que roteia tráfego externo para Services internos baseado em host e path.</p>
        <p>Estrutura básica:</p>
        <pre><code>apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
spec:
  rules:
    - host: app.exemplo.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-svc
                port:
                  number: 80</code></pre>
        <p>Pontos importantes:</p>
        <ul>
          <li>O Ingress <b>não</b> expõe nada sozinho — precisa de um <b>Ingress Controller</b> (nginx-ingress, Traefik, etc.) rodando no cluster.</li>
          <li>Várias regras podem coexistir: diferentes hosts ou paths apontam para serviços distintos.</li>
          <li><b>TLS</b>: adicione <code>tls</code> com um Secret contendo certificado e chave para habilitar HTTPS.</li>
          <li><code>pathType</code> pode ser <code>Prefix</code>, <code>Exact</code> ou <code>ImplementationSpecific</code>.</li>
        </ul>`,
    },
    {
      id: 'svc-clusterip-exercicio',
      tipo: 'exercicio',
      titulo: 'Service ClusterIP',
      dificuldade: 'facil',
      xp: 10,
      resumo: `<p>Crie um Service chamado <code>web-svc</code> do tipo <b>ClusterIP</b> que aponte para pods com label <code>app: web</code> na porta 80.</p>
        <p>Dica: use <code>selector</code> para vincular o Service aos pods alvo.</p>`,
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
        {
          descricao: 'O Service web-svc existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Service', nome: 'web-svc' }],
        },
        {
          descricao: 'O Service é do tipo ClusterIP',
          regras: [{ tipo: 'service-tipo', service: 'web-svc', tipo: 'ClusterIP' }],
        },
        {
          descricao: 'O Service seleciona pods com app=web',
          regras: [{ tipo: 'service-selector', service: 'web-svc', selector: { app: 'web' } }],
        },
      ],
    },
    {
      id: 'svc-ingress-exercicio',
      tipo: 'exercicio',
      titulo: 'Ingress com regra de host',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie um Ingress chamado <code>meu-ingress</code> que roteie tráfego do host <code>app.exemplo.com</code> (path <code>/</code>) para o Service <code>web-svc</code> na porta 80.</p>
        <p>Use <code>pathType: Prefix</code> e a API <code>networking.k8s.io/v1</code>.</p>`,
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
        {
          descricao: 'O Ingress meu-ingress existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Ingress', nome: 'meu-ingress' }],
        },
        {
          descricao: 'O Ingress tem regra para app.exemplo.com',
          regras: [{ tipo: 'ingress-existe', ingress: 'meu-ingress', host: 'app.exemplo.com' }],
        },
      ],
    },
    {
      id: 'svc-nodeport',
      tipo: 'exercicio',
      titulo: 'Service NodePort',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Service chamado <code>web-nodeport</code> do tipo <b>NodePort</b> que selecione pods com label <code>app: web</code>, mapeando a porta 80 do service para a porta 8080 dos pods.</p>`,
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
        {
          descricao: 'O Service web-nodeport existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Service', nome: 'web-nodeport' }],
        },
        {
          descricao: 'O Service é do tipo NodePort',
          regras: [{ tipo: 'service-tipo', service: 'web-nodeport', tipo: 'NodePort' }],
        },
        {
          descricao: 'O Service seleciona pods com app=web',
          regras: [{ tipo: 'service-selector', service: 'web-nodeport', selector: { app: 'web' } }],
        },
      ],
    },
    {
      id: 'svc-loadbalancer',
      tipo: 'exercicio',
      titulo: 'Service LoadBalancer',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Service chamado <code>api-lb</code> do tipo <b>LoadBalancer</b> que selecione pods com label <code>app: api</code> na porta 443 (targetPort 8443).</p>`,
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
        {
          descricao: 'O Service api-lb existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Service', nome: 'api-lb' }],
        },
        {
          descricao: 'O Service é do tipo LoadBalancer',
          regras: [{ tipo: 'service-tipo', service: 'api-lb', tipo: 'LoadBalancer' }],
        },
        {
          descricao: 'O Service seleciona pods com app=api',
          regras: [{ tipo: 'service-selector', service: 'api-lb', selector: { app: 'api' } }],
        },
      ],
    },
    {
      id: 'svc-headless',
      tipo: 'exercicio',
      titulo: 'Headless Service',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Service chamado <code>db-headless</code> do tipo <b>ClusterIP</b> com <code>clusterIP: None</code> (headless), selecionando pods com label <code>app: database</code> na porta 5432.</p>
        <p>Services headless retornam IPs individuais dos pods via DNS em vez de um IP virtual.</p>`,
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
        {
          descricao: 'O Service db-headless existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Service', nome: 'db-headless' }],
        },
        {
          descricao: 'O Service seleciona pods com app=database',
          regras: [{ tipo: 'service-selector', service: 'db-headless', selector: { app: 'database' } }],
        },
      ],
    },
    {
      id: 'svc-externalname',
      tipo: 'exercicio',
      titulo: 'ExternalName Service',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Service chamado <code>ext-api</code> do tipo <b>ExternalName</b> que aponte para o DNS externo <code>api.externo.com</code>.</p>
        <p>ExternalName cria um CNAME no DNS do cluster — não há proxy nem endpoints.</p>`,
      solucao: `apiVersion: v1
kind: Service
metadata:
  name: ext-api
spec:
  type: ExternalName
  externalName: api.externo.com`,
      testes: [
        {
          descricao: 'O Service ext-api existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Service', nome: 'ext-api' }],
        },
        {
          descricao: 'O Service é do tipo ExternalName',
          regras: [{ tipo: 'service-tipo', service: 'ext-api', tipo: 'ExternalName' }],
        },
      ],
    },
    {
      id: 'svc-multi-port',
      tipo: 'exercicio',
      titulo: 'Service com Múltiplas Portas',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um Service chamado <code>multi-svc</code> do tipo <b>ClusterIP</b> que selecione pods com label <code>app: multi</code> e exponha duas portas:</p>
        <ul>
          <li><code>http</code>: porta 80 → targetPort 8080.</li>
          <li><code>metrics</code>: porta 9090 → targetPort 9090.</li>
        </ul>`,
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
        {
          descricao: 'O Service multi-svc existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Service', nome: 'multi-svc' }],
        },
        {
          descricao: 'O Service é do tipo ClusterIP',
          regras: [{ tipo: 'service-tipo', service: 'multi-svc', tipo: 'ClusterIP' }],
        },
        {
          descricao: 'O Service seleciona pods com app=multi',
          regras: [{ tipo: 'service-selector', service: 'multi-svc', selector: { app: 'multi' } }],
        },
      ],
    },
    {
      id: 'svc-endpoint-slices',
      tipo: 'exercicio',
      titulo: 'EndpointSlices Awareness',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie um Service chamado <code>slice-svc</code> do tipo <b>ClusterIP</b> que selecione pods com label <code>app: slice-app</code> na porta 80.</p>
        <p>O Kubernetes gera EndpointSlices automaticamente para Services com selectors. Este exercício foca na criação do Service que ativa esse mecanismo.</p>`,
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
        {
          descricao: 'O Service slice-svc existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Service', nome: 'slice-svc' }],
        },
        {
          descricao: 'O Service é do tipo ClusterIP',
          regras: [{ tipo: 'service-tipo', service: 'slice-svc', tipo: 'ClusterIP' }],
        },
        {
          descricao: 'O Service seleciona pods com app=slice-app',
          regras: [{ tipo: 'service-selector', service: 'slice-svc', selector: { app: 'slice-app' } }],
        },
      ],
    },
    {
      id: 'svc-topology',
      tipo: 'exercicio',
      titulo: 'Service Topology Awareness',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie um Service chamado <code>topo-svc</code> do tipo <b>ClusterIP</b> que selecione pods com label <code>app: topo</code> na porta 80 e tenha a annotation <code>service.kubernetes.io/topology-mode: Auto</code> para habilitar roteamento topológico.</p>`,
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
        {
          descricao: 'O Service topo-svc existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Service', nome: 'topo-svc' }],
        },
        {
          descricao: 'O Service é do tipo ClusterIP',
          regras: [{ tipo: 'service-tipo', service: 'topo-svc', tipo: 'ClusterIP' }],
        },
        {
          descricao: 'O Service seleciona pods com app=topo',
          regras: [{ tipo: 'service-selector', service: 'topo-svc', selector: { app: 'topo' } }],
        },
      ],
    },
    {
      id: 'svc-datasource-pod',
      tipo: 'exercicio',
      titulo: 'Service apontando para Pod existente',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>No cluster já existe um Pod chamado <code>backend-pod</code> com a label <code>app: backend</code> e porta 8080.</p>
        <p>Crie um Service chamado <code>backend-svc</code> do tipo <b>ClusterIP</b> que aponte para esse Pod usando o selector correto, mapeando a porta 80 do Service para a porta 8080 do Pod.</p>
        <p>Assim como no Terraform usamos <code>data "kubernetes_pod"</code> para ler recursos existentes, no Kubernetes real você consulta o estado do cluster (<code>kubectl get pod backend-pod -o yaml</code>) para descobrir as labels antes de criar o Service.</p>`,
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
        {
          descricao: 'O Service backend-svc existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Service', nome: 'backend-svc' }],
        },
        {
          descricao: 'O Service é do tipo ClusterIP',
          regras: [{ tipo: 'service-tipo', service: 'backend-svc', tipo: 'ClusterIP' }],
        },
        {
          descricao: 'O Service seleciona pods com app=backend',
          regras: [{ tipo: 'service-selector', service: 'backend-svc', selector: { app: 'backend' } }],
        },
      ],
    },
    {
      id: 'svc-dns-srv',
      tipo: 'exercicio',
      titulo: 'DNS SRV Records',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `<p>Crie um Service chamado <code>srv-svc</code> do tipo <b>ClusterIP</b> com portas nomeadas (<code>http</code> na porta 80) que selecione pods com label <code>app: srv-app</code>.</p>
        <p>Portas nomeadas permitem que o CoreDNS gere registros SRV (<code>_http._tcp.srv-svc.default.svc.cluster.local</code>) para descoberta avançada.</p>`,
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
        {
          descricao: 'O Service srv-svc existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Service', nome: 'srv-svc' }],
        },
        {
          descricao: 'O Service é do tipo ClusterIP',
          regras: [{ tipo: 'service-tipo', service: 'srv-svc', tipo: 'ClusterIP' }],
        },
        {
          descricao: 'O Service seleciona pods com app=srv-app',
          regras: [{ tipo: 'service-selector', service: 'srv-svc', selector: { app: 'srv-app' } }],
        },
      ],
    },
  ],
};