# Cenários da trilha: PixiJS ou canvas 2D? E a vida dos personagens

Data: 2026-10-20 · Repo de referência: kubernetes-playground (DivergeKubernetes) · Branch: `feature/cenarios-pixijs`

Status: **análise concluída, aguardando aprovação** antes da migração e da Parte 2.

## Glossário (termos técnicos, com analogias)

- **Canvas 2D**: uma folha de papel em que o JavaScript pinta pixel por pixel. É o que usamos hoje.
  - Analogia: pintar o mural da praça à mão, quadradinho por quadradinho.
- **WebGL / WebGPU**: o JavaScript manda a placa de vídeo (GPU) desenhar. É rápido para muitas figuras iguais.
  - Analogia: em vez de pintar à mão, usar carimbos numa prensa.
- **PixiJS**: biblioteca que usa WebGL (ou WebGPU, ou canvas) para desenhar sprites.
  - Analogia: a prensa já montada, com os carimbos organizados.
- **Atlas / spritesheet**: uma folha pequena com todos os desenhos (tiles e quadros dos personagens) lado a lado.
  - Analogia: a cartela de adesivos; você recorta o que precisa em vez de redesenhar.
- **Culling**: não desenhar nem animar o que está fora da tela.
  - Analogia: o contrarregra só arruma o pedaço do palco que a plateia vê.
- **Ticker / laço de animação**: a função chamada a cada quadro da tela (`requestAnimationFrame`).
  - Analogia: o metrônomo da banda.
- **Orçamento de quadros**: limite de quantas vezes por segundo a animação pode redesenhar.
  - Analogia: a mesada; gasta-se até o limite, nunca mais.
- **DPR (devicePixelRatio)**: quantos pixels físicos cabem num pixel CSS (2 a 3 nos celulares).
  - Analogia: a mesma foto impressa em papel comum ou em papel de alta resolução.
- **Compositor**: a parte do navegador que move camadas prontas (rolagem, `transform`) sem rodar JavaScript.
  - Analogia: o garçom que só leva o prato pronto; não cozinha de novo.
- **Contexto WebGL**: a "conexão" da página com a GPU. O navegador só permite uns 16 ao mesmo tempo.
  - Analogia: cadeiras numa sala de espera; se ninguém levanta, os próximos ficam de pé.
- **CLS (Cumulative Layout Shift)**: o quanto o conteúdo "pula" de lugar enquanto a página carrega.
  - Analogia: alguém mexendo a cadeira quando você vai sentar.
- **TBT / LCP**: tempo em que a página fica travada / tempo até o maior elemento aparecer.

## 1. Como funciona hoje (confirmado no código)

- `src/ui/cenarios/` é igual nos 4 repos (pixel, mapa, física, casas, comuns, vila, cidade, palco e index). Cada site tem o seu mapa em `src/conteudo/cenarios.js` e os seus cenários temáticos.
- Um `<canvas>` por módulo, do tamanho do módulo inteiro (largura da área da trilha × altura do módulo, até 32 mil px). Cada tile 32×32 é pintado com `fillRect`, e cada sprite 16×16 vira 256 `fillRect`.
- Cada personagem é um `<span>` com o seu próprio `<canvas>` 32×32, repintado a cada passo. O deslize entre tiles é uma `transition` de CSS.
- Um `setInterval` de 400 ms move todos os personagens dos módulos visíveis. O módulo inteiro conta como visível, então todos os personagens dele andam, mesmo os que estão a 10 telas de distância.
- O mapa só é refeito quando a largura muda (a barra de endereço do Android muda só a altura).
- **Achados durante a análise:**
  1. Quem rola a trilha é o `main.tela-inicio` (`overflow-y: auto`), não a janela.
  2. `.cenario` também é o nome do quadro de casos de teste (`estilo.css`, com fundo e borda). A camada do cenário herda esse fundo; no 2D ele fica escondido sob o mapa, mas cobriria qualquer desenho por trás (foi o que escondeu o canvas do Pixi no início do spike).
  3. Os cenários não eram desligados ao sair da trilha: o temporizador continuava rodando com a trilha escondida. O spike já desliga ao trocar de rota (`desligarCenariosDaTrilha()` em `navegar()`).
  4. Sem botão para pausar a animação (WCAG 2.2.2, "Pausar, parar, ocultar"), apontado pela sessão de usabilidade e acessibilidade.

