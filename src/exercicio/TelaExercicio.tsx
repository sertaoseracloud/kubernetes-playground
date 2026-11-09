// Ilha da tela do exercício (spike da fase 1). O enunciado chega pronto do build (slot
// `enunciado`, HTML estático); aqui fica só o que tem comportamento: editor, ▶ Apply,
// ⬆ Enviar, testes e terminal. O motor entra pela porta Motor (padrão Strategy): a mesma tela
// serve aos cinco playgrounds.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Abas } from '../react/Abas.tsx';
import { Botao } from '../react/Botao.tsx';
import { Confirmacao } from '../react/Dialogo.tsx';
import { criarGravadorRascunho } from '../rascunho.js';
import type { ExercicioDaIlha } from './dados.ts';
import { ocupado, resumoDoEstado, type EstadoExercicio } from './maquina.ts';
import type { Arquivos, LinhaSaida, Motor } from './motor.ts';
import { criarMotorK8s, type TesteK8s } from './motor-k8s.ts';
import { PainelTestes } from './PainelTestes.tsx';
import { ARQUIVO_PRINCIPAL, repositorioLocal, type RepositorioDoExercicio } from './repositorio.ts';
import { useEditor } from './useEditor.ts';
import { useExercicio } from './useExercicio.ts';
import estilosDoModulo from './tela.module.css';

const estilos = estilosDoModulo as Readonly<Record<'tela' | 'area' | 'descricao' | 'codigo' | 'terminal', string>>;

export interface TelaExercicioProps {
  readonly exercicio: ExercicioDaIlha;
  /** Slot do Astro: o enunciado em HTML estático. */
  readonly enunciado?: ReactNode;
  /** Para os testes: um motor e um repositório falsos. Na página, os reais. */
  readonly motor?: Motor<TesteK8s>;
  readonly repositorio?: RepositorioDoExercicio;
}

const CLASSE_DA_LINHA: Record<LinhaSaida['tipo'], string> = { saida: '', sucesso: 'sucesso', erro: 'erro', aviso: 'aviso', comando: 'comando' };
const LIMITE_DE_LINHAS = 500;
const ESPACO_FIXO = ' ';

function useArquivos(exercicio: ExercicioDaIlha, repositorio: RepositorioDoExercicio) {
  const inicial = useMemo<Arquivos>(
    () => repositorio.lerRascunho(exercicio.id) ?? { [ARQUIVO_PRINCIPAL]: exercicio.inicial },
    [exercicio.id, exercicio.inicial, repositorio],
  );
  const arquivos = useRef<Record<string, string>>({ ...inicial });
  const principal = Object.keys(inicial)[0] ?? ARQUIVO_PRINCIPAL;
  const rascunhos = useMemo(() => criarGravadorRascunho((id: string, a: Arquivos) => { repositorio.gravarRascunho(id, a); }), [repositorio]);

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
      rascunhos.agendar(exercicio.id, arquivos.current);
    },
    restaurar() {
      rascunhos.cancelar(exercicio.id);
      repositorio.apagarRascunho(exercicio.id);
      arquivos.current = { [principal]: exercicio.inicial };
    },
  };
}

/** Terminal e aria-live: as duas saídas de texto da tela. */
function useSaidas() {
  const [linhas, setLinhas] = useState<readonly LinhaSaida[]>([
    { texto: '# kubectl configurado no cluster simulado (namespace default).', tipo: 'aviso' },
  ]);
  const [anuncio, setAnuncio] = useState('');
  const escrever = useCallback((novas: readonly LinhaSaida[]) => {
    setLinhas((atuais) => [...atuais, ...novas].slice(-LIMITE_DE_LINHAS));
  }, []);
  // Texto novo a cada anúncio: o leitor de tela repete mesmo quando a frase é igual.
  const anunciar = useCallback((texto: string) => {
    setAnuncio((anterior) => (anterior === texto ? `${texto}${ESPACO_FIXO}` : texto));
  }, []);
  return { linhas, anuncio, escrever, anunciar };
}

interface BarraProps {
  readonly titulo: string;
  readonly estado: EstadoExercicio;
  readonly aoAplicar: () => void;
  readonly aoEnviar: () => void;
  readonly aoRestaurar: () => void;
}

function BarraDoExercicio({ titulo, estado, aoAplicar, aoEnviar, aoRestaurar }: BarraProps) {
  const pronto = estado.tipo !== 'carregandoRuntime';
  const modo = estado.tipo === 'executando' || estado.tipo === 'corrigindo' ? estado.modo : null;
  return (
    <div className="barra-item">
      <div className="titulo-item"><h1>{titulo}</h1></div>
      <div className="acoes">
        <Botao variante="roxo" onClick={aoAplicar} disabled={!pronto} carregando={modo === 'apply'}
          title="kubectl apply: valida o YAML e roda os testes visíveis (Ctrl+Enter)" aria-keyshortcuts="Control+Enter">▶ Apply</Botao>
        <Botao variante="verde" onClick={aoEnviar} disabled={!pronto} carregando={modo === 'enviar'}
          title="Rodar todos os casos de teste, inclusive os ocultos (Ctrl+Shift+Enter)" aria-keyshortcuts="Control+Shift+Enter">⬆ Enviar</Botao>
        <Botao onClick={aoRestaurar} disabled={ocupado(estado)}><span aria-hidden="true">↺</span> Restaurar</Botao>
      </div>
    </div>
  );
}

