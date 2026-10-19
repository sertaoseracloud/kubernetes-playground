// Recursos Avançados: NetworkPolicy, Ingress com TLS e Gateway API.
import { licao, exercicio, teste, existe, campo } from './util.js';

export const avancadosRede = {
  id: 'rede',
  titulo: 'NetworkPolicy e Ingress',
  itens: [
    licao('rede-conceitos', 'Firewall entre Pods e a porta de entrada do cluster', 'medio', `
      <p>Por padrão, <b>todo Pod fala com todo Pod</b>. NetworkPolicy e Ingress organizam esse trânsito:</p>
      <ul>
        <li><b>NetworkPolicy</b> é a <b>lista de convidados</b> na porta de cada Pod. Ela escolhe os Pods com
          <code>podSelector</code> e diz quem entra (<code>ingress</code>) e para onde eles podem sair (<code>egress</code>).</li>
        <li>Basta <b>uma</b> política selecionar o Pod para que tudo o que não estiver liberado seja bloqueado naquela direção.
          <code>podSelector: {}</code> seleciona todos os Pods do namespace: é o "negar tudo" que serve de base.</li>
        <li>Quem aplica as regras é o plugin de rede (Calico, Cilium, VPC CNI com políticas, Azure CNI com Cilium...).
          Sem um plugin com suporte, a NetworkPolicy é aceita, mas não bloqueia nada.</li>
        <li>Ao bloquear a saída, libere o <b>DNS</b> (porta 53 UDP e TCP do CoreDNS no <code>kube-system</code>), senão nenhum
          nome resolve.</li>
        <li><b>Ingress</b> é a <b>recepção do prédio</b>: um só endereço HTTP(S) que encaminha cada host e caminho para o
          Service certo. O <code>ingressClassName</code> escolhe o controlador; <code>tls</code> aponta o Secret com o certificado.</li>
        <li><b>Gateway API</b> é a evolução do Ingress, separando papéis: o time de plataforma cuida do <code>Gateway</code>
          (a porta) e cada time de aplicação cuida das suas <code>HTTPRoute</code> (os caminhos).</li>
      </ul>`),
    exercicio({
      id: 'rede-default-deny',
      titulo: 'NetworkPolicy que nega tudo',
      dificuldade: 'medio',
      resumo: `<p>Comece o namespace <code>loja</code> fechado: crie a NetworkPolicy <code>negar-tudo</code> (namespace <code>loja</code>) que</p>
        <ul>
          <li>seleciona <b>todos</b> os Pods (<code>podSelector: {}</code>);</li>
          <li>controla as duas direções: <code>policyTypes: [Ingress, Egress]</code>;</li>
          <li>não libera nada (sem listas <code>ingress</code> e <code>egress</code>).</li>
        </ul>`,
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
        teste('A política vale para todos os Pods do namespace', existe('NetworkPolicy', 'negar-tudo'), campo('NetworkPolicy', 'negar-tudo', 'spec.podSelector', { valor: {} })),
        teste('Bloqueia a entrada e a saída', { tipo: 'network-policy', policy: 'negar-tudo', direction: 'Ingress' }, { tipo: 'network-policy', policy: 'negar-tudo', direction: 'Egress' }),
        teste('Não libera nenhum tráfego', campo('NetworkPolicy', 'negar-tudo', 'spec.ingress', { ausente: true }), campo('NetworkPolicy', 'negar-tudo', 'spec.egress', { ausente: true })),
      ],
    }),
    exercicio({
      id: 'rede-frontend-backend',
      titulo: 'Só o frontend fala com o backend (e o DNS continua)',
      dificuldade: 'dificil',
      resumo: `<p>Crie a NetworkPolicy <code>backend-permite-frontend</code> para os Pods com <code>app: backend</code>:</p>
        <ul>
          <li><b>Entrada</b>: só dos Pods com <code>app: frontend</code>, na porta <b>8080/TCP</b>.</li>
          <li><b>Saída</b>: só para o DNS do cluster: namespace <code>kube-system</code> (label
            <code>kubernetes.io/metadata.name: kube-system</code>) e Pods <code>k8s-app: kube-dns</code>, porta <b>53</b> em UDP e TCP.</li>
          <li><code>policyTypes</code> com <code>Ingress</code> e <code>Egress</code>.</li>
        </ul>`,
      dica: 'No egress, namespaceSelector e podSelector no MESMO item de "to" significam "os Pods kube-dns do namespace kube-system" (E). Em itens separados seria OU.',
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
        teste('A política protege o backend nas duas direções',
          { tipo: 'network-policy', policy: 'backend-permite-frontend', podSelector: 'app=backend', direction: 'Ingress' },
          { tipo: 'network-policy', policy: 'backend-permite-frontend', direction: 'Egress' }),
        teste('Só o frontend entra, na porta 8080',
          campo('NetworkPolicy', 'backend-permite-frontend', 'spec.ingress[0].from[0].podSelector.matchLabels.app', { valor: 'frontend' }),
          campo('NetworkPolicy', 'backend-permite-frontend', 'spec.ingress[0].ports[0].port', { valor: 8080 })),
        teste('A saída libera o DNS em UDP e TCP',
          campo('NetworkPolicy', 'backend-permite-frontend', 'spec.egress[0].to[0].podSelector.matchLabels["k8s-app"]', { valor: 'kube-dns' }),
          campo('NetworkPolicy', 'backend-permite-frontend', 'spec.egress[0].to[0].namespaceSelector.matchLabels["kubernetes.io/metadata.name"]', { valor: 'kube-system' }),
          campo('NetworkPolicy', 'backend-permite-frontend', 'spec.egress[0].ports[*].protocol', { contem: 'UDP' }),
          campo('NetworkPolicy', 'backend-permite-frontend', 'spec.egress[0].ports[*].port', { contem: 53 })),
      ],
    }),
    exercicio({
      id: 'rede-ingress-tls',
      titulo: 'Ingress com TLS e dois caminhos',
      dificuldade: 'medio',
      resumo: `<p>Publique a loja em HTTPS. Crie o Ingress <code>loja</code> com:</p>
        <ul>
          <li><code>ingressClassName: nginx</code>.</li>
          <li>TLS para o host <code>loja.example.com</code> com o Secret <code>loja-tls</code>.</li>
          <li>Host <code>loja.example.com</code>: <code>/api</code> vai para o Service <code>api</code> (porta 8080) e <code>/</code> para o
            Service <code>web</code> (porta 80), os dois com <code>pathType: Prefix</code>.</li>
        </ul>`,
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
        teste('O Ingress atende loja.example.com pela classe nginx', { tipo: 'ingress-existe', ingress: 'loja', host: 'loja.example.com' }, campo('Ingress', 'loja', 'spec.ingressClassName', { valor: 'nginx' })),
        teste('O certificado vem do Secret loja-tls', campo('Ingress', 'loja', 'spec.tls[0].secretName', { valor: 'loja-tls' }), campo('Ingress', 'loja', 'spec.tls[0].hosts', { contem: 'loja.example.com' })),
        teste('/api vai para a api e / para o web',
          campo('Ingress', 'loja', 'spec.rules[0].http.paths[path=/api].backend.service.name', { valor: 'api' }),
          campo('Ingress', 'loja', 'spec.rules[0].http.paths[path=/api].backend.service.port.number', { valor: 8080 }),
          campo('Ingress', 'loja', 'spec.rules[0].http.paths[path=/].backend.service.name', { valor: 'web' })),
      ],
    }),
  ],
};
