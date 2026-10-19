// Os comandos do terminal interativo: um kubectl de mentira, em cima do cluster simulado.
// A saída imita a do kubectl de verdade (em inglês, como no terminal real); as explicações
// para a pessoa ficam em português. Função pura sobre o estado (obterEstado): quem aplica,
// apaga e roda os testes é a tela do exercício (src/ui/item.js), que recebe a `acao`.
//
// Comandos: kubectl apply|diff -f manifest.yaml, kubectl get, kubectl describe,
// kubectl delete, kubectl version, kubectl cluster-info, kubectl explain, drift, help e clear.

import { API_VERSIONS } from './simulador.js';

/** Os tipos que o kubectl get/describe/delete aceitam, com os apelidos de verdade. */
export const TIPOS = {
  pods: { kind: 'Pod', lista: 'pods', apelidos: ['pod', 'po'] },
  services: { kind: 'Service', lista: 'services', apelidos: ['service', 'svc'] },
  deployments: { kind: 'Deployment', lista: 'deployments', apelidos: ['deployment', 'deploy'], prefixo: 'deployment.apps' },
  configmaps: { kind: 'ConfigMap', lista: 'configmaps', apelidos: ['configmap', 'cm'] },
  secrets: { kind: 'Secret', lista: 'secrets', apelidos: ['secret'] },
  ingresses: { kind: 'Ingress', lista: 'ingresses', apelidos: ['ingress', 'ing'], prefixo: 'ingress.networking.k8s.io' },
  hpa: { kind: 'HorizontalPodAutoscaler', lista: 'hpas', apelidos: ['horizontalpodautoscaler', 'horizontalpodautoscalers'], prefixo: 'horizontalpodautoscaler.autoscaling' },
  networkpolicies: { kind: 'NetworkPolicy', lista: 'networkpolicies', apelidos: ['networkpolicy', 'netpol'] },
  pvc: { kind: 'PersistentVolumeClaim', lista: 'pvcs', apelidos: ['persistentvolumeclaim', 'persistentvolumeclaims'] },
  serviceaccounts: { kind: 'ServiceAccount', lista: 'serviceaccounts', apelidos: ['serviceaccount', 'sa'] },
  cronjobs: { kind: 'CronJob', lista: 'cronjobs', apelidos: ['cronjob', 'cj'], prefixo: 'cronjob.batch' },
  jobs: { kind: 'Job', lista: 'jobs', apelidos: ['job'], prefixo: 'job.batch' },
  nodes: { kind: 'Node', lista: 'nos', apelidos: ['node', 'no'] },
};

/** Apelidos curtos de verdade (kubectl api-resources) dos kinds guardados de forma genérica. */
const APELIDOS = {
  StatefulSet: ['sts'], DaemonSet: ['ds'], ReplicaSet: ['rs'], Namespace: ['ns'], StorageClass: ['sc'],
  PersistentVolume: ['pv'], PodDisruptionBudget: ['pdb'], ResourceQuota: ['quota'], LimitRange: ['limits'],
  PriorityClass: ['pc'], CustomResourceDefinition: ['crd', 'crds'], Endpoints: ['ep'], Gateway: ['gtw'],
  Kustomization: ['ks'], HelmRelease: ['hr'], ExternalSecret: ['es'], Certificate: ['cert', 'certs'],
  VerticalPodAutoscaler: ['vpa'], ScaledObject: ['so'], VolumeSnapshot: ['vs'],
};

const plural = (kind) => {
  const k = kind.toLowerCase();
  if (k.endsWith('s')) return k.endsWith('ss') ? `${k}es` : k;
  return k.endsWith('y') ? `${k.slice(0, -1)}ies` : `${k}s`;
};

// Os kinds que o simulador guarda em "outros" (StatefulSet, Role, CRDs...) também entram no get/describe/delete.
for (const [kind, versoes] of Object.entries(API_VERSIONS)) {
  if (Object.values(TIPOS).some((t) => t.kind === kind)) continue;
  const grupo = versoes[0].includes('/') ? versoes[0].split('/')[0] : '';
  TIPOS[plural(kind)] = {
    kind, lista: 'outros', apelidos: [kind.toLowerCase(), ...(APELIDOS[kind] ?? [])], prefixo: grupo ? `${kind.toLowerCase()}.${grupo}` : undefined,
  };
}

