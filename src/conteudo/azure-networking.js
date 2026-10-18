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
      resumo: `<p>Crie um <b>Ingress</b> chamado <code>app-agic-ingress</code> configurado com anotações do Application Gateway Ingress Controller.</p>
        <ul>
          <li>Hostname: <code>app.exemplo.com</code></li>
          <li>Service backend: <code>app-service</code> na porta <code>80</code></li>
          <li>Anotação <code>kubernetes.io/ingress.class</code> com valor <code>azure/application-gateway</code></li>
          <li>Anotação <code>appgw-ingress.k8s.io/request-timeout</code> com valor <code>60</code></li>
        </ul>`,
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
          regras: [{ tipo: 'recurso-existe', kind: 'Ingress', nome: 'app-agic-ingress' }],
        },
        {
          descricao: 'O Ingress tem anotação AGIC configurada',
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
      resumo: `<p>Crie uma <b>NetworkPolicy</b> chamada <code>restrict-azure-app</code> que restrinja o tráfego de entrada para pods com label <code>app: azure-web</code>.</p>
        <ul>
          <li>Aplique no namespace <code>default</code></li>
          <li>Permita tráfego de entrada apenas de pods com label <code>role: frontend</code></li>
          <li>Porta permitida: <code>8080</code> (TCP)</li>
        </ul>`,
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
          regras: [{ tipo: 'recurso-existe', kind: 'NetworkPolicy', nome: 'restrict-azure-app' }],
        },
        {
          descricao: 'A NetworkPolicy restringe tráfego corretamente',
          regras: [{ tipo: 'network-policy', nome: 'restrict-azure-app', podSelector: 'azure-web' }],
        },
      ],
    },
  ],
};