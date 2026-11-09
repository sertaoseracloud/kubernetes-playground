// Tipos da parte do simulador que o código em TypeScript usa (a porta Motor, em
// src/exercicio/motor-k8s.ts). O simulador continua em JS até a fase 4c do plano de migração;
// os módulos em JS não leem este arquivo.

export interface RegraK8s {
  readonly tipo: string;
  readonly [campo: string]: unknown;
}

export interface ResultadoApply {
  readonly ok: boolean;
  readonly mensagem: string;
}

export interface VerificacaoK8s {
  readonly ok: boolean;
  readonly mensagem: string;
  readonly detalhe?: string;
  readonly tecnico?: string;
}

export function aplicarYaml(yaml: string | Readonly<Record<string, string>>, chaveExercicio?: string): ResultadoApply;
export function verificarRegra(regra: RegraK8s): VerificacaoK8s;
export function descreverRegra(regra: RegraK8s): string;
export function avaliarIsolado<T>(avaliar: () => T, existentes?: string): T;
export function carregarEstado(chaveExercicio?: string): void;
export function resetarEstado(chaveExercicio?: string): void;
export function obterEstado(): { readonly manifestos: Readonly<Record<string, unknown>> } & Readonly<Record<string, unknown>>;
export function definirDiffUsado(valor: boolean): void;
