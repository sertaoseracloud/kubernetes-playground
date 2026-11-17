// Tipos da parte do simulador que o código em TypeScript usa (o adaptador do contrato Motor,
// src/k8s/motor-k8s.ts). O simulador continua em JS até a fase 4c do plano de migração; os
// módulos em JS não leem este arquivo.

export interface RegraK8s {
  readonly tipo: string;
  readonly msg?: string;
  readonly [campo: string]: unknown;
}

/** O cluster simulado: listas por tipo e o YAML aplicado de cada recurso ("Kind/nome"). */
export interface EstadoCluster {
  readonly manifestos: Readonly<Record<string, unknown>>;
  readonly [lista: string]: unknown;
}

export interface ResultadoApply {
  readonly ok: boolean;
  readonly mensagem: string;
  readonly recursos?: readonly unknown[];
}

export interface DiffK8s {
  readonly criar: readonly { readonly kind: string; readonly nome: string }[];
  readonly atualizar: readonly { readonly kind: string; readonly nome: string }[];
  readonly destruir: readonly { readonly kind: string; readonly nome: string }[];
}

export interface VerificacaoK8s {
  readonly ok: boolean;
  readonly mensagem: string;
  readonly detalhe?: string;
  readonly tecnico?: string;
  readonly categoria?: string;
  readonly obtido?: string;
}

export function aplicarYaml(yaml: string | Readonly<Record<string, string>>, chaveExercicio?: string): ResultadoApply;
export function simularApply(yaml: string | Readonly<Record<string, string>>): ResultadoApply & { readonly diff: DiffK8s };
export function removerRecurso(kind: string, nome: string, chaveExercicio?: string): boolean;
export function verificarRegra(regra: RegraK8s): VerificacaoK8s;
export function descreverRegra(regra: RegraK8s): string;
export function obterEstado(): EstadoCluster;
export function estadoVazio(): EstadoCluster;
export function avaliarIsolado<T>(avaliar: () => T, existentes?: string): T;
export function trocarEstado(novo: EstadoCluster | null | undefined): EstadoCluster;
export function definirDiffUsado(valor: boolean): void;
