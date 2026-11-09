// Adaptador do simulador de kubectl para a porta Motor. Executar = `kubectl apply -f .` no
// cluster do aluno (gravado por exercício); corrigir = aplicar num cluster separado e conferir
// as regras de cada caso, sem mexer no cluster do aluno.
//
// O simulador é síncrono e guarda o cluster num módulo: este adaptador é o único lugar do
// código em TS que conhece isso.
import {
  aplicarYaml,
  avaliarIsolado,
  carregarEstado,
  obterEstado,
  verificarRegra,
  type RegraK8s,
} from '../k8s/simulador.js';
import {
  falha,
  sucesso,
  type Arquivos,
  type ContextoDoExercicio,
  type Correcao,
  type Execucao,
  type LinhaSaida,
  type Motor,
  type OpcoesDeExecucao,
  type Resultado,
  type ResultadoCaso,
  type Verificacao,
} from './motor.ts';

export interface TesteK8s {
  readonly descricao?: string;
  readonly oculto?: boolean;
  /** "Como corrigir": vai na primeira verificação que falhou. */
  readonly dica?: string;
  readonly regras: readonly RegraK8s[];
}

const proximaVolta = (): Promise<void> => new Promise((resolver) => { setTimeout(resolver, 0); });

const temManifesto = (arquivos: Arquivos): boolean => Object.values(arquivos).some((texto) => texto.trim() !== '');

const linhas = (mensagem: string, tipo: LinhaSaida['tipo']): LinhaSaida[] =>
  mensagem.split('\n').filter(Boolean).map((texto) => ({ texto, tipo }));

/** Põe a dica do caso na primeira verificação que falhou (o mesmo que comoCorrigir, em item.js). */
export function comDica(verificacoes: readonly Verificacao[], dica: string | undefined): readonly Verificacao[] {
  const indice = dica ? verificacoes.findIndex((v) => !v.ok) : -1;
  if (indice < 0 || dica === undefined) return verificacoes;
  return verificacoes.map((v, i) => (i === indice ? { ...v, dica } : v));
}

function verificar(regra: RegraK8s): Verificacao {
  const { ok, mensagem, detalhe, tecnico } = verificarRegra(regra);
  return {
    ok,
    mensagem,
    ...(detalhe === undefined ? {} : { detalhe }),
    ...(tecnico === undefined ? {} : { tecnico }),
  };
}

function corrigirNoCluster(arquivos: Arquivos, testes: readonly TesteK8s[]): Resultado<Correcao> {
  const apply = aplicarYaml(arquivos);
  if (!apply.ok) return falha({ tipo: 'compilacao', mensagem: apply.mensagem }, linhas(apply.mensagem, 'erro'));
  const casos: ResultadoCaso[] = testes.map((teste) => {
    const verificacoes = comDica(teste.regras.map(verificar), teste.dica);
    return { ok: verificacoes.every((v) => v.ok), verificacoes };
  });
  return sucesso({ aprovado: casos.every((c) => c.ok), casos });
}

function antesDeRodar(arquivos: Arquivos, opcoes: OpcoesDeExecucao | undefined): Resultado<never> | null {
  if (opcoes?.sinal?.aborted) return falha({ tipo: 'cancelado' });
  if (!temManifesto(arquivos)) {
    return falha({ tipo: 'compilacao', mensagem: 'nenhum manifesto YAML fornecido' }, [{ texto: 'error: nenhum manifesto YAML fornecido', tipo: 'erro' }]);
  }
  return null;
}

/** Erro inesperado do simulador vira dado, como os outros. */
function interno(erro: unknown): Resultado<never> {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return falha({ tipo: 'interno', mensagem: `Erro interno do simulador: ${mensagem}` });
}

export function criarMotorK8s(): Motor<TesteK8s> {
  let contexto: ContextoDoExercicio | null = null;

  return {
    nome: 'kubectl (simulado)',
    capacidades: { stdin: false, tempoLimite: false },

    preparar(novo) {
      contexto = novo;
      carregarEstado(novo.chave);
      if (novo.existentes && Object.keys(obterEstado().manifestos).length === 0) aplicarYaml(novo.existentes, novo.chave);
      return Promise.resolve();
    },

    async executar(arquivos, opcoes): Promise<Resultado<Execucao>> {
      const antes = antesDeRodar(arquivos, opcoes);
      if (antes) return antes;
      await proximaVolta(); // deixa a interface mostrar "executando" antes do trabalho síncrono
      if (opcoes?.sinal?.aborted) return falha({ tipo: 'cancelado' });
      try {
        const comando: LinhaSaida = { texto: '$ kubectl apply -f .', tipo: 'comando' };
        const r = aplicarYaml(arquivos, contexto?.chave);
        if (!r.ok) {
          const erros = linhas(r.mensagem, 'erro').map((l) => ({ ...l, texto: `error: ${l.texto}` }));
          return falha({ tipo: 'compilacao', mensagem: r.mensagem }, [comando, ...erros]);
        }
        return sucesso({ saida: [comando, ...linhas(r.mensagem, 'sucesso')] });
      } catch (erro) {
        return interno(erro);
      }
    },

    async corrigir(arquivos, testes, opcoes): Promise<Resultado<Correcao>> {
      const antes = antesDeRodar(arquivos, opcoes);
      if (antes) return antes;
      await proximaVolta();
      if (opcoes?.sinal?.aborted) return falha({ tipo: 'cancelado' });
      try {
        return avaliarIsolado(() => corrigirNoCluster(arquivos, testes), contexto?.existentes);
      } catch (erro) {
        return interno(erro);
      }
    },
  };
}
