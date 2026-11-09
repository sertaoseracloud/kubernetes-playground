// Container da tela do exercício: liga a máquina de estados ao Motor e ao repositório.
// A interface só lê `estado` e chama as ações; não sabe qual linguagem está rodando.
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { ESTADO_INICIAL, podeExecutar, reduzirExercicio, type Modo } from './maquina.ts';
import type { Arquivos, LinhaSaida, Motor, Resultado } from './motor.ts';
import type { RepositorioDoExercicio } from './repositorio.ts';

export interface OpcoesDoExercicio<Teste extends { readonly oculto?: boolean }> {
  readonly id: string;
  readonly testes: readonly Teste[];
  readonly existentes?: string;
  readonly motor: Motor<Teste>;
  readonly repositorio: RepositorioDoExercicio;
  /** O que o leitor de tela ouve (aria-live), no fim de cada execução. */
  readonly anunciar: (texto: string) => void;
  /** Linhas para o terminal (a saída do ▶ Apply). */
  readonly escrever: (linhas: readonly LinhaSaida[]) => void;
}

export function useExercicio<Teste extends { readonly oculto?: boolean }>(opcoes: OpcoesDoExercicio<Teste>) {
  const { id, testes, existentes, motor, repositorio, anunciar, escrever } = opcoes;
  const [estado, despachar] = useReducer(reduzirExercicio, ESTADO_INICIAL);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const controle = useRef<AbortController | null>(null);

  useEffect(() => {
    let vivo = true;
    void motor.preparar({ chave: id, ...(existentes === undefined ? {} : { existentes }) }).then(() => {
      if (vivo) despachar({ tipo: 'RUNTIME_PRONTO' });
    });
    return () => {
      vivo = false;
      controle.current?.abort();
    };
  }, [motor, id, existentes]);

  const falhou = useCallback(<T,>(r: Resultado<T>): r is Extract<Resultado<T>, { ok: false }> => {
    if (r.ok) return false;
    despachar({ tipo: 'FALHOU', erro: r.erro, saida: r.saida });
    return true;
  }, []);

  /** ▶ Apply: roda no cluster do aluno e escreve no terminal. Devolve false se parou aqui. */
  const executar = useCallback(async (arquivos: Arquivos, sinal: AbortSignal): Promise<boolean> => {
    const execucao = await motor.executar(arquivos, { sinal });
    escrever(execucao.ok ? execucao.valor.saida : execucao.saida);
    if (falhou(execucao)) {
      anunciar(execucao.erro.tipo === 'compilacao' ? `Erro ao aplicar o YAML: ${execucao.erro.mensagem}` : 'A execução não terminou.');
      return false;
    }
    despachar({ tipo: 'EXECUTOU', saida: execucao.valor.saida });
    return true;
  }, [motor, escrever, anunciar, falhou]);

  /** Corrige (os visíveis no ▶ Apply, todos no ⬆ Enviar), grava o progresso e anuncia. */
  const corrigir = useCallback(async (modo: Modo, arquivos: Arquivos, sinal: AbortSignal) => {
    const correcao = await motor.corrigir(arquivos, modo === 'apply' ? testes.filter((t) => !t.oculto) : testes, { sinal });
    if (falhou(correcao)) {
      if (modo === 'enviar') repositorio.marcar(id, 'tentado');
      anunciar('O YAML não pôde ser aplicado. Corrija o erro e rode de novo.');
      return;
    }
    despachar({ tipo: 'CORRIGIU', correcao: correcao.valor });
    const { aprovado, casos } = correcao.valor;
    const placar = `${String(casos.filter((c) => c.ok).length)}/${String(casos.length)}`;
    if (modo === 'enviar') {
      repositorio.marcar(id, aprovado ? 'resolvido' : 'tentado');
      anunciar(aprovado ? 'Parabéns! Exercício resolvido.' : `${placar} casos passaram.`);
      return;
    }
    if (casos.length) escrever([{ texto: `${aprovado ? '✅' : '❌'} ${placar} casos visíveis passaram`, tipo: aprovado ? 'sucesso' : 'aviso' }]);
    anunciar(`${placar} casos visíveis passaram.`);
  }, [motor, testes, repositorio, id, anunciar, escrever, falhou]);

  const rodar = useCallback(async (modo: Modo, arquivos: Arquivos) => {
    if (!podeExecutar(estadoRef.current)) return;
    controle.current?.abort();
    const atual = new AbortController();
    controle.current = atual;
    despachar({ tipo: 'EXECUTAR', modo });
    if (modo === 'apply' && !(await executar(arquivos, atual.signal))) return;
    await corrigir(modo, arquivos, atual.signal);
  }, [executar, corrigir]);

  const editou = useCallback(() => { despachar({ tipo: 'EDITOU' }); }, []);
  const reiniciar = useCallback(() => { despachar({ tipo: 'REINICIAR' }); }, []);

  return { estado, aplicar: (a: Arquivos) => rodar('apply', a), enviar: (a: Arquivos) => rodar('enviar', a), editou, reiniciar };
}