/** Os recursos de um tipo no estado (a lista "outros" é filtrada pelo kind). */
const recursosDoTipo = (t, estado) => (t.lista === 'outros' ? (estado.outros ?? []).filter((r) => r.kind === t.kind) : estado[t.lista] ?? []);

const NOME_TIPO = Object.fromEntries(Object.entries(TIPOS).flatMap(([nome, t]) => [[nome, nome], ...t.apelidos.map((a) => [a, nome])]));

/** O tipo pelo nome digitado ("po", "svc", "deployment.apps"...), ou null. */
export function tipoPorNome(texto) {
  const base = String(texto ?? '').toLowerCase().split('.')[0];
  return NOME_TIPO[base] ?? null;
}

export const COMANDOS = [
  'kubectl apply -f manifest.yaml',
  'kubectl diff -f manifest.yaml',
  'kubectl delete -f manifest.yaml',
  'kubectl get all',
  'kubectl get pods',
  'kubectl get services',
  'kubectl get deployments',
  'kubectl get configmaps',
  'kubectl get secrets',
  'kubectl get nodes',
  'kubectl describe',
  'kubectl delete',
  'kubectl explain',
  'kubectl version',
  'kubectl cluster-info',
  'drift',
  'help',
  'clear',
];

/** Opções do Tab para o que já foi digitado. */
export function completarKubectl(texto) {
  const t = texto.replace(/^\s+/, '');
  if (!t) return ['kubectl', 'help', 'clear', 'drift'];
  return COMANDOS.filter((c) => c.startsWith(t) && c !== t);
}

const linha = (texto, classe = '') => ({ texto, classe });
const pad = (texto, n) => String(texto).padEnd(n);

/** Tabela alinhada como a do kubectl (colunas separadas por 3 espaços). */
function tabela(cabecalho, linhas) {
  const larguras = cabecalho.map((c, i) => Math.max(c.length, ...linhas.map((l) => String(l[i]).length)));
  const fmt = (cols) => cols.map((c, i) => (i === cols.length - 1 ? String(c) : pad(c, larguras[i] + 3))).join('');
  return [linha(fmt(cabecalho), 'forte'), ...linhas.map((l) => linha(fmt(l)))];
}

const sufixo = (nome, i) => {
  let h = 5381;
  for (const c of `${nome}-${i}`) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return h.toString(36).slice(0, 5).padEnd(5, 'x');
};

/** Pods do cluster: os criados direto e os dos Deployments (um por réplica). */
function todosOsPods(estado) {
  const diretos = estado.pods.map((p) => ({ nome: p.nome, status: p.status ?? 'Running', prontos: `${p.containers?.length || 1}/${p.containers?.length || 1}` }));
  const deDeploy = estado.deployments.flatMap((d) => Array.from({ length: Number(d.replicas) || 0 }, (_, i) => ({
    nome: `${d.nome}-${sufixo(d.nome, 'rs').slice(0, 5)}${sufixo(d.nome, 'h')}-${sufixo(d.nome, i)}`.slice(0, 63),
    status: 'Running',
    prontos: `${d.containers?.length || 1}/${d.containers?.length || 1}`,
  })));
  return [...diretos, ...deDeploy];
}

