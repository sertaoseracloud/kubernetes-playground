// Módulo extra de projetos: oito projetos completos, cada um com uma lição de arquitetura e cinco
// etapas encadeadas (a etapa N parte do que a etapa N-1 deixou no cluster). Cada projeto é um tópico.
// É um módulo extra (como a comparação com o Terraform): não entra na cadeia de certificados, para
// os certificados finais já emitidos continuarem válidos.
import { comOcultos } from './util.js';
import { projetoBlog } from './projetos-blog.js';
import { projetoEks } from './projetos-eks.js';
import { projetoAks } from './projetos-aks.js';
import { projetoGitops } from './projetos-gitops.js';
import { projetoSeguranca } from './projetos-seguranca.js';
import { projetoDados } from './projetos-dados.js';
import { projetoLancamento } from './projetos-lancamento.js';
import { projetoObservabilidade } from './projetos-observabilidade.js';

export const PROJETOS = [
  projetoBlog, projetoDados, projetoSeguranca, projetoLancamento,
  projetoObservabilidade, projetoGitops, projetoEks, projetoAks,
];

export const projetos = {
  id: 'projetos',
  titulo: 'Projetos práticos',
  extra: true, // módulo extra: sem certificado próprio, fora da conta do certificado final
  descricao: 'Oito projetos de ponta a ponta: blog com banco, pipeline de dados, segurança em camadas, lançamento canary, observabilidade, GitOps, loja no EKS e loja no AKS.',
  icone: '🏗️',
  grupos: PROJETOS.map((p) => ({ id: p.id, titulo: p.titulo, icone: p.icone })),
  itens: PROJETOS.flatMap((p) => comOcultos(p.itens, p.ocultos ?? {}).map((item) => ({ ...item, grupo: p.id }))),
};
