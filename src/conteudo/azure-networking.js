// Módulo Azure, tópico 3: rede no AKS (Azure CNI com Cilium, AGIC, App Routing e o Load Balancer da Azure).
// Segue docs/didatica.md: lição com exemplo comentado, passos, esqueleto, dicas e "como corrigir".
import { licao, exercicio, teste, existe, campo } from './util.js';

const AGIC = 'appgw-ingress.k8s.io';
const LB = 'service.beta.kubernetes.io';

/** Um Ingress que leva / ao Service `servico`; `classe` é o ingressClassName e `anotacoes` vão em metadata. */
const ingress = (nome, servico, classe, anotacoes = '', extraSpec = '') => `
  apiVersion: networking.k8s.io/v1
  kind: Ingress
  metadata:
    name: ${nome}
${anotacoes ? `    annotations:\n${anotacoes}\n` : ''}  spec:
    ingressClassName: ${classe}
${extraSpec}    rules:
      - host: loja.contoso.com
        http:
          paths:
            - path: /
              pathType: Prefix
              backend:
                service:
                  name: ${servico}
                  port:
                    number: 80
`;

/** Um Service LoadBalancer para os Pods app: api; `anotacoes` entram em metadata.annotations. */
const serviceLb = (nome, anotacoes) => `
  apiVersion: v1
  kind: Service
  metadata:
    name: ${nome}
    annotations:
${anotacoes}
  spec:
    type: LoadBalancer
    selector:
      app: api
    ports:
      - port: 80
        targetPort: 8080
`;

