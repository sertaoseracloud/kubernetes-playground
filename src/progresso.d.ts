// Tipos da parte do progresso que o código em TypeScript usa (os adaptadores de
// src/exercicio-k8s/ e a página do spike). O módulo continua em JS; as chaves do localStorage
// não mudam (ADR 0002, regra 7).

export type StatusDoItem = 'resolvido' | 'tentado';

export function statusDe(id: string): StatusDoItem | undefined;
export function marcar(id: string, status: StatusDoItem): void;
export function lerRascunho(id: string): unknown;
export function gravarRascunho(id: string, arquivos: string | Readonly<Record<string, string>>): boolean | undefined;
export function apagarRascunho(id: string): void;
export function lerEstado(chave: string): unknown;
export function gravarEstado(chave: string, estado: unknown): void;
export function apagarEstado(chave: string): void;
export function lerPreferencia(chave: string, padrao?: unknown): unknown;
