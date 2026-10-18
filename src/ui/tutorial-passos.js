// Passos do tutorial interativo do Kubernetes Playground.
// Adaptado do terraform-playground: cada passo destaca um elemento da UI e explica o que fazer.

/** ID do primeiro exercício da trilha, usado como destino final do tutorial. */
export const PROBLEMA_DO_TUTORIAL = 'k8s-primeiro-yaml';

/**
 * Cada passo tem:
 * - titulo: texto curto do cabeçalho
 * - texto: HTML com a explicação
 * - alvo: seletor CSS do elemento destacado (desktop)
 * - alvoCelular: seletor alternativo para celular (opcional)
 * - soDesktop: true se o passo só existe no desktop (opcional)
 * - tela: 'inicio' | 'item' | null — para onde levar o aluno antes de mostrar o passo
 */
export const PASSOS = [
  {
    titulo: 'Bem-vindo ao DivergeKubernetes! ☸️',
    texto: '<p>Aqui você aprende Kubernetes escrevendo YAML de verdade e vendo o resultado na hora, sem precisar de um cluster real.</p><p>Vamos fazer um tour rápido pela interface?</p>',
    alvo: '.marca',
    tela: 'inicio',
  },
  {
    titulo: 'A trilha de aprendizado',
    texto: '<p>A trilha é o caminho dos exercícios. Cada módulo desbloqueia quando você resolve 70% do anterior.</p><p>Os nós são lições (📖) e exercícios (⭐ fácil, 🔥 médio, 💎 difícil).</p>',
    alvo: '.caminho',
    tela: 'inicio',
  },
  {
    titulo: 'Seu progresso',
    texto: '<p>No painel lateral você vê seu nível, XP, sequência de dias e certificados conquistados.</p><p>O nome aparece nos certificados — clique em <b>informar nome</b> quando quiser.</p>',
    alvo: '.painel-jogador',
    tela: 'inicio',
  },
  {
    titulo: 'Dentro de um exercício',
    texto: '<p>Cada exercício tem um editor de YAML à esquerda e o terminal simulado à direita.</p><p>Escreva o manifesto, clique em <b>▶ Apply</b> para validar e em <b>⬆ Enviar</b> para rodar todos os testes.</p>',
    alvo: '#btn-executar',
    tela: 'item',
  },
  {
    titulo: 'Abas de descrição',
    texto: '<p>As abas acima do painel mostram:</p><ul><li><b>Descrição</b>: o que fazer e como conferir</li><li><b>Solução</b>: aparece depois de um tempo tentando</li><li><b>Testes</b>: o resultado de cada caso</li></ul>',
    alvo: '[data-desc="enunciado"]',
    tela: 'item',
  },
  {
    titulo: 'Ajuda e preferências',
    texto: '<p>Os botões flutuantes (⚙️) abrem o tutorial novamente, o painel de acessibilidade e a página de privacidade.</p><p>No painel ♿ você ajusta tema, tamanho do texto, régua de leitura e lembrete de pausa.</p>',
    alvo: '#btn-flutuantes',
    tela: null,
  },
  {
    titulo: 'Pronto para começar! 🚀',
    texto: '<p>Agora é com você. Abra o primeiro exercício e escreva seu primeiro Pod em YAML.</p><p>Boa jornada! ☸️</p>',
    alvo: null,
    tela: null,
  },
];