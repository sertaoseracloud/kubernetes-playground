import { basico } from './basico.js';
import { pods } from './pods.js';
import { services } from './services.js';
import { deployments } from './deployments.js';
import { comOcultos } from './util.js';

const grupos = [
  { id: 'basico', titulo: 'Fundamentos Básicos', icone: '☸️' },
  { id: 'pods', titulo: 'Pods e Containers', icone: '📦' },
  { id: 'services', titulo: 'Services e Networking', icone: '🔗' },
  { id: 'deployments', titulo: 'Deployments e Escala', icone: '🚀' },
];

const tagItens = (modulo, grupoId) =>
  comOcultos(modulo.itens ?? [], modulo.ocultos ?? {}).map((item) => ({ ...item, grupo: grupoId }));

export const fundamentos = {
  id: 'fundamentos',
  titulo: 'Fundamentos do Kubernetes',
  descricao: 'Arquitetura, Pods, Services, Deployments e escalabilidade.',
  icone: '☸️',
  grupos,
  itens: [
    ...tagItens(basico, 'basico'),
    ...tagItens(pods, 'pods'),
    ...tagItens(services, 'services'),
    ...tagItens(deployments, 'deployments'),
  ],
};