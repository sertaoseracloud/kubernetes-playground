import { gitops } from './gitops.js';
import { cronjobs } from './cronjobs.js';
import { secrets } from './secrets.js';

const grupos = [
  { id: 'gitops', titulo: 'GitOps com ArgoCD e Flux', icone: '🔄' },
  { id: 'cronjobs', titulo: 'CronJobs e Jobs', icone: '⏰' },
  { id: 'secrets', titulo: 'Secrets e Segurança', icone: '🔐' },
];

const tagItens = (modulo, grupoId) =>
  (modulo.itens ?? []).map((item) => ({ ...item, grupo: grupoId }));

export const avancados = {
  id: 'avancados',
  titulo: 'Recursos Avançados',
  descricao: 'GitOps, CronJobs, Secrets e padrões avançados de Kubernetes.',
  icone: '⚙️',
  grupos,
  itens: [
    ...tagItens(gitops, 'gitops'),
    ...tagItens(cronjobs, 'cronjobs'),
    ...tagItens(secrets, 'secrets'),
  ],
};