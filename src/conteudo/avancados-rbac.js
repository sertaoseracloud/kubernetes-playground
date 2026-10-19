// Recursos Avançados: RBAC e ServiceAccounts (quem pode fazer o quê no cluster).
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
        <li><b>Menor privilégio</b>: dê só os verbos e recursos necessários. Evite <code>"*"</code>.</li>
        <li>Um <b>ServiceAccount por aplicação</b>, em vez do <code>default</code> do namespace.</li>
        <li>Se o Pod não fala com a API, desligue o token: <code>automountServiceAccountToken: false</code>.</li>
        <li>O grupo da API principal (Pods, Services, ConfigMaps) é a string vazia: <code>apiGroups: [""]</code>.</li>
        <li>Para testar: <code>kubectl auth can-i list pods --as=system:serviceaccount:loja:monitor -n loja</code>.</li>
      </ul>`),
    exercicio({
      id: 'rbac-sa-sem-token',
      titulo: 'ServiceAccount sem token montado',
      dificuldade: 'facil',
      resumo: `<p>A aplicação <b>relatorios</b> não conversa com a API do Kubernetes, então não precisa do token.</p>
        <ul>
          <li>Crie a ServiceAccount <code>relatorios</code> com o label <code>app: relatorios</code>.</li>
          <li>Desligue a montagem automática do token com <code>automountServiceAccountToken: false</code>.</li>
        </ul>`,
      dica: 'automountServiceAccountToken fica no nível raiz do manifesto, ao lado de metadata (a ServiceAccount não tem spec).',
      solucao: `apiVersion: v1
kind: ServiceAccount
metadata:
  name: relatorios
  labels:
    app: relatorios
automountServiceAccountToken: false`,
      testes: [
        teste('A ServiceAccount existe', existe('ServiceAccount', 'relatorios')),
        teste('O token não é montado nos Pods', campo('ServiceAccount', 'relatorios', 'automountServiceAccountToken', { valor: false })),
        teste('O label app está certo', campo('ServiceAccount', 'relatorios', 'metadata.labels.app', { valor: 'relatorios' })),
      ],
    }),
    exercicio({
      id: 'rbac-role-leitor',
      titulo: 'Role de leitura de Pods e logs',
      dificuldade: 'medio',
      resumo: `<p>O time de monitoramento precisa <b>ler</b> Pods e seus logs no namespace <code>loja</code>, sem poder apagar nada.</p>
        <ol>
          <li>Crie a ServiceAccount <code>monitor</code> no namespace <code>loja</code>.</li>
          <li>Crie a Role <code>leitor-pods</code> (namespace <code>loja</code>) com <code>apiGroups: [""]</code>, recursos
            <code>pods</code> e <code>pods/log</code> e os verbos <code>get</code>, <code>list</code> e <code>watch</code>.</li>
          <li>Crie o RoleBinding <code>leitor-pods</code> que entrega a Role à ServiceAccount <code>monitor</code>.</li>
        </ol>`,
      dica: 'No RoleBinding, roleRef tem apiGroup rbac.authorization.k8s.io, kind Role e name; subjects lista a ServiceAccount com o namespace dela.',
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
        teste('A Role e o RoleBinding existem', existe('Role', 'leitor-pods'), existe('RoleBinding', 'leitor-pods')),
        teste('A Role lê Pods e logs', campo('Role', 'leitor-pods', 'rules[*].resources', { contem: 'pods/log' }), campo('Role', 'leitor-pods', 'rules[*].verbs', { contem: 'watch' })),
        teste('Menor privilégio: nada de apagar nem de curinga', campo('Role', 'leitor-pods', 'rules[*].verbs', { naoContem: 'delete' }), campo('Role', 'leitor-pods', 'rules[*].verbs', { naoContem: '*' })),
        teste('O RoleBinding liga a Role à ServiceAccount monitor',
          campo('RoleBinding', 'leitor-pods', 'roleRef.name', { valor: 'leitor-pods' }),
          campo('RoleBinding', 'leitor-pods', 'subjects[kind=ServiceAccount].name', { valor: 'monitor' })),
      ],
    }),
    exercicio({
      id: 'rbac-clusterrole-nodes',
      titulo: 'ClusterRole para ver os nós',
      dificuldade: 'medio',
      resumo: `<p>Nós (<code>nodes</code>) não têm namespace, então uma Role comum não serve. O grupo <code>plataforma</code>
        do provedor de identidade precisa listar os nós.</p>
        <ul>
          <li>Crie a ClusterRole <code>ver-nos</code> com <code>get</code>, <code>list</code> e <code>watch</code> em <code>nodes</code> (<code>apiGroups: [""]</code>).</li>
          <li>Crie o ClusterRoleBinding <code>ver-nos</code> para o <b>Group</b> <code>plataforma</code>
            (<code>apiGroup: rbac.authorization.k8s.io</code>).</li>
        </ul>`,
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
        teste('A ClusterRole libera a leitura de nodes', existe('ClusterRole', 'ver-nos'), campo('ClusterRole', 'ver-nos', 'rules[*].resources', { contem: 'nodes' }), campo('ClusterRole', 'ver-nos', 'rules[*].verbs', { contem: 'list' })),
        teste('O ClusterRoleBinding entrega a ClusterRole ao grupo plataforma',
          campo('ClusterRoleBinding', 'ver-nos', 'roleRef.kind', { valor: 'ClusterRole' }),
          campo('ClusterRoleBinding', 'ver-nos', 'subjects[0].kind', { valor: 'Group' }),
          campo('ClusterRoleBinding', 'ver-nos', 'subjects[0].name', { valor: 'plataforma' })),
      ],
    }),
    exercicio({
      id: 'rbac-deploy-sa',
      titulo: 'Deployment com ServiceAccount própria',
      dificuldade: 'facil',
      resumo: `<p>Cada aplicação deve ter o próprio crachá. Crie:</p>
        <ul>
          <li>A ServiceAccount <code>api-sa</code>.</li>
          <li>O Deployment <code>api</code> com 2 réplicas, label <code>app: api</code>, container <code>api</code> com a imagem
            <code>nginx:1.27</code> e <code>serviceAccountName: api-sa</code> no template do Pod.</li>
        </ul>`,
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
        teste('A ServiceAccount e o Deployment existem', existe('ServiceAccount', 'api-sa'), existe('Deployment', 'api')),
        teste('Os Pods usam a ServiceAccount api-sa', campo('Deployment', 'api', 'spec.template.spec.serviceAccountName', { valor: 'api-sa' })),
        teste('O Deployment tem 2 réplicas', { tipo: 'deployment-replicas', deployment: 'api', valor: 2 }),
      ],
    }),
  ],
};
