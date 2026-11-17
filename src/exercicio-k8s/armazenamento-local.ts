// Adaptadores do localStorage para as portas da ilha Exercicio e do motor, com as chaves e o
// formato de sempre (progresso.js): rascunho:<id> (texto quando é um manifest.yaml só),
// progresso e estado:<id> (o cluster do aluno).
import type { ArmazenamentoEstado, Arquivos } from '../pacote/motor/tipos.ts';
import type { RepositorioDoExercicio } from '../pacote/exercicio/repositorio.ts';
import { apagarEstado, apagarRascunho, gravarEstado, gravarRascunho, lerEstado, lerRascunho, marcar, statusDe } from '../progresso.js';

export const ARQUIVO_PRINCIPAL = 'manifest.yaml';

/** Rascunho salvo → arquivos. Um texto é o formato antigo (um arquivo só). Igual a normalizarArquivos. */
export function arquivosDoRascunho(valor: unknown): Arquivos | null {
  if (typeof valor === 'string') return { [ARQUIVO_PRINCIPAL]: valor };
  if (valor === null || typeof valor !== 'object') return null;
  const entradas = Object.entries(valor);
  if (!entradas.length || !entradas.every(([, v]) => typeof v === 'string')) return null;
  return Object.fromEntries(entradas.map(([nome, texto]) => [nome, String(texto)]));
}

/** Arquivos → formato salvo. Um arquivo só, com o nome padrão, vira texto (igual a formaDeGuardar). */
export function formaDeGuardar(arquivos: Arquivos): string | Arquivos {
  const nomes = Object.keys(arquivos);
  return nomes.length === 1 && nomes[0] === ARQUIVO_PRINCIPAL ? (arquivos[ARQUIVO_PRINCIPAL] ?? '') : { ...arquivos };
}

export const repositorioLocal: RepositorioDoExercicio = {
  lerRascunho: (id) => arquivosDoRascunho(lerRascunho(id)),
  gravarRascunho: (id, arquivos) => { gravarRascunho(id, formaDeGuardar(arquivos)); },
  apagarRascunho,
  marcar,
  statusDe,
};

/** O cluster do aluno: a chave é o id do exercício (estado:<id>, como o simulador gravava). */
export const armazenamentoLocal: ArmazenamentoEstado = {
  ler: lerEstado,
  gravar: gravarEstado,
  apagar: apagarEstado,
};