## 2. Como medimos

- Build de produção (segredo descartável fora do repo), servido localmente, com o Chromium do Playwright.
- **GPU real** (`--use-angle=d3d11`, Intel UHD 620). O headless padrão usa SwiftShader (WebGL na CPU) e deixa o Pixi 10× pior do que é de verdade. Esse erro apareceu na primeira rodada e foi corrigido.
- Perfis:
  - **desktop**: 1280×800, DPR 1;
  - **celular**: 412×915, DPR 2,625, toque, CPU 4× mais lenta (`Emulation.setCPUThrottlingRate`).
- Três rodadas intercaladas (atual, 2D otimizado e Pixi). A tabela traz a mediana. A máquina estava disputada por outras sessões, por isso os números absolutos são piores que os da spec anterior (84 ms para refazer um mapa); as **proporções** são o que vale.
- Contadores:
  - `cenarios:planejar` e `cenarios:montar` (User Timing);
  - custo do cenário por segundo, em ms de thread principal, somado dentro do código de cada palco (parado por 5 s e rolando por 3 s);
  - megapixels de canvas (memória de imagem ≈ MP × 4 bytes);
  - FPS e p95 do quadro numa rolagem de 3 s;
  - redimensionar só a largura e só a altura.
- Scripts em `C:\Users\HP\AppData\Local\Temp\px-medir` (`medir.mjs`, `contexto.mjs`, `resumo.mjs`); não vão para o repo.

## 3. As três opções medidas

1. **Atual**: o código do develop.
2. **2D otimizado** (spike `palco-leve.js`):
   - atlas desenhado uma vez por cenário (`atlas.js`);
   - mapa em pedaços de 16 linhas (512 px) que rolam com a página, desenhados com `drawImage` só quando chegam a 1,5 tela de distância e liberados quando se afastam;
   - personagens sem canvas próprio (o atlas como imagem de fundo e o deslize no compositor);
   - um passo a cada 0,4 s alinhado a `requestAnimationFrame`, só para quem está perto da tela.
3. **PixiJS 8.22.0** (spike `palco-pixi.js`, carregado com `import()` só na trilha):
   - um único canvas WebGL do tamanho da caixa de rolagem, fixo atrás da trilha (um canvas por módulo esbarra no limite de contextos e no tamanho máximo de textura);
   - mapa em pedaços de 16×16 tiles criados sob demanda, a partir do mesmo atlas;
   - `scaleMode: 'nearest'`, `roundPixels`, `resolution = min(DPR, 2)`;
   - Ticker com orçamento de 30 quadros/s para a animação e redesenho a cada quadro durante a rolagem;
   - `preference: ['webgl', 'canvas']`, voltando ao 2D se o Pixi falhar;
   - `destroy` + `WEBGL_lose_context` ao sair;
   - `accessibilityOptions.activateOnTab: false`, porque sem isso o Pixi cria uma camada de acessibilidade própria ao apertar Tab.

## 4. Resultados (mediana de 3 rodadas)

### Desktop (1280×800, GPU Intel UHD 620)

| Métrica | Atual | 2D otimizado | PixiJS |
|---|---:|---:|---:|
| Planejar + montar os 8 mapas | 2.769 ms (planejar incluído) | 304 + 537 = 841 ms | 168 + 43 = 211 ms (+ pedaços criados durante os quadros) |
| Do clique até o `load` da trilha | 5.575 ms | 1.273 ms | 1.087 ms |
| Custo parado (ms de thread por s) | 10,1 | **0,9** | 99 |
| Custo rolando (ms de thread por s) | 10,9 | 19,3 | 211 |
| Canvas (megapixels / memória de imagem) | 62,3 MP ≈ 249 MB | **1,3 MP ≈ 5 MB** | 0,9 MP + buffers da GPU ≈ 7 MB |
| Elementos `<canvas>` | 182 | 99 (só ~6 com pixels) | 1 |
| Rolagem: FPS / p95 do quadro | 55 / 33,3 ms | **59 / 16,8 ms** | 56 / 33,3 ms |
| Mudar a largura | 2.041 ms | 154 ms | 47 ms (+ planejar) |
| Mudar só a altura | 0 montagens | 0 | 0 |

