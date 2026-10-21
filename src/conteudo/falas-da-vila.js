// Falas dos moradores dos cenários da trilha (src/ui/cenarios): clicar ou tocar num personagem, ou
// abrir "Conhecer a vila", mostra a definição curta de um conceito do curso, para revisar. Texto
// simples, sem resposta de exercício e sem detalhe de como a correção funciona. Cada site tem as suas.
export const FALAS_DA_VILA = {
  timoneira: { nome: 'Timoneira', falas: ['Kubernetes: orquestrador que mantém contêineres rodando do jeito que você descreveu.', 'Estado desejado: o que você declara no manifesto; o cluster trabalha para chegar lá.', 'Cluster: o conjunto de máquinas (nós) que o Kubernetes administra como uma só.'] },
  navio: { nome: 'Navio porta-contêineres', falas: ['Contêiner: a aplicação empacotada com tudo de que precisa para rodar.', 'Pod: a menor unidade do Kubernetes; um ou mais contêineres que dividem rede e volumes.'] },
  gaivota: { nome: 'Gaivota', falas: ['Label: par chave=valor preso a um objeto, usado para agrupar e encontrar recursos.', 'Selector: o filtro de labels que escolhe quais objetos fazem parte de algo.'] },
  operadora: { nome: 'Operadora do cluster', falas: ['Plano de controle: a parte do cluster que decide e guarda o estado (API, agendador, controladores).', 'Deployment: mantém o número certo de réplicas de um Pod e faz atualizações graduais.', 'ReplicaSet: garante que exista a quantidade pedida de cópias de um Pod.'] },
  'cao-de-guarda': { nome: 'Cão de guarda', falas: ['RBAC: regras de quem pode fazer o quê no cluster (Role e RoleBinding).', 'Probe: verificação periódica que diz se o contêiner está vivo (liveness) ou pronto (readiness).'] },
  drone: { nome: 'Drone de monitoramento', falas: ['HorizontalPodAutoscaler: aumenta ou diminui as réplicas conforme uma métrica, como a CPU.', 'Requests e limits: o mínimo reservado e o máximo permitido de CPU e memória para um contêiner.'] },
  arquiteta: { nome: 'Arquiteta de nuvem', falas: ['EKS: o Kubernetes gerenciado da AWS; ela cuida do plano de controle.', 'Node group: grupo de máquinas iguais que servem de nós para o cluster.'] },
  'balao-laranja': { nome: 'Balão laranja', falas: ['Zona de disponibilidade: um datacenter isolado dentro de uma região da nuvem.'] },
  aviaozinho: { nome: 'Aviãozinho', falas: ['Service: um endereço estável que encaminha o tráfego para os Pods escolhidos pelo selector.'] },
  piloto: { nome: 'Piloto', falas: ['AKS: o Kubernetes gerenciado do Azure; ele cuida do plano de controle.', 'Node pool: grupo de máquinas virtuais iguais que servem de nós no AKS.'] },
  'balao-azul': { nome: 'Balão azul', falas: ['Resource group: a pasta do Azure que reúne os recursos de um projeto.'] },
  pipa: { nome: 'Pipa', falas: ['Controlador: laço que compara o estado real com o desejado e corrige a diferença.'] },
  operaria: { nome: 'Operária da noite', falas: ['ConfigMap: guarda configuração em pares chave-valor, fora da imagem.', 'Secret: guarda dados sensíveis, como senhas e tokens, separados da configuração comum.'] },
  robozinho: { nome: 'Robozinho', falas: ['Job: roda uma tarefa até terminar com sucesso.', 'CronJob: cria Jobs em horários marcados, como o cron do Linux.'] },
  gato: { nome: 'Gato da cidade', falas: ['Namespace: divisão lógica do cluster, que separa recursos com o mesmo nome.'] },
  marinheira: { nome: 'Marinheira', falas: ['Multi-cloud: usar mais de um provedor de nuvem no mesmo projeto.', 'Manifesto: arquivo YAML que descreve um objeto do Kubernetes e o estado desejado dele.'] },
  golfinho: { nome: 'Golfinho', falas: ['Imagem: o pacote imutável de onde os contêineres são criados.'] },
  pelicano: { nome: 'Pelicano', falas: ['PersistentVolumeClaim: o pedido de armazenamento que sobrevive quando o Pod é recriado.'] },
  'mestre-de-obras': { nome: 'Mestre de obras', falas: ['kubectl apply: envia o manifesto para o cluster criar ou atualizar o objeto.'] },
  engenheira: { nome: 'Engenheira', falas: ['Declarativo: você descreve o resultado; o sistema descobre os passos.'] },
  passaro: { nome: 'Passarinho', falas: ['Rolling update: troca as réplicas aos poucos, sem derrubar o serviço.'] },
};

/** Emojis das conversas, por cenário (o balão de quem conversa). */
export const EMOJIS_DA_CONVERSA = {
  porto: ['⚓', '📦', '☸️'],
  cluster: ['☸️', '🖥️', '🔒'],
  'nuvem-laranja': ['☁️', '💰', '🌅'],
  ceu: ['☁️', '🪁', '🎈'],
  cidade: ['🌙', '🏗️', '💡'],
  arquipelago: ['🏝️', '⛵', '☁️'],
  canteiro: ['🏗️', '📐', '🧱'],
};