function Terminal({ id, linhas }: { readonly id: string; readonly linhas: readonly LinhaSaida[] }) {
  return (
    <section className={`painel ${estilos.terminal}`} aria-label="Saída do Kubernetes">
      <div className="janela-terminal">
        <div className="barra-terminal">
          <span className="luzes" aria-hidden="true"><i /><i /><i /></span>
          <span className="titulo-terminal">aluno@sertao: ~/k8s/{id}</span>
        </div>
        <div className="terminal" role="region" aria-label="Terminal" tabIndex={0}>
          <pre className="saida-terminal" role="log">
            {linhas.map((l, i) => <span key={i} className={CLASSE_DA_LINHA[l.tipo]}>{l.texto}{'\n'}</span>)}
          </pre>
        </div>
      </div>
    </section>
  );
}

function Editor({ editor }: { readonly editor: RefObject<HTMLDivElement | null> }) {
  return (
    <section className={`painel ${estilos.codigo}`} aria-label="Código">
      <p id="ajuda-editor-ilha" className="sr">Control Enter aplica e roda os testes visíveis. Control Shift Enter envia. Tab sai do editor.</p>
      <div ref={editor} className="editor" aria-describedby="ajuda-editor-ilha" />
    </section>
  );
}

export function TelaExercicio({ exercicio, enunciado, motor: motorDado, repositorio = repositorioLocal }: TelaExercicioProps) {
  const motor = useMemo(() => motorDado ?? criarMotorK8s(), [motorDado]);
  const [aba, setAba] = useState('enunciado');
  const [confirmando, setConfirmando] = useState(false);
  const [versaoTexto, setVersaoTexto] = useState(0);
  const [gentil, setGentil] = useState(false);
  const arquivos = useArquivos(exercicio, repositorio);
  const { linhas, anuncio, escrever, anunciar } = useSaidas();

  useEffect(() => { setGentil(document.documentElement.classList.contains('a11y-sem-pressao')); }, []);

  const { estado, aplicar, enviar, editou, reiniciar } = useExercicio({
    id: exercicio.id,
    testes: exercicio.testes,
    ...(exercicio.existentes === undefined ? {} : { existentes: exercicio.existentes }),
    motor, repositorio, anunciar, escrever,
  });

  const rodarApply = () => { void aplicar(arquivos.arquivos.current).then(() => { setAba('testes'); }); };
  const rodarEnvio = () => { setAba('testes'); void enviar(arquivos.arquivos.current); };
  const editor = useEditor({
    texto: arquivos.arquivos.current[arquivos.principal] ?? exercicio.inicial,
    versao: versaoTexto,
    rotulo: `Editor de ${arquivos.principal}`,
    aoMudar: (texto) => { arquivos.mudar(texto); editou(); },
    aoExecutar: rodarApply,
    aoEnviar: rodarEnvio,
  });
  const resumo = resumoDoEstado(estado, exercicio.testes.length);

  return (
    <div className={estilos.tela}>
      <BarraDoExercicio titulo={exercicio.titulo} estado={estado} aoAplicar={rodarApply} aoEnviar={rodarEnvio} aoRestaurar={() => { setConfirmando(true); }} />
      <div className={estilos.area}>
        <section className={`painel ${estilos.descricao}`} aria-label="Descrição">
          <Abas selecionada={aba} aoSelecionar={setAba}>
            <Abas.Lista rotulo="Descrição">
              <Abas.Aba id="enunciado">Descrição</Abas.Aba>
              <Abas.Aba id="testes" rotulo={`Testes: ${resumo}`}>🧪 Testes <span className="resumo-testes">{/^[✅❌]\s*\d+\/\d+/.exec(resumo)?.[0] ?? ''}</span></Abas.Aba>
            </Abas.Lista>
            <Abas.Painel id="enunciado">{enunciado}</Abas.Painel>
            <Abas.Painel id="testes">
              <div className="saida testes"><PainelTestes estado={estado} testes={exercicio.testes} gentil={gentil} {...(exercicio.proximo ? { proximo: exercicio.proximo } : {})} /></div>
            </Abas.Painel>
          </Abas>
        </section>
        <Editor editor={editor} />
        <Terminal id={exercicio.id} linhas={linhas} />
      </div>
      <p className="sr" role="status" aria-live="polite">{anuncio}</p>
      <Confirmacao aberto={confirmando} titulo="Voltar ao código original?" mensagem="Suas alterações neste exercício serão perdidas." confirmar="Restaurar"
        aoFechar={() => { setConfirmando(false); }}
        aoConfirmar={() => { arquivos.restaurar(); setVersaoTexto((v) => v + 1); reiniciar(); anunciar('Código original restaurado.'); }} />
    </div>
  );
}

export default TelaExercicio;