### Celular (412×915, DPR 2,625, CPU 4×)

| Métrica | Atual | 2D otimizado | PixiJS |
|---|---:|---:|---:|
| Planejar + montar | 4.368 ms (maior: 1.641 ms, uma tarefa travada) | 629 + 454 ≈ 1.083 ms (maior: 120–171 ms) | 436 + 226 ≈ 662 ms |
| Do clique até o `load` | 13.755 ms | 7.322 ms | 7.785 ms |
| Custo parado (ms/s) | 58,9 | **1,2** | 149,6 |
| Custo rolando (ms/s) | 68 | **11,2** | 117,5 |
| Canvas | 20,8 MP ≈ 83 MB | **0,4 MP** | 1,4 MP + GPU |
| Rolagem: FPS / p95 | 10 / 283 ms | 13 / 133 ms | 9 / 217 ms |
| Mudar a largura | 3.273 ms | 351 ms | 15–123 ms (+ planejar) |

- No celular, o FPS da rolagem é dominado pela própria trilha (200 nós). O controle **sem cenário nenhum** deu de 4 a 32 FPS entre rodadas. Por isso valem mais o custo do cenário (ms/s) e as tarefas longas do que o FPS.
- O Pixi gasta **~100 ms/s no desktop e ~150 ms/s no celular parado**: com o canvas fixo, cada passo dos personagens obriga a redesenhar a tela inteira (até 30 vezes por segundo), e cada rolagem também. No 2D otimizado, o deslize fica com o compositor e o mapa rola junto, sem custo de JavaScript.

### Bundle (gzip)

| | Atual | 2D otimizado | PixiJS |
|---|---:|---:|---:|
| Bundle principal | 473,3 KB | +1,3 KB (planejar/atlas compartilhados) | +1,3 KB |
| Carregado só na trilha (`import()`) | 0 | 2,9 KB | **147,8 KB** (10 chunks: palco 71,8; Geometry 32,8; RenderTarget 21,3; browserAll 10,9; init 4,6; outros 6,4) |
| Na landing e no exercício | nada a mais | nada a mais | nada a mais (conferido na rede) |

### Lighthouse móvel da `#/trilha` (Lighthouse 13.5.0, 2 rodadas)

| | Atual | 2D otimizado | PixiJS |
|---|---:|---:|---:|
| Performance | 27–29 | 26–27 | 27 |
| LCP | 11,4–11,6 s | 12,6–13,2 s | **15,3 s** |
| TBT | 1,7–3,5 s | 2,4–3,4 s | 3,0–3,3 s |
| CLS | 0,000 | 0,017 | 0,017 |

- A nota é dominada pelo bundle principal de 1,7 MB (473 KB gzip): FCP de ~10 s em todas. Dividir esse bundle é outra frente (débito técnico).
- O CLS de 0,017 vem do cenário montado depois do `import()`: a camada `.cenario` muda de largura com o fundo herdado do `estilo.css`. A correção (renomear a classe e calcular a largura antes do primeiro quadro) é obrigatória na implementação, para voltar a 0.
- O Pixi atrasa o LCP em ~3,8 s porque baixa 148 KB a mais logo na abertura da trilha.

### Contexto WebGL e troca de rota

- 20 idas e voltas trilha ↔ exercício com o Pixi: **1 canvas vivo no final, nenhum aviso de "too many active WebGL contexts"**, e o mapa desenhado. Isso só funciona porque o spike desliga os cenários em `navegar()`; no develop, o desligamento só acontece quando a trilha é renderizada de novo.

## 5. Comparação lado a lado

