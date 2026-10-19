// Grafo de dependências dos manifestos (a aba 🕸️ Grafo, como o "terraform graph" do
// DivergeTerraform): quem usa quem no YAML do editor. No Kubernetes, os recursos se ligam de
// dois jeitos: pelo nome (configMapRef, secretName, serviceAccountName, scaleTargetRef...) e
// pelos rótulos (o selector do Service escolhe os Pods com aqueles labels). Função pura.
import * as yaml from 'js-yaml';

/** Grupo de cada kind (dá a cor e a ordem na coluna). */
const GRUPO = {
  Pod: 'carga', Deployment: 'carga', StatefulSet: 'carga', DaemonSet: 'carga', ReplicaSet: 'carga', Job: 'carga', CronJob: 'carga',
  Service: 'rede', Ingress: 'rede', NetworkPolicy: 'rede', IngressClass: 'rede', Gateway: 'rede', HTTPRoute: 'rede',
  ConfigMap: 'config', Secret: 'config',
  ServiceAccount: 'acesso', Role: 'acesso', ClusterRole: 'acesso', RoleBinding: 'acesso', ClusterRoleBinding: 'acesso',
  PersistentVolumeClaim: 'disco', PersistentVolume: 'disco', StorageClass: 'disco',
  HorizontalPodAutoscaler: 'escala', PodDisruptionBudget: 'escala', VerticalPodAutoscaler: 'escala',
};
export const grupoDoKind = (kind) => GRUPO[kind] ?? 'outro';

const lista = (v) => (Array.isArray(v) ? v : []);

/** O "molde" de Pod de um recurso (o próprio Pod, o template de um Deployment, de um CronJob...). */
function moldeDePod(doc) {
  if (doc.kind === 'Pod') return { labels: doc.metadata?.labels ?? {}, spec: doc.spec ?? {} };
  const template = doc.kind === 'CronJob' ? doc.spec?.jobTemplate?.spec?.template : doc.spec?.template;
  return template ? { labels: template.metadata?.labels ?? {}, spec: template.spec ?? {} } : null;
}

/** O selector (matchLabels ou o mapa simples do Service) aceita estes labels? Selector vazio não escolhe nada aqui. */
function seleciona(selector, labels) {
  const regras = selector?.matchLabels ?? (selector && !selector.matchExpressions ? selector : null);
  const pares = Object.entries(regras ?? {});
  return pares.length > 0 && pares.every(([k, v]) => labels?.[k] === v);
}

/** Os nomes que o molde de Pod usa: ConfigMaps, Secrets, PVCs e a ServiceAccount. */
function referenciasDoPod(spec) {
  const refs = [];
  const conteineres = [...lista(spec.containers), ...lista(spec.initContainers)];
  for (const c of conteineres) {
    for (const e of lista(c.env)) {
      if (e?.valueFrom?.configMapKeyRef?.name) refs.push(['ConfigMap', e.valueFrom.configMapKeyRef.name, 'env']);
      if (e?.valueFrom?.secretKeyRef?.name) refs.push(['Secret', e.valueFrom.secretKeyRef.name, 'env']);
    }
    for (const e of lista(c.envFrom)) {
      if (e?.configMapRef?.name) refs.push(['ConfigMap', e.configMapRef.name, 'envFrom']);
      if (e?.secretRef?.name) refs.push(['Secret', e.secretRef.name, 'envFrom']);
    }
  }
  for (const v of lista(spec.volumes)) {
    if (v?.configMap?.name) refs.push(['ConfigMap', v.configMap.name, 'volume']);
    if (v?.secret?.secretName) refs.push(['Secret', v.secret.secretName, 'volume']);
    if (v?.persistentVolumeClaim?.claimName) refs.push(['PersistentVolumeClaim', v.persistentVolumeClaim.claimName, 'volume']);
    for (const s of lista(v?.projected?.sources)) {
      if (s?.configMap?.name) refs.push(['ConfigMap', s.configMap.name, 'volume']);
      if (s?.secret?.name) refs.push(['Secret', s.secret.name, 'volume']);
    }
  }
  for (const s of lista(spec.imagePullSecrets)) if (s?.name) refs.push(['Secret', s.name, 'imagePullSecrets']);
  if (spec.serviceAccountName) refs.push(['ServiceAccount', spec.serviceAccountName, 'serviceAccountName']);
  return refs;
}

/**
 * Lê o YAML e devolve { nos, arestas, avisos } ou { erro }. Cada nó é { id: 'Kind/nome', rotulo,
 * kind, grupo }; cada aresta vai de quem usa para quem é usado, com o campo que faz a ligação.
 * `avisos` aponta ligações que não acham ninguém no YAML (um Service que não seleciona nenhum Pod).
 */