function linhasDoGet(nomeTipo, estado, nome) {
  const t = TIPOS[nomeTipo];
  let itens = nomeTipo === 'pods' ? todosOsPods(estado) : [...recursosDoTipo(t, estado)];
  if (nomeTipo === 'nodes' && !itens.length) itens = [{ nome: 'node-1', status: 'Ready' }];
  if (nome) {
    itens = itens.filter((r) => r.nome === nome);
    if (!itens.length) return [linha(`Error from server (NotFound): ${nomeTipo} "${nome}" not found`, 'erro')];
  }
  if (!itens.length) return null;
  const idade = '5s';
  switch (nomeTipo) {
    case 'pods': return tabela(['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE'], itens.map((p) => [p.nome, p.prontos, p.status, 0, idade]));
    case 'services': return tabela(['NAME', 'TYPE', 'CLUSTER-IP', 'EXTERNAL-IP', 'PORT(S)', 'AGE'], itens.map((s) => [
      s.nome, s.tipo, s.clusterIP ?? '<none>', s.tipo === 'LoadBalancer' ? '<pending>' : '<none>',
      (s.portas ?? []).map((p) => `${p.porta}${s.nodePort ? `:${s.nodePort}` : ''}/${p.protocolo ?? 'TCP'}`).join(',') || '<none>', idade]));
    case 'deployments': return tabela(['NAME', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'AGE'], itens.map((d) => [d.nome, `${d.replicas}/${d.replicas}`, d.replicas, d.replicas, idade]));
    case 'configmaps': return tabela(['NAME', 'DATA', 'AGE'], itens.map((c) => [c.nome, Object.keys(c.data ?? {}).length, idade]));
    case 'secrets': return tabela(['NAME', 'TYPE', 'DATA', 'AGE'], itens.map((s) => [s.nome, s.tipo, Object.keys({ ...s.data, ...s.stringData }).length, idade]));
    case 'hpa': return tabela(['NAME', 'REFERENCE', 'MINPODS', 'MAXPODS', 'AGE'], itens.map((h) => [h.nome, `Deployment/${h.target}`, h.min, h.max, idade]));
    case 'statefulsets': return tabela(['NAME', 'READY', 'AGE'], itens.map((s) => [s.nome, `${s.spec?.replicas ?? 1}/${s.spec?.replicas ?? 1}`, idade]));
    case 'daemonsets': return tabela(['NAME', 'DESIRED', 'CURRENT', 'READY', 'AGE'], itens.map((d) => [d.nome, 1, 1, 1, idade]));
    case 'cronjobs': return tabela(['NAME', 'SCHEDULE', 'SUSPEND', 'ACTIVE', 'AGE'], itens.map((c) => [c.nome, c.schedule, 'False', 0, idade]));
    case 'nodes': return tabela(['NAME', 'STATUS', 'ROLES', 'AGE', 'VERSION'], itens.map((n) => [n.nome, n.status ?? 'Ready', 'control-plane', '1d', 'v1.31.0']));
    case 'pvc': return tabela(['NAME', 'STATUS', 'CAPACITY', 'ACCESS MODES', 'STORAGECLASS', 'AGE'], itens.map((p) => [p.nome, 'Bound', p.size || '<none>', (p.accessModes ?? []).join(',') || '<none>', p.storageClass || 'standard', idade]));
    default: return tabela(['NAME', 'AGE'], itens.map((r) => [r.nome, idade]));
  }
}

function get(args, estado) {
  const [alvo, nome] = args.filter((a) => !a.startsWith('-'));
  if (!alvo) {
    return [
      linha('You must specify the type of resource to get. Use "kubectl api-resources" for a complete list of supported resources.', 'erro'),
      linha('# Exemplos: kubectl get pods · kubectl get svc · kubectl get all', 'comentario'),
    ];
  }
  if (alvo === 'all') {
    const saida = [];
    for (const tipo of ['pods', 'services', 'deployments']) {
      const bloco = linhasDoGet(tipo, estado);
      if (!bloco) continue;
      const prefixo = TIPOS[tipo].prefixo ?? TIPOS[tipo].kind.toLowerCase();
      if (saida.length) saida.push(linha(''));
      saida.push(bloco[0], ...bloco.slice(1).map((l) => linha(`${prefixo}/${l.texto}`)));
    }
    return saida.length ? saida : [linha('No resources found in default namespace.')];
  }
  const tipo = tipoPorNome(alvo);
  if (!tipo) return [linha(`error: the server doesn't have a resource type "${alvo}"`, 'erro')];
  return linhasDoGet(tipo, estado, nome) ?? [linha('No resources found in default namespace.')];
}

