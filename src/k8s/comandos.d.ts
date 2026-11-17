// Tipos da parte dos comandos do terminal que o adaptador do contrato Motor usa.
import type { EstadoCluster } from './simulador.js';

export interface LinhaK8s {
  readonly texto: string;
  readonly classe?: string;
}

export type AcaoK8s =
  | 'apply' | 'diff' | 'drift' | 'clear' | 'delete-arquivo'
  | { readonly apagar: readonly { readonly kind: string; readonly nome: string; readonly prefixo: string; readonly tipo: string }[] };

export function interpretar(
  texto: string,
  estado: EstadoCluster,
  arquivos?: Readonly<Record<string, string>>,
): { readonly linhas: readonly LinhaK8s[]; readonly acao?: AcaoK8s; readonly arquivos?: Readonly<Record<string, string>> };
export function completarKubectl(texto: string, arquivos?: readonly string[]): readonly string[];
