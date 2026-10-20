import { azureAks } from './azure-aks.js';
import { azureNos } from './azure-nos.js';
import { azureNetworking } from './azure-networking.js';
import { azureStorage } from './azure-storage.js';
import { azureObservabilidade } from './azure-observabilidade.js';
import { azureCusto } from './azure-custo.js';
import { comOcultos } from './util.js';

// Os tópicos seguem o mapa de progressão de docs/didatica.md, na mesma ordem do módulo da AWS.
// Os ids dos grupos antigos (azure-aks, azure-networking, azure-storage) continuam os mesmos.
const grupos = [
  { id: 'azure-aks', titulo: 'AKS e identidade', icone: '🔵' },
  { id: 'azure-nos', titulo: 'Nós e escala', icone: '🖥️' },
  { id: 'azure-networking', titulo: 'Rede no AKS', icone: '🌐' },
  { id: 'azure-storage', titulo: 'Storage no AKS', icone: '💾' },
  { id: 'azure-observabilidade', titulo: 'Observabilidade e segredos', icone: '🔭' },
  { id: 'azure-custo', titulo: 'Custo e operação', icone: '💰' },
];

const tagItens = (modulo, grupoId) =>
  comOcultos(modulo.itens ?? [], modulo.ocultos ?? {}).map((item) => ({ ...item, grupo: grupoId }));

export const azure = {
  id: 'azure',
  titulo: 'Kubernetes no Azure',
  descricao: 'AKS: identidade com Entra ID, node pools e KEDA, rede com Cilium e AGIC, storage Disk/Files, observabilidade, Key Vault e custo.',
  icone: '🔵',
  grupos,
  itens: [
    ...tagItens(azureAks, 'azure-aks'),
    ...tagItens(azureNos, 'azure-nos'),
    ...tagItens(azureNetworking, 'azure-networking'),
    ...tagItens(azureStorage, 'azure-storage'),
    ...tagItens(azureObservabilidade, 'azure-observabilidade'),
    ...tagItens(azureCusto, 'azure-custo'),
  ],
};