export function grafoDoYaml(texto) {
  let docs;
  try {
    docs = yaml.loadAll(String(texto ?? '')).filter((d) => d && typeof d === 'object' && d.kind && d.metadata?.name);
  } catch (e) {
    return { erro: `O YAML não pôde ser lido: ${e.reason ?? e.message}` };
  }
  const nos = docs.map((d) => ({ id: `${d.kind}/${d.metadata.name}`, rotulo: `${d.kind}/${d.metadata.name}`, kind: d.kind, grupo: grupoDoKind(d.kind) }));
  const existe = new Set(nos.map((n) => n.id));
  const arestas = [];
  const avisos = [];
  const ligar = (de, kind, nome, motivo) => {
    const para = `${kind}/${nome}`;
    if (de === para) return;
    if (!existe.has(para)) {
      avisos.push(`${de} usa ${para} (${motivo}), que não está neste YAML.`);
      return;
    }
    if (!arestas.some((a) => a.de === de && a.para === para)) arestas.push({ de, para, motivo });
  };
  const comMolde = docs.map((d) => ({ id: `${d.kind}/${d.metadata.name}`, molde: moldeDePod(d) })).filter((x) => x.molde);
  const porSelector = (de, selector, motivo, rotulo) => {
    const alvos = comMolde.filter((x) => x.id !== de && seleciona(selector, x.molde.labels));
    for (const a of alvos) ligar(de, ...a.id.split('/'), motivo);
    const pares = Object.entries(selector?.matchLabels ?? selector ?? {}).filter(([, v]) => typeof v === 'string');
    if (!alvos.length && pares.length) avisos.push(`${de} não ${rotulo} nenhum Pod deste YAML (${pares.map(([k, v]) => `${k}=${v}`).join(', ')}).`);
  };

  for (const d of docs) {
    const id = `${d.kind}/${d.metadata.name}`;
    const molde = moldeDePod(d);
    if (molde) for (const [kind, nome, motivo] of referenciasDoPod(molde.spec)) ligar(id, kind, nome, motivo);
    const spec = d.spec ?? {};
    switch (d.kind) {
      case 'Service':
        if (spec.selector) porSelector(id, spec.selector, 'selector', 'seleciona');
        break;
      case 'Ingress': {
        if (spec.defaultBackend?.service?.name) ligar(id, 'Service', spec.defaultBackend.service.name, 'defaultBackend');
        for (const r of lista(spec.rules)) for (const p of lista(r?.http?.paths)) if (p?.backend?.service?.name) ligar(id, 'Service', p.backend.service.name, `path ${p.path ?? '/'}`);
        for (const t of lista(spec.tls)) if (t?.secretName) ligar(id, 'Secret', t.secretName, 'tls');
        break;
      }
      case 'StatefulSet':
        if (spec.serviceName) ligar(id, 'Service', spec.serviceName, 'serviceName');
        break;
      case 'HorizontalPodAutoscaler':
      case 'VerticalPodAutoscaler': {
        const alvo = spec.scaleTargetRef ?? spec.targetRef;
        if (alvo?.kind && alvo?.name) ligar(id, alvo.kind, alvo.name, 'scaleTargetRef');
        break;
      }
      case 'PodDisruptionBudget':
        if (spec.selector) porSelector(id, spec.selector, 'selector', 'protege');
        break;
      case 'NetworkPolicy':
        if (spec.podSelector) porSelector(id, spec.podSelector, 'podSelector', 'protege');
        break;
      case 'RoleBinding':
      case 'ClusterRoleBinding':
        if (d.roleRef?.kind && d.roleRef?.name) ligar(id, d.roleRef.kind, d.roleRef.name, 'roleRef');
        for (const s of lista(d.subjects)) if (s?.kind === 'ServiceAccount' && s.name) ligar(id, 'ServiceAccount', s.name, 'subjects');
        break;
      case 'PersistentVolumeClaim':
        if (spec.storageClassName) ligar(id, 'StorageClass', spec.storageClassName, 'storageClassName');
        break;
      default:
    }
  }
  // Referências a recursos do próprio cluster (StorageClass padrão, ServiceAccount default...) não são erro.
  const ignorar = /(StorageClass|ServiceAccount)\/(default|gp2|gp3|standard|managed-csi|managed-premium|azurefile-csi|efs-sc)\b/;
  return { nos, arestas, avisos: avisos.filter((a) => !ignorar.test(a)) };
}
