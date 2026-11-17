// Aba 🧪 Testes: props → JSX, sem estado. Lê o Relatorio do corretor único e descreve as regras
// pelo registro. O switch é exaustivo: um estado novo sem tela não compila.
import type { CasoDeTeste, Diagnostico, RegistroRegras, RegraBase, RelatorioCaso, ResultadoRegra } from '../motor/tipos.ts';
import type { EstadoExercicio } from './maquina.ts';

export interface VizinhoDaTrilha {
  readonly href: string;
  readonly titulo: string;
}

interface PainelTestesProps {
  readonly estado: EstadoExercicio;
  readonly testes: readonly CasoDeTeste[];
  readonly regras: RegistroRegras<never>;
  readonly gentil: boolean;
  readonly proximo?: VizinhoDaTrilha;
}

const nomeDoCaso = (oculto: boolean | undefined, i: number): string => (oculto ? `🔒 Oculto ${String(i + 1)}` : `Caso ${String(i + 1)}`);

function descricoes(regras: RegistroRegras<never>, lista: readonly RegraBase[]): string[] {
  return lista.map((r) => {
    try { return regras.achar(r).descrever(r) ?? ''; } catch { return ''; }
  }).filter(Boolean);
}

function CasoPendente({ caso, indice, regras }: { readonly caso: CasoDeTeste; readonly indice: number; readonly regras: RegistroRegras<never> }) {
  const itens = descricoes(regras, caso.regras ?? []);
  return (
    <details className="caso pendente">
      <summary>⏳ {nomeDoCaso(caso.oculto, indice)}<span className="url">{caso.descricao ?? ''}</span></summary>
      <div className="corpo-caso">
        <p className="rotulo-caso">O que este caso confere</p>
        <ul className="verificacoes">
          {itens.map((texto, j) => <li key={j} className="verificacao pendente"><span className="marca" aria-hidden="true">⏳</span><div>{texto}</div></li>)}
        </ul>
      </div>
    </details>
  );
}

function ItemResultado({ r }: { readonly r: ResultadoRegra }) {
  return (
    <li className={`verificacao ${r.ok ? 'ok' : 'falha'}`}>
      <span className="marca" aria-hidden="true">{r.ok ? '✅' : '❌'}</span>
      <div>
        {r.mensagem}
        {r.detalhe ? <><br /><span className="detalhe">{r.detalhe}</span></> : null}
        {r.dica ? <span className="dica">🔧 Como corrigir: {r.dica}</span> : null}
        {!r.ok && r.tecnico ? <details className="detalhe-tecnico"><summary>Detalhe técnico</summary><code>{r.tecnico}</code></details> : null}
      </div>
    </li>
  );
}

