// Contrato Motor (estudo-componentizacao/analise-codigo/contrato-motor.md, seção 3): a porta
// comum aos cinco motores dos playgrounds. TS puro, sem DOM.
//
// Tudo em src/pacote/ vai para @sertaoseracloud/playground-ui na fase 3 (/dominio, /react e
// /testes). Nada aqui importa do repositório: o ESLint barra (eslint.config.js).

/** Arquivos do editor: caminho relativo → conteúdo. Imutável para o motor. */
export type Arquivos = Readonly<Record<string, string>>;

export type IdMotor = 'go' | 'php' | 'python' | 'terraform' | 'kubernetes';

/** Situação do ciclo de vida. A ilha só habilita ▶/⬆ em 'pronto'. */
export type SituacaoMotor =
  | { readonly fase: 'ocioso' }
  | { readonly fase: 'carregando'; readonly progresso?: Progresso }
  | { readonly fase: 'pronto' }
  | { readonly fase: 'falha'; readonly erro: string; readonly recuperavel: boolean };

export interface Progresso {
  readonly mensagem: string;
  readonly fracao?: number;
  readonly bytes?: { readonly recebidos: number; readonly total?: number };
}

/** O que o motor sabe fazer. A ilha decide a interface por aqui, nunca pelo `id`. */
export interface Capacidades {
  readonly id: IdMotor;
  readonly rotulo: string;
  readonly natureza: 'compilado' | 'interpretado' | 'requisicao' | 'simulador';
  readonly compilacaoSeparada: boolean;
  readonly entrada: 'nenhum' | 'lote' | 'linhas';
  readonly entradaInterativa: boolean;
  readonly streaming: boolean;
  /** `cancelar()` interrompe de fato. Senão, só descarta o resultado. */
  readonly cancelavel: boolean;
  /** Limite padrão em ms; null = o motor não consegue impor (síncrono na thread da página). */
  readonly limiteMsPadrao: number | null;
  readonly saida: 'texto' | 'html';
  readonly estadoPersistente: boolean;
  readonly deterministico: boolean;
}

/** Contexto de isolamento: cada um tem o próprio estado (banco/sessão, tfstate, cluster). */
export type Contexto = 'aluno' | 'preview' | 'testes' | (string & {});

export interface PedidoExecucao<Extra = unknown> {
  readonly arquivos: Arquivos;
  readonly principal?: string;
  readonly entrada?: string | readonly (string | null)[];
  readonly argv?: readonly string[];
  readonly limiteMs?: number;
  readonly sinal?: AbortSignal;
  /** Padrão 'aluno'. */
  readonly contexto?: Contexto;
  /** false (padrão): começa do estado inicial do contexto. true: continua da execução anterior. */
  readonly continuar?: boolean;
  readonly extra?: Extra;
}

export interface GanchosExecucao {
  aoSaida?(pedaco: string, fluxo: 'stdout' | 'stderr'): void;
  aoPedirEntrada?(prompt: string): Promise<string | null>;
}

/** Erro ou aviso com posição: o que o editor marca e o terminal lista. */
export interface Diagnostico {
  readonly gravidade: 'erro' | 'aviso' | 'info';
  readonly fase: 'carga' | 'compilacao' | 'execucao' | 'validacao';
  readonly mensagem: string;
  readonly detalhe?: string;
  readonly codigo?: string;
  readonly arquivo?: string;
  readonly linha?: number;
  readonly coluna?: number;
  readonly bruto?: string;
}

export type DesfechoExecucao = 'ok' | 'erro-compilacao' | 'erro-execucao' | 'tempo-esgotado' | 'cancelado' | 'falha-motor';

export interface ResultadoExecucao<Detalhes = unknown> {
  readonly desfecho: DesfechoExecucao;
  readonly stdout: string;
  readonly stderr: string;
  readonly codigoSaida: number | null;
  readonly ms: number;
  readonly diagnosticos: readonly Diagnostico[];
  readonly saidaCortada?: boolean;
  /** Dados próprios do motor que as regras específicas e os painéis consomem. Serializável. */
  readonly detalhes: Detalhes;
}

/** Estado que sobrevive entre execuções, por contexto. Quem grava no armazenamento é o adaptador. */
export interface EstadoDoMotor<Instantaneo = unknown> {
  abrir(chave: string): Promise<void>;
  instantaneo(contexto?: Contexto): Instantaneo;
  zerar(contexto?: Contexto): Promise<void>;
  aoMudar(ouvinte: (contexto: Contexto) => void): () => void;
}

/** Porta de armazenamento do estado do motor (no repositório, sobre o localStorage). */
export interface ArmazenamentoEstado {
  ler(chave: string): unknown;
  gravar(chave: string, valor: unknown): void;
  apagar(chave: string): void;
}

export interface LinhaTerminal {
  readonly texto: string;
  readonly estilo?: 'normal' | 'comando' | 'erro' | 'aviso' | 'sucesso' | 'comentario' | 'forte';
  readonly atrasoMs?: number;
}

export interface SaidaTerminal {
  escrever(texto: string, estilo?: LinhaTerminal['estilo']): void;
  mostrar(linhas: readonly LinhaTerminal[], opcoes?: { readonly animar?: boolean }): Promise<void>;
  limpar(): void;
}

export interface Pergunta {
  readonly prompt: string;
  readonly rotulo: string;
  readonly tipo: 'entrada' | 'confirmacao' | 'segredo';
  readonly noHistorico?: boolean;
}

