import { awsEks } from './aws-eks.js';
import { awsNetworking } from './aws-networking.js';
import { awsStorage } from './aws-storage.js';

const grupos = [
  { id: 'aws-eks', titulo: 'EKS: Kubernetes na AWS', icone: '🟠' },
  { id: 'aws-networking', titulo: 'Networking AWS para K8s', icone: '🌐' },
  { id: 'aws-storage', titulo: 'Storage AWS para K8s', icone: '💾' },
];

const tagItens = (modulo, grupoId) =>
  (modulo.itens ?? []).map((item) => ({ ...item, grupo: grupoId }));

export const aws = {
  id: 'aws',
  titulo: 'Kubernetes na AWS',
  descricao: 'EKS, networking VPC/CNI, storage EBS/EFS e integrações AWS.',
  icone: '🟠',
  grupos,
  itens: [
    ...tagItens(awsEks, 'aws-eks'),
    ...tagItens(awsNetworking, 'aws-networking'),
    ...tagItens(awsStorage, 'aws-storage'),
  ],
};