/** O diagnóstico com o nome do campo destacado e a posição, quando houver. */
export function ErroDoMotor({ diagnostico }: { readonly diagnostico: Diagnostico }) {
  const partes = diagnostico.mensagem.split(/("[^"]+")/g);
  const onde = [diagnostico.arquivo, diagnostico.linha === undefined ? null : `linha ${String(diagnostico.linha)}`, diagnostico.coluna === undefined ? null : `coluna ${String(diagnostico.coluna)}`]
    .filter(Boolean).join(', ');
  return (
    <div className="erro-yaml" role="note">
      {onde ? <b>{onde}: </b> : null}
      {partes.map((parte, i) => (/^"[^"]+"$/.test(parte) ? <code key={i} className="campo-faltante">{parte.slice(1, -1)}</code> : parte))}
    </div>
  );
}

function CasoRodado({ relatorio, indice }: { readonly relatorio: RelatorioCaso; readonly indice: number }) {
  return (
    <details className={`caso ${relatorio.ok ? 'ok' : 'falha'}`} open={!relatorio.ok}>
      <summary>{relatorio.ok ? '✅' : '❌'} {nomeDoCaso(relatorio.oculto, indice)}<span className="url">{relatorio.descricao ?? ''}</span></summary>
      <div className="corpo-caso">
        {relatorio.erroExecucao ? <ErroDoMotor diagnostico={relatorio.erroExecucao} /> : null}
        {relatorio.resultados.length ? <ul className="verificacoes">{relatorio.resultados.map((r, j) => <ItemResultado key={j} r={r} />)}</ul> : null}
      </div>
    </details>
  );
}

function Veredito({ estado, gentil, proximo }: { readonly estado: Extract<EstadoExercicio, { tipo: 'resultado' }>; readonly gentil: boolean; readonly proximo: VizinhoDaTrilha | undefined }) {
  const { relatorio } = estado;
  const todos = estado.modo === 'enviar';
  const passaram = relatorio.casos.filter((c) => c.ok).length;
  const titulo = relatorio.aprovado
    ? (todos ? 'Aceito 🎉 Você acertou a questão!' : 'Casos visíveis passaram')
    : gentil ? 'Ainda não passou, e tudo bem: errar faz parte' : 'Resposta errada';
  const sub = relatorio.aprovado && !todos
    ? 'Agora clique em ⬆ Enviar para rodar todos os casos e marcar como resolvido.'
    : relatorio.aprovado ? 'Parabéns! Continue na trilha.'
      : `${String(passaram)} de ${String(relatorio.casos.length)} casos já funcionam. Abra o caso marcado abaixo para ver o próximo ajuste.`;
  return (
    <>
      <p className={`veredito ${relatorio.aprovado ? 'ok' : 'falha'}`}>{titulo}</p>
      <p className="veredito-sub">
        {sub}
        {relatorio.aprovado && todos && proximo ? <> <a className="btn btn-roxo btn-pequeno proximo-problema" href={proximo.href}>Próximo: {proximo.titulo} ›</a></> : null}
      </p>
    </>
  );
}

/** Liga cada caso do item ao relatório (o ▶ Executar roda só os visíveis). */
function cartoes(testes: readonly CasoDeTeste[], regras: RegistroRegras<never>, estado: EstadoExercicio) {
  const casos = estado.tipo === 'resultado' ? estado.relatorio.casos : [];
  const rodados = estado.tipo === 'resultado' && estado.modo === 'enviar' ? testes : testes.filter((t) => !t.oculto);
  return testes.map((caso, i) => {
    const r = casos[rodados.indexOf(caso)];
    return r ? <CasoRodado key={i} relatorio={r} indice={i} /> : <CasoPendente key={i} caso={caso} indice={i} regras={regras} />;
  });
}

const DESATUALIZADO = <p className="veredito-sub" role="status">Código alterado: execute de novo para conferir.</p>;

export function PainelTestes({ estado, testes, regras, gentil, proximo }: PainelTestesProps) {
  const errou = gentil ? 'Ainda não passou, e tudo bem: errar faz parte' : 'Resposta errada';
  switch (estado.tipo) {
    case 'carregandoRuntime':
      return <p className="veredito-sub">Preparando…</p>;
    case 'falhaCarga':
      return <p className="veredito falha">Não deu para carregar: {estado.erro}</p>;
    case 'ocioso':
      return <><p className="veredito-sub"><b>▶</b> roda os casos visíveis. <b>⬆ Enviar</b> roda todos e marca como resolvido.</p><div className="casos">{cartoes(testes, regras, estado)}</div></>;
    case 'executando':
    case 'corrigindo':
      return <p className="veredito-sub" aria-busy="true">{estado.modo === 'enviar' ? 'Rodando todos os casos de teste…' : 'Executando e conferindo os casos visíveis…'}</p>;
    case 'resultado':
      return <>{estado.desatualizado ? DESATUALIZADO : null}<Veredito estado={estado} gentil={gentil} proximo={proximo} /><div className="casos">{cartoes(testes, regras, estado)}</div></>;
    case 'erroCompilacao':
      return (
        <>
          {estado.desatualizado ? DESATUALIZADO : null}
          <p className="veredito falha">{errou}</p>
          <p className="veredito-sub">O código não compilou. Corrija o erro abaixo e rode de novo.</p>
          {estado.diagnosticos.length ? estado.diagnosticos.map((d, i) => <ErroDoMotor key={i} diagnostico={d} />) : <ErroDoMotor diagnostico={{ gravidade: 'erro', fase: 'compilacao', mensagem: estado.stderr }} />}
          <div className="casos">{cartoes(testes, regras, estado)}</div>
        </>
      );
    case 'tempoEsgotado':
      return <p className="veredito falha">Tempo esgotado: a execução foi interrompida.</p>;
    case 'erroInterno':
      return <><p className="veredito falha">Erro</p><p className="veredito-sub">{estado.mensagem}. Tente de novo.</p></>;
  }
}
