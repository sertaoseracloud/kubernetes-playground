// Porta RepositorioDeEstado (plano, seção 4.2) para a tela do exercício, com o adaptador do
// localStorage. As chaves são as de sempre (progresso.js): rascunho:<id> e progresso.
import { apagarRascunho, gravarRascunho, lerRascunho, marcar, statusDe, type StatusDoItem } from '../progresso.js';
import type { Arquivos } from './motor.ts';

export const ARQUIVO_PRINCIPAL = 'manifest.yaml';

export interface RepositorioDoExercicio {
  lerRascunho(id: string): Arquivos | null;
  gravarRascunho(id: string, arquivos: Arquivos): void;
  apagarRascunho(id: string): void;
  marcar(id: string, status: StatusDoItem): void;
  statusDe(id: string): StatusDoItem | undefined;
}

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

/** Repositório em memória, para os testes. */
export function criarRepositorioEmMemoria(): RepositorioDoExercicio & { readonly dados: Map<string, unknown> } {
  const dados = new Map<string, unknown>();
  return {
    dados,
    lerRascunho: (id) => arquivosDoRascunho(dados.get(`rascunho:${id}`)),
    gravarRascunho: (id, arquivos) => { dados.set(`rascunho:${id}`, formaDeGuardar(arquivos)); },
    apagarRascunho: (id) => { dados.delete(`rascunho:${id}`); },
    marcar: (id, status) => {
      if (dados.get(`progresso:${id}`) !== 'resolvido') dados.set(`progresso:${id}`, status);
    },
    statusDe: (id) => dados.get(`progresso:${id}`) as StatusDoItem | undefined,
  };
}