export interface ContextoComando {
  arquivos(): Arquivos;
  trocarArquivos?(novos: Arquivos): void;
  readonly saida: SaidaTerminal;
  perguntar(p: Pergunta): Promise<string | null>;
  readonly sinal: AbortSignal;
  /** Sinais da interface que regras podem consultar (ex.: 'diff-usado' do K8s). */
  sinalizar(nome: string, valor: unknown): void;
}

export type EfeitoComando = { readonly tipo: 'abrir-painel'; readonly painel: string } | { readonly tipo: 'estado-mudou' };

export interface ResultadoComando<Detalhes = unknown> {
  readonly execucao?: ResultadoExecucao<Detalhes>;
  readonly efeitos?: readonly EfeitoComando[];
}

export interface InterpretadorComandos<Detalhes = unknown> {
  prompt(estado: { readonly pasta: string; readonly modo?: string }): string;
  completar(texto: string, ctx: Pick<ContextoComando, 'arquivos'>): readonly string[];
  rodar(linha: string, ctx: ContextoComando): Promise<ResultadoComando<Detalhes>>;
  comandoDoExecutar?(principal: string): string;
  readonly ajuda: string;
}

export interface Motor<Extra = unknown, Detalhes = unknown> {
  readonly capacidades: Capacidades;
  situacao(): SituacaoMotor;
  aoMudarSituacao(ouvinte: (s: SituacaoMotor) => void): () => void;
  /** Idempotente. Rejeita só se a carga falhar (a situação vira 'falha'). */
  preparar(opcoes?: { readonly sinal?: AbortSignal }): Promise<void>;
  verificar?(arquivos: Arquivos, opcoes?: { readonly principal?: string }): Promise<readonly Diagnostico[]>;
  /** Serial. Nunca rejeita: erro do aluno, tempo, cancelamento e falha do motor são desfechos. */
  executar(pedido: PedidoExecucao<Extra>, ganchos?: GanchosExecucao): Promise<ResultadoExecucao<Detalhes>>;
  cancelar(): void;
  readonly estado?: EstadoDoMotor;
  readonly comandos?: InterpretadorComandos<Detalhes>;
  descartar(): void;
}

// ---------- correção (contrato, seção 3.6) ----------

export type RegraBase = { readonly msg?: string } & Readonly<Record<string, unknown>>;

export interface Passo<Regra extends RegraBase = RegraBase, Extra = unknown> {
  readonly entrada?: PedidoExecucao['entrada'];
  readonly argv?: readonly string[];
  readonly extra?: Extra;
  readonly arquivos?: Arquivos;
  readonly regras?: readonly Regra[];
}

export interface CasoDeTeste<Regra extends RegraBase = RegraBase, Extra = unknown> extends Passo<Regra, Extra> {
  readonly descricao?: string;
  readonly oculto?: boolean;
  readonly dica?: string;
  readonly dados?: Arquivos;
  /** Estado inicial do contexto 'testes' (PHP banco, TF antes, K8s existentes). Vai para `extra.inicial`. */
  readonly inicial?: unknown;
  readonly passos?: readonly Passo<Regra, Extra>[];
}

export interface ContextoRegra<Detalhes = unknown> {
  readonly execucao: ResultadoExecucao<Detalhes>;
  readonly codigo: string;
  readonly arquivos: Arquivos;
  readonly extraDaRegra?: unknown;
  readonly sinais: Readonly<Record<string, unknown>>;
  readonly estado?: unknown;
  readonly dom?: (html: string) => Document;
}

export interface ResultadoRegra {
  readonly ok: boolean;
  readonly mensagem: string;
  readonly categoria: string;
  readonly detalhe?: string;
  readonly obtido?: string;
  readonly dica?: string;
  /** Texto técnico para o "Detalhe técnico" (o esperado × obtido cru). */
  readonly tecnico?: string;
}

export interface VerificadorRegra<Regra extends RegraBase = RegraBase, Detalhes = unknown> {
  readonly chave: string;
  casa?(regra: RegraBase): regra is Regra;
  readonly categoria: string;
  descrever(regra: Regra): string | null;
  preparar?(regra: Regra): { readonly extra?: Readonly<Record<string, unknown>> };
  verificar(regra: Regra, ctx: ContextoRegra<Detalhes>): ResultadoRegra;
}

export interface RelatorioCaso {
  readonly descricao?: string;
  readonly oculto: boolean;
  readonly ok: boolean;
  readonly resultados: readonly ResultadoRegra[];
  readonly cenario: readonly { readonly rotulo: string; readonly detalhe?: string }[];
  readonly erroExecucao?: Diagnostico;
  readonly desfecho: DesfechoExecucao;
  readonly ms: number;
}

export interface Relatorio {
  readonly aprovado: boolean;
  readonly casos: readonly RelatorioCaso[];
}

export interface OpcoesCorrecao {
  readonly incluirOcultos: boolean;
  readonly sinal?: AbortSignal;
  readonly reaproveitar?: { readonly pedido: PedidoExecucao; readonly resultado: ResultadoExecucao };
  readonly sinais?: Readonly<Record<string, unknown>>;
}

export interface RegistroRegras<Detalhes = unknown> {
  registrar(...verificadores: VerificadorRegra<RegraBase, Detalhes>[]): RegistroRegras<Detalhes>;
  /** Lança "Regra desconhecida" quando nenhum verificador casa. */
  achar(regra: RegraBase): VerificadorRegra<RegraBase, Detalhes>;
}
