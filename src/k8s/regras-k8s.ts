// Regras do Kubernetes no registro do corretor único (contrato, seções 3.6 e 4.5). O conteúdo usa
// `tipo:` (recurso-existe, campo, configmap-contem...): as regras casam por `regra.tipo`. Elas leem o
// cluster do fim do passo (ctx.estado), não o global. 'diff-usado' lê o sinal da interface.
//
// Primeiro corte: um verificador para todos os `tipo:` do simulador. A fase −1 (item 2) separa um
// verificador por tipo, com o teste que garante registro para todo tipo usado no conteúdo.
import { criarRegistroRegras } from '../pacote/motor/corretor.ts';
import { REGRAS_COMUNS } from '../pacote/motor/regras-comuns.ts';
import type { RegistroRegras, RegraBase, ResultadoRegra, VerificadorRegra } from '../pacote/motor/tipos.ts';
import type { DetalhesK8s } from './motor-k8s.ts';
import { descreverRegra, trocarEstado, verificarRegra, type EstadoCluster, type RegraK8s } from './simulador.js';

const ehRegraK8s = (regra: RegraBase): regra is RegraK8s => typeof regra.tipo === 'string';
const comoK8s = (regra: RegraBase): RegraK8s => regra as RegraK8s;

export const diffUsado: VerificadorRegra<RegraBase, DetalhesK8s> = {
  chave: 'diff-usado',
  casa: (regra): regra is RegraBase => regra.tipo === 'diff-usado',
  categoria: 'Workflow',
  descrever: () => 'Você usou 🔍 Diff antes de aplicar',
  verificar(_regra, { sinais }): ResultadoRegra {
    const ok = sinais['diff-usado'] === true;
    return {
      ok,
      mensagem: 'Você usou 🔍 Diff antes de aplicar',
      categoria: 'Workflow',
      detalhe: ok ? 'Diff foi executado antes do Apply.' : 'O botão 🔍 Diff não foi usado antes de aplicar.',
      obtido: ok ? 'diff executado' : '(não usado)',
    };
  },
};

/** Todas as regras `tipo:` do simulador, conferidas no cluster do fim do passo. */
export const regraDoCluster: VerificadorRegra<RegraBase, DetalhesK8s> = {
  chave: 'tipo',
  casa: (regra): regra is RegraBase => ehRegraK8s(regra),
  categoria: 'Recurso',
  descrever: (regra) => descreverRegra(comoK8s(regra)) || null,
  verificar(regra, { estado, execucao }): ResultadoRegra {
    const cluster = (estado ?? execucao.detalhes.cluster) as EstadoCluster;
    const anterior = trocarEstado(cluster);
    try {
      const v = verificarRegra(comoK8s(regra));
      return {
        ok: v.ok,
        mensagem: v.mensagem,
        categoria: v.categoria ?? 'Recurso',
        ...(v.detalhe === undefined ? {} : { detalhe: v.detalhe }),
        ...(v.obtido === undefined ? {} : { obtido: v.obtido }),
        ...(v.tecnico === undefined ? {} : { tecnico: v.tecnico }),
      };
    } finally {
      trocarEstado(anterior);
    }
  },
};

export function criarRegrasK8s(): RegistroRegras<DetalhesK8s> {
  return criarRegistroRegras<DetalhesK8s>()
    .registrar(diffUsado, regraDoCluster)
    .registrar(...(REGRAS_COMUNS as readonly VerificadorRegra<RegraBase, DetalhesK8s>[]));
}
