// Porta RepositorioDeEstado da ilha (plano, seção 4.2): rascunho e progresso. O adaptador do
// localStorage fica no repositório (mesmas chaves e formato de sempre); aqui, a porta e o
// adaptador em memória dos testes.
import type { Arquivos } from '../motor/tipos.ts';

export type StatusDoItem = 'resolvido' | 'tentado';

export interface RepositorioDoExercicio {
  lerRascunho(id: string): Arquivos | null;
  gravarRascunho(id: string, arquivos: Arquivos): void;
  apagarRascunho(id: string): void;
  /** Nunca rebaixa um item resolvido. */
  marcar(id: string, status: StatusDoItem): void;
  statusDe(id: string): StatusDoItem | undefined;
}

export function criarRepositorioEmMemoria(): RepositorioDoExercicio & { readonly dados: Map<string, unknown> } {
  const dados = new Map<string, unknown>();
  return {
    dados,
    lerRascunho: (id) => (dados.get(`rascunho:${id}`) as Arquivos | undefined) ?? null,
    gravarRascunho: (id, arquivos) => { dados.set(`rascunho:${id}`, { ...arquivos }); },
    apagarRascunho: (id) => { dados.delete(`rascunho:${id}`); },
    marcar: (id, status) => {
      if (dados.get(`progresso:${id}`) !== 'resolvido') dados.set(`progresso:${id}`, status);
    },
    statusDe: (id) => dados.get(`progresso:${id}`) as StatusDoItem | undefined,
  };
}

/** Grava o rascunho com atraso, sem perder a última edição ao sair (o mesmo do rascunho.js). */
export function criarGravadorRascunho(gravar: (id: string, arquivos: Arquivos) => void, atrasoMs = 300) {
  const pendentes = new Map<string, { arquivos: Arquivos; timer: ReturnType<typeof setTimeout> }>();
  const salvar = (id: string) => {
    const entrada = pendentes.get(id);
    if (!entrada) return;
    clearTimeout(entrada.timer);
    pendentes.delete(id);
    gravar(id, entrada.arquivos);
  };
  return {
    agendar(id: string, arquivos: Arquivos) {
      const anterior = pendentes.get(id);
      if (anterior) clearTimeout(anterior.timer);
      pendentes.set(id, { arquivos: { ...arquivos }, timer: setTimeout(() => { salvar(id); }, atrasoMs) });
    },
    descarregar() { for (const id of [...pendentes.keys()]) salvar(id); },
    cancelar(id: string) {
      const entrada = pendentes.get(id);
      if (entrada) clearTimeout(entrada.timer);
      pendentes.delete(id);
    },
  };
}