function describe(args, estado) {
  const [alvo, nome] = args.filter((a) => !a.startsWith('-'));
  const tipo = tipoPorNome(alvo);
  if (!tipo) return [linha(alvo ? `error: the server doesn't have a resource type "${alvo}"` : 'error: Required resource not specified.', 'erro')];
  const lista = recursosDoTipo(TIPOS[tipo], estado);
  const recursos = nome ? lista.filter((r) => r.nome === nome) : lista;
  if (!recursos.length) return [linha(nome ? `Error from server (NotFound): ${tipo} "${nome}" not found` : `No resources found in default namespace.`, nome ? 'erro' : '')];
  const saida = [];
  for (const r of recursos) {
    if (saida.length) saida.push(linha(''));
    saida.push(linha(`Name:         ${r.nome}`, 'forte'), linha('Namespace:    default'));
    if (r.labels && Object.keys(r.labels).length) saida.push(linha(`Labels:       ${Object.entries(r.labels).map(([k, v]) => `${k}=${v}`).join(',')}`));
    if (r.imagem) saida.push(linha(`Image:        ${r.imagem}`));
    if (r.replicas !== undefined) saida.push(linha(`Replicas:     ${r.replicas} desired | ${r.replicas} updated | ${r.replicas} total | ${r.replicas} available`));
    if (r.tipo && tipo === 'services') {
      saida.push(linha(`Type:         ${r.tipo}`), linha(`IP:           ${r.clusterIP}`));
      saida.push(linha(`Selector:     ${Object.entries(r.alvo ?? {}).map(([k, v]) => `${k}=${v}`).join(',') || '<none>'}`));
      for (const p of r.portas ?? []) saida.push(linha(`Port:         ${p.porta}/${p.protocolo ?? 'TCP'} → ${p.targetPort ?? p.porta}`));
      if (r.nodePort) saida.push(linha(`NodePort:     ${r.nodePort}/TCP`));
      saida.push(linha(`Endpoints:    ${(r.endpoints ?? []).join(',') || '<none>'}`));
    }
    if (r.data && tipo === 'configmaps') {
      saida.push(linha('Data'), linha('===='));
      for (const [k, v] of Object.entries(r.data)) saida.push(linha(`${k}:`), linha('----'), linha(String(v)));
    }
    if (tipo === 'secrets') saida.push(linha(`Type:  ${r.tipo}`), linha('Data'), linha('===='), ...Object.keys({ ...r.data, ...r.stringData }).map((k) => linha(`${k}:  (oculto)`)));
    for (const c of r.containers ?? []) saida.push(linha(`Container:    ${c.nome} (${c.imagem})`));
    if (r.status && typeof r.status === 'string') saida.push(linha(`Status:       ${r.status}`));
    saida.push(linha('Events:       <none>', 'comentario'));
  }
  return saida;
}

const AJUDA = [
  linha('kubectl controla o cluster Kubernetes simulado deste exercício.', 'forte'),
  linha(''),
  linha('Comandos disponíveis:', 'forte'),
  linha('  kubectl apply -f manifest.yaml    aplica o YAML do editor (o mesmo que ▶ Apply)'),
  linha('  kubectl diff -f manifest.yaml     mostra o que mudaria, sem aplicar'),
  linha('  kubectl get <tipo> [nome]         lista recursos: pods, svc, deploy, cm, secrets, nodes, all...'),
  linha('  kubectl describe <tipo> [nome]    detalhes de um recurso'),
  linha('  kubectl delete <tipo> <nome>      apaga um recurso (ou delete -f manifest.yaml)'),
  linha('  kubectl explain <tipo>            o que é aquele tipo de recurso'),
  linha('  kubectl version · kubectl cluster-info'),
  linha('  drift                             compara o YAML do editor com o cluster'),
  linha('  clear                             limpa o terminal (ou Ctrl+L)'),
  linha(''),
  linha('Teclas: ↑/↓ histórico · Tab completa · Ctrl+C cancela · Esc sai do terminal.', 'comentario'),
];

