# Paridade com o DivergeTerraform

Comparação feature a feature entre o `terraform-playground` (DivergeTerraform, v1.11.0) e este
`kubernetes-playground` (DivergeKubernetes), feita em 2026-10-19 sobre o `develop` dos dois (com o
PR #8, didática, já mesclado aqui). Os arquivos comuns foram comparados um a um; os iguais (só muda o
nome do site) não aparecem na tabela. O que é próprio de cada ferramenta (o simulador de Terraform, os
workspaces, o `terraform console`; o diff, o drift e a aba Arquitetura do Kubernetes) está no fim.

Legenda: ✅ igual · 🆕 feito neste branch · ➖ não se aplica ao Kubernetes · ⏭️ pendência.

## Tabela

| Feature | DivergeTerraform | Antes, no DivergeKubernetes | Agora |
| --- | --- | --- | --- |
| **Cenários da trilha** (pixel art, mapa do módulo, vila) | `src/ui/cenarios/` completo: pixel, mapa, física, vila, palco + 4 cenários | Esboço: chips de nós e pods no canto do módulo (`index.js` de 57 linhas, `palco.js` vazio) | 🆕 Motor comum copiado sem mudança (pixel, mapa, física, vila, palco, comuns, cidade). 7 cenários: porto de contêineres, cidade-cluster, nuvens ao entardecer (AWS), céu de nuvens azuis (Azure), cidade à noite, arquipélago multicloud e o canteiro do Terraform na comparação. Mesmo CSS e os 6 arquivos de teste (`tests/cenarios*.test.js`) |
| Mapa cobre o módulo e a largura toda; estrada serpenteia pelos nós | Sim | Não | 🆕 Igual (testes `cenarios-trilha` e `cenarios-mapa`) |
| Vila calculada de (semente, exercícios feitos), sem gravar nada | Sim | Não | 🆕 Igual (`cenarios-vila`) |
| Personagens: 10 por tela, 4 no celular; parados com reduzir movimento e alto contraste | Sim | Não | 🆕 Igual |
| Palco só refaz quando a **largura** muda | Sim | Não | 🆕 Igual (`cenarios-redimensionar`) |
| **Glossário** (📚 Palavras técnicas no desafio) | `src/conteudo/glossario.js` + `tests/glossario.test.js` | Não tinha | ✅ Veio do PR #8 (90 termos, com termos já vistos). Este branch acrescenta `tests/glossario.test.js` no formato do Terraform. O Terraform também não tem página própria de glossário nem busca |
| **Editor**: abas de arquivos (+ novo, × excluir, pastas) | `EditorArquivos` | Um arquivo só | 🆕 `EditorArquivos` para YAML; o apply junta os manifestos com `---`. Rascunhos antigos (texto) abrem em `manifest.yaml` |
| Editor: realce, atalhos (Ctrl+Enter, Ctrl+Shift+Enter), Tab que sai, rótulo e ajuda para leitor de tela | Sim (realce HCL próprio, `linguagem-hcl.js`) | Sim (`@codemirror/lang-yaml`) | ✅ O realce de YAML vem do pacote oficial; não precisa de arquivo próprio |
| Compartilhar com o código no link | Leva os arquivos | **Quebrado**: levava um texto, que o leitor do link recusava (abria a landing) | 🆕 Corrigido: leva os arquivos (teste em `tests/editor-arquivos.test.js`) |
| **Terminal** interativo: prompt, histórico, Tab, Ctrl+C/L, Esc, ritmo da saída | Sim | Sim | ✅ (`src/ui/terminal.js` é o mesmo) |
| Terminal: `ls` e `cat` | Sim | Não | 🆕 Com Tab completando o nome do arquivo |
| Testes do terminal e dos comandos | `terminal`, `console`, `comandos`, `saida-comandos` | `terminal-interativo`, `item-terminal` | ✅ Os de comandos do kubectl ficam em `item-terminal`; 🆕 `ls`/`cat` em `editor-arquivos` |
| **Grafo de dependências** (aba 🕸️, SVG + lista em texto) | `src/ui/grafo.js` | A aba 🏛️ Arquitetura explica o simulador, mas não mostra as dependências do código | 🆕 `src/k8s/grafo.js` + `src/ui/grafo.js`: liga por nome e por rótulos, avisa selector que não acha ninguém. A Arquitetura continua |
| Aba 📘 Docs | Argumentos de cada tipo de recurso | Kinds com explicação e link | 🆕 Mostra também a `apiVersion` servida de cada kind |
| Aba 📤 Outputs, seletor de workspace, Limpar estado | Sim | — | ➖ Conceitos do Terraform (no Kubernetes, o mais perto é o namespace; o estado recomeça a cada apply) |
| Landing | Sim | Sim | ✅ 🆕 Textos citam vários arquivos, palavras técnicas e o grafo |
| Início (trilha, perfil, certificados) | Sim | Sim | ✅ |
| Tutorial (`tutorial-passos.js`) | 6,4 KB | 5,5 KB | 🆕 Abas de arquivos, `ls`/`cat`, 🕸️ Grafo, 📚 Palavras técnicas, 📘 Docs, divisória e a descrição dos perfis rápidos |
| Tutorial e aviso de privacidade ao abrir um exercício | Abrem por cima do editor (medido a 1280 px: o tutorial no centro e o aviso de 560 px cobrindo o editor) | Igual ao Terraform | 🆕 Melhoria aqui: o tutorial abre sozinho só na trilha, e o aviso fica dentro da coluna da descrição. ⏭️ Levar ao Terraform |
| Largura da coluna da descrição com o terminal aberto | 26% da tela, entre 280 e 420 px (`layout-calculo.js`) | Igual | 🆕 Mínimo de 320 px. ⏭️ Levar ao Terraform |
| `item.js` (39,5 KB × 30,7 KB) | Projetos encadeados, casos ocultos, testes detalhados | — | ✅ O PR #8 trouxe "🔧 Como corrigir", dicas em níveis e mensagens simples. ⏭️ Casos ocultos: nenhum exercício de Kubernetes tem `oculto: true` ainda (a tela já trata); é conteúdo, fica para o branch de didática |
| Páginas legais (termos) | Aceitação, O serviço, Uso permitido... | Começava no item 2 e não tinha o aviso do simulador nem das marcas | 🆕 Mesma estrutura (9 itens), com "Kubernetes é marca registrada da The Linux Foundation" |
| Privacidade, LGPD, licença, declaração de acessibilidade | Sim | Sim | ✅ |
| Preferências, acessibilidade (4 temas, perfis, régua, Libras) | Sim | Sim | ✅ (arquivos iguais) |
| Certificados, badges, validador, XML, Ed25519, restaurar | Sim | Sim | ✅ (o segredo continua só nos secrets do Actions) |
| Novidades (`#/novidades`) | Sim | Sim | ✅ 🆕 Release 0.4.0 |
| SEO (meta, JSON-LD, sitemap) | Sim | Sim | ✅ |
| README ("O que tem", "Como adicionar conteúdo", "Desenvolvimento", "Como publicar") | Sim | **Não existia** | 🆕 README no mesmo formato |
| Testes E2E (fluxo, axe nos 4 temas, larguras de 320 a 412 px) | Sim | Sim | ✅ (arquivos iguais; 70 passaram no Chromium e no celular) |
| Limites de cobertura | 72/65/65/74 | 70/60/60/70 | 🆕 74/66/76/77 (medido: 77/70/80/80) |
| Workflow `testes.yml` | Lint, testes, audit, E2E, Lighthouse | Igual + build e conferência dos dois ambientes | ✅ |
| Workflow `deploy.yml` | Principal + homologação, tag, PR de promoção | Igual; a promoção conta arquivos | ✅ |
| Workflow `feature-pr.yml` | Sobe a versão e abre o PR | Igual + aviso sem `FEATURE_PR_TOKEN` | 🆕 Corrigido o bug abaixo |
| Specs em `docs/superpowers/` | Cenários, vila, terminal, CI/CD | — | ➖ O desenho dos cenários é o mesmo do Terraform; não foi duplicado |

