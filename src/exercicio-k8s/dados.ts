// O que a ilha do exercício recebe do build (props serializáveis e mínimas: ADR 0002, regra 5).
// Nunca vai a solução: o enunciado vai como HTML estático (slot), fora do JavaScript.
import type { CasoDeTeste } from '../pacote/motor/tipos.ts';
import type { VizinhoDaTrilha } from '../pacote/exercicio/PainelTestes.tsx';
import { ARQUIVO_PRINCIPAL } from './armazenamento-local.ts';

export interface ExercicioDaIlha {
  readonly id: string;
  readonly titulo: string;
  readonly principal: string;
  readonly arquivos: Readonly<Record<string, string>>;
  readonly testes: readonly CasoDeTeste[];
  /** item.existentes: o cluster já tem esses recursos antes do aluno começar. */
  readonly inicial?: string;
  readonly proximo?: VizinhoDaTrilha;
}

/** O item do conteúdo (em JS, ainda sem tipos), como o conteúdo o descreve hoje. */
export interface ItemDoConteudo {
  readonly id: string;
  readonly titulo: string;
  readonly tipo?: string;
  readonly inicial?: string;
  readonly existentes?: string;
  readonly solucao?: string;
  readonly testes?: readonly CasoDeTeste[];
}

/** O exercício começa com um esqueleto, nunca com a resposta (o mesmo de item.js). */
export const ESQUELETO = '# Escreva aqui o manifesto YAML e clique em ▶ Apply.\napiVersion: \nkind: \nmetadata:\n  name: \n';

/** Monta as props da ilha a partir do item, deixando a solução de fora. */
export function paraIlha(item: ItemDoConteudo, proximo?: VizinhoDaTrilha): ExercicioDaIlha {
  return {
    id: item.id,
    titulo: item.titulo,
    principal: ARQUIVO_PRINCIPAL,
    arquivos: { [ARQUIVO_PRINCIPAL]: item.inicial ?? ESQUELETO },
    testes: (item.testes ?? []).map((t) => ({
      regras: t.regras ?? [],
      ...(t.descricao === undefined ? {} : { descricao: t.descricao }),
      ...(t.oculto === undefined ? {} : { oculto: t.oculto }),
      ...(t.dica === undefined ? {} : { dica: t.dica }),
    })),
    ...(item.existentes === undefined ? {} : { inicial: item.existentes }),
    ...(proximo === undefined ? {} : { proximo }),
  };
}
