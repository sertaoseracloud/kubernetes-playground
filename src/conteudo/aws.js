import { awsEks } from './aws-eks.js';
import { awsNos } from './aws-nos.js';
import { awsNetworking } from './aws-networking.js';
import { awsStorage } from './aws-storage.js';
import { awsObservabilidade } from './aws-observabilidade.js';
import { awsCusto } from './aws-custo.js';
import { comOcultos } from './util.js';

// Os tópicos seguem o mapa de progressão de docs/didatica.md: identidade, nós, rede, storage,
// observabilidade e segurança, custo. Os ids dos grupos antigos (aws-eks, aws-networking,
// aws-storage) continuam os mesmos.
const grupos = [
  { id: 'aws-eks', titulo: 'EKS e identidade', icone: '🟠' },
  { id: 'aws-nos', titulo: 'Nós e escala', icone: '🖥️' },
  { id: 'aws-networking', titulo: 'Rede no EKS', icone: '🌐' },
  { id: 'aws-storage', titulo: 'Storage no EKS', icone: '💾' },
  { id: 'aws-observabilidade', titulo: 'Observabilidade e segurança', icone: '🔭' },
  { id: 'aws-custo', titulo: 'Custo e operação', icone: '💰' },
];

const tagItens = (modulo, grupoId) =>
  comOcultos(modulo.itens ?? [], modulo.ocultos ?? {}).map((item) => ({ ...item, grupo: grupoId }));

export const aws = {
  id: 'aws',
  titulo: 'Kubernetes na AWS',
  descricao: 'EKS: identidade com IAM, nós e Karpenter, rede VPC/ALB/NLB, storage EBS/EFS, observabilidade, segurança e custo.',
  icone: '🟠',
  grupos,
  itens: [
    ...tagItens(awsEks, 'aws-eks'),
    ...tagItens(awsNos, 'aws-nos'),
    ...tagItens(awsNetworking, 'aws-networking'),
    ...tagItens(awsStorage, 'aws-storage'),
    ...tagItens(awsObservabilidade, 'aws-observabilidade'),
    ...tagItens(awsCusto, 'aws-custo'),
  ],
};
