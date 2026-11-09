// Porta Motor (plano de migração, seções 4.2 e 6): a tela do exercício fala com qualquer
// linguagem por esta interface. Cada playground tem o seu adaptador (aqui, o simulador de
// kubectl; no Go, PHP e Python, os workers WASM). Vai para @sertaoseracloud/playground-ui/dominio
// na fase 3; por enquanto, mora no repositório do spike.
//
// Erros de compilação, de tempo e de cancelamento são dados (Resultado), nunca exceções.

/** Os arquivos do editor: nome → conteúdo. */
export type Arquivos = Readonly<Record<string, string>>;

export type TipoDeLinha = 'saida' | 'sucesso' | 'erro' | 'aviso' | 'comando';

export interface LinhaSaida {
  readonly texto: string;
  readonly tipo: TipoDeLinha;
}

/** Por que o motor não chegou ao fim. */
export type FalhaDoMotor =
  | { readonly tipo: 'compilacao'; readonly mensagem: string }
  | { readonly tipo: 'tempo'; readonly limiteMs: number }
  | { readonly tipo: 'cancelado' }
  | { readonly tipo: 'interno'; readonly mensagem: string };

export type Resultado<T> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly erro: FalhaDoMotor; readonly saida: readonly LinhaSaida[] };

export interface Verificacao {
  readonly ok: boolean;
  readonly mensagem: string;
  readonly detalhe?: string;
  readonly dica?: string;
  readonly tecnico?: string;
}

export interface ResultadoCaso {
  readonly ok: boolean;
  readonly verificacoes: readonly Verificacao[];
}

export interface Correcao {
  readonly aprovado: boolean;
  /** Um por teste pedido, na mesma ordem. */
  readonly casos: readonly ResultadoCaso[];
}

export interface Execucao {
  readonly saida: readonly LinhaSaida[];
}

export interface ContextoDoExercicio {
  /** Chave do exercício: o estado de cada exercício fica separado. */
  readonly chave: string;
  /** Recursos que já existem antes do aluno começar (exercícios de "corrigir o cluster"). */
  readonly existentes?: string;
}

export interface OpcoesDeExecucao {
  readonly sinal?: AbortSignal;
  readonly tempoLimiteMs?: number;
}

/** O que cada motor sabe fazer além do básico (a suíte de contrato pula o que não se aplica). */
export interface Capacidades {
  /** Lê a entrada padrão (Go, PHP e Python). */
  readonly stdin: boolean;
  /** Pode demorar sem fim (um laço infinito) e por isso respeita tempoLimiteMs. */
  readonly tempoLimite: boolean;
}

export interface Motor<Teste> {
  readonly nome: string;
  readonly capacidades: Capacidades;
  /** Carrega o runtime (quando houver) e o estado do exercício. Chamado ao abrir a tela. */
  preparar(contexto: ContextoDoExercicio): Promise<void>;
  /** ▶ Executar/Apply: roda no ambiente do aluno (o estado muda e fica gravado). */
  executar(arquivos: Arquivos, opcoes?: OpcoesDeExecucao): Promise<Resultado<Execucao>>;
  /** Corrige num ambiente separado: não muda o que o aluno vê. */
  corrigir(arquivos: Arquivos, testes: readonly Teste[], opcoes?: OpcoesDeExecucao): Promise<Resultado<Correcao>>;
}

/** Falha pronta, sem saída. */
export const falha = (erro: FalhaDoMotor, saida: readonly LinhaSaida[] = []): Resultado<never> => ({ ok: false, erro, saida });

/** Sucesso pronto. */
export const sucesso = <T>(valor: T): Resultado<T> => ({ ok: true, valor });

/** Texto de uma falha, para a interface e o leitor de tela. */
export function descreverFalha(erro: FalhaDoMotor): string {
  switch (erro.tipo) {
    case 'compilacao':
    case 'interno':
      return erro.mensagem;
    case 'tempo':
      return `O código passou de ${String(Math.round(erro.limiteMs / 1000))} s e foi interrompido.`;
    case 'cancelado':
      return 'A execução foi cancelada.';
  }
}
