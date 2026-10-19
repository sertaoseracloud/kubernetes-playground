// Versão do site e resumo das alterações de cada release (página #/novidades e CHANGELOG.md).
// A versão vem do package.json (injetada pelo Vite); o histórico completo vem do git
// (scripts/plugin-historico.mjs).
import historico from 'virtual:historico';

export const VERSAO = typeof __VERSAO__ === 'undefined' ? '0.0.0' : __VERSAO__;
export const HISTORICO = historico;
export const REPOSITORIO = 'https://github.com/sertaoseracloud/kubernetes-playground';

/** Releases, da mais nova para a mais antiga. Escritas para quem usa o site, sem jargão. */
export const RELEASES = [
  {
    versao: '0.4.0',
    data: '2026-10-19',
    titulo: 'Cenários de volta e as mesmas ferramentas do DivergeTerraform',
    resumo: 'Os mapas animados voltaram para a trilha, o editor aceita vários arquivos e há uma aba nova que mostra quem usa quem no seu YAML.',
    grupos: [
      {
        titulo: '🗺️ Trilha',
        itens: [
          'Cada módulo ganhou um mapa em pixel art atrás do caminho: porto de contêineres, cidade-cluster, nuvens da AWS, céu da Azure, cidade à noite, arquipélago e o canteiro de obras do Terraform.',
          'A cada exercício resolvido, a vila do mapa ganha uma casa, um filho ou um filhote. Nada novo é guardado no navegador: a vila sai do seu progresso.',
          'Com "reduzir animações" ou no alto contraste, os personagens ficam parados. O mapa é só decoração: o leitor de tela não lê.',
        ],
      },
      {
        titulo: '📘 Desafios e telas',
        itens: [
          'A aba 📘 Docs mostra a apiVersion certa de cada tipo de recurso.',
          'Ao abrir um exercício, o tutorial e o aviso de privacidade não cobrem mais o editor, e a descrição ficou mais larga em telas médias.',
        ],
      },
      {
        titulo: '⌨️ Editor e terminal',
        itens: [
          'O editor tem abas de arquivos: o botão + cria service.yaml ou base/deployment.yaml, e o apply usa todos juntos.',
          'Nova aba 🕸️ Grafo: um desenho de quem usa quem no seu YAML (o Service escolhe os Pods, o Deployment lê o ConfigMap), com a mesma lista em texto.',
          'O terminal entende ls e cat, para ver os arquivos do editor.',
          'O botão 🔗 Compartilhar volta a funcionar: o link abre o exercício com o seu código.',
        ],
      },
    ],
  },
  {
    versao: '0.3.0',
    data: '2026-10-19',
    titulo: 'Trilha feita para quem está começando',
    resumo: 'Todos os exercícios foram reescritos para quem nunca usou Kubernetes: lição antes de cada assunto novo, passos numerados, um modelo pronto no editor e dicas que dizem o que corrigir.',
    grupos: [
      {
        titulo: '🗺️ Trilha e exercícios',
        itens: [
          '17 lições novas nos Fundamentos, antes de cada assunto novo: YAML em 5 minutos, a anatomia de um manifesto, Namespaces, labels, variáveis de ambiente, CPU e memória, e mais.',
          'Toda lição traz uma comparação com o dia a dia e um exemplo comentado linha a linha, que já abre no editor para você testar.',
          'O editor de cada exercício abre com um modelo e comentários "# TODO" mostrando onde escrever cada valor.',
          'O enunciado virou uma lista de passos, e termina explicando o que acontece no cluster depois do apply.',
          'Exercícios que diziam que algo "já existe no cluster" agora começam com esse recurso de verdade.',
          'Nenhum exercício foi removido e o seu progresso continua salvo.',
        ],
      },
      {
        titulo: '💡 Ajuda na hora certa',
        itens: [
          'Dicas em até três níveis, abertas uma de cada vez: da mais leve até quase a resposta.',
          'Quando um teste falha, aparece "🔧 Como corrigir" com o que mudar no YAML, também lido pelo leitor de tela.',
          'Mensagens de erro em linguagem simples, com o detalhe técnico guardado num botão à parte.',
          'Palavras técnicas explicadas no primeiro uso, com uma comparação do dia a dia.',
        ],
      },
      {
        titulo: '🎓 Certificados',
        itens: [
          'A carga horária de Fundamentos passa para 32 horas (eram 30), por causa das lições novas; a da trilha completa, para 73 horas.',
        ],
      },
    ],
  },
  {
    versao: '0.2.1',
    data: '2026-10-19',
    titulo: 'Ajuste na publicação',
    resumo: 'Correção interna no processo que publica as novas versões do site. Nada muda nos exercícios nem no progresso salvo.',
    grupos: [
      {
        titulo: '🔧 Bastidores',
        itens: [
          'A publicação deixa de abrir pedidos de atualização vazios quando não há nada novo para levar ao site principal.',
        ],
      },
    ],
  },
  {
    versao: '0.2.0',
    data: '2026-10-19',
    titulo: 'Recursos Avançados completos',
    resumo: 'O módulo Recursos Avançados dobrou: RBAC, escala automática, StatefulSet, NetworkPolicy, Ingress com TLS e GitOps com Argo CD e Flux.',
    grupos: [
      {
        titulo: '🗺️ Trilha e exercícios',
        itens: [
          'Recursos Avançados passa de 18 para 35 exercícios, em sete tópicos: RBAC, escala e saúde, StatefulSet e storage, Jobs, rede, Secrets e GitOps.',
          'Fundamentos ganha dois exercícios: Pod endurecido com securityContext e desligamento gracioso com preStop.',
          'Lições novas com analogias do dia a dia para RBAC, HPA e probes, StatefulSet e DaemonSet, NetworkPolicy e Ingress, e CRDs.',
        ],
      },
      {
        titulo: '🧪 Simulador',
        itens: [
          'O simulador recusa versões de API que não existem mais no Kubernetes 1.31 (como batch/v1beta1), com a mensagem do kubectl.',
          'Erros reais do servidor: Job sem restartPolicy Never ou OnFailure, Ingress sem pathType, selector que não casa com os labels e mais.',
          'StatefulSet, DaemonSet, Role, RoleBinding, StorageClass e recursos do Argo CD, do Flux e de outros operadores no apply, no kubectl get e na aba Docs.',
        ],
      },
    ],
  },
  {
    versao: '0.1.0',
    data: '2026-10-19',
    titulo: 'Primeira versão do Kubernetes Playground',
    resumo: 'Trilha de Kubernetes com simulador no navegador, exercícios corrigidos automaticamente e certificados.',
    grupos: [
      {
        titulo: '🗺️ Trilha e exercícios',
        itens: [
          'Trilha de Kubernetes: fundamentos, pods, services, deployments e projetos.',
          'Simulador de kubectl no navegador: apply, get, describe, delete e logs. Não precisa de cluster real.',
          'Exercícios corrigidos na hora por testes, com casos ocultos ao enviar.',
          'Playground livre para experimentar, com o estado salvo no navegador.',
        ],
      },
      {
        titulo: '🏆 Gamificação e certificados',
        itens: [
          'Caminho com XP, níveis e sequência de dias; cada módulo abre quando você faz 70% do anterior.',
          'Certificado e badge para cada módulo, emitidos pela Sertão será cloud.',
          'Compartilhamento no LinkedIn com a imagem do badge e opção de imprimir ou salvar em PDF.',
          'Selo de autenticidade: os certificados saem na ordem da trilha, ligados uns aos outros.',
        ],
      },
      {
        titulo: '♿ Acessibilidade e neurodiversidade',
        itens: [
          'Temas Dracula, Claro, Alto contraste e Suave, texto de 87,5% a 175% e fonte mais legível.',
          'Perfis prontos: Foco (TDAH), Leitura facilitada (dislexia), Calmo (autismo) e Sem pressão (ansiedade).',
          'Modo foco, lista de tarefas, régua de leitura, lembrete de pausa e leitura em voz alta.',
          'Navegação completa pelo teclado e contraste revisado em todas as telas.',
        ],
      },
      {
        titulo: '🔒 Privacidade, licença e termos',
        itens: [
          'Sem cookies, sem rastreamento e sem cadastro: seus dados ficam só no seu navegador.',
          'Página de privacidade (LGPD), com botões para baixar e apagar seus dados.',
          'Software livre com copyleft: código sob AGPL-3.0 e conteúdo didático sob CC BY-SA 4.0.',
        ],
      },
    ],
  },
];