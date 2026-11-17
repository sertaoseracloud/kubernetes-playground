// Ilha Exercicio (plano, fase 3c; primeiro corte no spike da fase 1): a tela do exercício feita
// uma vez para os cinco playgrounds. Fala só com o contrato Motor e o corretor único. Cada
// repositório entrega o motor, as regras, a linguagem do editor e os seus painéis (slots).
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { Extension } from '@codemirror/state';
import { Abas } from '../react/Abas.tsx';
import { Botao } from '../react/Botao.tsx';
import { Confirmacao } from '../react/Dialogo.tsx';
import type { Arquivos, LinhaTerminal, Motor, RegistroRegras } from '../motor/tipos.ts';
import { ocupado, resumoDoEstado, type EstadoExercicio } from './maquina.ts';
import { PainelTestes, type VizinhoDaTrilha } from './PainelTestes.tsx';
import { criarGravadorRascunho, type RepositorioDoExercicio } from './repositorio.ts';
import { useEditor } from './useEditor.ts';
import { useExercicio, type ItemDoExercicio } from './useExercicio.ts';
import estilosDoModulo from './tela.module.css';

const estilos = estilosDoModulo as Readonly<Record<'tela' | 'area' | 'descricao' | 'codigo' | 'terminal', string>>;

/** Um painel próprio do repositório (cluster do K8s, estado do TF, preview do PHP). */
export interface PainelDoRepositorio {
  readonly id: string;
  readonly rotulo: string;
  /** Chamado de novo quando o estado do motor muda (estado.aoMudar). */
  readonly conteudo: () => ReactNode;
}

export interface ExercicioProps<Extra, Detalhes> {
  readonly item: ItemDoExercicio & { readonly titulo: string; readonly arquivos: Arquivos; readonly proximo?: VizinhoDaTrilha };
  readonly motor: Motor<Extra, Detalhes>;
  readonly regras: RegistroRegras<Detalhes>;
  readonly repositorio: RepositorioDoExercicio;
  /** Slot do Astro: o enunciado em HTML estático. */
  readonly enunciado?: ReactNode;
  readonly paineis?: readonly PainelDoRepositorio[];
  /** Linguagem e tema do editor (o pacote não sabe qual é a linguagem). */
  readonly extensoesDoEditor?: readonly Extension[];
  /** O nome do ▶ no playground ("▶ Apply" no K8s, "▶ Executar" nos outros). */
  readonly rotuloExecutar?: string;
}

const LIMITE_DE_LINHAS = 500;
const ESPACO_FIXO = ' ';

function useArquivos(item: ExercicioProps<unknown, unknown>['item'], repositorio: RepositorioDoExercicio) {
  const inicial = useMemo<Arquivos>(() => repositorio.lerRascunho(item.id) ?? item.arquivos, [item.id, item.arquivos, repositorio]);
  const arquivos = useRef<Arquivos>(inicial);
  const principal = item.principal in inicial ? item.principal : (Object.keys(inicial)[0] ?? item.principal);
  const rascunhos = useMemo(() => criarGravadorRascunho((id, a) => { repositorio.gravarRascunho(id, a); }), [repositorio]);

  useEffect(() => {
    const descarregar = () => { rascunhos.descarregar(); };
    window.addEventListener('pagehide', descarregar);
    return () => { window.removeEventListener('pagehide', descarregar); descarregar(); };
  }, [rascunhos]);

  return {
    arquivos,
    principal,
    mudar(texto: string) {
      arquivos.current = { ...arquivos.current, [principal]: texto };
      rascunhos.agendar(item.id, arquivos.current);
    },
    restaurar() {
      rascunhos.cancelar(item.id);
      repositorio.apagarRascunho(item.id);
      arquivos.current = item.arquivos;
    },
  };
}

