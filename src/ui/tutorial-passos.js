// Passos do tutorial. `tela` diz em qual tela o passo acontece ('inicio' ou 'item');
// `alvo` é o seletor do elemento destacado (sem alvo, o modal fica no centro).
// tests/tutorial.test.js confere que todos os alvos existem na página.

export const PROBLEMA_DO_TUTORIAL = 'k8s-primeiro-yaml';

export const PASSOS = [
  {
    titulo: 'Bem-vindo ao DivergeKubernetes ☸️',
    texto: `<p>Aqui você aprende <b>Kubernetes</b> escrevendo manifestos YAML e vendo o cluster responder,
      do Pod ao deploy na <b>AWS (EKS)</b> e no <b>Azure (AKS)</b>.</p>
      <p>Tudo roda no seu navegador, num <b>simulador</b>: não precisa instalar nada nem ter um cluster,
      e nada é cobrado. Este tutorial leva 1 minuto.</p>`,
  },
  {
    tela: 'inicio',
    alvo: '#tela-inicio .bloco-unidade',
    titulo: 'O caminho',
    texto: `<p>A trilha é um caminho: Fundamentos → Recursos Avançados → AWS → Azure → Projetos.</p>
      <ul>
        <li>📖 <b>lições</b> e exercícios ⭐ <span class="dificuldade facil">fácil</span>,
          🔥 <span class="dificuldade medio">médio</span> e 💎 <span class="dificuldade dificil">difícil</span>;</li>
        <li>o nó que pisca com <b>COMEÇAR</b> é o seu próximo passo;</li>
        <li>🔒 o próximo módulo abre quando você resolve <b>70%</b> do atual.</li>
      </ul>`,
  },
  {
    tela: 'inicio',
    alvo: '.painel-jogador',
    titulo: 'XP, nível e certificados',
    texto: `<p>Cada lição e exercício resolvido dá <b>XP</b> e sobe o seu <b>nível</b>. Estudar em dias seguidos
      aumenta a sua sequência 🔥.</p>
      <p>Ao concluir um módulo, o 🏆 libera um <b>certificado</b> emitido pela <b>Sertão será cloud</b>, que você pode
      salvar em PDF e compartilhar no LinkedIn. Concluindo tudo, ganha o certificado final 🎓.</p>`,
  },
  {
    tela: 'inicio',
    alvo: '.menu',
    alvoCelular: '#btn-menu',
    titulo: 'Trilha e Playground livre',
    texto: `<p><b>Trilha</b> volta para este caminho. O <b>Playground livre</b> é para experimentar
      à vontade: o YAML e o cluster ficam salvos no navegador.</p>
      <p class="so-celular">No celular, eles ficam no menu <b>☰</b>, no canto de cima.</p>`,
  },
  {
    tela: 'item',
    alvo: '#painel-descricao',
    titulo: 'O enunciado',
    texto: `<p>Leia o que o exercício pede e como saber que deu certo. A <b>Solução</b> aparece depois do
      tempo estimado do exercício (o ⏱), se você ainda não resolveu.</p>
      <p>O botão <b>🔊</b> lê o enunciado em voz alta.</p>`,
  },
  {
    tela: 'item',
    alvo: '.painel-codigo',
    titulo: 'O editor de YAML',
    texto: `<p>Escreva o manifesto aqui; vários recursos vão no mesmo arquivo, separados por <code>---</code>.
      Seu código é salvo sozinho enquanto você digita.</p>
      <p>Atalho: <kbd>Ctrl</kbd> + <kbd>Enter</kbd> roda o apply. <kbd>Tab</kbd> sai do editor.</p>`,
  },
  {
    tela: 'item',
    alvo: '.painel-preview',
    titulo: 'O terminal',
    texto: `<p>Mostra a saída do <code>kubectl</code>, em inglês, igual à de verdade, e os erros do YAML com uma
      explicação em português.</p>
      <p>É um terminal de verdade: digite <code>kubectl get pods</code>, <code>kubectl describe svc web</code>,
      <code>kubectl delete pod nginx</code>... e <code>help</code> para ver todos. <kbd>Esc</kbd> sai do terminal.</p>
      <p>A aba <b>📦 Estado</b> mostra o cluster e a <b>🏛️ Arquitetura</b>, como o simulador funciona.</p>`,
  },
  {
    tela: 'item',
    alvo: '#btn-executar',
    titulo: '▶ Apply, Diff e Drift',
    texto: `<p><b>Apply</b> cria os recursos no cluster simulado e confere os <b>casos de teste visíveis</b>.
      <b>Diff</b> mostra antes o que vai mudar, e <b>Drift</b> compara o YAML com o que está rodando.</p>`,
  },
  {
    tela: 'item',
    alvo: '#aba-testes',
    titulo: '🧪 Testes',
    texto: `<p>Os testes ficam nesta aba, ao lado da descrição. Ela abre sozinha quando você clica em
      <b>▶ Apply</b>, e o resultado aparece no nome da aba (ex.: ✅ 3/3).</p>
      <p>Cada cartão é um caso de teste: ⏳ ainda não rodou, ✅ passou, ❌ falhou, com <b>o que faltou</b>.</p>`,
  },
  {
    tela: 'item',
    alvo: '#btn-enviar',
    titulo: '⬆ Enviar',
    texto: `<p>Roda <b>todos</b> os casos de teste. Se tudo passar, aparece <b>Aceito 🎉</b> e o exercício fica
      marcado como resolvido.</p>
      <p>Atalho: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Enter</kbd>.</p>`,
  },
  {
    tela: 'item',
    alvo: '#grupo-layout',
    soDesktop: true, // no celular o código e o terminal sempre ficam empilhados
    titulo: 'Posição do código e do terminal',
    texto: `<p><b>Auto</b> escolhe sozinho: lado a lado quando há espaço, senão o código fica em cima
      e o terminal embaixo.</p>
      <p>Use <b>⇆</b> ou <b>⇅</b> para fixar e <b>📄</b> para ocultar a descrição.</p>`,
  },
  {
    alvo: '#btn-acessibilidade',
    titulo: '♿ Acessibilidade',
    texto: `<p>Mude o <b>tema</b>, o <b>tamanho do texto</b>, a fonte e o espaçamento.</p>
      <p>Há <b>perfis rápidos</b> para estudar do seu jeito: <b>🎯 Foco</b>, <b>📖 Leitura facilitada</b>,
      <b>🌿 Calmo</b> e <b>🤝 Sem pressão</b>.</p>`,
  },
  {
    alvo: '#btn-tutorial',
    titulo: 'Pronto! 🚀',
    texto: `<p>Você pode rever este tutorial quando quiser no botão <b>❓</b>, no canto de baixo à direita.
      Ali também ficam <b>♿ Acessibilidade</b> e <b>🔒 Privacidade</b>.</p>
      <p>Comece pelo primeiro exercício de Fundamentos. Bons estudos!</p>`,
  },
];