| Critério | Atual | 2D otimizado | PixiJS |
|---|---|---|---|
| Desempenho parado | ruim no celular (59 ms/s) | **ótimo (≈1 ms/s)** | ruim (100–150 ms/s) |
| Desempenho ao rolar | o mapa rola nativo | **nativo; desenha pedaços sob demanda** | redesenha a cada quadro; o canvas fixo "nada" atrás do conteúdo quando a thread trava (p95 de 217 ms no celular = mapa até ~200 ms atrasado em relação aos nós) |
| Montar / redimensionar | 2,8 s / 2 s | 0,8 s / 0,15 s | **0,2 s / 0,05 s** |
| Memória | 249 MB de canvas | **5 MB** | ~7 MB + GPU |
| Bundle | 0 | 2,9 KB sob demanda | 148 KB sob demanda |
| Complexidade | baixa | baixa/média (mesmos conceitos de hoje) | alta: ciclo de vida do WebGL, perda de contexto, sincronia com a rolagem, a camada de acessibilidade e os eventos do Pixi desligados à mão |
| Testes no happy-dom/vitest | lógica pura + DOM | **lógica pura + DOM; o canvas falta no happy-dom e o código já trata (`getContext?.`)** | o Pixi não inicializa no happy-dom: exige `vi.mock('pixi.js')`, e a renderização só se testa no Playwright |
| Acessibilidade | canvas `aria-hidden` | igual | igual, desde que `activateOnTab: false` (senão o Pixi injeta `div`s focáveis ao apertar Tab) |
| Pixel art nítido | sim (bitmap ampliado no celular, levemente borrado em DPR 2,6) | sim (`image-rendering: pixelated`) | sim (`nearest` + `roundPixels`, nítido com DPR 2) |
| Sem WebGL | n/a | n/a | volta para o Canvas do Pixi ou para o 2D |

## 6. Decisão recomendada

**Não migrar para o PixiJS. Adotar o caminho híbrido: a arquitetura do spike (atlas, culling, laço com orçamento e lógica pura separada) sobre o canvas 2D.**

Por quê, em números:

- Parado, o 2D otimizado custa **~1 ms/s** contra **100–150 ms/s** do Pixi. A trilha passa a maior parte do tempo parada, e é aí que a bateria do celular se gasta.
- A memória de canvas cai de **249 MB para 5 MB** no desktop (de 83 MB para menos de 2 MB no celular), o mesmo ganho do Pixi.
- Montar os mapas cai **~3,3× no desktop e ~4× no celular**, e a maior tarefa travada do celular cai de 1,6 s para ~0,15 s. O Pixi monta mais rápido, mas o 2D otimizado ainda tem uma folga conhecida (ler todas as medidas antes de escrever no DOM; hoje elas se intercalam e forçam um layout por módulo).
- O 2D custa **2,9 KB** contra **148 KB** do Pixi, que ainda piora o LCP em ~3,8 s.
- O mapa continua rolando no compositor, sem o risco do canvas fixo ficar atrasado em relação aos nós.
- Os testes continuam no happy-dom sem mocks pesados.

Onde o Pixi seria melhor: montar e redimensionar (≈4× mais rápido que o 2D otimizado). Não compensa os 148 KB e o custo contínuo de redesenho. Se no futuro houver efeitos de partículas pesados, o palco fica com uma interface de renderizador (planejar → montar → animar → desligar) em que um palco Pixi pode entrar sem mexer na lógica.

O que **não** vai para o PR final: `palco-pixi.js`, a dependência `pixi.js`, as chaves `?cenario=pixi|leve|nenhum` e os contadores `__pixi`/`__cenarios` de inspeção. O que fica: `atlas.js`, `planejar()`, o palco 2D otimizado (substituindo o atual), o desligamento ao trocar de rota e as medições `cenarios:planejar`/`cenarios:montar` (aparecem no painel Performance).

## 7. Parte 2: a vida dos personagens (vale com qualquer renderizador)

Tudo continua determinístico: o estado de cada personagem sai de **(semente do módulo, exercícios feitos, número do passo)**. Nada novo é gravado.

### Lógica pura (`src/ui/cenarios/vida.js`, testada sem DOM)

- **Caminho até um destino**: busca em largura (BFS) nos tiles em que o personagem pode pisar (`podePisar`), com o caminho guardado como lista de tiles.
  - Analogia: o GPS que só conhece as ruas de terra, não a estrada dos exercícios.
- **Destinos**: a porta da casa (tile livre vizinho da casa), a praça (tile livre perto do nó atual) e os nós concluídos (tile livre na linha do nó, ao lado da estrada). A escolha é sorteada pela semente do personagem.
- **Comportamentos (máquina de estados)**: andar, parado, cumprimentar, conversar, sentar, dentro de casa e seguir.
  - Dois personagens que se cruzam (vizinhos) param 2 passos e mostram 👋.
  - Às vezes conversam: balão com um emoji do tema (☸️ 📦 ☁️), por 3 passos.
  - Sentar: parado 4 a 8 passos ao lado de um objeto do cenário.
  - Entrar em casa: some por alguns passos e sai pela mesma porta.
  - Filhotes seguem o dono: o destino é o tile anterior do dono.
  - Dia e noite: só nos cenários que pedem (a cidade à noite do Kubernetes); à noite, metade dos moradores fica em casa.