/** Terminal, aria-live e a versão do estado do motor (para os painéis do repositório). */
function useSaidas(motor: Motor) {
  const [linhas, setLinhas] = useState<readonly LinhaTerminal[]>([]);
  const [anuncio, setAnuncio] = useState('');
  const [versaoEstado, setVersaoEstado] = useState(0);
  useEffect(() => motor.estado?.aoMudar(() => { setVersaoEstado((v) => v + 1); }), [motor]);
  const escrever = useCallback((novas: readonly LinhaTerminal[]) => { setLinhas((atuais) => [...atuais, ...novas].slice(-LIMITE_DE_LINHAS)); }, []);
  // Texto novo a cada anúncio: o leitor de tela repete mesmo quando a frase é igual.
  const anunciar = useCallback((texto: string) => { setAnuncio((a) => (a === texto ? `${texto}${ESPACO_FIXO}` : texto)); }, []);
  return { linhas, anuncio, versaoEstado, escrever, anunciar };
}

interface BarraProps {
  readonly titulo: string;
  readonly rotuloExecutar: string;
  readonly estado: EstadoExercicio;
  readonly cancelavel: boolean;
  readonly aoExecutar: () => void;
  readonly aoEnviar: () => void;
  readonly aoParar: () => void;
  readonly aoRestaurar: () => void;
}

function BarraDeAcoes({ titulo, rotuloExecutar, estado, cancelavel, aoExecutar, aoEnviar, aoParar, aoRestaurar }: BarraProps) {
  const pronto = !['carregandoRuntime', 'falhaCarga'].includes(estado.tipo);
  const modo = estado.tipo === 'executando' || estado.tipo === 'corrigindo' ? estado.modo : null;
  return (
    <div className="barra-item">
      <div className="titulo-item"><h1>{titulo}</h1></div>
      <div className="acoes">
        <Botao variante="roxo" onClick={aoExecutar} disabled={!pronto} carregando={modo === 'executar'}
          title="Executa e roda os testes visíveis (Ctrl+Enter)" aria-keyshortcuts="Control+Enter">{rotuloExecutar}</Botao>
        <Botao variante="verde" onClick={aoEnviar} disabled={!pronto} carregando={modo === 'enviar'}
          title="Roda todos os casos de teste, inclusive os ocultos (Ctrl+Shift+Enter)" aria-keyshortcuts="Control+Shift+Enter">⬆ Enviar</Botao>
        {cancelavel && modo ? <Botao onClick={aoParar}><span aria-hidden="true">⏹</span> Parar</Botao> : null}
        <Botao onClick={aoRestaurar} disabled={ocupado(estado)}><span aria-hidden="true">↺</span> Restaurar</Botao>
      </div>
    </div>
  );
}

const CLASSE_DO_ESTILO: Readonly<Record<NonNullable<LinhaTerminal['estilo']>, string>> = {
  normal: '', comando: 'comando', erro: 'erro', aviso: 'aviso', sucesso: 'sucesso', comentario: 'comentario', forte: 'forte',
};

function Terminal({ id, linhas }: { readonly id: string; readonly linhas: readonly LinhaTerminal[] }) {
  return (
    <div className="janela-terminal">
      <div className="barra-terminal">
        <span className="luzes" aria-hidden="true"><i /><i /><i /></span>
        <span className="titulo-terminal">aluno@sertao: ~/{id}</span>
      </div>
      <div className="terminal" role="region" aria-label="Terminal" tabIndex={0}>
        <pre className="saida-terminal" role="log">
          {linhas.map((l, i) => <span key={i} className={CLASSE_DO_ESTILO[l.estilo ?? 'normal']}>{l.texto}{'\n'}</span>)}
        </pre>
      </div>
    </div>
  );
}

function Editor({ editor }: { readonly editor: RefObject<HTMLDivElement | null> }) {
  return (
    <section className={`painel ${estilos.codigo}`} aria-label="Código">
      <p id="ajuda-editor-ilha" className="sr">Control Enter executa e roda os testes visíveis. Control Shift Enter envia. Tab sai do editor.</p>
      <div ref={editor} className="editor" aria-describedby="ajuda-editor-ilha" />
    </section>
  );
}

