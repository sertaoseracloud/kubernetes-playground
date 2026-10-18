import { azureAks } from './azure-aks.js';
import { azureNetworking } from './azure-networking.js';
import { azureStorage } from './azure-storage.js';

const grupos = [
  { id: 'azure-aks', titulo: 'AKS: Kubernetes no Azure', icone: '🔵' },
  { id: 'azure-networking', titulo: 'Networking Azure para K8s', icone: '🌐' },
  { id: 'azure-storage', titulo: 'Storage Azure para K8s', icone: '💾' },
];

const tagItens = (modulo, grupoId) =>
  (modulo.itens ?? []).map((item) => ({ ...item, grupo: grupoId }));

export const azure = {
  id: 'azure',
  titulo: 'Kubernetes no Azure',
  descricao: 'AKS, networking Azure CNI/AGIC, storage Azure Disk/Files e integrações Azure.',
  icone: '🔵',
  grupos,
  itens: [
    ...tagItens(azureAks, 'azure-aks'),
    ...tagItens(azureNetworking, 'azure-networking'),
    ...tagItens(azureStorage, 'azure-storage'),
  ],
};