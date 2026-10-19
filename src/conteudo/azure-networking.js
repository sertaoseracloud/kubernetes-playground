// Módulo Azure: Networking para Kubernetes.
// Lições sobre Azure CNI vs Kubenet e AGIC.
// Exercícios com validação via recurso-existe, agic-anotacao e network-policy.

export const azureNetworking = {
  id: 'azure-networking',
  titulo: 'Networking Azure para K8s',
  descricao: 'Redes no AKS com Azure CNI, Kubenet e Application Gateway Ingress Controller.',
  icone: '🌐',
  itens: [
    {
      id: 'azure-cni-vs-kubenet',
      tipo: 'licao',
      titulo: 'Azure CNI vs Kubenet',
      dificuldade: 'dificil',
      xp: 5,
      resumo: `<p>O AKS oferece dois modelos de networking para conectar pods à rede virtual do Azure:</p>
        <table>
          <thead><tr><th>Aspecto</th><th>Kubenet</th><th>Azure CNI</th></tr></thead>
          <tbody>
            <tr><td>IPs dos Pods</td><td>CIDR interno, NAT para saída</td><td>IPs diretos da VNet</td></tr>
            <tr><td>Performance</td><td>Maior latência (NAT)</td><td>Performance nativa da VNet</td></tr>
            <tr><td>Integração VNet</td><td>Limitada (precisa de UDR)</td><td>Nativa (pods acessam VNets diretamente)</td></tr>
            <tr><td>Network Policies</td><td>Suportado (Calico)</td><td>Suportado (Azure NPM)</td></tr>
            <tr><td>Consumo de IPs</td><td>Baixo (CIDR separado)</td><td>Alto (cada pod consome IP da VNet)</td></tr>
          </tbody>
        </table>
        <p><b>Quando usar Kubenet</b>: clusters menores, desenvolvimento, quando o consumo de IPs da VNet é uma preocupação.</p>
        <p><b>Quando usar Azure CNI</b>: produção, necessidade de comunicação direta entre pods e outros serviços na VNet, requisitos de performance de rede.</p>
        <p>O <b>Pod CIDR</b> define o range de IPs disponíveis para pods. No Azure CNI, este range deve ser planejado junto com a subnet da VNet para evitar esgotamento de IPs.</p>`,
    },
    {
      id: 'azure-agic',
      tipo: 'licao',
      titulo: 'Application Gateway Ingress Controller (AGIC)',
      dificuldade: 'dificil',
      xp: 5,
      resumo: `<p>O <b>AGIC</b> conecta o Azure Application Gateway ao Kubernetes como Ingress Controller nativo:</p>
        <dl>
          <dt><b>Como funciona</b></dt><dd>O AGIC monitora objetos Ingress no cluster e configura automaticamente o Application Gateway com as rotas, backend pools e health probes correspondentes.</dd>
          <dt><b>Anotações principais</b></dt><dd>
            <ul>
              <li><code>appgw-ingress.k8s.io/backend-path-prefix</code>: prefixo de caminho para o backend.</li>
              <li><code>appgw-ingress.k8s.io/connection-draining</code>: habilita draining graceful durante deploys.</li>
              <li><code>appgw-ingress.k8s.io/request-timeout</code>: timeout de requisição em segundos.</li>
              <li><code>appgw-ingress.k8s.io/health-probe-status-codes</code>: códigos HTTP considerados saudáveis.</li>
            </ul>
          </dd>
          <dt><b>Vantagens</b></dt><dd>WAF integrado, SSL termination no gateway, suporte a múltiplos listeners e roteamento baseado em hostname/caminho.</dd>
        </dl>
        <p><b>Alternativas</b>: NGINX Ingress Controller (mais flexível, open source), Traefik, ou Envoy-based ingress controllers. O AGIC é ideal quando já se usa Azure Application Gateway.</p>`,
    },
    {
      id: 'azure-ingress-agic',
      tipo: 'exercicio',
      titulo: 'Ingress com anotações AGIC',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `
        <p>Na Azure, o <b>AGIC</b> transforma um Ingress em regras do <b>Application Gateway</b>. Como o ALB da AWS, as escolhas vão em annotations.</p>
        <ol>
          <li>No Ingress <code>app-agic-ingress</code>, a annotation <code>kubernetes.io/ingress.class: azure/application-gateway</code>.</li>
          <li>A annotation <code>appgw-ingress.k8s.io/request-timeout: "60"</code> (com aspas: annotations são texto).</li>
          <li>A regra do host <code>app.exemplo.com</code> leva <code>/</code> ao Service <code>app-service</code> na porta 80.</li>
        </ol>
        <p><b>No cluster:</b> o AGIC configura o Application Gateway com um listener para <code>app.exemplo.com</code>, os IPs dos Pods
        como destino e 60 segundos de tempo limite.</p>`,
      inicial: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-agic-ingress
  annotations:
    # TODO: kubernetes.io/ingress.class: azure/application-gateway
    # TODO: appgw-ingress.k8s.io/request-timeout: "60"
spec:
  rules:
    - host:              # TODO: app.exemplo.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name:    # TODO: app-service
                port:
                  number: 80
`,
      dica: [
        "As duas annotations ficam em metadata.annotations, uma por linha.",
        "request-timeout: \"60\" com aspas; sem elas, 60 vira número e a annotation é recusada.",
      ],
      solucao: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-agic-ingress
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
    appgw-ingress.k8s.io/request-timeout: "60"
spec:
  rules:
    - host: app.exemplo.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 80`,
      testes: [
        {
          descricao: 'O Ingress app-agic-ingress existe',
          dica: "Preencha os TODO: um campo vazio impede o apply.",
          regras: [{ tipo: 'recurso-existe', kind: 'Ingress', nome: 'app-agic-ingress' }],
        },
        {
          descricao: 'O Ingress tem anotação AGIC configurada',
          dica: "Em metadata.annotations: kubernetes.io/ingress.class: azure/application-gateway.",
          regras: [{ tipo: 'agic-anotacao', ingress: 'app-agic-ingress' }],
        },
      ],
    },
    {
      id: 'azure-network-policy',
      tipo: 'exercicio',
      titulo: 'NetworkPolicy com labels Azure',
      dificuldade: 'dificil',
      xp: 20,
      resumo: `
        <p>No AKS, as NetworkPolicies são aplicadas pelo Azure CNI (com Cilium) ou pelo Calico. A regra é a mesma de qualquer cluster.</p>
        <ol>
          <li>A NetworkPolicy <code>restrict-azure-app</code> (namespace <code>default</code>) seleciona os Pods com <code>app: azure-web</code>.</li>
          <li><code>policyTypes: [Ingress]</code>.</li>
          <li>Em <code>ingress[0].from</code>, só os Pods com <code>role: frontend</code>, na porta <code>8080/TCP</code>.</li>
        </ol>
        <p><b>No cluster:</b> os Pods <code>azure-web</code> só recebem conexões do frontend na 8080; o resto é descartado.</p>`,
      inicial: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-azure-app
  namespace: default
spec:
  podSelector:
    matchLabels:
      app:               # TODO: azure-web
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              role:      # TODO: frontend
      ports:
        - protocol: TCP
          port:          # TODO: 8080
`,
      dica: [
        "O podSelector de cima é QUEM é protegido; o de dentro do from é QUEM pode entrar.",
        "app: azure-web em cima; role: frontend no from; port: 8080.",
      ],
      solucao: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-azure-app
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: azure-web
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              role: frontend
      ports:
        - protocol: TCP
          port: 8080`,
      testes: [
        {
          descricao: 'A NetworkPolicy restrict-azure-app existe',
          dica: "Preencha os TODO: um campo vazio impede o apply.",
          regras: [{ tipo: 'recurso-existe', kind: 'NetworkPolicy', nome: 'restrict-azure-app' }],
        },
        {
          descricao: 'A NetworkPolicy restringe tráfego corretamente',
          dica: "podSelector com app: azure-web e, em from, role: frontend na porta 8080.",
          regras: [{ tipo: 'network-policy', nome: 'restrict-azure-app', podSelector: 'azure-web' }, { tipo: 'campo', kind: 'NetworkPolicy', nome: 'restrict-azure-app', caminho: 'spec.podSelector.matchLabels.app', valor: 'azure-web' }, { tipo: 'campo', kind: 'NetworkPolicy', nome: 'restrict-azure-app', caminho: 'spec.ingress[0].from[0].podSelector.matchLabels.role', valor: 'frontend' }, { tipo: 'campo', kind: 'NetworkPolicy', nome: 'restrict-azure-app', caminho: 'spec.ingress[0].ports[0].port', valor: 8080 }],
        },
      ],
    },
  ],
};