- **Reações ao progresso**: o palco guarda em memória (variável do módulo, não no `localStorage`) quantos exercícios havia no último desenho.
  - Se aumentou: os personagens do módulo dão um salto curto, uma única vez.
  - A casa nova aparece com uma animação de 300 ms.
  - Um morador vai até o nó atual e acena (👋) de vez em quando, nunca mais de uma vez a cada 4 s.
- **Interpolação**: o deslize continua com a `transition` de CSS (compositor). Os quadros de caminhada alternam a cada passo, a partir do atlas.

### Interação do usuário

- **Clicar ou tocar num personagem** mostra uma fala curta (dica ou curiosidade do tema do curso, em texto simples, sem solução e sem detalhes de validação).
  - As falas ficam em `src/conteudo/falas-da-vila.js`, por site.
  - O clique é tratado na seção do módulo: o palco converte o ponto em tile e procura um personagem ali. A camada continua `pointer-events: none` e não rouba a rolagem. A área de toque é o tile inteiro (32×32 px), inclusive nos filhotes.
- **Alternativa fora do canvas**, junto do cabeçalho de cada módulo:
  - um botão **"Conhecer a vila"** (`aria-expanded`) abre uma lista com os moradores do módulo (nome e fala), em texto, navegável por teclado e leitor de tela;
  - um botão **"⏸ Pausar cenário" / "▶ Animar cenário"** (`aria-pressed`, lembrado no `localStorage` como preferência de interface, igual às outras do painel ♿), que atende ao WCAG 2.2.2.
  - Os dois têm no mínimo 24×24 px, foco visível e nenhum efeito na largura (sem rolagem horizontal a 320, 375 e 412 px).

### Acessibilidade e conforto

- Com reduzir movimento, alto contraste ou cenário pausado: tudo parado, sem balões automáticos. A fala só aparece por clique, toque ou pela lista "Conhecer a vila".
- Nada pisca mais de 3 vezes por segundo: os balões aparecem e somem sem piscar, e os saltos acontecem uma vez só.
- O canvas e a camada continuam `aria-hidden`. A camada perde o fundo herdado de `.cenario` (renomeando a classe para `.cenario-trilha`), o que zera o CLS.
- O limite continua proporcional: 10 personagens por tela (4 no celular).

### Desempenho

- `visibilitychange`: aba oculta, nenhum passo.
- `IntersectionObserver`: módulo fora da tela, nenhum passo; pedaços do mapa desenhados e liberados sob demanda.
- Culling por personagem: só anda quem está a até 2 tiles da tela.

### Testes

- Os 5 arquivos `cenarios-*.test.js` continuam e são adaptados (o redimensionar passa a conferir os pedaços).
- Novos testes:
  - `cenarios-atlas.test.js`: quadros, máscara das bordas e camadas do tile;
  - `cenarios-vida.test.js`: caminho mais curto, só por tiles permitidos, comportamentos, determinismo (mesma semente, mesmos estados) e a regra de não piscar;
  - e2e `tests/e2e/vila.spec.js`: "Conhecer a vila" e "Pausar cenário" por teclado, axe WCAG 2.2 AA nos 4 temas e medição de estouro a 320/375/412 px com `getBoundingClientRect`.
- A cobertura não pode cair.

## 8. Plano depois da aprovação

1. Kubernetes:
   - trocar o palco atual pelo 2D otimizado, sem as chaves do spike;
   - remover o `pixi.js`;
   - resolver a colisão `.cenario` e zerar o CLS;
   - implementar a Parte 2;
   - medir de novo (a mesma matriz) e validar a homologação.
2. Levar `src/ui/cenarios/*`, `src/cenarios.css` e os testes para php, terraform e python, cada um com as suas falas e os seus cenários.
3. Versão nova + `src/novidades.js` em cada repo. PR develop → validar a homologação → PR develop→main → tag → back-merge.
4. Avisar a sessão de débito técnico para incluir os cenários no `comuns.json` na rodada seguinte.
