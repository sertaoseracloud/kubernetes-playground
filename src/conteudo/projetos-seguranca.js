// Projeto: o namespace de pagamentos com segurança em camadas (Pod Security, NetworkPolicies,
// RBAC mínimo e um Deployment endurecido).
// Segue docs/didatica.md: lição de arquitetura e 5 etapas; cada etapa parte da anterior.
import { licao, exercicio, teste, existe, campo, docs } from './util.js';

const info = (n) => `<p class="etapa-info">🧩 <b>Projeto Segurança</b> · etapa ${n} de 5. Pagamentos protegidos em camadas, como as portas de um cofre.</p>`;

const NAMESPACE = `
  apiVersion: v1
  kind: Namespace
  metadata:
    name: pagamentos
    labels:
      time: pagamentos
      pod-security.kubernetes.io/enforce: restricted
      pod-security.kubernetes.io/warn: restricted
`;

const NEGAR_TUDO = `
  apiVersion: networking.k8s.io/v1
  kind: NetworkPolicy
  metadata:
    name: negar-tudo
    namespace: pagamentos
  spec:
    podSelector: {}
    policyTypes:
      - Ingress
      - Egress
`;

const SA = `
  apiVersion: v1
  kind: ServiceAccount
  metadata:
    name: api
    namespace: pagamentos
  automountServiceAccountToken: false
`;

/** O Deployment da API de pagamentos; `pod` entra no spec do Pod, `seguranca` no securityContext do container e `container` no fim dele. */
const deployApi = ({ pod = '', seguranca = '', container = '' } = {}) => `
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: api
    namespace: pagamentos
  spec:
    replicas: 2
    selector:
      matchLabels:
        app: api
    template:
      metadata:
        labels:
          app: api
      spec:
        serviceAccountName: api
        securityContext:
          runAsNonRoot: true
          seccompProfile:
            type: RuntimeDefault
${pod}        containers:
          - name: api
            image: nginxinc/nginx-unprivileged:1.27
            ports:
              - containerPort: 8080
            securityContext:
              allowPrivilegeEscalation: false
              capabilities:
                drop: ["ALL"]
${seguranca}${container}`;

