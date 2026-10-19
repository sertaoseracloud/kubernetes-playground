# Padrão didático da trilha

Guia para quem escreve ou revisa lições e exercícios do DivergeKubernetes. O público é
**quem nunca usou Kubernetes**: se uma palavra, um campo do YAML ou um passo não foi
explicado antes, o aluno trava. Os atalhos para escrever o conteúdo estão em
`src/conteudo/util.js`, e o glossário em `src/conteudo/glossario.js`.

## As 10 regras

1. **Uma ideia nova por exercício.** Se o exercício precisa de Namespace *e* de ConfigMap,
   pelo menos um deles já foi praticado antes. O resto do YAML é repetição do que o aluno já sabe.
2. **Lição antes de todo conceito novo.** Nenhum exercício usa um `kind` ou um campo que
   nenhuma lição anterior apresentou. Se faltar, crie a lição antes (não remova exercícios).
3. **A lição tem analogia e exemplo comentado.** Uma comparação do dia a dia ("o Service é o
   telefone fixo da empresa") e um YAML comentado linha a linha no campo `codigo`. O exemplo
   aparece na lição e abre no editor, para o aluno clicar em ▶ Apply e ver o resultado.
4. **O enunciado é uma lista de passos numerados** (`<ol>`), cada passo com um único pedido
   e o valor exato (nome, imagem, porta). Contexto e "por quê" ficam num parágrafo curto
   antes da lista, nunca misturados com a tarefa.
5. **Esqueleto `inicial` com `# TODO`.** O editor nunca abre vazio: abre com a estrutura que
   o aluno já conhece e comentários `# TODO` onde entra a parte nova. O esqueleto não pode
   passar nos testes (há um teste que confere isso).
6. **Dicas progressivas.** `dica` é uma lista: a primeira só aponta o caminho, a do meio
   mostra o campo, a última quase dá a resposta. A tela mostra uma de cada vez.
7. **Glossário no primeiro uso.** Todo termo técnico do texto precisa estar em
   `glossario.js`, com definição simples, analogia e, se ajudar, um exemplo. A tela mostra
   os termos que aparecem no item. Termo novo? Acrescente ao glossário no mesmo PR.
8. **O teste diz o que corrigir.** Cada caso de teste tem `dica`: uma frase no imperativo que
   diz onde mexer ("Coloque `namespace: dev-env` dentro de `metadata` do Pod"). Ela aparece
   como "🔧 Como corrigir" quando o caso falha e é lida pelo leitor de tela. Não revele
   detalhes de como a validação funciona.
9. **Do fácil para o difícil.** Dentro de cada tópico: lição → exercício fácil (um campo) →
   médio (dois recursos que se ligam) → difícil (juntar o que já foi visto).
10. **Explique o que acontece no cluster.** Termine o enunciado com "No cluster" ou "Por que
    isso importa": o que o Kubernetes faz com aquele YAML (o kubelet reinicia, o Service
    passa a mandar tráfego, o Pod sai dos endpoints...).

## Modelo de lição

```js
licao('basico-namespaces', 'Namespaces: as pastas do cluster', 'facil', `
  <p>Analogia em uma frase. O que é, para que serve.</p>
  <ul><li>Um ponto por linha.</li></ul>
  <p><b>No cluster:</b> o que muda quando você aplica.</p>`,
  `# Comentário explicando a linha de baixo.
  apiVersion: v1
  kind: Namespace
  metadata:
    name: dev-env   # o nome da "pasta"
  `),
```

## Modelo de exercício

```js
exercicio({
  id: 'basico-namespace',          // NUNCA mude o id: o progresso e os certificados dependem dele
  titulo: 'Criando um Namespace',
  dificuldade: 'facil',
  resumo: `
    <p>Uma ou duas frases de contexto: por que fazer isso.</p>
    <ol>
      <li>Crie um <code>Namespace</code> chamado <code>dev-env</code>.</li>
      <li>Separe com <code>---</code> e crie um <code>Pod</code> chamado <code>nginx-dev</code>.</li>
      <li>Coloque o Pod no namespace com <code>metadata.namespace: dev-env</code>.</li>
    </ol>
    <p><b>No cluster:</b> o que acontece depois do apply.</p>`,
  inicial: `
    # 1. O Namespace
    apiVersion: v1
    kind: Namespace
    metadata:
      name:            # TODO: dev-env
    `,
  dica: [
    'Leve: onde procurar.',
    'Média: qual campo usar.',
    'Forte: o trecho de YAML quase pronto.',
  ],
  solucao: `...`,
  testes: [
    teste({ descricao: 'O Namespace dev-env existe', dica: 'Crie um documento com kind: Namespace e metadata.name: dev-env.' },
      existe('Namespace', 'dev-env')),
  ],
}),
```

## Checklist antes do PR

- [ ] Os `id` dos exercícios existentes continuam os mesmos e nenhum exercício foi removido.
- [ ] Todo conceito novo tem lição antes; a lição tem analogia e `codigo` comentado.
- [ ] O enunciado tem `<ol>` com os passos e um parágrafo "No cluster".
- [ ] `inicial` com `# TODO`, `dica` com 2 ou 3 níveis e `dica` em cada caso de teste.
- [ ] Os termos novos estão em `glossario.js`.
- [ ] `npm run lint` e `npx vitest run --coverage` passam (os testes aplicam cada `solucao`
      no simulador e conferem os casos; também conferem que o `inicial` não passa).
- [ ] Se o número de lições mudou, atualize a carga horária em `src/certificados.js` e rode
      `npm run badges`.
