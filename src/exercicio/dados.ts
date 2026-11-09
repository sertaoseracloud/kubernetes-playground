// O que a ilha do exercício recebe do build (props serializáveis e mínimas: ADR 0002, regra 5).
// Nunca vai a solução: o enunciado vai como HTML estático (slot), fora do JavaScript.
import type { TesteK8s } from './motor-k8s.ts';

export interface VizinhoDaTrilha {
  readonly href: string;
  readonly titulo: string;
}

export interface ExercicioDaIlha {
  readonly id: string;
  readonly titulo: string;
  readonly inicial: string;
  readonly testes: readonly TesteK8s[];
  readonly existentes?: string;
  readonly proximo?: VizinhoDaTrilha;
}

/** O item do conteúdo (em JS, ainda sem tipos) como o conteúdo o descreve hoje. */
export interface ItemDoConteudo {
  readonly id: string;
  readonly titulo: string;
  readonly tipo?: string;
  readonly inicial?: string;
  readonly existentes?: string;
  readonly solucao?: string;
  readonly testes?: readonly TesteK8s[];
}

/** O exercício começa com um esqueleto, nunca com a resposta (o mesmo de item.js). */
export const ESQUELETO = '# Escreva aqui o manifesto YAML e clique em ▶ Apply.\napiVersion: \nkind: \nmetadata:\n  name: \n';

/** Monta as props da ilha a partir do item, deixando a solução de fora. */
export function paraIlha(item: ItemDoConteudo, proximo?: VizinhoDaTrilha): ExercicioDaIlha {
  return {
    id: item.id,
    titulo: item.titulo,
    inicial: item.inicial ?? ESQUELETO,
    testes: (item.testes ?? []).map((t) => ({
      regras: t.regras,
      ...(t.descricao === undefined ? {} : { descricao: t.descricao }),
      ...(t.oculto === undefined ? {} : { oculto: t.oculto }),
      ...(t.dica === undefined ? {} : { dica: t.dica }),
    })),
    ...(item.existentes === undefined ? {} : { existentes: item.existentes }),
    ...(proximo === undefined ? {} : { proximo }),
  };
}
