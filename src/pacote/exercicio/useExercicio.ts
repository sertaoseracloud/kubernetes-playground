// Container da ilha Exercicio: liga a máquina de estados ao Motor, ao corretor único e ao
// repositório. A interface só lê `estado` e chama as ações; não sabe qual linguagem roda.
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { corrigir } from '../motor/corretor.ts';
import type { Arquivos, CasoDeTeste, LinhaTerminal, Motor, RegistroRegras, RegraBase, ResultadoExecucao } from '../motor/tipos.ts';
import { ESTADO_INICIAL, podeExecutar, reduzirExercicio, type Modo } from './maquina.ts';
import type { RepositorioDoExercicio } from './repositorio.ts';

export interface ItemDoExercicio {
  readonly id: string;
  readonly principal: string;
  readonly testes: readonly CasoDeTeste[];
  /** Estado inicial do motor (K8s existentes, TF antes, PHP banco): vai em `extra.inicial`. */
  readonly inicial?: unknown;
}

export interface OpcoesDoExercicio<Extra, Detalhes> {
  readonly item: ItemDoExercicio;
  readonly motor: Motor<Extra, Detalhes>;
  readonly regras: RegistroRegras<Detalhes>;
  readonly repositorio: RepositorioDoExercicio;
  /** O que o leitor de tela ouve (aria-live), no fim de cada execução. */
  readonly anunciar: (texto: string) => void;
  /** Linhas para o terminal. */
  readonly escrever: (linhas: readonly LinhaTerminal[]) => void;
  /** Sinais da interface que as regras consultam (ex.: 'diff-usado'). */
  readonly sinais?: () => Readonly<Record<string, unknown>>;
}

const linhas = (texto: string, estilo: LinhaTerminal['estilo']): LinhaTerminal[] =>
  texto.split('\n').filter(Boolean).map((t) => ({ texto: t, ...(estilo ? { estilo } : {}) }));

const ANUNCIO_DO_DESFECHO: Readonly<Record<ResultadoExecucao['desfecho'], string>> = {
  ok: '', 'erro-execucao': '', 'erro-compilacao': 'O código não compilou. Veja o erro na aba Testes.',
  'tempo-esgotado': 'O tempo acabou e a execução foi interrompida.', cancelado: 'Execução cancelada.', 'falha-motor': 'O motor parou. Tente de novo.',
};

export function useExercicio<Extra, Detalhes>(opcoes: OpcoesDoExercicio<Extra, Detalhes>) {
  const { item, motor, regras, repositorio, anunciar, escrever, sinais } = opcoes;
  const [estado, despachar] = useReducer(reduzirExercicio, ESTADO_INICIAL);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const controle = useRef<AbortController | null>(null);

  useEffect(() => {
    let vivo = true;
    motor.preparar()
      .then(() => motor.estado?.abrir(item.id))
      .then(() => { if (vivo) despachar({ tipo: 'RUNTIME_PRONTO' }); })
      .catch((erro: unknown) => {
        const s = motor.situacao();
        if (vivo) despachar({ tipo: 'RUNTIME_FALHOU', erro: s.fase === 'falha' ? s.erro : String(erro), recuperavel: s.fase !== 'falha' || s.recuperavel });
      });
    return () => { vivo = false; controle.current?.abort(); };
  }, [motor, item.id]);

  /** ▶ Executar no contexto do aluno. Devolve se a correção deve rodar. */
  const executar = useCallback(async (arquivos: Arquivos, sinal: AbortSignal): Promise<boolean> => {
    const comando = motor.comandos?.comandoDoExecutar?.(item.principal);
    if (comando) escrever([{ texto: `$ ${comando}`, estilo: 'comando' }]);
    const extra = (item.inicial === undefined ? undefined : { inicial: item.inicial }) as Extra | undefined;
    const r = await motor.executar({ arquivos, principal: item.principal, contexto: 'aluno', continuar: true, sinal, ...(extra === undefined ? {} : { extra }) });
    escrever([...linhas(r.stdout, 'sucesso'), ...linhas(r.stderr, 'erro')]);
    despachar({ tipo: 'EXECUTOU', resultado: r });
    const segue = r.desfecho === 'ok' || r.desfecho === 'erro-execucao';
    if (!segue) anunciar(ANUNCIO_DO_DESFECHO[r.desfecho]);
    return segue;
  }, [motor, item.principal, item.inicial, escrever, anunciar]);

  /** Corrige pelo corretor único, grava o progresso e anuncia. */
  const conferir = useCallback(async (modo: Modo, arquivos: Arquivos, sinal: AbortSignal) => {
    try {
      const relatorio = await corrigir({ testes: item.testes as readonly CasoDeTeste<RegraBase, Extra>[], inicial: item.inicial }, arquivos, motor, regras, {
        incluirOcultos: modo === 'enviar', sinal, sinais: sinais?.() ?? {},
      });
      despachar({ tipo: 'CORRIGIU', relatorio });
      const passaram = `${String(relatorio.casos.filter((c) => c.ok).length)}/${String(relatorio.casos.length)}`;
      if (modo === 'enviar') repositorio.marcar(item.id, relatorio.aprovado ? 'resolvido' : 'tentado');
      else escrever([{ texto: `${relatorio.aprovado ? '✅' : '❌'} ${passaram} casos visíveis passaram`, estilo: relatorio.aprovado ? 'sucesso' : 'aviso' }]);
      anunciar(relatorio.aprovado && modo === 'enviar' ? 'Parabéns! Exercício resolvido.' : `${passaram} casos passaram.`);
    } catch (erro) {
      despachar({ tipo: 'CORRECAO_FALHOU', mensagem: erro instanceof Error ? erro.message : String(erro) });
      anunciar('Não deu para rodar os testes. Tente de novo.');
    }
  }, [motor, regras, repositorio, item.id, item.testes, item.inicial, escrever, anunciar, sinais]);

  const rodar = useCallback(async (modo: Modo, arquivos: Arquivos) => {
    if (!podeExecutar(estadoRef.current)) return;
    controle.current?.abort();
    const atual = new AbortController();
    controle.current = atual;
    despachar({ tipo: 'EXECUTAR', modo });
    if (modo === 'executar' && !(await executar(arquivos, atual.signal))) return;
    await conferir(modo, arquivos, atual.signal);
  }, [executar, conferir]);

  const editou = useCallback(() => { despachar({ tipo: 'EDITOU' }); }, []);
  const reiniciar = useCallback(() => { despachar({ tipo: 'REINICIAR' }); }, []);

  return {
    estado,
    executar: (a: Arquivos) => rodar('executar', a),
    enviar: (a: Arquivos) => rodar('enviar', a),
    parar: () => { controle.current?.abort(); motor.cancelar(); },
    editou,
    reiniciar,
  };
}
