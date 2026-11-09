// Apresentação da aba 🧪 Testes: props → JSX, sem estado. Um componente por estado da máquina;
// o switch é exaustivo, então um estado novo sem tela não compila.
import type { EstadoExercicio } from './maquina.ts';
import type { Correcao, ResultadoCaso, Verificacao } from './motor.ts';
import type { TesteK8s } from './motor-k8s.ts';
import type { VizinhoDaTrilha } from './dados.ts';
import { descreverRegra } from '../k8s/simulador.js';

interface PainelTestesProps {
  readonly estado: EstadoExercicio;
  readonly testes: readonly TesteK8s[];
  readonly gentil: boolean;
  readonly proximo?: VizinhoDaTrilha;
}

const nomeDoCaso = (teste: TesteK8s, i: number): string => (teste.oculto ? `🔒 Oculto ${String(i + 1)}` : `Caso ${String(i + 1)}`);

function CasoPendente({ teste, indice }: { readonly teste: TesteK8s; readonly indice: number }) {
  return (
    <details className="caso pendente">
      <summary>⏳ {nomeDoCaso(teste, indice)}<span className="url">{teste.descricao ?? 'kubectl apply'}</span></summary>
      <div className="corpo-caso">
        <p className="rotulo-caso">O que este caso confere</p>
        <ul className="verificacoes">
          {teste.regras.map((regra, j) => (
            <li key={j} className="verificacao pendente"><span className="marca" aria-hidden="true">⏳</span><div>{descreverRegra(regra)}</div></li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function ItemVerificacao({ v }: { readonly v: Verificacao }) {
  return (
    <li className={`verificacao ${v.ok ? 'ok' : 'falha'}`}>
      <span className="marca" aria-hidden="true">{v.ok ? '✅' : '❌'}</span>
      <div>
        {v.mensagem}
        {v.detalhe ? <><br /><span className="detalhe">{v.detalhe}</span></> : null}
        {v.dica ? <span className="dica">🔧 Como corrigir: {v.dica}</span> : null}
        {!v.ok && v.tecnico ? <details className="detalhe-tecnico"><summary>Detalhe técnico</summary><code>{v.tecnico}</code></details> : null}
      </div>
    </li>
  );
}

function CasoRodado({ teste, indice, resultado }: { readonly teste: TesteK8s; readonly indice: number; readonly resultado: ResultadoCaso }) {
  return (
    <details className={`caso ${resultado.ok ? 'ok' : 'falha'}`} open={!resultado.ok}>
      <summary>{resultado.ok ? '✅' : '❌'} {nomeDoCaso(teste, indice)}<span className="url">{teste.descricao ?? 'kubectl apply'}</span></summary>
      <div className="corpo-caso">
        <ul className="verificacoes">{resultado.verificacoes.map((v, j) => <ItemVerificacao key={j} v={v} />)}</ul>
      </div>
    </details>
  );
}

/** Liga cada teste pedido ao seu resultado (o ▶ Apply roda só os visíveis). */
function cartoes(testes: readonly TesteK8s[], correcao: Correcao | null, todos: boolean) {
  const rodados = todos ? testes : testes.filter((t) => !t.oculto);
  return testes.map((teste, i) => {
    const posicao = correcao ? rodados.indexOf(teste) : -1;
    const resultado = posicao >= 0 ? correcao?.casos[posicao] : undefined;
    return resultado
      ? <CasoRodado key={i} teste={teste} indice={i} resultado={resultado} />
      : <CasoPendente key={i} teste={teste} indice={i} />;
  });
}

/** Erro do YAML com os nomes de campo destacados (o que antes era HTML montado em texto). */
export function ErroYaml({ mensagem }: { readonly mensagem: string }) {
  const partes = mensagem.split(/("[^"]+")/g);
  return (
    <div className="erro-yaml" role="note">
      {partes.map((parte, i) => (/^"[^"]+"$/.test(parte) ? <code key={i} className="campo-faltante">{parte.slice(1, -1)}</code> : parte))}
    </div>
  );
}

function Veredito({ correcao, todos, gentil, proximo }: { readonly correcao: Correcao; readonly todos: boolean; readonly gentil: boolean; readonly proximo: VizinhoDaTrilha | undefined }) {
  const passaram = correcao.casos.filter((c) => c.ok).length;
  const titulo = correcao.aprovado
    ? (todos ? 'Aceito 🎉 Você acertou a questão!' : 'Casos visíveis passaram')
    : gentil ? 'Ainda não passou, e tudo bem: errar faz parte' : 'Resposta errada';
  const sub = correcao.aprovado && !todos
    ? 'Agora clique em ⬆ Enviar para rodar todos os casos e marcar como resolvido.'
    : correcao.aprovado ? 'Parabéns! Continue na trilha.'
      : `${String(passaram)} de ${String(correcao.casos.length)} casos já funcionam. Abra o caso marcado abaixo para ver o próximo ajuste.`;
  return (
    <>
      <p className={`veredito ${correcao.aprovado ? 'ok' : 'falha'}`}>{titulo}</p>
      <p className="veredito-sub">
        {sub}
        {correcao.aprovado && todos && proximo ? <> <a className="btn btn-roxo btn-pequeno proximo-problema" href={proximo.href}>Próximo: {proximo.titulo} ›</a></> : null}
      </p>
    </>
  );
}

const AJUDA = <p className="veredito-sub"><b>▶ Apply</b> valida o YAML. <b>⬆ Enviar</b> roda todos os casos e marca como resolvido.</p>;
const DESATUALIZADO = <p className="veredito-sub" role="status">Código alterado: execute de novo para conferir.</p>;

export function PainelTestes({ estado, testes, gentil, proximo }: PainelTestesProps) {
  switch (estado.tipo) {
    case 'carregandoRuntime':
      return <p className="veredito-sub">Preparando o cluster simulado…</p>;
    case 'ocioso':
      return <>{AJUDA}<div className="casos">{cartoes(testes, null, false)}</div></>;
    case 'executando':
    case 'corrigindo':
      return <p className="veredito-sub" aria-busy="true">{estado.modo === 'enviar' ? 'Rodando todos os casos de teste…' : 'Aplicando o YAML e conferindo os casos visíveis…'}</p>;
    case 'resultado': {
      const todos = estado.modo === 'enviar';
      return (
        <>
          {estado.desatualizado ? DESATUALIZADO : null}
          <Veredito correcao={estado.correcao} todos={todos} gentil={gentil} proximo={proximo} />
          <div className="casos">{cartoes(testes, estado.correcao, todos)}</div>
        </>
      );
    }
    case 'erroCompilacao':
      return (
        <>
          {estado.desatualizado ? DESATUALIZADO : null}
          <p className="veredito falha">{gentil ? 'Ainda não passou, e tudo bem: errar faz parte' : 'Resposta errada'}</p>
          <p className="veredito-sub">O YAML não pôde ser aplicado. Corrija o erro abaixo e rode de novo.</p>
          <ErroYaml mensagem={estado.mensagem} />
          <div className="casos">{cartoes(testes, null, false)}</div>
        </>
      );
    case 'tempoEsgotado':
      return <p className="veredito falha">Tempo esgotado: o código passou de {String(Math.round(estado.limiteMs / 1000))} s.</p>;
    case 'erroInterno':
      return <><p className="veredito falha">Erro</p><p className="veredito-sub">{estado.mensagem}. Tente de novo.</p></>;
  }
}
