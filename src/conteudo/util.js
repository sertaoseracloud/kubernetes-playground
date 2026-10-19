// Atalhos para escrever o conteúdo da trilha sem repetir a mesma estrutura em cada item.
// Os módulos antigos usam objetos literais; os novos (avançados, AWS, Azure e projetos) usam
// estes atalhos. O resultado é o mesmo formato que a tela, a gamificação e os testes leem.

const XP_DO_EXERCICIO = { facil: 10, medio: 15, dificil: 20 };

/** Uma lição (texto em HTML; use listas e analogias). */
export const licao = (id, titulo, dificuldade, resumo) => ({ id, tipo: 'licao', titulo, dificuldade, xp: 5, resumo });

/** Um exercício: enunciado em HTML, solução de referência em YAML e casos de teste. */
export const exercicio = ({ id, titulo, dificuldade, resumo, solucao, testes, dica, existentes, inicial }) => ({
  id, tipo: 'exercicio', titulo, dificuldade, xp: XP_DO_EXERCICIO[dificuldade], resumo, solucao, testes,
  ...(dica ? { dica } : {}),
  ...(existentes ? { existentes } : {}),
  ...(inicial ? { inicial } : {}),
});

/** Um caso de teste com uma ou mais regras. */
export const teste = (descricao, ...regras) => ({ descricao, regras });

/** O recurso existe no cluster simulado. */
export const existe = (kind, nome) => ({ tipo: 'recurso-existe', kind, nome });

/** Um campo do manifesto aplicado: { valor }, { contem }, { naoContem }, { ausente: true }, { minimo }, ou só existir. */
export const campo = (kind, nome, caminho, condicao = {}) => ({ tipo: 'campo', kind, nome, caminho, ...condicao });

/** Marca os itens de um grupo (o módulo mostra os grupos como tópicos). */
export const doGrupo = (grupo, itens) => itens.map((item) => ({ ...item, grupo }));
