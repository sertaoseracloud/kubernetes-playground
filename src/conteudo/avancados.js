import { gitops } from './gitops.js';
import { gitopsCrds } from './gitops-crds.js';
import { cronjobs } from './cronjobs.js';
import { secrets } from './secrets.js';
import { avancadosRbac } from './avancados-rbac.js';
import { avancadosEscala } from './avancados-escala.js';
import { avancadosStateful } from './avancados-stateful.js';
import { avancadosRede } from './avancados-rede.js';

const grupos = [
  { id: 'rbac', titulo: 'RBAC e ServiceAccounts', icone: '🛂' },
  { id: 'escala', titulo: 'Escala, saúde e recursos', icone: '📈' },
  { id: 'stateful', titulo: 'StatefulSet, DaemonSet e Storage', icone: '🗄️' },
  { id: 'cronjobs', titulo: 'CronJobs e Jobs', icone: '⏰' },
  { id: 'rede', titulo: 'NetworkPolicy e Ingress', icone: '🧱' },
  { id: 'secrets', titulo: 'Secrets e Segurança', icone: '🔐' },
  { id: 'gitops', titulo: 'GitOps, Helm, Kustomize e CRDs', icone: '🔄' },
];

const tagItens = (modulo, grupoId) =>
  (modulo.itens ?? []).map((item) => ({ ...item, grupo: grupoId }));

export const avancados = {
  id: 'avancados',
  titulo: 'Recursos Avançados',
  descricao: 'RBAC, HPA, probes, StatefulSet, DaemonSet, Jobs, NetworkPolicy, Ingress, storage, Helm, Kustomize e GitOps.',
  icone: '⚙️',
  grupos,
  itens: [
    ...tagItens(avancadosRbac, 'rbac'),
    ...tagItens(avancadosEscala, 'escala'),
    ...tagItens(avancadosStateful, 'stateful'),
    ...tagItens(cronjobs, 'cronjobs'),
    ...tagItens(avancadosRede, 'rede'),
    ...tagItens(secrets, 'secrets'),
    ...tagItens(gitops, 'gitops'),
    ...tagItens(gitopsCrds, 'gitops'),
  ],
};