function Saida({ item, linhas, paineis, versaoEstado }: { readonly item: { readonly id: string }; readonly linhas: readonly LinhaTerminal[]; readonly paineis: readonly PainelDoRepositorio[]; readonly versaoEstado: number }) {
  if (!paineis.length) return <section className={`painel ${estilos.terminal}`} aria-label="Saída"><Terminal id={item.id} linhas={linhas} /></section>;
  return (
    <section className={`painel ${estilos.terminal}`} aria-label="Saída">
      <Abas>
        <Abas.Lista rotulo="Saída">
          <Abas.Aba id="terminal">🖥️ Terminal</Abas.Aba>
          {paineis.map((p) => <Abas.Aba key={p.id} id={p.id}>{p.rotulo}</Abas.Aba>)}
        </Abas.Lista>
        <Abas.Painel id="terminal" className="painel-saida"><Terminal id={item.id} linhas={linhas} /></Abas.Painel>
        {paineis.map((p) => <Abas.Painel key={`${p.id}-${String(versaoEstado)}`} id={p.id} className="saida">{p.conteudo()}</Abas.Painel>)}
      </Abas>
    </section>
  );
}

export function Exercicio<Extra, Detalhes>({ item, motor, regras, repositorio, enunciado, paineis = [], extensoesDoEditor = [], rotuloExecutar = '▶ Executar' }: ExercicioProps<Extra, Detalhes>) {
  const [aba, setAba] = useState('enunciado');
  const [confirmando, setConfirmando] = useState(false);
  const [versaoTexto, setVersaoTexto] = useState(0);
  const [gentil, setGentil] = useState(false);
  const arquivos = useArquivos(item, repositorio);
  const { linhas, anuncio, versaoEstado, escrever, anunciar } = useSaidas(motor);
  useEffect(() => { setGentil(document.documentElement.classList.contains('a11y-sem-pressao')); }, []);

  const exercicio = useExercicio({ item, motor, regras, repositorio, anunciar, escrever });
  const { estado } = exercicio;
  const rodarExecutar = () => { void exercicio.executar(arquivos.arquivos.current).then(() => { setAba('testes'); }); };
  const rodarEnvio = () => { setAba('testes'); void exercicio.enviar(arquivos.arquivos.current); };
  const editor = useEditor({
    texto: arquivos.arquivos.current[arquivos.principal] ?? '',
    versao: versaoTexto,
    rotulo: `Editor de ${arquivos.principal}`,
    extensoes: extensoesDoEditor,
    aoMudar: (texto) => { arquivos.mudar(texto); exercicio.editou(); },
    aoExecutar: rodarExecutar,
    aoEnviar: rodarEnvio,
  });
  const resumo = resumoDoEstado(estado, item.testes.length);

  return (
    <div className={estilos.tela}>
      <BarraDeAcoes titulo={item.titulo} rotuloExecutar={rotuloExecutar} estado={estado} cancelavel={motor.capacidades.cancelavel}
        aoExecutar={rodarExecutar} aoEnviar={rodarEnvio} aoParar={exercicio.parar} aoRestaurar={() => { setConfirmando(true); }} />
      <div className={estilos.area}>
        <section className={`painel ${estilos.descricao}`} aria-label="Descrição">
          <Abas selecionada={aba} aoSelecionar={setAba}>
            <Abas.Lista rotulo="Descrição">
              <Abas.Aba id="enunciado">Descrição</Abas.Aba>
              <Abas.Aba id="testes" rotulo={`Testes: ${resumo}`}>🧪 Testes <span className="resumo-testes">{/^[✅❌]\s*\d+\/\d+/.exec(resumo)?.[0] ?? ''}</span></Abas.Aba>
            </Abas.Lista>
            <Abas.Painel id="enunciado">{enunciado}</Abas.Painel>
            <Abas.Painel id="testes">
              <div className="saida testes">
                <PainelTestes estado={estado} testes={item.testes} regras={regras} gentil={gentil} {...(item.proximo ? { proximo: item.proximo } : {})} />
              </div>
            </Abas.Painel>
          </Abas>
        </section>
        <Editor editor={editor} />
        <Saida item={item} linhas={linhas} paineis={paineis} versaoEstado={versaoEstado} />
      </div>
      <p className="sr" role="status" aria-live="polite">{anuncio}</p>
      <Confirmacao aberto={confirmando} titulo="Voltar ao código original?" mensagem="Suas alterações neste exercício serão perdidas." confirmar="Restaurar"
        aoFechar={() => { setConfirmando(false); }}
        aoConfirmar={() => { arquivos.restaurar(); setVersaoTexto((v) => v + 1); exercicio.reiniciar(); anunciar('Código original restaurado.'); }} />
    </div>
  );
}