export const EXPLICACOES = {
  pods: 'Pod: a menor unidade do Kubernetes; um ou mais containers que compartilham rede e volumes.',
  services: 'Service: um endereço estável (ClusterIP, NodePort ou LoadBalancer) na frente de um grupo de Pods.',
  deployments: 'Deployment: mantém N réplicas de um Pod rodando e faz atualizações sem parar o serviço.',
  configmaps: 'ConfigMap: configurações em texto (chave e valor) que os Pods leem como variáveis ou arquivos.',
  secrets: 'Secret: como o ConfigMap, mas para dados sensíveis (senhas, tokens), guardados em base64.',
  ingresses: 'Ingress: regras de HTTP(S) que levam o tráfego de fora do cluster para os Services.',
  hpa: 'HorizontalPodAutoscaler: aumenta e diminui as réplicas conforme o uso de CPU ou memória.',
  networkpolicies: 'NetworkPolicy: firewall entre Pods (quem pode falar com quem).',
  pvc: 'PersistentVolumeClaim: um pedido de disco que sobrevive ao Pod.',
  serviceaccounts: 'ServiceAccount: a identidade de um Pod para falar com a API e com a nuvem.',
  cronjobs: 'CronJob: roda um Job num horário, no formato do cron.',
  jobs: 'Job: roda Pods até terminarem com sucesso (tarefas que acabam).',
  nodes: 'Node: uma máquina (virtual ou física) onde os Pods rodam.',
};

/** Os kinds de um manifesto YAML, na ordem em que aparecem (sem repetir). */
export const kindsDoYaml = (texto) => [...new Set([...String(texto ?? '').matchAll(/^kind:\s*([A-Za-z]+)/gm)].map((m) => m[1]))];

