// Trilha de Kubernetes: módulos, lições e exercícios.
// Importa cada módulo de conteúdo e os consolida em listas planas para a UI e gamificação.
import { fundamentos } from './fundamentos.js';
import { avancados } from './avancados.js';
import { aws } from './aws.js';
import { azure } from './azure.js';
import { gitops } from './gitops.js';
import { projetoMicroservicos } from './projeto-microservicos.js';
import { projetoMulticloud } from './projeto-multicloud.js';
import { comparacao } from './comparacao.js';

export const modulos = [fundamentos, avancados, aws, azure, gitops, projetoMicroservicos, projetoMulticloud, comparacao];

/** Lista plana de todos os itens da trilha (lições + exercícios). */
export const itens = modulos.flatMap((m) => m.itens ?? []);

/** Apenas os exercícios (itens com testes automáticos). */
export const problemas = itens.filter((i) => i.tipo === 'exercicio');

/** Mapeia ID → item para busca rápida. */
export const porId = Object.fromEntries(itens.map((i) => [i.id, i]));

/** Dificuldades usadas na gamificação e na UI. */
export const DIFICULDADES = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

/** Busca um item por ID. */
export function buscarItem(id) {
  return porId[id] ?? null;
}

/** Vizinhos (anterior e próximo) de um item na trilha plana. */
export function vizinhos(id) {
  const idx = itens.findIndex((i) => i.id === id);
  if (idx < 0) return {};
  return {
    anterior: idx > 0 ? itens[idx - 1] : null,
    proximo: idx < itens.length - 1 ? itens[idx + 1] : null,
  };
}