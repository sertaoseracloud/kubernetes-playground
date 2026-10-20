// Recursos Avançados: RBAC e ServiceAccounts (quem pode fazer o quê no cluster).
// Segue docs/didatica.md: lição com exemplo comentado, passos, esqueleto, dicas e "como corrigir".
import { licao, exercicio, teste, existe, campo } from './util.js';

export const avancadosRbac = {
  id: 'rbac',
  titulo: 'RBAC e ServiceAccounts',
  itens: [
    licao('rbac-conceitos', 'RBAC: quem pode fazer o quê', 'medio', `
      <p><b>RBAC</b> (controle de acesso baseado em papéis) decide quem pode fazer o quê na API do Kubernetes.
      Pense num prédio comercial:</p>
      <ul>
        <li><b>ServiceAccount</b> é o <b>crachá</b> de um programa (um Pod). Pessoas usam usuários e grupos do
          provedor de identidade; Pods usam ServiceAccounts.</li>
        <li><b>Role</b> é a <b>lista de salas</b> que um crachá abre, dentro de um andar (um namespace). Cada regra diz
          <code>apiGroups</code> (o bloco), <code>resources</code> (as salas) e <code>verbs</code> (o que se pode fazer:
          <code>get</code>, <code>list</code>, <code>watch</code>, <code>create</code>, <code>update</code>, <code>patch</code>, <code>delete</code>).</li>
        <li><b>RoleBinding</b> é a <b>catraca configurada</b>: liga a Role aos crachás (<code>subjects</code>) daquele andar.</li>
        <li><b>ClusterRole</b> e <b>ClusterRoleBinding</b> valem para o prédio inteiro: recursos sem namespace (como
          <code>nodes</code>) ou permissões em todos os namespaces.</li>
      </ul>
      <p>Boas práticas:</p>
      <ul>
        <li><b>Menor privilégio</b>: dê só os verbos e recursos necessários. Evite <code>"*"</code> (o curinga libera tudo).</li>
        <li>Um <b>ServiceAccount por aplicação</b>, em vez do <code>default</code> do namespace.</li>
        <li>Se o Pod não fala com a API, desligue o token: <code>automountServiceAccountToken: false</code>.</li>
        <li>O grupo da API principal (Pods, Services, ConfigMaps) é a string vazia: <code>apiGroups: [""]</code>.</li>
        <li>Para testar: <code>kubectl auth can-i list pods --as=system:serviceaccount:loja:monitor -n loja</code>.</li>
      </ul>
      <p><b>Repare:</b> ServiceAccount, Role e RoleBinding <b>não têm <code>spec</code></b>. Os campos (<code>rules</code>,
      <code>subjects</code>, <code>roleRef</code>, <code>automountServiceAccountToken</code>) ficam na raiz do manifesto.</p>`,
    `
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: faxina              # o crachá do programa
        namespace: escritorio
      ---
      apiVersion: rbac.authorization.k8s.io/v1
      kind: Role
      metadata:
        name: ver-configmaps
        namespace: escritorio     # vale só neste andar
      rules:                      # sem spec: rules fica na raiz
        - apiGroups: [""]         # "" = API principal (Pods, ConfigMaps...)
          resources: ["configmaps"]
          verbs: ["get", "list"]  # só ler; nada de apagar
      ---
      apiVersion: rbac.authorization.k8s.io/v1
      kind: RoleBinding
      metadata:
        name: faxina-ver-configmaps
        namespace: escritorio
      subjects:                   # QUEM recebe a permissão
        - kind: ServiceAccount
          name: faxina
          namespace: escritorio
      roleRef:                    # QUAL permissão
        apiGroup: rbac.authorization.k8s.io
        kind: Role
        name: ver-configmaps
    `),

    exercicio({
      id: 'rbac-sa-sem-token',
      titulo: 'ServiceAccount sem token montado',
      dificuldade: 'facil',
      resumo: `
        <p>A aplicação <b>relatorios</b> não conversa com a API do Kubernetes, então não precisa do token (a "senha" do crachá).
        Menos token montado, menos risco se o Pod for invadido.</p>
        <ol>
          <li>Crie a ServiceAccount <code>relatorios</code> com a label <code>app: relatorios</code>.</li>
          <li>Na raiz do manifesto (ao lado de <code>metadata</code>), escreva <code>automountServiceAccountToken: false</code>.</li>
        </ol>
        <p><b>No cluster:</b> os Pods que usarem esta ServiceAccount não recebem o arquivo de token em
        <code>/var/run/secrets/kubernetes.io/serviceaccount</code>.</p>`,
      inicial: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: relatorios
          # TODO: labels com app: relatorios
        # TODO: automountServiceAccountToken: false (na raiz, sem spec)
      `,
      dica: [
        'A ServiceAccount não tem spec: o campo do token fica encostado na margem, como kind.',
        'automountServiceAccountToken: false  (e em metadata: labels:\n  app: relatorios)',
      ],
      solucao: `apiVersion: v1
kind: ServiceAccount
metadata:
  name: relatorios
  labels:
    app: relatorios
automountServiceAccountToken: false`,
      testes: [
        teste({ descricao: 'A ServiceAccount existe', dica: 'Mantenha kind: ServiceAccount e metadata.name: relatorios.' }, existe('ServiceAccount', 'relatorios')),
        teste({ descricao: 'O token não é montado nos Pods', dica: 'Na raiz do manifesto: automountServiceAccountToken: false.' },
          campo('ServiceAccount', 'relatorios', 'automountServiceAccountToken', { valor: false })),
        teste({ descricao: 'O label app está certo', dica: 'Em metadata.labels, escreva app: relatorios.' },
          campo('ServiceAccount', 'relatorios', 'metadata.labels.app', { valor: 'relatorios' })),
      ],
    }),

    exercicio({
      id: 'rbac-role-leitor',
      titulo: 'Role de leitura de Pods e logs',
      dificuldade: 'medio',
      resumo: `
        <p>O time de monitoramento precisa <b>ler</b> Pods e seus logs no namespace <code>loja</code>, sem poder apagar nada.</p>
        <ol>
          <li>Crie a ServiceAccount <code>monitor</code> no namespace <code>loja</code>.</li>
          <li>Crie a Role <code>leitor-pods</code> (namespace <code>loja</code>) com <code>apiGroups: [""]</code>, recursos
            <code>pods</code> e <code>pods/log</code> e os verbos <code>get</code>, <code>list</code> e <code>watch</code>.</li>
          <li>Crie o RoleBinding <code>leitor-pods</code> que entrega a Role à ServiceAccount <code>monitor</code>.</li>
        </ol>
        <p><b>No cluster:</b> <code>kubectl auth can-i delete pods --as=system:serviceaccount:loja:monitor -n loja</code>
        responde <code>no</code>; <code>list pods</code> responde <code>yes</code>.</p>`,
      inicial: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: monitor
          namespace: loja
        ---
        apiVersion: rbac.authorization.k8s.io/v1
        kind: Role
        metadata:
          name: leitor-pods
          namespace: loja
        rules:
          - apiGroups: [""]
            resources:         # TODO: ["pods", "pods/log"]
            verbs:             # TODO: só leitura: get, list e watch
        ---
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: leitor-pods
          namespace: loja
        subjects:
          # TODO: - kind: ServiceAccount, name: monitor, namespace: loja
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: Role
          name:                # TODO: leitor-pods
      `,
      dica: [
        'Releia o exemplo da lição "RBAC": ele tem exatamente as três peças, com outros nomes.',
        'Os logs são um sub-recurso: escreva "pods/log" na lista de resources. Leitura = get, list, watch.',
        'subjects:\n  - kind: ServiceAccount\n    name: monitor\n    namespace: loja',
      ],
      solucao: `apiVersion: v1
kind: ServiceAccount
metadata:
  name: monitor
  namespace: loja
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: leitor-pods
  namespace: loja
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: leitor-pods
  namespace: loja
subjects:
  - kind: ServiceAccount
    name: monitor
    namespace: loja
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: leitor-pods`,
      testes: [
        teste({ descricao: 'A Role e o RoleBinding existem', dica: 'Preencha os TODO: um campo vazio impede o apply.' },
          existe('Role', 'leitor-pods'), existe('RoleBinding', 'leitor-pods')),
        teste({ descricao: 'A Role lê Pods e logs', dica: 'Em rules → resources, inclua "pods" e "pods/log"; em verbs, get, list e watch.' },
          campo('Role', 'leitor-pods', 'rules[*].resources', { contem: 'pods/log' }), campo('Role', 'leitor-pods', 'rules[*].verbs', { contem: 'watch' })),
        teste({ descricao: 'Menor privilégio: nada de apagar nem de curinga', dica: 'Liste só get, list e watch nos verbs: sem delete e sem "*".' },
          campo('Role', 'leitor-pods', 'rules[*].verbs', { naoContem: 'delete' }), campo('Role', 'leitor-pods', 'rules[*].verbs', { naoContem: '*' })),
        teste({ descricao: 'O RoleBinding liga a Role à ServiceAccount monitor', dica: 'roleRef.name: leitor-pods e, em subjects, a ServiceAccount monitor do namespace loja.' },
          campo('RoleBinding', 'leitor-pods', 'roleRef.name', { valor: 'leitor-pods' }),
          campo('RoleBinding', 'leitor-pods', 'subjects[kind=ServiceAccount].name', { valor: 'monitor' })),
      ],
    }),

    exercicio({
      id: 'rbac-clusterrole-nodes',
      titulo: 'ClusterRole para ver os nós',
      dificuldade: 'medio',
      resumo: `
        <p>Nós (<code>nodes</code>) não têm namespace, então uma Role comum não serve. O grupo <code>plataforma</code> do
        provedor de identidade precisa listar os nós.</p>
        <ol>
          <li>Crie a ClusterRole <code>ver-nos</code> com <code>apiGroups: [""]</code>, <code>resources: ["nodes"]</code> e os
            verbos <code>get</code>, <code>list</code> e <code>watch</code>.</li>
          <li>Crie o ClusterRoleBinding <code>ver-nos</code> com <code>roleRef.kind: ClusterRole</code>.</li>
          <li>Em <code>subjects</code>, um item <code>kind: Group</code>, <code>name: plataforma</code> e
            <code>apiGroup: rbac.authorization.k8s.io</code>.</li>
        </ol>
        <p><b>No cluster:</b> qualquer pessoa do grupo <code>plataforma</code> pode rodar <code>kubectl get nodes</code>. A
        ClusterRole e o binding não levam <code>namespace</code>.</p>`,
      inicial: `
        apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRole
        metadata:
          name: ver-nos            # sem namespace: vale no cluster todo
        rules:
          - apiGroups: [""]
            resources:             # TODO: ["nodes"]
            verbs:                 # TODO: get, list e watch
        ---
        apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRoleBinding
        metadata:
          name: ver-nos
        subjects:
          # TODO: - kind: Group, name: plataforma, apiGroup: rbac.authorization.k8s.io
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind:                    # TODO: ClusterRole
          name: ver-nos
      `,
      dica: [
        'É a mesma estrutura de Role e RoleBinding, trocando os kinds e sem namespace.',
        'Para grupos, o subject leva apiGroup (e não namespace): kind: Group, name: plataforma, apiGroup: rbac.authorization.k8s.io.',
      ],
      solucao: `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ver-nos
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ver-nos
subjects:
  - kind: Group
    name: plataforma
    apiGroup: rbac.authorization.k8s.io
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ver-nos`,
      testes: [
        teste({ descricao: 'A ClusterRole libera a leitura de nodes', dica: 'Na ClusterRole: resources: ["nodes"] e verbs com get, list e watch.' },
          existe('ClusterRole', 'ver-nos'), campo('ClusterRole', 'ver-nos', 'rules[*].resources', { contem: 'nodes' }), campo('ClusterRole', 'ver-nos', 'rules[*].verbs', { contem: 'list' })),
        teste({ descricao: 'O ClusterRoleBinding entrega a ClusterRole ao grupo plataforma', dica: 'roleRef.kind: ClusterRole e, em subjects, kind: Group com name: plataforma.' },
          campo('ClusterRoleBinding', 'ver-nos', 'roleRef.kind', { valor: 'ClusterRole' }),
          campo('ClusterRoleBinding', 'ver-nos', 'subjects[0].kind', { valor: 'Group' }),
          campo('ClusterRoleBinding', 'ver-nos', 'subjects[0].name', { valor: 'plataforma' })),
      ],
    }),

    exercicio({
      id: 'rbac-deploy-sa',
      titulo: 'Deployment com ServiceAccount própria',
      dificuldade: 'facil',
      resumo: `
        <p>Cada aplicação deve ter o próprio crachá, para você poder dar permissões só a ela.</p>
        <ol>
          <li>Crie a ServiceAccount <code>api-sa</code>.</li>
          <li>Complete o Deployment <code>api</code>: <code>replicas: 2</code> e a label <code>app: api</code>.</li>
          <li>No spec do Pod (dentro de <code>template</code>), escreva <code>serviceAccountName: api-sa</code>.</li>
        </ol>
        <p><b>No cluster:</b> os Pods do Deployment passam a falar com a API como <code>api-sa</code>. Sem isso, usariam o
        <code>default</code> do namespace, compartilhado com todo mundo.</p>`,
      inicial: `
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name:                    # TODO: api-sa
        ---
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: api
        spec:
          replicas:                # TODO: 2
          selector:
            matchLabels:
              app: api
          template:
            metadata:
              labels:
                app: api
            spec:
              # TODO: serviceAccountName: api-sa
              containers:
                - name: api
                  image: nginx:1.27
      `,
      dica: [
        'serviceAccountName é do Pod: fica em template.spec, alinhado com containers.',
        'template:\n  spec:\n    serviceAccountName: api-sa\n    containers: ...',
      ],
      solucao: `apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-sa
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
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
      serviceAccountName: api-sa
      containers:
        - name: api
          image: nginx:1.27`,
      testes: [
        teste({ descricao: 'A ServiceAccount e o Deployment existem', dica: 'Preencha o nome da ServiceAccount e as réplicas.' },
          existe('ServiceAccount', 'api-sa'), existe('Deployment', 'api')),
        teste({ descricao: 'Os Pods usam a ServiceAccount api-sa', dica: 'Em template.spec, escreva serviceAccountName: api-sa.' },
          campo('Deployment', 'api', 'spec.template.spec.serviceAccountName', { valor: 'api-sa' })),
        teste({ descricao: 'O Deployment tem 2 réplicas', dica: 'Em spec, escreva replicas: 2.' },
          { tipo: 'deployment-replicas', deployment: 'api', valor: 2 }),
      ],
    }),
  ],
  // Casos ocultos (rodam só no ⬆ Enviar): o resto do que os passos pedem.
  ocultos: {
    'rbac-role-leitor': { dica: 'Releia os passos: algum valor pedido na RoleBinding leitor-pods ainda não confere.', regras: [campo('RoleBinding', 'leitor-pods', 'roleRef.apiGroup', { valor: 'rbac.authorization.k8s.io' }), campo('RoleBinding', 'leitor-pods', 'subjects[name=monitor].kind', { valor: 'ServiceAccount' })] },
    'rbac-clusterrole-nodes': { dica: 'Releia os passos: algum valor pedido na ClusterRoleBinding ver-nos ainda não confere.', regras: [campo('ClusterRoleBinding', 'ver-nos', 'subjects[name=plataforma].apiGroup', { valor: 'rbac.authorization.k8s.io' }), campo('ClusterRoleBinding', 'ver-nos', 'roleRef.name', { valor: 'ver-nos' })] },
    'rbac-deploy-sa': { dica: 'Releia os passos: algum valor pedido no Deployment api ainda não confere.', regras: [campo('Deployment', 'api', 'spec.template.spec.containers[name=api].image', { valor: 'nginx:1.27' }), campo('Deployment', 'api', 'spec.selector.matchLabels.app', { valor: 'api' })] },
    'rbac-sa-sem-token': { dica: 'Confira a apiVersion da ServiceAccount relatorios e não liste secrets nela.', regras: [campo('ServiceAccount', 'relatorios', 'apiVersion', { valor: 'v1' }), campo('ServiceAccount', 'relatorios', 'secrets', { ausente: true })] },
  },
};