/** Explicações dos kinds guardados de forma genérica (nativos e CRDs dos add-ons). */
const EXPLICACOES_POR_KIND = {
  StatefulSet: 'StatefulSet: como o Deployment, mas cada Pod tem nome fixo (db-0, db-1) e disco próprio; para bancos e filas.',
  DaemonSet: 'DaemonSet: um Pod em cada nó do cluster; para agentes de log, métricas e rede.',
  ReplicaSet: 'ReplicaSet: mantém N cópias de um Pod; o Deployment cria e troca ReplicaSets por você.',
  Namespace: 'Namespace: uma "pasta" do cluster que separa recursos, permissões e cotas por time ou ambiente.',
  ResourceQuota: 'ResourceQuota: o limite total de CPU, memória e objetos de um namespace.',
  LimitRange: 'LimitRange: valores padrão e máximos de CPU e memória para cada container de um namespace.',
  PodDisruptionBudget: 'PodDisruptionBudget: quantos Pods podem sair ao mesmo tempo numa manutenção (drain, upgrade).',
  PriorityClass: 'PriorityClass: a prioridade de um Pod; os mais importantes passam na frente e podem tirar os menos importantes.',
  Role: 'Role: uma lista de permissões (verbos sobre recursos) dentro de um namespace.',
  RoleBinding: 'RoleBinding: entrega uma Role (ou ClusterRole) a usuários, grupos ou ServiceAccounts num namespace.',
  ClusterRole: 'ClusterRole: como a Role, mas vale para o cluster todo ou para recursos sem namespace.',
  ClusterRoleBinding: 'ClusterRoleBinding: entrega uma ClusterRole no cluster inteiro.',
  StorageClass: 'StorageClass: o "cardápio" de discos; diz qual driver CSI cria o volume e com quais parâmetros.',
  PersistentVolume: 'PersistentVolume: um disco de verdade disponível no cluster, que um PVC reserva.',
  CSIDriver: 'CSIDriver: registra um driver de armazenamento CSI no cluster.',
  EndpointSlice: 'EndpointSlice: a lista de endereços (IPs e portas) dos Pods atrás de um Service.',
  Endpoints: 'Endpoints: a lista antiga de endereços dos Pods de um Service (hoje, EndpointSlice).',
  IngressClass: 'IngressClass: diz qual controlador (NGINX, ALB, Application Gateway...) atende um Ingress.',
  CustomResourceDefinition: 'CustomResourceDefinition: ensina um tipo novo de recurso à API do Kubernetes.',
  VolumeSnapshot: 'VolumeSnapshot: uma "foto" de um volume persistente, para backup ou para clonar.',
  VolumeSnapshotClass: 'VolumeSnapshotClass: qual driver CSI tira os snapshots e o que fazer com eles depois.',
  GatewayClass: 'GatewayClass (Gateway API): o tipo de balanceador que implementa os Gateways.',
  Gateway: 'Gateway (Gateway API): o ponto de entrada (porta, protocolo, certificado) do tráfego do cluster.',
  HTTPRoute: 'HTTPRoute (Gateway API): regras de HTTP que ligam um Gateway aos Services.',
  Application: 'Application (Argo CD): um app que o Argo CD mantém igual ao que está no Git.',
  AppProject: 'AppProject (Argo CD): limites de um grupo de Applications (repositórios e destinos permitidos).',
  ApplicationSet: 'ApplicationSet (Argo CD): gera várias Applications a partir de um modelo (um por cluster ou ambiente).',
  GitRepository: 'GitRepository (Flux): o repositório Git que o Flux acompanha.',
  HelmRepository: 'HelmRepository (Flux): o repositório de charts Helm que o Flux acompanha.',
  Kustomization: 'Kustomization (Flux): aplica uma pasta do repositório no cluster e mantém em sincronia.',
  HelmRelease: 'HelmRelease (Flux): instala e atualiza um chart Helm de forma declarativa.',
  SecretProviderClass: 'SecretProviderClass (Secrets Store CSI): de qual cofre (AWS Secrets Manager, Azure Key Vault) vêm os segredos montados no Pod.',
  ExternalSecret: 'ExternalSecret (External Secrets Operator): copia um segredo do cofre externo para um Secret do Kubernetes.',
  SecretStore: 'SecretStore (External Secrets Operator): como chegar ao cofre externo num namespace.',
  ClusterSecretStore: 'ClusterSecretStore (External Secrets Operator): como chegar ao cofre externo, para o cluster todo.',
  Certificate: 'Certificate (cert-manager): pede e renova um certificado TLS e guarda num Secret.',
  Issuer: 'Issuer (cert-manager): quem emite os certificados (Let\'s Encrypt, CA própria) num namespace.',
  ClusterIssuer: 'ClusterIssuer (cert-manager): o emissor de certificados para o cluster todo.',
  ServiceMonitor: 'ServiceMonitor (Prometheus): diz de quais Services o Prometheus coleta métricas.',
  PodMonitor: 'PodMonitor (Prometheus): diz de quais Pods o Prometheus coleta métricas.',
  PrometheusRule: 'PrometheusRule (Prometheus): regras de alerta e de gravação de métricas.',
  VerticalPodAutoscaler: 'VerticalPodAutoscaler: ajusta os requests de CPU e memória pelo uso real.',
  TargetGroupBinding: 'TargetGroupBinding (AWS Load Balancer Controller): liga um Service a um target group que já existe.',
  IngressClassParams: 'IngressClassParams (AWS Load Balancer Controller): parâmetros comuns dos ALBs de uma IngressClass.',
  NodePool: 'NodePool (Karpenter): que tipo de nó o Karpenter pode criar e quando pode removê-lo.',
  EC2NodeClass: 'EC2NodeClass (Karpenter na AWS): AMI, sub-redes, security groups e role IAM dos nós EC2.',
  ENIConfig: 'ENIConfig (VPC CNI): a sub-rede e os security groups dos Pods numa zona (rede personalizada).',
  SecurityGroupPolicy: 'SecurityGroupPolicy (VPC CNI): security groups da AWS aplicados direto aos Pods.',
  ScaledObject: 'ScaledObject (KEDA): escala um Deployment por eventos (fila, tópico, métrica), até zero.',
  ScaledJob: 'ScaledJob (KEDA): cria Jobs conforme chegam eventos numa fila.',
  TriggerAuthentication: 'TriggerAuthentication (KEDA): como o KEDA se autentica na fonte de eventos.',
  ClusterTriggerAuthentication: 'ClusterTriggerAuthentication (KEDA): a autenticação do KEDA para o cluster todo.',
  NginxIngressController: 'NginxIngressController (roteamento de aplicativos do AKS): um controlador NGINX gerenciado.',
  AKSNodeClass: 'AKSNodeClass (provisionamento automático de nós do AKS): imagem e disco dos nós criados pelo Karpenter.',
  ApplicationLoadBalancer: 'ApplicationLoadBalancer (Application Gateway for Containers): o balanceador gerenciado pelo controlador ALB do Azure.',
};