export const azureNetworking = {
  id: 'azure-networking',
  titulo: 'Rede no AKS',
  descricao: 'Azure CNI com Cilium, AGIC, App Routing e o Load Balancer da Azure.',
  icone: '🌐',
  itens: [
    licao('azure-cni-vs-kubenet', 'Azure CNI vs Kubenet', 'dificil', `
      <p>A rede do AKS decide <b>de onde vem o IP de cada Pod</b>. Pense nos endereços de um condomínio: cada casa pode ter um número
      da rua (IP da VNet) ou um número interno do condomínio (IP privado, com uma portaria que traduz).</p>
      <ul>
        <li><b>Azure CNI (VNet)</b>: cada Pod pega um IP da sub-rede da VNet. Outros serviços da Azure alcançam o Pod direto, mas a
          sub-rede precisa ser grande.</li>
        <li><b>Azure CNI Overlay</b> (o recomendado): os Pods usam uma faixa privada separada (o <i>Pod CIDR</i>, como
          <code>192.168.0.0/16</code>), e só os nós gastam IPs da VNet. Escala para muitos Pods sem esgotar a rede.</li>
        <li><b>Kubenet</b>: o modelo antigo, com rotas manuais. Está sendo aposentado; clusters novos usam Azure CNI.</li>
        <li><b>Azure CNI powered by Cilium</b>: o mesmo Azure CNI, com o <b>Cilium</b> (eBPF) aplicando as NetworkPolicies, mais
          rápido. Ele entende também a <code>CiliumNetworkPolicy</code>, que vai além da NetworkPolicy: regras por
          <b>nome de domínio</b> (<code>toFQDNs</code>, com o Advanced Container Networking Services) e por caminho HTTP.</li>
      </ul>
      <p>Na <code>CiliumNetworkPolicy</code>, quem é protegido fica em <code>endpointSelector</code> (o <code>podSelector</code> da
      NetworkPolicy) e as origens em <code>fromEndpoints</code>. As portas vão em <code>toPorts</code>, como texto.</p>
      <p><b>No cluster:</b> <code>kubectl get ciliumnetworkpolicies</code> lista as políticas, e os pacotes proibidos são descartados no
      próprio nó.</p>`,
    `
      # Só os Pods web chegam na API, na porta 8080
      apiVersion: cilium.io/v2
      kind: CiliumNetworkPolicy
      metadata:
        name: api-so-do-web
      spec:
        endpointSelector:             # QUEM é protegido
          matchLabels:
            app: api
        ingress:
          - fromEndpoints:            # QUEM pode entrar
              - matchLabels:
                  app: web
            toPorts:
              - ports:
                  - port: "8080"      # texto, entre aspas
                    protocol: TCP
    `),

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

    exercicio({
      id: 'aks-cilium-labels',
      titulo: 'CiliumNetworkPolicy entre o site e a API',
      dificuldade: 'medio',
      resumo: `
        <p>O cluster usa o Azure CNI com Cilium. Só os Pods do site (<code>app: site</code>) podem chegar na API de catálogo
        (<code>app: catalogo</code>), na porta 8080.</p>
        <ol>
          <li>Na <code>CiliumNetworkPolicy</code> <code>catalogo-do-site</code>, <code>endpointSelector.matchLabels</code> com <code>app: catalogo</code>.</li>
          <li>Em <code>ingress[0].fromEndpoints</code>, um item com <code>matchLabels</code> <code>app: site</code>.</li>
          <li>Em <code>toPorts</code>, a porta <code>"8080"</code> com <code>protocol: TCP</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Cilium carrega a regra no eBPF de cada nó. Um Pod de outro app que tenta a porta 8080 do catálogo tem os pacotes
        descartados.</p>`,
      inicial: `
        apiVersion: cilium.io/v2
        kind: CiliumNetworkPolicy
        metadata:
          name: catalogo-do-site
        spec:
          endpointSelector:
            matchLabels:
              app:             # TODO: catalogo
          ingress:
            - fromEndpoints:
                # TODO: - matchLabels com app: site
              toPorts:
                - ports:
                    - port:    # TODO: "8080"
                      protocol: TCP
      `,
      dica: [
        'O exemplo da lição "Azure CNI vs Kubenet" é a mesma política com outros nomes.',
        'No Cilium, a porta é texto: "8080" com aspas.',
        'endpointSelector:\n  matchLabels:\n    app: catalogo\n...\nfromEndpoints:\n  - matchLabels:\n      app: site\n...\nport: "8080"',
      ],
      solucao: `
        apiVersion: cilium.io/v2
        kind: CiliumNetworkPolicy
        metadata:
          name: catalogo-do-site
        spec:
          endpointSelector:
            matchLabels:
              app: catalogo
          ingress:
            - fromEndpoints:
                - matchLabels:
                    app: site
              toPorts:
                - ports:
                    - port: "8080"
                      protocol: TCP
      `,
      testes: [
        teste({ descricao: 'Protege os Pods do catálogo', dica: 'Em endpointSelector.matchLabels, escreva app: catalogo.' },
          existe('CiliumNetworkPolicy', 'catalogo-do-site'),
          campo('CiliumNetworkPolicy', 'catalogo-do-site', 'spec.endpointSelector.matchLabels.app', { valor: 'catalogo' })),
        teste({ descricao: 'Só o site entra', dica: 'Em ingress[0].fromEndpoints: - matchLabels: app: site.' },
          campo('CiliumNetworkPolicy', 'catalogo-do-site', 'spec.ingress[0].fromEndpoints[0].matchLabels.app', { valor: 'site' })),
        teste({ descricao: 'Na porta 8080', dica: 'Em toPorts, port: "8080" (com aspas).' },
          campo('CiliumNetworkPolicy', 'catalogo-do-site', 'spec.ingress[0].toPorts[0].ports[0].port', { valor: '8080' })),
      ],
    }),

    exercicio({
      id: 'aks-cilium-fqdn',
      titulo: 'Saída só para o domínio do gateway de pagamento',
      dificuldade: 'dificil',
      resumo: `
        <p>Os Pods de pagamento só podem falar com <code>api.pagamentos.com.br</code> na internet. O IP desse serviço muda, então a regra
        precisa ser pelo <b>nome</b>. A parte do DNS (para o Pod descobrir o IP) já está no esqueleto.</p>
        <ol>
          <li>A política <code>pagamentos-saida</code> protege os Pods <code>app: pagamentos</code> e controla a saída (<code>egress</code>).</li>
          <li>Acrescente um segundo item em <code>egress</code> com <code>toFQDNs</code>: <code>matchName: api.pagamentos.com.br</code>.</li>
          <li>No mesmo item, <code>toPorts</code> com a porta <code>"443"</code> e <code>protocol: TCP</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Cilium observa as respostas de DNS e libera só os IPs de <code>api.pagamentos.com.br</code> na 443. Qualquer
        outro destino na internet é bloqueado.</p>`,
      inicial: `
        apiVersion: cilium.io/v2
        kind: CiliumNetworkPolicy
        metadata:
          name: pagamentos-saida
        spec:
          endpointSelector:
            matchLabels:
              app: pagamentos
          egress:
            - toEndpoints:
                - matchLabels:
                    "k8s:io.kubernetes.pod.namespace": kube-system
                    "k8s:k8s-app": kube-dns
              toPorts:
                - ports:
                    - port: "53"
                      protocol: ANY
                  rules:
                    dns:
                      - matchPattern: "*"
            # TODO: - toFQDNs com matchName api.pagamentos.com.br e toPorts 443/TCP
      `,
      dica: [
        'O item novo de egress começa com "- toFQDNs:", no mesmo recuo do "- toEndpoints:".',
        'toFQDNs é uma lista de itens com matchName; toPorts é igual ao do DNS, com outra porta.',
        '- toFQDNs:\n    - matchName: api.pagamentos.com.br\n  toPorts:\n    - ports:\n        - port: "443"\n          protocol: TCP',
      ],
      solucao: `
        apiVersion: cilium.io/v2
        kind: CiliumNetworkPolicy
        metadata:
          name: pagamentos-saida
        spec:
          endpointSelector:
            matchLabels:
              app: pagamentos
          egress:
            - toEndpoints:
                - matchLabels:
                    "k8s:io.kubernetes.pod.namespace": kube-system
                    "k8s:k8s-app": kube-dns
              toPorts:
                - ports:
                    - port: "53"
                      protocol: ANY
                  rules:
                    dns:
                      - matchPattern: "*"
            - toFQDNs:
                - matchName: api.pagamentos.com.br
              toPorts:
                - ports:
                    - port: "443"
                      protocol: TCP
      `,
      testes: [
        teste({ descricao: 'A saída para o domínio está liberada', dica: 'No segundo item de egress: toFQDNs com - matchName: api.pagamentos.com.br.' },
          campo('CiliumNetworkPolicy', 'pagamentos-saida', 'spec.egress[1].toFQDNs[0].matchName', { valor: 'api.pagamentos.com.br' })),
        teste({ descricao: 'Só na porta 443', dica: 'No mesmo item, toPorts com port: "443" e protocol: TCP.' },
          campo('CiliumNetworkPolicy', 'pagamentos-saida', 'spec.egress[1].toPorts[0].ports[0].port', { valor: '443' }),
          campo('CiliumNetworkPolicy', 'pagamentos-saida', 'spec.egress[1].toPorts[0].ports[0].protocol', { valor: 'TCP' })),
      ],
    }),

    licao('azure-agic', 'Application Gateway Ingress Controller (AGIC)', 'dificil', `
      <p>O <b>Application Gateway</b> é o balanceador HTTP da Azure, com firewall de aplicação (WAF). O <b>AGIC</b> é o operador que lê
      os Ingresses do cluster e configura o Application Gateway, como a recepção do prédio que monta as placas a partir da lista de
      salas.</p>
      <ul>
        <li>Com o add-on do AKS, o Ingress escolhe o AGIC com <code>ingressClassName: azure-application-gateway</code>. Os
          manifestos antigos usam a annotation <code>kubernetes.io/ingress.class: azure/application-gateway</code>.</li>
        <li>As escolhas vão em annotations <code>appgw-ingress.k8s.io/...</code>: <code>health-probe-path</code> (onde conferir a
          saúde), <code>request-timeout</code>, <code>connection-draining</code>, <code>ssl-redirect</code> (mandar HTTP para
          HTTPS) e <code>backend-protocol</code>.</li>
        <li>O HTTPS usa o bloco <code>tls</code> do Ingress: o certificado vem de um Secret do tipo <code>kubernetes.io/tls</code>.</li>
        <li>A evolução do AGIC é o <b>Application Gateway for Containers</b>, que usa a Gateway API.</li>
      </ul>
      <p><b>No cluster:</b> o AGIC cria no Application Gateway um listener por host, um backend pool com os IPs dos Pods e um health probe.
      O IP público aparece em <code>kubectl get ingress</code>.</p>`,
    `
      apiVersion: networking.k8s.io/v1
      kind: Ingress
      metadata:
        name: loja
        annotations:
          appgw-ingress.k8s.io/health-probe-path: /saude   # onde conferir a saúde
          appgw-ingress.k8s.io/ssl-redirect: "true"        # HTTP vira HTTPS
      spec:
        ingressClassName: azure-application-gateway        # o AGIC
        tls:
          - hosts: ["loja.contoso.com"]
            secretName: loja-tls                           # o certificado (Secret TLS)
        rules:
          - host: loja.contoso.com
            http:
              paths:
                - path: /
                  pathType: Prefix
                  backend:
                    service:
                      name: vitrine
                      port:
                        number: 80
    `),

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

    exercicio({
      id: 'aks-agic-classname',
      titulo: 'Ingress do AGIC com ingressClassName',
      dificuldade: 'facil',
      resumo: `
        <p>A annotation <code>kubernetes.io/ingress.class</code> é o jeito antigo. Com o add-on do AGIC, o certo é o campo
        <code>ingressClassName</code>.</p>
        <ol>
          <li>No Ingress <code>vitrine</code>, escreva <code>ingressClassName: azure-application-gateway</code> no <code>spec</code>.</li>
        </ol>
        <p><b>No cluster:</b> o AGIC do add-on pega o Ingress e cria a regra para <code>loja.contoso.com</code> no Application Gateway.</p>`,
      inicial: ingress('vitrine', 'vitrine', '                # TODO: azure-application-gateway'),
      dica: [
        'ingressClassName fica no spec, alinhado com rules.',
        'ingressClassName: azure-application-gateway',
      ],
      solucao: ingress('vitrine', 'vitrine', 'azure-application-gateway'),
      testes: [
        teste({ descricao: 'O Ingress existe', dica: 'Mantenha kind: Ingress e metadata.name: vitrine.' }, existe('Ingress', 'vitrine')),
        teste({ descricao: 'É do AGIC', dica: 'No spec, escreva ingressClassName: azure-application-gateway.' },
          campo('Ingress', 'vitrine', 'spec.ingressClassName', { valor: 'azure-application-gateway' })),
      ],
    }),

    exercicio({
      id: 'aks-agic-health',
      titulo: 'AGIC conferindo a saúde em /saude',
      dificuldade: 'facil',
      resumo: `
        <p>A API responde 404 em <code>/</code>, e o Application Gateway marca todos os Pods como doentes. A API tem o caminho <code>/saude</code>
        para isso.</p>
        <ol>
          <li>No Ingress <code>api</code>, a annotation <code>appgw-ingress.k8s.io/health-probe-path: /saude</code>.</li>
        </ol>
        <p><b>No cluster:</b> o AGIC muda o health probe do backend; os Pods que respondem 200 em <code>/saude</code> voltam a receber tráfego.</p>`,
      inicial: ingress('api', 'api', 'azure-application-gateway', `      # TODO: ${AGIC}/health-probe-path: /saude`),
      dica: [
        'É uma annotation em metadata.annotations, com o prefixo appgw-ingress.k8s.io/.',
        `${AGIC}/health-probe-path: /saude`,
      ],
      solucao: ingress('api', 'api', 'azure-application-gateway', `      ${AGIC}/health-probe-path: /saude`),
      testes: [
        teste({ descricao: 'O Ingress é do AGIC', dica: 'Mantenha ingressClassName: azure-application-gateway.' },
          campo('Ingress', 'api', 'spec.ingressClassName', { valor: 'azure-application-gateway' })),
        teste({ descricao: 'A saúde é conferida em /saude', dica: `Em metadata.annotations: ${AGIC}/health-probe-path: /saude.` },
          campo('Ingress', 'api', `metadata.annotations["${AGIC}/health-probe-path"]`, { valor: '/saude' })),
      ],
    }),

    exercicio({
      id: 'aks-agic-tls',
      titulo: 'AGIC com HTTPS e redirecionamento',
      dificuldade: 'dificil',
      resumo: `
        <p>O certificado de <code>loja.contoso.com</code> está no Secret <code>loja-tls</code> (tipo <code>kubernetes.io/tls</code>). O Application
        Gateway deve servir HTTPS e mandar quem chega por HTTP para HTTPS.</p>
        <ol>
          <li>No <code>spec</code> do Ingress <code>loja</code>, o bloco <code>tls</code> com <code>hosts: ["loja.contoso.com"]</code> e
            <code>secretName: loja-tls</code>.</li>
          <li>A annotation <code>appgw-ingress.k8s.io/ssl-redirect: "true"</code>.</li>
        </ol>
        <p><b>No cluster:</b> o AGIC envia o certificado ao Application Gateway, cria o listener 443 e uma regra na 80 que redireciona para HTTPS.</p>`,
      inicial: ingress('loja', 'vitrine', 'azure-application-gateway', `      # TODO: ${AGIC}/ssl-redirect: "true"`, `    # TODO: tls com hosts e secretName (passo 1)
`),
      dica: [
        'tls fica no spec, alinhado com rules; é uma lista de itens com hosts e secretName.',
        'O valor da annotation é texto: "true" com aspas.',
        `tls:\n  - hosts: ["loja.contoso.com"]\n    secretName: loja-tls\n...\n${AGIC}/ssl-redirect: "true"`,
      ],
      solucao: ingress('loja', 'vitrine', 'azure-application-gateway', `      ${AGIC}/ssl-redirect: "true"`, `    tls:
      - hosts: ["loja.contoso.com"]
        secretName: loja-tls
`),
      testes: [
        teste({ descricao: 'O HTTPS usa o Secret loja-tls', dica: 'No spec: tls com - hosts: ["loja.contoso.com"] e secretName: loja-tls.' },
          campo('Ingress', 'loja', 'spec.tls[0].secretName', { valor: 'loja-tls' }),
          campo('Ingress', 'loja', 'spec.tls[0].hosts', { contem: 'loja.contoso.com' })),
        teste({ descricao: 'Quem chega por HTTP vai para HTTPS', dica: `Em metadata.annotations: ${AGIC}/ssl-redirect: "true".` },
          campo('Ingress', 'loja', `metadata.annotations["${AGIC}/ssl-redirect"]`, { valor: 'true' })),
      ],
    }),

    licao('aks-app-routing-licao', 'App Routing: o NGINX gerenciado do AKS', 'medio', `
      <p>O <b>App Routing</b> é um add-on do AKS que instala e atualiza um <b>NGINX Ingress Controller</b> para você, com integração ao
      Azure DNS e ao Key Vault. É o porteiro terceirizado: a Azure contrata, treina e troca o uniforme.</p>
      <ul>
        <li>O Ingress escolhe o controlador gerenciado com <code>ingressClassName: webapprouting.kubernetes.azure.com</code>.</li>
        <li>Para ter <b>outro</b> controlador (por exemplo, um só para tráfego interno), crie um <code>NginxIngressController</code>
          (<code>approuting.kubernetes.azure.com/v1alpha1</code>) com o <code>ingressClassName</code> novo, um
          <code>controllerNamePrefix</code> e, em <code>loadBalancerAnnotations</code>, as annotations do Service do balanceador.</li>
        <li>A annotation <code>service.beta.kubernetes.io/azure-load-balancer-internal: "true"</code> faz o balanceador ficar só na VNet,
          sem IP público.</li>
      </ul>
      <p><b>No cluster:</b> o add-on cria os Pods do NGINX no namespace <code>app-routing-system</code>, e a IngressClass aparece em
      <code>kubectl get ingressclass</code>.</p>`,
    `
      # Um segundo NGINX gerenciado, só para dentro da VNet
      apiVersion: approuting.kubernetes.azure.com/v1alpha1
      kind: NginxIngressController
      metadata:
        name: nginx-interno
      spec:
        ingressClassName: nginx-interno        # a IngressClass que ele cria
        controllerNamePrefix: nginx-interno    # o prefixo dos Pods e do Service
        loadBalancerAnnotations:               # vão para o Service do balanceador
          service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    `),

    exercicio({
      id: 'aks-approuting-ingress',
      titulo: 'Ingress no NGINX gerenciado',
      dificuldade: 'facil',
      resumo: `
        <p>O cluster tem o App Routing ligado. O Ingress do blog vai usar o NGINX gerenciado pelo AKS.</p>
        <ol>
          <li>No Ingress <code>blog</code>, escreva <code>ingressClassName: webapprouting.kubernetes.azure.com</code>.</li>
        </ol>
        <p><b>No cluster:</b> o NGINX do App Routing passa a rotear <code>loja.contoso.com</code> para o Service <code>blog</code>.</p>`,
      inicial: ingress('blog', 'blog', '                # TODO: webapprouting.kubernetes.azure.com'),
      dica: [
        'ingressClassName fica no spec, alinhado com rules.',
        'ingressClassName: webapprouting.kubernetes.azure.com',
      ],
      solucao: ingress('blog', 'blog', 'webapprouting.kubernetes.azure.com'),
      testes: [
        teste({ descricao: 'O Ingress existe', dica: 'Mantenha kind: Ingress e metadata.name: blog.' }, existe('Ingress', 'blog')),
        teste({ descricao: 'Usa o NGINX do App Routing', dica: 'No spec, escreva ingressClassName: webapprouting.kubernetes.azure.com.' },
          campo('Ingress', 'blog', 'spec.ingressClassName', { valor: 'webapprouting.kubernetes.azure.com' })),
      ],
    }),

    exercicio({
      id: 'aks-approuting-interno',
      titulo: 'Um NGINX gerenciado só para a rede interna',
      dificuldade: 'medio',
      resumo: `
        <p>As APIs de back-office não podem ter IP público. Crie um segundo controlador do App Routing, interno.</p>
        <ol>
          <li>Crie o <code>NginxIngressController</code> <code>nginx-interno</code> com <code>ingressClassName: nginx-interno</code>.</li>
          <li><code>controllerNamePrefix: nginx-interno</code>.</li>
          <li>Em <code>loadBalancerAnnotations</code>: <code>service.beta.kubernetes.io/azure-load-balancer-internal: "true"</code>.</li>
        </ol>
        <p><b>No cluster:</b> o add-on sobe um segundo NGINX com um Load Balancer interno (IP da VNet). Ingresses com
        <code>ingressClassName: nginx-interno</code> só são alcançados de dentro da rede.</p>`,
      inicial: `
        apiVersion: approuting.kubernetes.azure.com/v1alpha1
        kind: NginxIngressController
        metadata:
          name: nginx-interno
        spec:
          ingressClassName:    # TODO: nginx-interno
          controllerNamePrefix: # TODO: nginx-interno
          # TODO: loadBalancerAnnotations com o balanceador interno
      `,
      dica: [
        'O exemplo da lição "App Routing" é exatamente este recurso.',
        'O valor da annotation é texto: "true" com aspas.',
        `ingressClassName: nginx-interno\ncontrollerNamePrefix: nginx-interno\nloadBalancerAnnotations:\n  ${LB}/azure-load-balancer-internal: "true"`,
      ],
      solucao: `
        apiVersion: approuting.kubernetes.azure.com/v1alpha1
        kind: NginxIngressController
        metadata:
          name: nginx-interno
        spec:
          ingressClassName: nginx-interno
          controllerNamePrefix: nginx-interno
          loadBalancerAnnotations:
            ${LB}/azure-load-balancer-internal: "true"
      `,
      testes: [
        teste({ descricao: 'O controlador cria a classe nginx-interno', dica: 'ingressClassName é obrigatório: escreva nginx-interno.' },
          existe('NginxIngressController', 'nginx-interno'),
          campo('NginxIngressController', 'nginx-interno', 'spec.ingressClassName', { valor: 'nginx-interno' })),
        teste({ descricao: 'O balanceador é interno', dica: `Em loadBalancerAnnotations: ${LB}/azure-load-balancer-internal: "true".` },
          campo('NginxIngressController', 'nginx-interno', `spec.loadBalancerAnnotations["${LB}/azure-load-balancer-internal"]`, { valor: 'true' })),
      ],
    }),

    licao('aks-load-balancer-licao', 'O Load Balancer da Azure para um Service', 'medio', `
      <p>Um Service <code>type: LoadBalancer</code> no AKS ganha uma regra no <b>Azure Load Balancer</b> do cluster, com um IP próprio. As
      escolhas vão em annotations <code>service.beta.kubernetes.io/azure-...</code>, como pedidos especiais ao balcão.</p>
      <ul>
        <li><code>azure-load-balancer-internal: "true"</code>: o IP é da VNet, sem acesso pela internet.</li>
        <li><code>azure-dns-label-name: loja-api</code>: o IP público ganha um nome, como
          <code>loja-api.brazilsouth.cloudapp.azure.com</code>.</li>
        <li><code>azure-pip-name</code>: usa um <b>IP público que já existe</b> (criado pelo Terraform), em vez de um novo a cada vez.
          Se ele estiver em outro resource group, diga qual em <code>azure-load-balancer-resource-group</code>.</li>
      </ul>
      <p>Os valores das annotations são sempre texto.</p>
      <p><b>No cluster:</b> <code>kubectl get service</code> mostra o IP em EXTERNAL-IP quando a Azure termina de configurar o balanceador.</p>`,
    `
      apiVersion: v1
      kind: Service
      metadata:
        name: api
        annotations:
          # O IP público ganha um nome DNS
          service.beta.kubernetes.io/azure-dns-label-name: loja-api
      spec:
        type: LoadBalancer
        selector:
          app: api
        ports:
          - port: 80
            targetPort: 8080
    `),

    exercicio({
      id: 'aks-lb-interno',
      titulo: 'Service só dentro da VNet',
      dificuldade: 'facil',
      resumo: `
        <p>A API de estoque só é chamada pelo ERP, que fica na mesma VNet. Ela não deve ter IP público.</p>
        <ol>
          <li>No Service <code>estoque</code> (<code>type: LoadBalancer</code>), a annotation
            <code>service.beta.kubernetes.io/azure-load-balancer-internal: "true"</code>.</li>
        </ol>
        <p><b>No cluster:</b> a Azure põe o Service no Load Balancer interno do cluster, com um IP da sub-rede. Da internet, ele não existe.</p>`,
      inicial: serviceLb('estoque', `      # TODO: ${LB}/azure-load-balancer-internal: "true"`),
      dica: [
        'O exemplo da lição "App Routing" usa a mesma annotation.',
        `${LB}/azure-load-balancer-internal: "true"`,
      ],
      solucao: serviceLb('estoque', `      ${LB}/azure-load-balancer-internal: "true"`),
      testes: [
        teste({ descricao: 'O Service é LoadBalancer', dica: 'Mantenha type: LoadBalancer.' }, { tipo: 'service-tipo', service: 'estoque', valorEsperado: 'LoadBalancer' }),
        teste({ descricao: 'O balanceador é interno', dica: `Em metadata.annotations: ${LB}/azure-load-balancer-internal: "true".` },
          campo('Service', 'estoque', `metadata.annotations["${LB}/azure-load-balancer-internal"]`, { valor: 'true' })),
      ],
    }),

    exercicio({
      id: 'aks-lb-dns-label',
      titulo: 'Um nome DNS para o IP público',
      dificuldade: 'medio',
      resumo: `
        <p>Os parceiros precisam de um endereço que não mude quando o Service for recriado. A Azure pode dar um nome ao IP público.</p>
        <ol>
          <li>No Service <code>parceiros</code>, a annotation <code>service.beta.kubernetes.io/azure-dns-label-name: loja-parceiros</code>.</li>
        </ol>
        <p><b>No cluster:</b> o IP público ganha o nome <code>loja-parceiros.&lt;região&gt;.cloudapp.azure.com</code>. Se o IP mudar, o nome acompanha.</p>`,
      inicial: serviceLb('parceiros', `      # TODO: ${LB}/azure-dns-label-name: loja-parceiros`),
      dica: [
        'O exemplo da lição "O Load Balancer da Azure" tem essa annotation.',
        `${LB}/azure-dns-label-name: loja-parceiros`,
      ],
      solucao: serviceLb('parceiros', `      ${LB}/azure-dns-label-name: loja-parceiros`),
      testes: [
        teste({ descricao: 'O Service é LoadBalancer', dica: 'Mantenha type: LoadBalancer.' }, { tipo: 'service-tipo', service: 'parceiros', valorEsperado: 'LoadBalancer' }),
        teste({ descricao: 'O IP público tem nome', dica: `Em metadata.annotations: ${LB}/azure-dns-label-name: loja-parceiros.` },
          campo('Service', 'parceiros', `metadata.annotations["${LB}/azure-dns-label-name"]`, { valor: 'loja-parceiros' })),
      ],
    }),

    exercicio({
      id: 'aks-lb-ip-fixo',
      titulo: 'Usando um IP público criado pelo Terraform',
      dificuldade: 'medio',
      resumo: `
        <p>O IP público <code>loja-ip</code> foi criado pelo Terraform no resource group <code>rg-rede-loja</code> e já está liberado no firewall
        do banco parceiro. O Service tem que usar esse IP.</p>
        <ol>
          <li>No Service <code>loja</code>, a annotation <code>service.beta.kubernetes.io/azure-pip-name: loja-ip</code>.</li>
          <li>A annotation <code>service.beta.kubernetes.io/azure-load-balancer-resource-group: rg-rede-loja</code>.</li>
        </ol>
        <p><b>No cluster:</b> a Azure liga o IP existente ao balanceador. Apagar o Service não apaga o IP (ele é do Terraform).</p>`,
      inicial: serviceLb('loja', `      # TODO: azure-pip-name (passo 1)
      # TODO: azure-load-balancer-resource-group (passo 2)`),
      dica: [
        'As duas annotations começam com service.beta.kubernetes.io/azure-.',
        'O resource group é necessário porque o IP não está no resource group dos nós do cluster.',
        `${LB}/azure-pip-name: loja-ip\n${LB}/azure-load-balancer-resource-group: rg-rede-loja`,
      ],
      solucao: serviceLb('loja', `      ${LB}/azure-pip-name: loja-ip
      ${LB}/azure-load-balancer-resource-group: rg-rede-loja`),
      testes: [
        teste({ descricao: 'Usa o IP loja-ip', dica: `Em metadata.annotations: ${LB}/azure-pip-name: loja-ip.` },
          campo('Service', 'loja', `metadata.annotations["${LB}/azure-pip-name"]`, { valor: 'loja-ip' })),
        teste({ descricao: 'Do resource group da rede', dica: `Em metadata.annotations: ${LB}/azure-load-balancer-resource-group: rg-rede-loja.` },
          campo('Service', 'loja', `metadata.annotations["${LB}/azure-load-balancer-resource-group"]`, { valor: 'rg-rede-loja' })),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'azure-network-policy': { dica: 'A política controla só a entrada, no protocolo do passo 3.', regras: [campo('NetworkPolicy', 'restrict-azure-app', 'spec.policyTypes', { valor: ['Ingress'] }), campo('NetworkPolicy', 'restrict-azure-app', 'spec.ingress[0].ports[0].protocol', { valor: 'TCP' })] },
    'aks-cilium-labels': { dica: 'Confira o protocolo da porta.', regras: [campo('CiliumNetworkPolicy', 'catalogo-do-site', 'spec.ingress[0].toPorts[0].ports[0].protocol', { valor: 'TCP' })] },
    'aks-cilium-fqdn': { dica: 'A regra do DNS do esqueleto continua no primeiro item, e a política protege os Pods de pagamento.', regras: [campo('CiliumNetworkPolicy', 'pagamentos-saida', 'spec.egress[0].toPorts[0].ports[0].port', { valor: '53' }), campo('CiliumNetworkPolicy', 'pagamentos-saida', 'spec.endpointSelector.matchLabels.app', { valor: 'pagamentos' })] },
    'azure-ingress-agic': { dica: 'Confira o host, o Service e o tempo limite dos passos 2 e 3.', regras: [campo('Ingress', 'app-agic-ingress', 'spec.rules[0].host', { valor: 'app.exemplo.com' }), campo('Ingress', 'app-agic-ingress', 'spec.rules[0].http.paths[0].backend.service.name', { valor: 'app-service' }), campo('Ingress', 'app-agic-ingress', `metadata.annotations["${AGIC}/request-timeout"]`, { valor: '60' })] },
    'aks-agic-classname': { dica: 'Use o campo, sem a annotation antiga.', regras: [campo('Ingress', 'vitrine', 'metadata.annotations["kubernetes.io/ingress.class"]', { ausente: true })] },
    'aks-agic-health': { dica: 'O Ingress continua levando ao Service api.', regras: [campo('Ingress', 'api', 'spec.rules[0].http.paths[0].backend.service.name', { valor: 'api' })] },
    'aks-agic-tls': { dica: 'O Ingress continua sendo do AGIC.', regras: [campo('Ingress', 'loja', 'spec.ingressClassName', { valor: 'azure-application-gateway' })] },
    'aks-approuting-ingress': { dica: 'O Ingress continua levando ao Service blog.', regras: [campo('Ingress', 'blog', 'spec.rules[0].http.paths[0].backend.service.name', { valor: 'blog' })] },
    'aks-approuting-interno': { dica: 'Confira o prefixo do controlador.', regras: [campo('NginxIngressController', 'nginx-interno', 'spec.controllerNamePrefix', { valor: 'nginx-interno' })] },
    'aks-lb-interno': { dica: 'O Service continua mandando para os Pods app: api.', regras: [{ tipo: 'service-selector', service: 'estoque', chave: 'app', valor: 'api' }] },
    'aks-lb-dns-label': { dica: 'O balanceador continua público (não é interno).', regras: [campo('Service', 'parceiros', `metadata.annotations["${LB}/azure-load-balancer-internal"]`, { ausente: true })] },
    'aks-lb-ip-fixo': { dica: 'O Service continua do tipo LoadBalancer.', regras: [{ tipo: 'service-tipo', service: 'loja', valorEsperado: 'LoadBalancer' }] },
  },
};
