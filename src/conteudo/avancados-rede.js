// Recursos Avançados: NetworkPolicy, Ingress com TLS e Gateway API.
// Segue docs/didatica.md. Ordem: Ingress com TLS (continua o que os Fundamentos ensinaram),
// depois NetworkPolicy do mais simples (negar tudo) ao mais completo.
import { licao, exercicio, teste, existe, campo } from './util.js';

export const avancadosRede = {
  id: 'rede',
  titulo: 'NetworkPolicy e Ingress',
  itens: [
    licao('rede-conceitos', 'Firewall entre Pods e a porta de entrada do cluster', 'medio', `
      <p>Por padrão, <b>todo Pod fala com todo Pod</b>, de qualquer namespace. NetworkPolicy e Ingress organizam esse trânsito:</p>
      <ul>
        <li><b>Ingress</b> (visto nos Fundamentos) é a <b>recepção do prédio</b>: um só endereço HTTP(S) que encaminha cada host e
          caminho para o Service certo. O <code>ingressClassName</code> escolhe o controlador; o bloco <code>tls</code> aponta o
          Secret com o certificado do HTTPS.</li>
        <li><b>NetworkPolicy</b> é a <b>lista de convidados</b> na porta de cada Pod. Ela escolhe os Pods com
          <code>podSelector</code> e diz quem entra (<code>ingress</code>, com <code>from</code>) e para onde eles podem sair
          (<code>egress</code>, com <code>to</code>). Não confunda: o <code>ingress</code> da NetworkPolicy é "tráfego de entrada",
          não o recurso Ingress.</li>
        <li>Basta <b>uma</b> política selecionar o Pod para que tudo o que não estiver liberado seja bloqueado nas direções de
          <code>policyTypes</code>. <code>podSelector: {}</code> seleciona todos os Pods do namespace: é o "negar tudo" que serve de base.</li>
        <li>Quem aplica as regras é o plugin de rede (Calico, Cilium, VPC CNI com políticas, Azure CNI com Cilium...).
          Sem um plugin com suporte, a NetworkPolicy é aceita, mas não bloqueia nada.</li>
        <li>Ao bloquear a saída, libere o <b>DNS</b> (porta 53 UDP e TCP do CoreDNS no <code>kube-system</code>), senão nenhum
          nome resolve.</li>
        <li><b>Gateway API</b> é a evolução do Ingress, separando papéis: o time de plataforma cuida do <code>Gateway</code>
          (a porta) e cada time de aplicação cuida das suas <code>HTTPRoute</code> (os caminhos).</li>
      </ul>`,
    `
      apiVersion: networking.k8s.io/v1
      kind: NetworkPolicy
      metadata:
        name: banco-so-da-api
      spec:
        podSelector:             # A QUEM a regra se aplica
          matchLabels:
            app: banco
        policyTypes: [Ingress]   # controla só a entrada
        ingress:                 # quem pode entrar
          - from:
              - podSelector:
                  matchLabels:
                    app: api     # só os Pods da api...
            ports:
              - protocol: TCP
                port: 5432       # ...e só na porta do banco
    `),

    exercicio({
      id: 'rede-ingress-tls',
      titulo: 'Ingress com TLS e dois caminhos',
      dificuldade: 'medio',
      resumo: `
        <p>Publique a loja em HTTPS, com a API e o site no mesmo endereço.</p>
        <ol>
          <li>No Ingress <code>loja</code>, escreva <code>ingressClassName: nginx</code>.</li>
          <li>Em <code>tls</code>, um item com <code>hosts: [loja.example.com]</code> e <code>secretName: loja-tls</code>.</li>
          <li>No host <code>loja.example.com</code>, o caminho <code>/api</code> vai para o Service <code>api</code> na porta 8080.</li>
          <li>O caminho <code>/</code> vai para o Service <code>web</code> na porta 80 (os dois com <code>pathType: Prefix</code>).</li>
        </ol>
        <p><b>No cluster:</b> o controlador NGINX usa o certificado do Secret para o HTTPS. Uma requisição a
        <code>/api/produtos</code> vai para a api (o caminho mais específico ganha); qualquer outra, para o web.</p>`,
      inicial: `
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: loja
        spec:
          ingressClassName:    # TODO: nginx
          # TODO: tls com um item: hosts [loja.example.com] e secretName: loja-tls
          rules:
            - host: loja.example.com
              http:
                paths:
                  - path: /api
                    pathType: Prefix
                    backend:
                      service:
                        name:  # TODO: api
                        port:
                          number:   # TODO: 8080
                  # TODO: o segundo caminho: path /, pathType Prefix, Service web na porta 80
      `,
      dica: [
        'tls fica em spec, alinhado com rules; é uma lista com hosts e secretName.',
        'tls:\n  - hosts:\n      - loja.example.com\n    secretName: loja-tls',
        'O segundo caminho é outro item de paths: copie o de /api e troque path, name e number.',
      ],
      solucao: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: loja
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - loja.example.com
      secretName: loja-tls
  rules:
    - host: loja.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80`,
      testes: [
        teste({ descricao: 'O Ingress atende loja.example.com pela classe nginx', dica: 'Em spec: ingressClassName: nginx (preencha os TODO).' },
          { tipo: 'ingress-existe', ingress: 'loja', host: 'loja.example.com' }, campo('Ingress', 'loja', 'spec.ingressClassName', { valor: 'nginx' })),
        teste({ descricao: 'O certificado vem do Secret loja-tls', dica: 'Em spec.tls, um item com hosts: [loja.example.com] e secretName: loja-tls.' },
          campo('Ingress', 'loja', 'spec.tls[0].secretName', { valor: 'loja-tls' }), campo('Ingress', 'loja', 'spec.tls[0].hosts', { contem: 'loja.example.com' })),
        teste({ descricao: '/api vai para a api e / para o web', dica: 'Dois itens em paths: /api → api:8080 e / → web:80.' },
          campo('Ingress', 'loja', 'spec.rules[0].http.paths[path=/api].backend.service.name', { valor: 'api' }),
          campo('Ingress', 'loja', 'spec.rules[0].http.paths[path=/api].backend.service.port.number', { valor: 8080 }),
          campo('Ingress', 'loja', 'spec.rules[0].http.paths[path=/].backend.service.name', { valor: 'web' })),
      ],
    }),

    exercicio({
      id: 'rede-default-deny',
      titulo: 'NetworkPolicy que nega tudo',
      dificuldade: 'medio',
      resumo: `
        <p>Comece o namespace <code>loja</code> fechado. Depois, cada aplicação libera só o que precisa.</p>
        <ol>
          <li>Na NetworkPolicy <code>negar-tudo</code> (namespace <code>loja</code>), selecione <b>todos</b> os Pods: <code>podSelector: {}</code>.</li>
          <li>Controle as duas direções: <code>policyTypes</code> com <code>Ingress</code> e <code>Egress</code>.</li>
          <li>Não escreva as listas <code>ingress</code> nem <code>egress</code>: sem elas, nada é liberado.</li>
        </ol>
        <p><b>No cluster:</b> nenhum Pod do namespace recebe nem envia tráfego (nem DNS), até outra política liberar.</p>`,
      inicial: `
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        metadata:
          name: negar-tudo
          namespace: loja
        spec:
          podSelector:         # TODO: {} (todos os Pods do namespace)
          policyTypes:
            # TODO: - Ingress e - Egress
      `,
      dica: [
        'O {} é um mapa vazio: "nenhum filtro" = todos os Pods.',
        'spec:\n  podSelector: {}\n  policyTypes:\n    - Ingress\n    - Egress',
      ],
      solucao: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: negar-tudo
  namespace: loja
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress`,
      testes: [
        teste({ descricao: 'A política vale para todos os Pods do namespace', dica: 'Em spec: podSelector: {} (as duas chaves, sem nada dentro).' },
          existe('NetworkPolicy', 'negar-tudo'), campo('NetworkPolicy', 'negar-tudo', 'spec.podSelector', { valor: {} })),
        teste({ descricao: 'Bloqueia a entrada e a saída', dica: 'Em policyTypes, os dois itens: - Ingress e - Egress.' },
          { tipo: 'network-policy', policy: 'negar-tudo', direction: 'Ingress' }, { tipo: 'network-policy', policy: 'negar-tudo', direction: 'Egress' }),
        teste({ descricao: 'Não libera nenhum tráfego', dica: 'Apague as listas ingress e egress, se tiver escrito.' },
          campo('NetworkPolicy', 'negar-tudo', 'spec.ingress', { ausente: true }), campo('NetworkPolicy', 'negar-tudo', 'spec.egress', { ausente: true })),
      ],
    }),

    exercicio({
      id: 'rede-frontend-backend',
      titulo: 'Só o frontend fala com o backend (e o DNS continua)',
      dificuldade: 'dificil',
      resumo: `
        <p>O backend só deve receber chamadas do frontend, e só deve sair para resolver nomes no DNS.</p>
        <ol>
          <li>A NetworkPolicy <code>backend-permite-frontend</code> seleciona os Pods com <code>app: backend</code>, com
            <code>policyTypes</code> <code>Ingress</code> e <code>Egress</code>.</li>
          <li><b>Entrada</b>: em <code>ingress[0].from</code>, os Pods com <code>app: frontend</code>; em <code>ports</code>, 8080/TCP.</li>
          <li><b>Saída</b>: em <code>egress[0].to</code>, <b>um único item</b> com <code>namespaceSelector</code>
            (<code>kubernetes.io/metadata.name: kube-system</code>) e <code>podSelector</code> (<code>k8s-app: kube-dns</code>).</li>
          <li>Nas portas da saída, 53 em UDP e 53 em TCP.</li>
        </ol>
        <p><b>No cluster:</b> chamadas de outros Pods ao backend são descartadas; o backend consegue resolver nomes, mas não
        abre conexão com mais nada.</p>`,
      inicial: `
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        metadata:
          name: backend-permite-frontend
        spec:
          podSelector:
            matchLabels:
              app: backend
          policyTypes:
            - Ingress
            - Egress
          ingress:
            - from:
                - podSelector:
                    matchLabels:
                      app:     # TODO: frontend
              ports:
                - protocol: TCP
                  port:        # TODO: 8080
          egress:
            - to:
                - namespaceSelector:
                    matchLabels:
                      kubernetes.io/metadata.name: kube-system
                  # TODO: podSelector com k8s-app: kube-dns (no MESMO item, sem "-" na frente)
              ports:
                # TODO: 53 em UDP e 53 em TCP
      `,
      dica: [
        'Compare com o exemplo da lição: a entrada é igual, só mudam a label e a porta.',
        'namespaceSelector e podSelector no MESMO item de "to" significam "os Pods kube-dns do namespace kube-system" (E). Em itens separados seria OU.',
        'ports:\n  - protocol: UDP\n    port: 53\n  - protocol: TCP\n    port: 53',
      ],
      solucao: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-permite-frontend
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53`,
      testes: [
        teste({ descricao: 'A política protege o backend nas duas direções', dica: 'Preencha os TODO: um campo vazio impede o apply.' },
          { tipo: 'network-policy', policy: 'backend-permite-frontend', podSelector: 'app=backend', direction: 'Ingress' },
          { tipo: 'network-policy', policy: 'backend-permite-frontend', direction: 'Egress' }),
        teste({ descricao: 'Só o frontend entra, na porta 8080', dica: 'Em ingress[0].from: podSelector com app: frontend; em ports: port: 8080.' },
          campo('NetworkPolicy', 'backend-permite-frontend', 'spec.ingress[0].from[0].podSelector.matchLabels.app', { valor: 'frontend' }),
          campo('NetworkPolicy', 'backend-permite-frontend', 'spec.ingress[0].ports[0].port', { valor: 8080 })),
        teste({ descricao: 'A saída libera o DNS em UDP e TCP', dica: 'podSelector (k8s-app: kube-dns) alinhado com namespaceSelector, no mesmo item; portas 53 UDP e TCP.' },
          campo('NetworkPolicy', 'backend-permite-frontend', 'spec.egress[0].to[0].podSelector.matchLabels["k8s-app"]', { valor: 'kube-dns' }),
          campo('NetworkPolicy', 'backend-permite-frontend', 'spec.egress[0].to[0].namespaceSelector.matchLabels["kubernetes.io/metadata.name"]', { valor: 'kube-system' }),
          campo('NetworkPolicy', 'backend-permite-frontend', 'spec.egress[0].ports[*].protocol', { contem: 'UDP' }),
          campo('NetworkPolicy', 'backend-permite-frontend', 'spec.egress[0].ports[*].port', { contem: 53 })),
      ],
    }),
  ],
};