export const projetoSeguranca = {
  id: 'proj-seguranca',
  titulo: 'Projeto Segurança em camadas',
  icone: '🛡️',
  itens: [
    licao('proj-seguranca-arquitetura', 'Arquitetura da segurança em camadas', 'dificil', `
      <p>Nenhuma proteção sozinha basta. Um cofre de banco tem portaria, porta blindada, câmeras e senhas diferentes para cada funcionário.
      Neste projeto, o namespace <code>pagamentos</code> ganha uma camada por etapa, todas vistas nos módulos anteriores:</p>
      <ol>
        <li><b>Pod Security</b>: o namespace no nível <code>restricted</code>.</li>
        <li><b>Rede fechada</b>: uma NetworkPolicy que nega toda entrada e toda saída.</li>
        <li><b>Rede aberta só no necessário</b>: o DNS do cluster e a entrada vinda do gateway, na porta 8080.</li>
        <li><b>RBAC mínimo</b>: uma ServiceAccount sem token e uma Role que só lê um ConfigMap.</li>
        <li><b>Container endurecido</b>: a API roda sem root, com o sistema de arquivos só de leitura e uma pasta temporária à parte.</li>
      </ol>
      <p>Com <code>podSelector: {}</code> (vazio), uma NetworkPolicy vale para <b>todos</b> os Pods do namespace. Para liberar o DNS, a saída
      vai para os Pods <code>k8s-app: kube-dns</code> do namespace <code>kube-system</code>, escolhido pela label
      <code>kubernetes.io/metadata.name</code> que todo namespace tem.</p>
      <p><b>No cluster:</b> no fim, mesmo que alguém invada a API, ele não vira root, não escreve no disco, não fala com outros serviços e não
      tem token para mexer na API do Kubernetes.</p>`,
    `
      # Camada 2: nada entra, nada sai (a lista vazia de regras nega tudo)
      apiVersion: networking.k8s.io/v1
      kind: NetworkPolicy
      metadata:
        name: negar-tudo
        namespace: pagamentos
      spec:
        podSelector: {}          # todos os Pods do namespace
        policyTypes:
          - Ingress
          - Egress
      ---
      # Camada 3: libera só a saída para o DNS do cluster
      apiVersion: networking.k8s.io/v1
      kind: NetworkPolicy
      metadata:
        name: permitir-dns
        namespace: pagamentos
      spec:
        podSelector: {}
        policyTypes:
          - Egress
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
    `),

    exercicio({
      id: 'proj-seg-namespace',
      titulo: 'Etapa 1: o namespace no nível restricted',
      dificuldade: 'facil',
      resumo: `
        ${info(1)}
        <p>A primeira camada é o fiscal da obra: nenhum Pod fora das regras mais rígidas entra em <code>pagamentos</code>.</p>
        <ol>
          <li>No Namespace <code>pagamentos</code>, mantenha a label <code>time: pagamentos</code>.</li>
          <li>Acrescente <code>pod-security.kubernetes.io/enforce: restricted</code> e <code>pod-security.kubernetes.io/warn: restricted</code>.</li>
        </ol>
        <p><b>No cluster:</b> um Pod que rode como root ou peça privilégios é recusado com <code>violates PodSecurity "restricted:latest"</code>.</p>`,
      inicial: `
        apiVersion: v1
        kind: Namespace
        metadata:
          name: pagamentos
          labels:
            time: pagamentos
            # TODO: enforce e warn no nível restricted
      `,
      dica: [
        'São as labels do exercício "Namespace no nível restricted" do módulo da AWS (elas valem em qualquer cluster).',
        'pod-security.kubernetes.io/enforce: restricted\npod-security.kubernetes.io/warn: restricted',
      ],
      solucao: NAMESPACE,
      testes: [
        teste({ descricao: 'O namespace recusa Pods fora do restricted', dica: 'Label pod-security.kubernetes.io/enforce: restricted.' },
          campo('Namespace', 'pagamentos', 'metadata.labels["pod-security.kubernetes.io/enforce"]', { valor: 'restricted' })),
        teste({ descricao: 'E avisa no kubectl', dica: 'Label pod-security.kubernetes.io/warn: restricted.' },
          campo('Namespace', 'pagamentos', 'metadata.labels["pod-security.kubernetes.io/warn"]', { valor: 'restricted' })),
      ],
    }),

    exercicio({
      id: 'proj-seg-negar',
      titulo: 'Etapa 2: nada entra, nada sai',
      dificuldade: 'medio',
      existentes: NAMESPACE,
      resumo: `
        ${info(2)}
        <p>A segunda camada fecha a rede inteira do namespace. Depois, as próximas etapas abrem só o necessário.</p>
        <ol>
          <li>Crie a NetworkPolicy <code>negar-tudo</code> no namespace <code>pagamentos</code> com <code>podSelector: {}</code>.</li>
          <li>Em <code>policyTypes</code>, <code>Ingress</code> e <code>Egress</code>, sem nenhuma regra de <code>ingress</code> ou <code>egress</code>.</li>
        </ol>
        <p><b>No cluster:</b> os Pods de pagamentos não recebem nem fazem conexão nenhuma, nem para o DNS. Isso é de propósito.</p>`,
      inicial: `
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        metadata:
          name: negar-tudo
          namespace: pagamentos
        spec:
          podSelector:         # TODO: {} (todos os Pods)
          policyTypes:
            # TODO: Ingress e Egress
      `,
      dica: [
        'É o "negar tudo" de Recursos Avançados, agora também para a saída.',
        'podSelector: {}\npolicyTypes:\n  - Ingress\n  - Egress',
      ],
      solucao: NEGAR_TUDO,
      testes: [
        teste({ descricao: 'Vale para todos os Pods do namespace', dica: 'Escreva podSelector: {} (as chaves vazias).' },
          existe('NetworkPolicy', 'negar-tudo'),
          campo('NetworkPolicy', 'negar-tudo', 'spec.podSelector', { valor: {} })),
        teste({ descricao: 'Fecha a entrada e a saída', dica: 'Em policyTypes: - Ingress e - Egress.' },
          campo('NetworkPolicy', 'negar-tudo', 'spec.policyTypes', { valor: ['Ingress', 'Egress'] })),
      ],
    }),

    exercicio({
      id: 'proj-seg-permitir',
      titulo: 'Etapa 3: abrir só o DNS e o gateway',
      dificuldade: 'dificil',
      existentes: docs(NAMESPACE, NEGAR_TUDO),
      resumo: `
        ${info(3)}
        <p>Com tudo fechado, a API nem descobre o IP do banco. Abra a saída para o DNS e a entrada vinda do gateway de pagamentos.</p>
        <ol>
          <li>Na NetworkPolicy <code>permitir-dns</code> (saída, todos os Pods), o destino é o <code>namespaceSelector</code>
            <code>kubernetes.io/metadata.name: kube-system</code> com o <code>podSelector</code> <code>k8s-app: kube-dns</code>, na porta 53/UDP.</li>
          <li>Na NetworkPolicy <code>api-do-gateway</code>, os Pods <code>app: api</code> recebem só dos Pods <code>app: gateway</code>.</li>
          <li>Essa entrada é só na porta <code>8080/TCP</code>.</li>
        </ol>
        <p><b>No cluster:</b> as políticas se somam: a API resolve nomes e recebe do gateway na 8080; qualquer outra conexão continua bloqueada pela
        <code>negar-tudo</code>.</p>`,
      inicial: `
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        metadata:
          name: permitir-dns
          namespace: pagamentos
        spec:
          podSelector: {}
          policyTypes:
            - Egress
          egress:
            - to:
                - namespaceSelector:
                    matchLabels:
                      kubernetes.io/metadata.name:   # TODO: kube-system
                  podSelector:
                    matchLabels:
                      k8s-app: kube-dns
              ports:
                - protocol: UDP
                  port: 53
        ---
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        metadata:
          name: api-do-gateway
          namespace: pagamentos
        spec:
          podSelector:
            matchLabels:
              app: api
          policyTypes:
            - Ingress
          ingress:
            - from:
                # TODO: - podSelector com app: gateway (passo 2)
              ports:
                # TODO: - protocol TCP e port 8080 (passo 3)
      `,
      dica: [
        'A primeira política é a do exemplo da lição "Arquitetura da segurança em camadas".',
        'No mesmo item de "to", namespaceSelector e podSelector juntos querem dizer "estes Pods, neste namespace".',
        'kubernetes.io/metadata.name: kube-system\n...\n- from:\n    - podSelector:\n        matchLabels:\n          app: gateway\n  ports:\n    - protocol: TCP\n      port: 8080',
      ],
      solucao: `
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        metadata:
          name: permitir-dns
          namespace: pagamentos
        spec:
          podSelector: {}
          policyTypes:
            - Egress
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
        ---
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        metadata:
          name: api-do-gateway
          namespace: pagamentos
        spec:
          podSelector:
            matchLabels:
              app: api
          policyTypes:
            - Ingress
          ingress:
            - from:
                - podSelector:
                    matchLabels:
                      app: gateway
              ports:
                - protocol: TCP
                  port: 8080
      `,
      testes: [
        teste({ descricao: 'A saída vai só para o DNS do kube-system', dica: 'No namespaceSelector: kubernetes.io/metadata.name: kube-system.' },
          campo('NetworkPolicy', 'permitir-dns', 'spec.egress[0].to[0].namespaceSelector.matchLabels["kubernetes.io/metadata.name"]', { valor: 'kube-system' })),
        teste({ descricao: 'A API só recebe do gateway', dica: 'Na api-do-gateway, from: - podSelector com app: gateway.' },
          campo('NetworkPolicy', 'api-do-gateway', 'spec.ingress[0].from[0].podSelector.matchLabels.app', { valor: 'gateway' })),
        teste({ descricao: 'Só na porta 8080', dica: 'Em ports: - protocol: TCP e port: 8080.' },
          campo('NetworkPolicy', 'api-do-gateway', 'spec.ingress[0].ports[0].port', { valor: 8080 })),
      ],
    }),

    exercicio({
      id: 'proj-seg-rbac',
      titulo: 'Etapa 4: o crachá mínimo da API',
      dificuldade: 'medio',
      existentes: NAMESPACE,
      resumo: `
        ${info(4)}
        <p>A API não fala com o Kubernetes, a não ser para ler o ConfigMap <code>limites</code>. Crachá sem token montado, e uma Role que abre só essa porta.</p>
        <ol>
          <li>A ServiceAccount <code>api</code> (namespace <code>pagamentos</code>) tem <code>automountServiceAccountToken: false</code>.</li>
          <li>A Role <code>ler-limites</code> permite <code>get</code> só no ConfigMap <code>limites</code> (<code>resourceNames: ["limites"]</code>).</li>
          <li>O RoleBinding <code>api-ler-limites</code> entrega a Role à ServiceAccount <code>api</code>.</li>
        </ol>
        <p><b>No cluster:</b> <code>kubectl auth can-i get configmaps/limites --as=system:serviceaccount:pagamentos:api -n pagamentos</code> responde <code>yes</code>;
        qualquer outro ConfigMap, <code>no</code>.</p>`,
      inicial: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: api
          namespace: pagamentos
        # TODO: automountServiceAccountToken: false (passo 1)
        ---
        apiVersion: rbac.authorization.k8s.io/v1
        kind: Role
        metadata:
          name: ler-limites
          namespace: pagamentos
        rules:
          - apiGroups: [""]
            resources: ["configmaps"]
            # TODO: resourceNames com limites e verbs só com get (passo 2)
        ---
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: api-ler-limites
          namespace: pagamentos
        subjects:
          - kind: ServiceAccount
            name: api
            namespace: pagamentos
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: Role
          name:                # TODO: ler-limites
      `,
      dica: [
        'É o RBAC de Recursos Avançados, com resourceNames para limitar a um ConfigMap só.',
        'resourceNames fica na regra, ao lado de resources e verbs.',
        'automountServiceAccountToken: false\n...\nresourceNames: ["limites"]\nverbs: ["get"]\n...\nroleRef: ... name: ler-limites',
      ],
      solucao: docs(SA, `
        apiVersion: rbac.authorization.k8s.io/v1
        kind: Role
        metadata:
          name: ler-limites
          namespace: pagamentos
        rules:
          - apiGroups: [""]
            resources: ["configmaps"]
            resourceNames: ["limites"]
            verbs: ["get"]
        ---
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: api-ler-limites
          namespace: pagamentos
        subjects:
          - kind: ServiceAccount
            name: api
            namespace: pagamentos
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: Role
          name: ler-limites
      `),
      testes: [
        teste({ descricao: 'A API não recebe o token', dica: 'Na raiz da ServiceAccount: automountServiceAccountToken: false.' },
          campo('ServiceAccount', 'api', 'automountServiceAccountToken', { valor: false })),
        teste({ descricao: 'A Role só lê o ConfigMap limites', dica: 'Na regra: resourceNames: ["limites"] e verbs: ["get"].' },
          campo('Role', 'ler-limites', 'rules[0].resourceNames', { valor: ['limites'] }),
          campo('Role', 'ler-limites', 'rules[0].verbs', { valor: ['get'] })),
        teste({ descricao: 'A Role é entregue à API', dica: 'No RoleBinding, roleRef.name: ler-limites.' },
          campo('RoleBinding', 'api-ler-limites', 'roleRef.name', { valor: 'ler-limites' })),
      ],
    }),

    exercicio({
      id: 'proj-seg-api',
      titulo: 'Etapa 5: a API com o sistema de arquivos só de leitura',
      dificuldade: 'dificil',
      existentes: docs(NAMESPACE, SA),
      resumo: `
        ${info(5)}
        <p>A última camada fica dentro do container: um invasor não consegue nem gravar um arquivo. O NGINX ainda precisa de uma pasta temporária, que
        vem de um <code>emptyDir</code>.</p>
        <ol>
          <li>O Deployment <code>api</code> já passa no nível restricted. No <code>securityContext</code> do container, acrescente
            <code>readOnlyRootFilesystem: true</code>.</li>
          <li>Declare o volume <code>tmp</code> do tipo <code>emptyDir: {}</code>.</li>
          <li>Monte <code>tmp</code> em <code>/tmp</code> no container <code>api</code>.</li>
        </ol>
        <p><b>No cluster:</b> qualquer escrita fora de <code>/tmp</code> falha com <code>Read-only file system</code>, e o que ficar em <code>/tmp</code> some
        quando o Pod é recriado.</p>`,
      inicial: deployApi({
        pod: '        # TODO: volumes com tmp do tipo emptyDir (passo 2)\n',
        seguranca: '              # TODO: readOnlyRootFilesystem: true (passo 1)\n',
        container: '            # TODO: volumeMounts de tmp em /tmp (passo 3)\n',
      }),
      dica: [
        'readOnlyRootFilesystem fica no securityContext do container, ao lado de allowPrivilegeEscalation.',
        'O volume emptyDir é o dos Fundamentos (lição "Volumes").',
        'readOnlyRootFilesystem: true\n...\nvolumes:\n  - name: tmp\n    emptyDir: {}\n...\nvolumeMounts:\n  - name: tmp\n    mountPath: /tmp',
      ],
      solucao: deployApi({
        pod: `        volumes:
          - name: tmp
            emptyDir: {}
`,
        seguranca: '              readOnlyRootFilesystem: true\n',
        container: `            volumeMounts:
              - name: tmp
                mountPath: /tmp
`,
      }),
      testes: [
        teste({ descricao: 'O sistema de arquivos é só de leitura', dica: 'No securityContext do container: readOnlyRootFilesystem: true.' },
          campo('Deployment', 'api', 'spec.template.spec.containers[name=api].securityContext.readOnlyRootFilesystem', { valor: true })),
        teste({ descricao: 'Há uma pasta temporária em /tmp', dica: 'Volume tmp com emptyDir: {}, montado em /tmp.' },
          campo('Deployment', 'api', 'spec.template.spec.volumes[name=tmp].emptyDir', { valor: {} }),
          campo('Deployment', 'api', 'spec.template.spec.containers[name=api].volumeMounts[name=tmp].mountPath', { valor: '/tmp' })),
      ],
    }),
  ],
  ocultos: {
    'proj-seg-namespace': { dica: 'A label do time continua no namespace.', regras: [campo('Namespace', 'pagamentos', 'metadata.labels.time', { valor: 'pagamentos' })] },
    'proj-seg-negar': { dica: 'Sem regras de entrada nem de saída: a lista vazia é que nega tudo.', regras: [campo('NetworkPolicy', 'negar-tudo', 'spec.ingress', { ausente: true }), campo('NetworkPolicy', 'negar-tudo', 'spec.egress', { ausente: true })] },
    'proj-seg-permitir': { dica: 'Confira o protocolo da porta 8080 e o tipo da política do gateway.', regras: [campo('NetworkPolicy', 'api-do-gateway', 'spec.ingress[0].ports[0].protocol', { valor: 'TCP' }), campo('NetworkPolicy', 'api-do-gateway', 'spec.policyTypes', { valor: ['Ingress'] })] },
    'proj-seg-rbac': { dica: 'A regra é só de ConfigMaps, sem curinga.', regras: [campo('Role', 'ler-limites', 'rules[0].resources', { valor: ['configmaps'] }), campo('Role', 'ler-limites', 'rules[0].verbs', { naoContem: '*' })] },
    'proj-seg-api': { dica: 'O container continua sem escalada de privilégio e com a ServiceAccount da etapa 4.', regras: [campo('Deployment', 'api', 'spec.template.spec.containers[name=api].securityContext.allowPrivilegeEscalation', { valor: false }), campo('Deployment', 'api', 'spec.template.spec.serviceAccountName', { valor: 'api' })] },
  },
};