## Bug do `feature-pr.yml` (os dois sites)

No passo "Abre ou atualiza o PR para develop", o `gh pr list --head "$GITHUB_REPOSITORY_OWNER:$GITHUB_REF_NAME"`
nunca acha o PR: o `--head` do `gh pr list` aceita só o nome do branch. A partir do segundo push, o
workflow tenta `gh pr create` e falha com "a pull request for branch ... already exists". E, quando
achava o PR, trocava o título e a descrição escritos por pessoas por "Promove ... (vX)".

- **Aqui:** corrigido (`--head "$GITHUB_REF_NAME"`; título e descrição só mudam se o título atual
  começar com "Promove ").
- **DivergeTerraform:** ⏭️ tem o mesmo bug (conferido no `develop`, commit `c645fdc`). Não foi alterado
  neste trabalho.

## Próprio de cada site

- **Só no Terraform:** simulador de HCL (`src/tf/`), `init`/`plan`/`apply`/`destroy` com a pergunta do
  `yes`, `terraform console`, workspaces, aba Outputs, verificações com categoria (`src/verificacoes.js`),
  projetos em etapas encadeadas.
- **Só no Kubernetes:** 🔍 Diff e 🔎 Drift, aba 📦 Estado com o diff do último apply, aba 🏛️ Arquitetura,
  módulo extra de comparação com o Terraform.

## Pendências

1. ⏭️ Levar ao DivergeTerraform as duas melhorias de layout (tutorial só na trilha, aviso na coluna da
   descrição, descrição com 320 px) e a correção do `feature-pr.yml`.
2. ⏭️ Casos de teste ocultos nos exercícios de Kubernetes (conteúdo; branch de didática).
