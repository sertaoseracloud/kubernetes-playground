# ☸️ DivergeKubernetes

Trilha de exercícios no estilo LeetCode para aprender **Kubernetes → Recursos avançados → AWS (EKS) →
Azure (AKS) → Projetos** em aula. O Kubernetes roda **simulado dentro do navegador**: você escreve
manifestos YAML, roda `kubectl apply`, `get`, `describe`, `diff` e `delete` e vê o cluster responder,
**sem cluster de verdade, sem credenciais e sem custo**. O site é estático e fica no GitHub Pages.

**Acesse:** https://sertaoseracloud.github.io/kubernetes-playground/

**Acessível para todas as pessoas.** O nome vem de *neurodivergente*: a plataforma foi feita para pessoas cegas (o leitor de tela fala o resultado de cada teste), surdas e mudas (nada depende de som ou de voz, com tradução para Libras pelo VLibras) e neurodivergentes (perfis para TDAH, dislexia, autismo e ansiedade). A meta é a WCAG 2.2 nível AA, conferida com o axe-core a cada versão. Detalhes na página **Acessibilidade** do site (`#/acessibilidade`).

É o irmão do [DivergeTerraform](https://github.com/sertaoseracloud/terraform-playground): os dois sites
têm as mesmas features comuns (trilha, cenários, certificados, acessibilidade, terminal, grafo). A
comparação feature a feature fica em [`docs/paridade-terraform.md`](docs/paridade-terraform.md).

## O que tem

- **Landing page** (`#/`): apresenta o projeto, a trilha, os certificados e os recursos de
  acessibilidade. Os números (exercícios, módulos, projetos) vêm do próprio conteúdo. A trilha fica
  em `#/trilha`, e quem já começou vê "▶ Continuar" no topo.
- **Mais de 250 exercícios** com dificuldade Fácil/Médio/Difícil, mais **lições** de conceito no começo de cada assunto:
  1. **Fundamentos**: arquitetura, Pods, labels e selectors, ConfigMaps, probes, volumes, Services
     (ClusterIP, NodePort, LoadBalancer, headless), Ingress, Deployments, rolling update, HPA, PDB e DaemonSet.
  2. **Recursos avançados**: RBAC e ServiceAccounts, HPA v2, probes e cotas, StatefulSet, StorageClass,
     Jobs e CronJobs, NetworkPolicy, Ingress com TLS, Secrets, GitOps (Argo CD e Flux), Helm, Kustomize e CRDs.
  3. **AWS (EKS)**: IRSA, aws-auth, VPC CNI, ALB Ingress, EBS e EFS.
  4. **Azure (AKS)**: Entra ID, identidade gerenciada, Azure CNI, AGIC, Azure Disk e Azure Files.
  5. **Projetos**: microsserviços (Deployments, Services, ConfigMaps, Secrets, Ingress, HPA, Kustomize) e
     deploy multicloud (manifestos genéricos, overlays para AWS e Azure, pipeline multi-cluster).
  6. **Módulo extra: Terraform vs. Kubernetes**, lições comparando os dois (sem certificado próprio).
- **Como no LeetCode**: **▶ Apply** roda os casos visíveis; **⬆ Enviar** roda todos e marca como resolvido.
- **Editor com abas de arquivos** (CodeMirror, YAML): o **+** cria `service.yaml` ou `base/deployment.yaml`,
  e o apply usa todos os manifestos juntos, como `kubectl apply -f .` numa pasta. O código fica salvo no navegador.
- **Terminal interativo** (`src/k8s/comandos.js`): o prompt (`aluno@sertao:~/k8s/<exercício>$`) aceita
  `kubectl apply|diff|delete -f`, `get` (pods, svc, deploy, cm, secrets, nodes, all e os apelidos de verdade),
  `describe`, `delete <tipo> <nome>`, `explain`, `version`, `cluster-info`, `drift`, `ls`, `cat`, `clear` e
  `help`. Teclas: ↑/↓ histórico, Tab completa (inclusive o nome do arquivo no `cat`), Ctrl+C cancela, Ctrl+L
  limpa, Esc sai do terminal. Os botões ▶ Apply, 🔍 Diff e 🔎 Drift digitam o comando.
- **Abas de saída**: 🖥️ Terminal, 🕸️ **Grafo** (quem usa quem no YAML: pelo nome, como `configMapRef` e
  `scaleTargetRef`, e pelos rótulos do selector; SVG com a lista em texto e avisos de selector que não acha
  ninguém), 📦 **Estado** do cluster (com o diff do último apply e o relatório de drift) e 🏛️ **Arquitetura**
  (como o simulador funciona).
- **Aba 📘 Docs**: os kinds usados no exercício, com a `apiVersion` servida, uma explicação curta e o link da
  documentação oficial.
- **Playground livre** (`#/livre`) com vários arquivos.
- **Instruções com estrutura previsível**: todo desafio mostra um roteiro curto, 🎯 **O que fazer**,
  📚 **Palavras técnicas** (até 6 termos com explicação simples, **analogia do dia a dia** e exemplo;
  glossário em `src/conteudo/glossario.js`), ✅ **Como saber que deu certo** e 💡 Dica.
- **👨‍🏫 Quem é o instrutor?** (`#/instrutor`) e **☕ Apoie o projeto** (`#/apoie`, PIX por QR Code ou copia e
  cola, montado no navegador por `src/apoio.js`).
- **♿ Acessibilidade**: temas Dracula, Alto contraste, Claro e Suave; tamanho do texto (87,5% a 175%,
  editor incluído); fonte Atkinson Hyperlegible; mais espaçamento; links sublinhados e foco reforçado;
  reduzir animações; **🔊 Ouvir** o enunciado; atalhos de teclado; "Pular para o conteúdo";
  rótulos e regiões `aria-live` para leitores de tela.
- **🧠 Neurodiversidade** (recomendações do W3C para acessibilidade cognitiva, COGA): perfis rápidos
  (🎯 Foco, 📖 Leitura facilitada, 🌿 Calmo, 🤝 Sem pressão), modo foco, lista de tarefas com caixas de
  marcar, régua de leitura, linhas curtas e lembrete de pausa.
- **❓ Tutorial** passo a passo, **progresso** por módulo, **🆕 Novidades** (`#/novidades`) e **compartilhar**
  com os arquivos no link.

### Trilha gamificada e certificados

- A trilha (`#/trilha`) é um **caminho** em zigue-zague. Lição vale 5 XP, fácil 10, médio 20 e difícil 40.
  O aluno sobe de **nível** (Iniciante → Mestre do Kubernetes) e ganha uma **sequência de dias** 🔥.
- O próximo módulo **desbloqueia quando o atual chega a 70%**.
- **🗺️ Cenários da trilha**: cada módulo tem um mapa em tiles de pixel art (como nos RPGs clássicos) que ocupa a
  largura toda e rola junto com a página, com uma estrada que faz curvas pelos exercícios e uma vila que cresce a
  cada exercício resolvido (casas, filhos e filhotes, calculados do progresso, sem nada a mais no navegador). Os
  temas: porto de contêineres (Fundamentos), cidade-cluster (Avançados), nuvens ao entardecer (AWS), céu de nuvens
  azuis (Azure), cidade à noite (Microsserviços), arquipélago multicloud e o canteiro de obras do Terraform na
  comparação. Os personagens andam de tile em tile sem pisar na água nem no caminho (10 por tela de altura, 4 no
  celular) e o mapa só é refeito quando a largura muda (`src/ui/cenarios/`, o mesmo motor dos sites irmãos). É só
  decoração: o leitor de tela não lê, e os personagens param com "reduzir movimento" e no alto contraste.
- Ao concluir 100% de um módulo, o 🏆 libera o **certificado do módulo**; com todos, o 🎓 libera o
  **certificado final**. Os certificados são emitidos pela **Sertão será cloud** e assinados por
  **Cláudio Raposo**, com **badge digital no estilo Credly** e botões para **publicar no LinkedIn** e
  **adicionar ao perfil**.
- **Carga horária**: cada atividade tem um tempo estimado (lição 10 min, fácil 15, médio 30, difícil 45),
  mostrado no exercício. O certificado de cada módulo vale a soma, arredondada para cima em horas e com o
  mínimo de 1 hora; o final soma os módulos. As horas ficam fixas em `src/certificados.js` e
  `tests/carga-horaria.test.js` avisa quando o conteúdo mudar. A regra fica em `src/cargaHoraria.js`.
- **Selo de verificação** (HMAC-SHA256) e **cadeia de certificados** (Fundamentos → Avançados → AWS → Azure →
  Projetos → Final): cada certificado inclui no selo o hash do anterior, então mudar uma data ou um nome em
  qualquer ponto quebra os seguintes.
- **🔎 Validador** (`#/validar`): link ou código, impresso/PDF e arquivo XML, com o badge, os dados e a cadeia.
- **↩️ Restaurar o progresso pelo certificado**: ao validar um certificado válido, quem tem neste navegador o
  **mesmo nome** do certificado restaura o módulo e os anteriores da cadeia (`src/restaurar.js`).
- **📄 XML do certificado** e **✍️ assinatura Ed25519** com a chave pública em `chave-publica-ed25519.txt`.
- **A palavra secreta nunca entra no código nem no site.** Ela fica nos secrets do GitHub Actions; o build
  injeta só um valor derivado dela (`vite.config.js`) e falha se o secret não existir.
- **Limite:** sem servidor, a chave derivada vai no JavaScript do site. O selo pega alterações no link, mas
  quem estudar o código publicado consegue gerar selos.

Cada badge tem uma página estática em `public/badge/<módulo>/` com as meta tags `og:` para a prévia do
LinkedIn. Esses arquivos, a capa `og-capa.png` e os ícones saem de `src/badges.js` e `src/certificados.js`;
depois de mudar um deles, rode `npm run badges` e faça commit de `public/`.

### Privacidade, cookies e LGPD

A página **🔒 Privacidade** (`#/privacidade`) explica como os dados são tratados:

- **Sem cookies e sem rastreamento**: não há analytics, anúncios nem servidor próprio.
- **Dados só no navegador** (`localStorage`, prefixo `kubernetes-playground:`): progresso, datas, dias de
  estudo, nome do certificado, código, estado simulado de cada exercício e preferências. A tabela completa
  fica em [`src/privacidade.js`](src/privacidade.js), e um teste falha se o código passar a gravar uma chave
  que não está documentada.
- **Nada vai para um cluster de verdade**: o simulador não faz chamadas de rede e não pede credenciais.
- **LGPD**: finalidade, base legal do nome (consentimento), direitos do art. 18 com **📥 Baixar meus dados**
  e **🗑️ Apagar meus dados**, e cuidado com menores (art. 14).

## O simulador

```
Editor (CodeMirror, YAML, várias abas) ──manifestos──▶ js-yaml ──▶ validação (apiVersion, campos, sugestões)
                                                                      │
   terminal / grafo / estado / drift ◀── diff → apply (estado do cluster no navegador) ──▶ regras dos testes
```

- [`src/k8s/simulador.js`](src/k8s/simulador.js): valida cada recurso (versões de API servidas pelo Kubernetes
  1.31+, campos obrigatórios, sugestão do nome certo quando há erro de digitação), cria Pods, Services,
  Deployments, ConfigMaps, Secrets, Ingress, HPA, NetworkPolicy, PVC, Jobs, CronJobs e os demais kinds, calcula
  diff e drift e confere as regras dos testes.
- [`src/k8s/comandos.js`](src/k8s/comandos.js): o kubectl de mentira do terminal.
- [`src/k8s/grafo.js`](src/k8s/grafo.js): quem usa quem nos manifestos (aba 🕸️ Grafo).

**Importante:** é um simulador para aprender. Ele não substitui um cluster de verdade nem cobre todos os
campos de todos os recursos. Antes de aplicar em produção, teste num ambiente controlado.

## Como adicionar conteúdo

Cada módulo fica num arquivo em [`src/conteudo/`](src/conteudo/) (`fundamentos.js`, `avancados.js`, `aws.js`,
`azure.js`, `projeto-*.js` e `comparacao.js`, com os tópicos em arquivos próprios), com uma lista `itens` de
lições e exercícios, na ordem em que aparecem. Os atalhos de [`src/conteudo/util.js`](src/conteudo/util.js)
montam cada item:

```js
licao('id', 'Título', 'facil', '<p>Texto em HTML, com analogias.</p>');
exercicio({ id, titulo, dificuldade, resumo, solucao, dica, testes: [
  teste('Ao aplicar', existe('Deployment', 'web'), campo('Deployment', 'web', 'spec.replicas', { valor: 3 })),
] });
```

| Regra | Confere |
| --- | --- |
| `existe(kind, nome)` | o recurso foi criado no cluster simulado |
| `campo(kind, nome, caminho, { valor \| contem \| naoContem \| ausente \| minimo })` | um campo do manifesto aplicado |

Os ids dos exercícios não mudam depois de publicados (o progresso e os certificados dependem deles). Os
testes do projeto rodam **toda a trilha** no simulador: cada solução passa em todos os casos e o código
inicial ainda não passa. Termos novos do glossário entram em `src/conteudo/glossario.js`, e o cenário de um
módulo novo, em `src/conteudo/cenarios.js`.

## Desenvolvimento

```bash
npm ci
npm run dev      # servidor local com recarga
npm run lint     # ESLint
npm test         # testes (simulador, regras, telas e toda a trilha)
npm run test:cobertura  # os mesmos testes, com o limite de cobertura
npm run comuns   # confere os arquivos comuns aos quatro playgrounds (comuns.json)
npm run build    # gera dist/ (precisa de CERTIFICADO_SEGREDO)
npm run test:e2e        # Playwright contra o dist (fluxo, axe nos 4 temas, larguras de celular)
npm run lighthouse      # Lighthouse CI contra o dist
npm run badges   # regenera badges, capa e ícones em public/
```

Para testar um build local sem o segredo de verdade:

```bash
CERTIFICADO_SEGREDO=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") npm run build
```

Alguns arquivos são iguais nos quatro playgrounds (php, terraform, python e kubernetes) e estão
listados em [`comuns.json`](comuns.json) com o hash de cada um. Para mudar um deles, altere aqui e
leve a mesma mudança aos outros com `npm run comuns:copiar -- ../php-playground ../terraform-playground ../python-playground`.
Detalhes em [docs/debito-tecnico.md](docs/debito-tecnico.md#arquivos-comuns).

## Como publicar

O repositório segue o **gitflow**. Pense no `develop` como o ensaio geral e no `main` como a estreia:

- **`feature/*`**: cada mudança nasce de `develop` e volta para ele por PR. Em cada push,
  [`feature-pr.yml`](.github/workflows/feature-pr.yml) sobe a versão patch uma vez por versão-base (se a
  feature já estiver acima, mantém) e abre ou atualiza o PR automaticamente, sem trocar um título escrito
  por pessoas.
- **`develop`**: tudo o que já foi aceito. Cada push publica a **homologação** em
  <https://sertaoseracloud.github.io/kubernetes-playground/homologacao/>, com uma faixa de aviso,
  progresso guardado à parte (prefixo `kubernetes-playground-homologacao:`), outro segredo de
  certificado, `noindex` e sem `sitemap.xml`. Depois do smoke test, abre o PR de promoção para `main`.
- **`main`**: cada push publica o site principal e cria a tag `v<versão>` e a release do GitHub com o texto de `src/novidades.js`, se ainda não existirem.
- **`hotfix/*`**: correção urgente que sai do `main` e entra nele do mesmo jeito.

`main` e `develop` só recebem PR, com os checks verdes. Os workflows:

- [`testes.yml`](.github/workflows/testes.yml): em todo PR. Lint, testes com limite de cobertura,
  `npm audit`, build e conferência dos dois ambientes, E2E e Lighthouse.
- [`deploy.yml`](.github/workflows/deploy.yml): em cada push no `main` ou no `develop`. Monta o principal
  na raiz e a homologação em `/homologacao/`, confere os dois com `scripts/conferir-build.mjs`, publica e
  testa os dois endereços no ar.
- [`auditoria-semanal.yml`](.github/workflows/auditoria-semanal.yml): Lighthouse no site no ar todo domingo.

Secrets do GitHub Actions (Settings > Secrets > Actions), gerados aleatoriamente e que ninguém conhece:
`CERTIFICADO_SEGREDO` (site principal) e `CERTIFICADO_SEGREDO_HOMOLOGACAO` (homologação). Opcional:
`FEATURE_PR_TOKEN`, com escrita em Contents e Pull requests, para o PR criado pelo workflow já disparar os checks.

## Licença

O DivergeKubernetes é **software livre com copyleft**:

- **Código**: [GNU AGPL-3.0-or-later](LICENSE).
- **Conteúdo didático** (lições, exercícios, projetos, glossário): [CC BY-SA 4.0](LICENSE-CONTEUDO.md).
  Crédito sugerido: "DivergeKubernetes, Sertão será cloud (CC BY-SA 4.0)".
- **Fora da licença**: o nome, a marca e o logotipo da Sertão será cloud e a emissão de certificados
  em nome dela.

**Marcas**: Kubernetes é marca registrada da The Linux Foundation; AWS é marca da Amazon; Azure é marca da
Microsoft. Este projeto é independente, não usa código do Kubernetes e não é afiliado nem endossado por elas.

Copyright (C) 2026 Sertão será cloud.
