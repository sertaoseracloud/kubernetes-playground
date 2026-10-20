// Atalhos para escrever o conteúdo da trilha sem repetir a mesma estrutura em cada item.
// O resultado é o mesmo formato que a tela, a gamificação e os testes leem.
// O padrão didático (lição antes do conceito, passos numerados, esqueleto com # TODO,
// dicas progressivas, "como corrigir" nos testes) está em docs/didatica.md.

const XP_DO_EXERCICIO = { facil: 10, medio: 15, dificil: 20 };

/**
 * Uma lição (texto em HTML; use listas e analogias).
 * `codigo` (opcional): um exemplo de YAML comentado linha a linha. Ele aparece na lição e
 * abre no editor, para o aluno clicar em ▶ Apply e ver o que acontece no cluster.
 */
export const licao = (id, titulo, dificuldade, resumo, codigo) => ({
  id, tipo: 'licao', titulo, dificuldade, xp: 5, resumo,
  ...(codigo ? { inicial: yaml(codigo) } : {}),
});

/**
 * Um exercício: enunciado em HTML, solução de referência em YAML e casos de teste.
 * `dica`: um texto ou uma lista de dicas, da mais leve à mais forte (a tela mostra uma de cada vez).
 * `inicial`: o esqueleto que abre no editor, com comentários # TODO guiando cada campo.
 * `xp`: só para manter o XP de um exercício antigo (o padrão vem da dificuldade).
 */
export const exercicio = ({ id, titulo, dificuldade, xp, resumo, solucao, testes, dica, existentes, inicial }) => ({
  id, tipo: 'exercicio', titulo, dificuldade, xp: xp ?? XP_DO_EXERCICIO[dificuldade], resumo, solucao: yaml(solucao), testes,
  ...(dica ? { dica } : {}),
  ...(existentes ? { existentes: yaml(existentes) } : {}),
  ...(inicial ? { inicial: yaml(inicial) } : {}),
});

/**
 * Um caso de teste com uma ou mais regras. O primeiro argumento é a descrição ou
 * { descricao, dica, oculto }: a `dica` diz ao aluno o que corrigir quando o caso falha.
 */
export const teste = (cabecalho, ...regras) => (typeof cabecalho === 'string' ? { descricao: cabecalho, regras } : { ...cabecalho, regras });

/** O recurso existe no cluster simulado. */
export const existe = (kind, nome) => ({ tipo: 'recurso-existe', kind, nome });

/** Um campo do manifesto aplicado: { valor }, { contem }, { naoContem }, { ausente: true }, { minimo }, ou só existir. */
export const campo = (kind, nome, caminho, condicao = {}) => ({ tipo: 'campo', kind, nome, caminho, ...condicao });

/** Marca os itens de um grupo (o módulo mostra os grupos como tópicos). */
export const doGrupo = (grupo, itens) => itens.map((item) => ({ ...item, grupo }));

/**
 * Tira o recuo comum e a primeira linha em branco de um YAML escrito dentro do JavaScript,
 * para o conteúdo poder ser indentado junto com o código. Textos sem recuo ficam iguais.
 */
export function yaml(texto) {
  if (typeof texto !== 'string') return texto;
  const linhas = texto.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
  const recuos = linhas.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
  const recuo = recuos.length ? Math.min(...recuos) : 0;
  return `${linhas.map((l) => l.slice(recuo)).join('\n')}\n`;
}

/** Vários manifestos (cada um com o próprio recuo) num texto só, separados por ---. */
export const docs = (...partes) => partes.map(yaml).join('---\n');

/**
 * Casos ocultos: rodam só no ⬆ Enviar e conferem o resto do que os passos pedem, para o código
 * não ficar "decorado" nos casos visíveis. `mapa` é { idDoExercicio: { dica, regras: [...] } }
 * (ou uma lista desses objetos). A `dica` aparece só se o caso falhar.
 */
export function comOcultos(itens, mapa) {
  return itens.map((item) => {
    const extras = [mapa[item.id] ?? []].flat();
    if (item.tipo !== 'exercicio' || !extras.length) return item;
    const casos = extras.map(({ dica, regras }) => ({ descricao: 'Caso oculto', dica, oculto: true, regras }));
    return { ...item, testes: [...item.testes, ...casos] };
  });
}