/** Explicação curta de um kind (ou null se não houver). */
export function explicarKind(kind) {
  const tipo = Object.keys(TIPOS).find((t) => TIPOS[t].kind === kind);
  return EXPLICACOES[tipo] ?? EXPLICACOES_POR_KIND[kind] ?? null;
}

/**
 * Interpreta uma linha do terminal. Devolve `{ linhas }` para mostrar e, quando o comando
 * precisa da tela do exercício, `acao`: 'apply' | 'diff' | 'drift' | 'clear' |
 * { apagar: [{ kind, nome, prefixo }] } | 'delete-arquivo'.
 */
export function interpretar(texto, estado) {
  const partes = texto.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return { linhas: [] };
  const [programa, sub, ...args] = partes;
  if (programa === 'help' || (programa === 'kubectl' && ['help', '--help', '-h'].includes(sub))) return { linhas: AJUDA };
  if (programa === 'clear') return { linhas: [], acao: 'clear' };
  if (programa === 'drift') return { linhas: [], acao: 'drift' };
  if (programa === 'k' || programa === 'kubectl') {
    if (!sub) return { linhas: AJUDA };
    const comArquivo = args.includes('-f') || args.some((a) => a.startsWith('--filename'));
    switch (sub) {
      case 'apply':
      case 'create':
        if (!comArquivo) return { linhas: [linha('error: must specify one of -f and -k', 'erro'), linha('# Use: kubectl apply -f manifest.yaml (o arquivo é o YAML do editor)', 'comentario')] };
        return { linhas: [], acao: 'apply' };
      case 'diff':
        if (!comArquivo) return { linhas: [linha('error: must specify one of -f and -k', 'erro')] };
        return { linhas: [], acao: 'diff' };
      case 'get': return { linhas: get(args, estado) };
      case 'describe': return { linhas: describe(args, estado) };
      case 'delete': {
        if (comArquivo) return { linhas: [], acao: 'delete-arquivo' };
        const [alvo, ...nomes] = args.filter((a) => !a.startsWith('-'));
        const tipo = tipoPorNome(alvo);
        if (!tipo || tipo === 'nodes') return { linhas: [linha(alvo ? `error: the server doesn't have a resource type "${alvo}"` : 'error: You must provide one or more resources by argument or filename.', 'erro')] };
        if (!nomes.length) return { linhas: [linha('error: resource(s) were provided, but no name was specified', 'erro')] };
        const t = TIPOS[tipo];
        return { linhas: [], acao: { apagar: nomes.map((nome) => ({ kind: t.kind, nome, prefixo: t.prefixo ?? t.kind.toLowerCase(), tipo })) } };
      }
      case 'explain': {
        const tipo = tipoPorNome(args[0]);
        if (!tipo) return { linhas: [linha(args[0] ? `error: couldn't find resource for "${args[0]}"` : 'error: You must specify the type of resource to explain.', 'erro')] };
        return { linhas: [linha(`KIND:     ${TIPOS[tipo].kind}`, 'forte'), linha(''), linha(explicarKind(TIPOS[tipo].kind) ?? 'Recurso do Kubernetes.', 'explicacao')] };
      }
      case 'version':
        return { linhas: [linha('Client Version: v1.31.0'), linha('Server Version: v1.31.0 (simulado no navegador)')] };
      case 'cluster-info':
        return { linhas: [linha('Kubernetes control plane is running at https://127.0.0.1:6443 (simulado)', 'sucesso'), linha('CoreDNS is running at https://127.0.0.1:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy')] };
      default:
        return { linhas: [linha(`error: unknown command "${sub}" for "kubectl"`, 'erro'), linha('Run \'kubectl help\' for usage.', 'comentario')] };
    }
  }
  return { linhas: [linha(`${programa}: command not found`, 'erro'), linha('# Aqui só o kubectl funciona. Digite help para ver os comandos.', 'comentario')] };
}
