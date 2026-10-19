// Glossário: cada termo técnico com uma explicação simples, uma analogia do dia a
// dia e, quando ajuda, um exemplo curto. A descrição de cada desafio mostra os termos
// que aparecem no texto dele (até MAX_TERMOS, na ordem em que aparecem), para não
// sobrecarregar. O formato é o mesmo do glossário do DivergeTerraform.
//
// `padroes` são regex (sem flags; usamos 'iu'), testadas no texto visível do desafio.
// Bordas de palavra são tratadas em `termosDoTexto`, porque \b não entende acentos.
// A ordem importa: os termos são agrupados por nível (fundamentos → avançados → AWS →
// Azure → projetos → comparação).

export const MAX_TERMOS = 6;

export const GLOSSARIO = [
  // ---------- Fundamentos: o cluster ----------
  {
    id: 'kubernetes', termo: 'Kubernetes (K8s)', padroes: ['kubernetes', 'k8s'],
    definicao: 'Sistema que roda e cuida de contêineres em várias máquinas: você descreve o que quer e ele mantém assim.',
    analogia: 'O nome quer dizer "timoneiro" em grego: quem pilota o navio cheio de contêineres e corrige o rumo sozinho.',
  },
  {
    id: 'conteiner', termo: 'Contêiner', padroes: ['cont[eê]ineres?', 'containers?'],
    definicao: 'Um programa empacotado com tudo de que precisa para rodar (bibliotecas, configurações), igual em qualquer máquina.',
    analogia: 'Uma marmita fechada: leva a comida e os talheres, e chega igual em qualquer mesa.',
  },
  {
    id: 'imagem', termo: 'Imagem', padroes: ['imagens?', 'images?'],
    definicao: 'O "molde" de onde sai o contêiner, com nome e versão (a tag), guardado num registro como o Docker Hub.',
    analogia: 'A forma de bolo: de uma forma saem quantos bolos iguais você quiser.',
    exemplo: 'image: nginx:1.25',
  },
  {
    id: 'cluster', termo: 'Cluster', padroes: ['clusters?'],
    definicao: 'O conjunto de máquinas (os nós) e do plano de controle que o Kubernetes administra como se fossem uma só.',
    analogia: 'Um condomínio: vários prédios (nós) com uma administração (plano de controle) que decide quem mora onde.',
  },
  {
    id: 'no', termo: 'Nó (node)', padroes: ['n[óo]s? do cluster', 'nodes?', 'n[óo]s worker', 'n[óo] worker'],
    definicao: 'Uma máquina, virtual ou física, onde os Pods rodam. Cada nó tem o kubelet, que conversa com o plano de controle.',
    analogia: 'Um prédio do condomínio: é onde as famílias (os Pods) moram de verdade.',
  },
  {
    id: 'plano-de-controle', termo: 'Plano de controle (control plane)', padroes: ['plano de controle', 'control plane', 'api server', 'kube-apiserver', 'etcd', 'scheduler', 'agendador'],
    definicao: 'O "cérebro" do cluster: a API, o banco etcd, o scheduler que escolhe o nó de cada Pod e os controladores.',
    analogia: 'A administração do condomínio: recebe os pedidos, guarda o cadastro e decide em qual prédio cada família fica.',
  },
  {
    id: 'kubectl', termo: 'kubectl', padroes: ['kubectl'],
    definicao: 'A linha de comando para falar com o cluster: aplicar manifestos, listar, descrever e apagar recursos.',
    analogia: 'O controle remoto do cluster.',
    exemplo: 'kubectl apply -f manifest.yaml\nkubectl get pods',
  },
  {
    id: 'yaml', termo: 'YAML', padroes: ['yaml', 'yml'],
    definicao: 'Formato de texto dos manifestos: pares chave: valor, com o recuo (espaços, nunca Tab) mostrando o que fica dentro de quê.',
    analogia: 'Uma lista de compras com tópicos e subtópicos: o recuo mostra o que é parte de quê.',
    exemplo: 'metadata:\n  name: web\n  labels:\n    app: web',
  },
  {
    id: 'manifesto', termo: 'Manifesto', padroes: ['manifestos?', 'manifest'],
    definicao: 'O arquivo YAML que descreve um ou mais recursos (separados por ---): o estado que você quer no cluster.',
    analogia: 'O pedido por escrito que você entrega na cozinha: diz o prato, o tamanho e os detalhes.',
  },
  {
    id: 'apiversion-kind', termo: 'apiVersion e kind', padroes: ['apiversion', 'kind'],
    definicao: 'As duas primeiras linhas de todo manifesto: kind diz o tipo do recurso (Pod, Service...) e apiVersion, a versão da API que o atende.',
    analogia: 'O nome do formulário e a edição dele: "Formulário de matrícula, versão 2024".',
    exemplo: 'apiVersion: apps/v1\nkind: Deployment',
  },
  {
    id: 'metadata', termo: 'metadata', padroes: ['metadata', 'metadados'],
    definicao: 'A parte do manifesto com o nome do recurso, o namespace, os labels e as annotations.',
    analogia: 'A etiqueta da caixa: diz o nome e para quem é, não o que tem dentro.',
  },
  {
    id: 'spec', termo: 'spec', padroes: ['spec'],
    definicao: 'A parte do manifesto que descreve o que você quer: contêineres, portas, réplicas.',
    analogia: 'A receita dentro da caixa: os ingredientes e o modo de preparo.',
  },
  {
    id: 'estado-desejado', termo: 'Estado desejado', padroes: ['estado desejado', 'estado real', 'declarativ[oa]', 'reconcilia[çc][ãa]o'],
    definicao: 'Você declara como quer o cluster; os controladores comparam com o que está rodando e corrigem a diferença o tempo todo.',
    analogia: 'Um termostato: você escolhe 22 °C e ele liga ou desliga o ar até chegar lá, e continua de olho.',
  },
  {
    id: 'pod', termo: 'Pod', padroes: ['pods?'],
    definicao: 'A menor unidade do Kubernetes: um ou mais contêineres que rodam juntos, no mesmo nó, com o mesmo IP.',
    analogia: 'Uma casa: quem mora nela (os contêineres) divide o endereço e a cozinha (a rede e os volumes).',
    exemplo: 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: web',
  },
  {
    id: 'namespace', termo: 'Namespace', padroes: ['namespaces?'],
    definicao: 'Uma "pasta" do cluster que separa recursos, permissões e cotas por time ou ambiente.',
    analogia: 'Os andares de uma escola: cada turma tem a sua sala, e dois alunos podem ter o mesmo nome em salas diferentes.',
  },
  {
    id: 'label', termo: 'Label (rótulo)', padroes: ['labels?', 'r[óo]tulos?'],
    definicao: 'Pares chave: valor presos a um recurso (app: web) que servem para encontrar e agrupar recursos.',
    analogia: 'Etiquetas coloridas nas pastas do arquivo: "financeiro", "2024".',
    exemplo: 'labels:\n  app: web\n  tier: frontend',
  },
  {
    id: 'selector', termo: 'Selector (seletor)', padroes: ['selectors?', 'seletor(es)?', 'matchlabels'],
    definicao: 'A regra que escolhe recursos pelos labels: um Service manda tráfego para os Pods que batem com o selector dele.',
    analogia: 'Chamar na escola "todo mundo de camiseta azul": só quem tem a etiqueta certa responde.',
    exemplo: 'selector:\n  app: web',
  },
  {
    id: 'annotation', termo: 'Annotation (anotação)', padroes: ['annotations?', 'anota[çc][õo]es', 'anota[çc][ãa]o'],
    definicao: 'Informações extras de um recurso, que não servem para selecionar: quem é o dono, um link, configurações de um controlador.',
    analogia: 'Um post-it colado na pasta: ajuda quem lê, mas não muda onde a pasta fica.',
  },
  {
    id: 'requests-limits', termo: 'Requests e limits', padroes: ['requests?', 'limits?', 'limites de (cpu|mem[óo]ria)'],
    definicao: 'Request é quanto de CPU e memória o contêiner reserva; limit é o máximo que ele pode usar.',
    analogia: 'Reservar uma mesa para 4 (request) num salão que deixa a mesa crescer até 6 (limit).',
    exemplo: 'resources:\n  requests:\n    cpu: 100m\n  limits:\n    memory: 256Mi',
  },
  {
    id: 'variavel-ambiente', termo: 'Variável de ambiente', padroes: ['vari[áa]ve(l|is) de ambiente', 'env'],
    definicao: 'Um valor que o contêiner lê ao começar (como a URL do banco), definido no manifesto em env.',
    analogia: 'Um bilhete na porta da geladeira que todo mundo da casa lê antes de sair.',
    exemplo: 'env:\n  - name: AMBIENTE\n    value: producao',
  },
  {
    id: 'configmap', termo: 'ConfigMap', padroes: ['configmaps?'],
    definicao: 'Configurações em texto (chave e valor) separadas da imagem, que os Pods leem como variáveis ou arquivos.',
    analogia: 'O cardápio do dia pregado na parede: muda sem precisar reformar a cozinha.',
    exemplo: 'kind: ConfigMap\ndata:\n  COR: azul',
  },
  {
    id: 'init-container', termo: 'Init container', padroes: ['init containers?', 'initcontainers'],
    definicao: 'Um contêiner que roda e termina antes dos outros do Pod começarem, para preparar algo (esperar o banco, baixar um arquivo).',
    analogia: 'Quem arruma a sala antes da reunião: quando termina, a reunião pode começar.',
  },
  {
    id: 'drift', termo: 'Drift (desvio)', padroes: ['drift', 'desvio'],
    definicao: 'Quando o que está rodando no cluster ficou diferente do que o manifesto diz (alguém mudou na mão, por exemplo).',
    analogia: 'A planta da casa diz parede branca, mas alguém pintou de verde: a casa "derivou" da planta.',
  },
  {
    id: 'diff', termo: 'Diff', padroes: ['diff'],
    definicao: 'A lista do que mudaria se você aplicasse o manifesto agora: o que seria criado (+), alterado (~) ou apagado (-).',
    analogia: 'Conferir o carrinho antes de pagar: você vê o que entra e o que sai antes de confirmar.',
    exemplo: 'kubectl diff -f manifest.yaml',
  },
  {
    id: 'apply', termo: 'kubectl apply', padroes: ['apply', 'aplicar'],
    definicao: 'Envia o manifesto para o cluster: cria o que não existe e atualiza o que mudou, sem apagar o resto.',
    analogia: 'Entregar a lista atualizada para o mestre de obras: ele faz só o que falta.',
  },
  {
    id: 'ciclo-de-vida', termo: 'Ciclo de vida do Pod', padroes: ['ciclo de vida', 'pending', 'running', 'succeeded', 'crashloopbackoff'],
    definicao: 'As fases de um Pod: Pending (esperando um nó ou a imagem), Running, Succeeded ou Failed.',
    analogia: 'Um voo: aguardando embarque, em voo, pousou ou foi cancelado.',
  },
  {
    id: 'volume', termo: 'Volume', padroes: ['volumes?', 'volumemounts?'],
    definicao: 'Um disco que o Pod monta numa pasta. Alguns somem com o Pod (emptyDir); outros sobrevivem (PersistentVolume).',
    analogia: 'Uma gaveta da casa: o contêiner guarda coisas ali e os outros moradores também enxergam.',
  },
  {
    id: 'emptydir', termo: 'emptyDir', padroes: ['emptydir'],
    definicao: 'Um volume vazio, criado junto com o Pod e apagado quando ele sai; serve para os contêineres do Pod trocarem arquivos.',
    analogia: 'Uma mesa de trabalho compartilhada que é limpa quando o expediente acaba.',
  },
  {
    id: 'hostpath', termo: 'hostPath', padroes: ['hostpath'],
    definicao: 'Monta uma pasta do próprio nó dentro do Pod. É poderoso e arriscado: use só para agentes do nó (logs, métricas).',
    analogia: 'Dar a chave do prédio inteiro para um morador: útil para o zelador, perigoso para os outros.',
  },
  {
    id: 'downward-api', termo: 'Downward API', padroes: ['downward api'],
    definicao: 'Entrega ao contêiner dados do próprio Pod (nome, namespace, IP, labels) como variáveis ou arquivos.',
    analogia: 'O crachá que o funcionário recebe no primeiro dia, com o nome e o setor dele.',
  },
  {
    id: 'probe', termo: 'Probe (sonda de saúde)', padroes: ['probes?', 'livenessprobe', 'readinessprobe', 'startupprobe', 'liveness', 'readiness', 'health ?checks?'],
    definicao: 'Testes que o kubelet faz no contêiner: liveness reinicia se travou, readiness só manda tráfego quando está pronto, startup espera a partida lenta.',
    analogia: 'O médico que mede o pulso: se o coração parou, reanima (liveness); se ainda está acordando, não deixa trabalhar (readiness).',
    exemplo: 'readinessProbe:\n  httpGet:\n    path: /saude\n    port: 8080',
  },
  {
    id: 'sidecar', termo: 'Sidecar', padroes: ['sidecars?', 'multi-container'],
    definicao: 'Um contêiner ajudante no mesmo Pod do principal: coleta logs, faz proxy, renova certificados.',
    analogia: 'O sidecar da moto: vai junto, do lado, ajudando na viagem.',
  },
  {
    id: 'restart-policy', termo: 'restartPolicy', padroes: ['restart ?policy', 'restartpolicy'],
    definicao: 'O que fazer quando o contêiner termina: Always (sempre reinicia), OnFailure (só se deu erro) ou Never.',
    analogia: 'A regra da academia: se a aula acabou, recomeça? Só se alguém se machucou? Nunca?',
  },
  {
    id: 'affinity', termo: 'Afinidade (affinity)', padroes: ['affinity', 'anti-affinity', 'afinidade', 'nodeselector'],
    definicao: 'Regras para escolher em que nó o Pod vai: perto de outros Pods (affinity), longe deles (anti-affinity) ou em nós com certo label.',
    analogia: 'Montar as mesas de uma festa: os amigos juntos, os primos brigados em mesas diferentes.',
  },
  {
    id: 'security-context', termo: 'securityContext', padroes: ['securitycontext', 'runasnonroot', 'contexto de seguran[çc]a'],
    definicao: 'As travas de segurança do Pod e do contêiner: não rodar como root, disco só de leitura, sem privilégios extras.',
    analogia: 'Dar ao estagiário só a chave da sala dele, e não a chave mestra.',
  },
  {
    id: 'ephemeral-container', termo: 'Ephemeral container', padroes: ['ephemeral containers?', 'cont[eê]iner ef[êe]mero'],
    definicao: 'Um contêiner temporário que você coloca num Pod que já está rodando, só para investigar um problema.',
    analogia: 'O técnico que entra na sala para consertar a impressora e sai logo depois.',
    exemplo: 'kubectl debug -it web --image=busybox',
  },
  {
    id: 'prestop', termo: 'preStop e desligamento gracioso', padroes: ['prestop', 'desligamento gracioso', 'graceful', 'terminationgraceperiodseconds'],
    definicao: 'Antes de parar o contêiner, o Kubernetes roda o preStop e espera um tempo, para ele terminar o que estava fazendo.',
    analogia: 'Avisar "a loja vai fechar em 5 minutos": quem está no caixa termina a compra.',
  },
  {
    id: 'service', termo: 'Service', padroes: ['services?'],
    definicao: 'Um endereço fixo na frente de um grupo de Pods (que nascem e morrem com IPs novos), escolhidos pelo selector.',
    analogia: 'O número da central de atendimento: você liga sempre para o mesmo número, e ele passa para quem estiver livre.',
    exemplo: 'kind: Service\nspec:\n  selector:\n    app: web\n  ports:\n    - port: 80',
  },
  {
    id: 'clusterip', termo: 'ClusterIP', padroes: ['clusterip'],
    definicao: 'O tipo padrão de Service: um IP que só funciona dentro do cluster.',
    analogia: 'O ramal interno da empresa: de fora não dá para ligar.',
  },
  {
    id: 'nodeport', termo: 'NodePort', padroes: ['nodeport'],
    definicao: 'Um Service que abre a mesma porta (30000 a 32767) em todos os nós, para chegar nele de fora.',
    analogia: 'Uma porta lateral com o mesmo número em todos os prédios do condomínio.',
  },
  {
    id: 'loadbalancer', termo: 'LoadBalancer', padroes: ['loadbalancer', 'load balancer', 'balanceador( de carga)?'],
    definicao: 'Um Service que pede à nuvem um balanceador com IP público e distribui o tráfego entre os Pods.',
    analogia: 'A recepcionista na entrada do prédio, que manda cada visitante para um atendente livre.',
  },
  {
    id: 'headless', termo: 'Headless Service', padroes: ['headless'],
    definicao: 'Um Service sem IP próprio (clusterIP: None): o DNS devolve o IP de cada Pod, um por um.',
    analogia: 'Uma lista telefônica com o número de cada pessoa, em vez de uma central única.',
  },
  {
    id: 'externalname', termo: 'ExternalName', padroes: ['externalname'],
    definicao: 'Um Service que é só um apelido de DNS para um endereço fora do cluster (um banco gerenciado, por exemplo).',
    analogia: 'Um atalho na agenda do celular que liga para um número de outra cidade.',
  },
  {
    id: 'porta', termo: 'port, targetPort e containerPort', padroes: ['targetport', 'containerport', 'portas?', 'ports?'],
    definicao: 'containerPort é onde o programa escuta no contêiner; port é a porta do Service; targetPort diz para qual porta do Pod o Service manda.',
    analogia: 'O ramal da recepção (port) que transfere para a mesa certa (targetPort) de quem atende (containerPort).',
  },
  {
    id: 'endpoint', termo: 'Endpoints e EndpointSlice', padroes: ['endpoints?', 'endpointslices?'],
    definicao: 'A lista dos IPs e portas dos Pods prontos que estão atrás de um Service, atualizada sozinha.',
    analogia: 'A escala de quem está de plantão hoje na central de atendimento.',
  },
  {
    id: 'dns', termo: 'DNS interno', padroes: ['dns', 'coredns'],
    definicao: 'Todo Service ganha um nome (web.default.svc.cluster.local) que os Pods usam em vez do IP.',
    analogia: 'Chamar o colega pelo nome, e não pelo número do crachá.',
    exemplo: 'curl http://web.default.svc.cluster.local',
  },
  {
    id: 'ingress', termo: 'Ingress', padroes: ['ingress(es)?'],
    definicao: 'Regras de HTTP(S) que levam o tráfego de fora para os Services, por domínio e caminho (loja.com/api → api).',
    analogia: 'O porteiro do shopping: "para a praça de alimentação, segundo andar à esquerda".',
    exemplo: 'rules:\n  - host: loja.com\n    http:\n      paths:\n        - path: /api',
  },
  {
    id: 'deployment', termo: 'Deployment', padroes: ['deployments?', 'deploys?'],
    definicao: 'Mantém N cópias (réplicas) de um Pod rodando e troca a versão aos poucos, sem parar o serviço.',
    analogia: 'O gerente de turno: garante que sempre há 3 caixas abertos e troca o pessoal sem fechar a loja.',
    exemplo: 'kind: Deployment\nspec:\n  replicas: 3',
  },
  {
    id: 'replicaset', termo: 'ReplicaSet e réplicas', padroes: ['replicasets?', 'r[ée]plicas?', 'replicas'],
    definicao: 'Réplicas são cópias iguais de um Pod; o ReplicaSet mantém a quantidade certa, e o Deployment cria ReplicaSets por você.',
    analogia: 'Fotocópias de um documento: se uma rasga, alguém tira outra.',
  },
  {
    id: 'rolling-update', termo: 'Rolling update e rollback', padroes: ['rolling ?update', 'rollback', 'rollout', 'maxsurge', 'maxunavailable', 'revisionhistorylimit'],
    definicao: 'Rolling update troca os Pods da versão antiga pelos da nova aos poucos; rollback volta para a versão anterior.',
    analogia: 'Trocar os pneus de um ônibus um de cada vez, com ele ainda rodando, e poder voltar o pneu antigo.',
    exemplo: 'kubectl rollout undo deployment/web',
  },
  {
    id: 'recreate', termo: 'Estratégia Recreate', padroes: ['recreate'],
    definicao: 'Apaga todos os Pods antigos antes de criar os novos: fica um tempo fora do ar, mas nunca roda duas versões juntas.',
    analogia: 'Fechar o restaurante para trocar o cardápio inteiro de uma vez.',
  },
  {
    id: 'canary-blue-green', termo: 'Canary e blue-green', padroes: ['canary', 'can[áa]rio', 'blue-green', 'azul-verde'],
    definicao: 'Canary manda uma parte pequena do tráfego para a versão nova; blue-green mantém as duas versões e troca o tráfego de uma vez.',
    analogia: 'Canary: provar o prato antes de servir para todos. Blue-green: duas cozinhas prontas, e você escolhe qual atende.',
  },
  {
    id: 'hpa', termo: 'HPA (escala automática)', padroes: ['hpa', 'horizontalpodautoscaler', 'autoscal(er|ing)', 'escala autom[áa]tica'],
    definicao: 'Aumenta e diminui o número de réplicas conforme o uso de CPU, memória ou outra métrica.',
    analogia: 'Abrir mais caixas no supermercado quando a fila cresce e fechar quando esvazia.',
    exemplo: 'kind: HorizontalPodAutoscaler\nspec:\n  minReplicas: 2\n  maxReplicas: 10',
  },
  {
    id: 'pdb', termo: 'PodDisruptionBudget', padroes: ['poddisruptionbudget', 'pdb', 'disruption budget'],
    definicao: 'Quantos Pods podem sair ao mesmo tempo numa manutenção (atualizar ou esvaziar um nó), para o serviço não cair.',
    analogia: 'A regra de que no máximo um salva-vidas sai para o almoço por vez.',
  },
  {
    id: 'topology-spread', termo: 'Topology spread', padroes: ['topology ?spread', 'topologyspreadconstraints', 'topologia', 'topology', 'zonas?'],
    definicao: 'Espalha os Pods entre zonas ou nós, para uma pane num lugar não derrubar todas as réplicas.',
    analogia: 'Não guardar todos os ovos na mesma cesta.',
  },
  {
    id: 'priorityclass', termo: 'PriorityClass', padroes: ['priorityclass', 'prioridade'],
    definicao: 'A prioridade de um Pod: quando falta espaço, os mais importantes passam na frente e podem tirar os menos importantes.',
    analogia: 'A fila preferencial do banco.',
  },
  {
    id: 'daemonset', termo: 'DaemonSet', padroes: ['daemonsets?'],
    definicao: 'Roda uma cópia de um Pod em cada nó do cluster; serve para agentes de logs, métricas e rede.',
    analogia: 'Um extintor em cada andar do prédio: se abrir um andar novo, ganha um extintor também.',
  },

  // ---------- Recursos avançados ----------
  {
    id: 'rbac', termo: 'RBAC', padroes: ['rbac'],
    definicao: 'Controle de acesso por papéis: quem (usuário, grupo, ServiceAccount) pode fazer o quê (verbos) em quais recursos.',
    analogia: 'O crachá da empresa: cada cargo abre algumas portas, e só elas.',
  },
  {
    id: 'role', termo: 'Role e ClusterRole', padroes: ['roles?', 'clusterroles?'],
    definicao: 'Uma lista de permissões (get, list, create...) sobre recursos. A Role vale num namespace; a ClusterRole, no cluster todo.',
    analogia: 'A descrição de um cargo: "pode abrir o caixa e consultar o estoque".',
    exemplo: 'rules:\n  - apiGroups: [""]\n    resources: ["pods"]\n    verbs: ["get", "list"]',
  },
  {
    id: 'rolebinding', termo: 'RoleBinding e ClusterRoleBinding', padroes: ['rolebindings?', 'clusterrolebindings?', 'binding'],
    definicao: 'Entrega uma Role (ou ClusterRole) para usuários, grupos ou ServiceAccounts.',
    analogia: 'A portaria nomeando a Ana para o cargo de caixa.',
  },
  {
    id: 'serviceaccount', termo: 'ServiceAccount', padroes: ['serviceaccounts?', 'service accounts?', 'conta de servi[çc]o'],
    definicao: 'A identidade de um Pod para falar com a API do Kubernetes (e, com IRSA ou Workload Identity, com a nuvem).',
    analogia: 'O crachá de um robô da fábrica: ele também precisa de autorização para entrar nas salas.',
  },
  {
    id: 'menor-privilegio', termo: 'Menor privilégio', padroes: ['menor privil[ée]gio', 'least privilege'],
    definicao: 'Dar só as permissões necessárias para a tarefa, nada a mais.',
    analogia: 'Emprestar a chave do carro, e não o molho de chaves da casa.',
  },
  {
    id: 'limitrange-quota', termo: 'LimitRange e ResourceQuota', padroes: ['limitrange', 'resourcequota', 'resource quota', 'cotas?'],
    definicao: 'ResourceQuota limita o total de CPU, memória e objetos de um namespace; LimitRange dá valores padrão e máximos a cada contêiner.',
    analogia: 'O orçamento do departamento (quota) e o limite de cada cartão corporativo (LimitRange).',
  },
  {
    id: 'statefulset', termo: 'StatefulSet', padroes: ['statefulsets?'],
    definicao: 'Como o Deployment, mas cada Pod tem nome fixo (db-0, db-1), ordem de criação e disco próprio. Para bancos e filas.',
    analogia: 'Cadeiras numeradas no teatro: cada pessoa volta sempre para a mesma cadeira.',
  },
  {
    id: 'pvc', termo: 'PersistentVolumeClaim (PVC)', padroes: ['pvcs?', 'persistentvolumeclaims?', 'persistentvolumes?', 'volume persistente', 'disco persistente'],
    definicao: 'Um pedido de disco que sobrevive ao Pod. O cluster liga o pedido a um PersistentVolume de verdade.',
    analogia: 'Alugar um armário no clube: você troca de roupa (de Pod), e as coisas continuam no armário.',
    exemplo: 'kind: PersistentVolumeClaim\nspec:\n  resources:\n    requests:\n      storage: 10Gi',
  },
  {
    id: 'storageclass', termo: 'StorageClass', padroes: ['storageclass(es)?', 'waitforfirstconsumer'],
    definicao: 'O "cardápio" de discos: diz qual driver cria o volume e com quais parâmetros (tipo, velocidade, zona).',
    analogia: 'Os tamanhos de armário que o clube oferece: pequeno, grande, refrigerado.',
  },
  {
    id: 'access-mode', termo: 'Modo de acesso (RWO, RWX)', padroes: ['readwriteonce', 'readwritemany', 'rwo', 'rwx', 'accessmodes?'],
    definicao: 'ReadWriteOnce: um nó por vez escreve no disco. ReadWriteMany: vários Pods, em vários nós, escrevem ao mesmo tempo.',
    analogia: 'Um caderno pessoal (RWO) e um quadro branco da sala, que todos podem usar (RWX).',
  },
  {
    id: 'csi', termo: 'Driver CSI', padroes: ['csi'],
    definicao: 'O plugin que ensina o Kubernetes a criar e montar discos de um fornecedor (EBS, Azure Disk, EFS...).',
    analogia: 'O adaptador de tomada de cada país: o aparelho é o mesmo, muda o encaixe.',
  },
  {
    id: 'job', termo: 'Job', padroes: ['jobs?'],
    definicao: 'Roda Pods até a tarefa terminar com sucesso (um backup, uma migração) e para.',
    analogia: 'Chamar o eletricista para uma tarefa: ele faz o serviço e vai embora.',
  },
  {
    id: 'cronjob', termo: 'CronJob', padroes: ['cronjobs?', 'cron', 'schedule', 'agendad[oa]'],
    definicao: 'Cria um Job num horário, no formato do cron (minuto hora dia mês dia-da-semana).',
    analogia: 'O despertador que toca todo dia útil às 7h.',
    exemplo: 'schedule: "0 3 * * *"   # todo dia às 3h',
  },
  {
    id: 'networkpolicy', termo: 'NetworkPolicy', padroes: ['networkpolic(y|ies)', 'network ?policy', 'pol[íi]tica de rede'],
    definicao: 'Firewall entre Pods: diz quem pode falar com quem. Sem nenhuma, todos falam com todos.',
    analogia: 'A lista de quem pode entrar em cada sala do prédio.',
  },
  {
    id: 'default-deny', termo: 'Default deny', padroes: ['default ?deny', 'nega tudo', 'negar tudo'],
    definicao: 'Uma NetworkPolicy que bloqueia todo o tráfego; depois você libera só o necessário.',
    analogia: 'Trancar todas as portas e entregar chaves só para quem precisa.',
  },
  {
    id: 'tls', termo: 'TLS e certificado', padroes: ['tls', 'https', 'certificados? (tls|digital)'],
    definicao: 'A criptografia do HTTPS: o certificado prova quem é o site e protege o que trafega.',
    analogia: 'O envelope lacrado com o selo do remetente.',
  },
  {
    id: 'secret', termo: 'Secret', padroes: ['secrets?', 'segredos?'],
    definicao: 'Como o ConfigMap, mas para dados sensíveis (senhas, tokens). Fica em base64, que não é criptografia: proteja com RBAC.',
    analogia: 'O cofre do escritório: guarda o que não pode ficar pregado na parede.',
    exemplo: 'kind: Secret\ntype: Opaque\nstringData:\n  senha: troque-me',
  },
  {
    id: 'base64', termo: 'base64', padroes: ['base64'],
    definicao: 'Um jeito de escrever bytes como texto. Qualquer um decodifica: não esconde nada.',
    analogia: 'Escrever de trás para frente: parece segredo, mas não é.',
    exemplo: 'echo -n senha | base64',
  },
  {
    id: 'external-secrets', termo: 'Cofre externo (Vault, External Secrets)', padroes: ['vault', 'external secrets?', 'externalsecret', 'cofres?'],
    definicao: 'Guardar os segredos num cofre fora do cluster e deixar um operador copiá-los para Secrets quando precisa.',
    analogia: 'Deixar as joias no cofre do banco e buscar só no dia da festa.',
  },
  {
    id: 'gitops', termo: 'GitOps', padroes: ['gitops'],
    definicao: 'O Git é a fonte da verdade: o cluster é atualizado por um agente que lê o repositório, e não por comandos manuais.',
    analogia: 'A receita oficial fica no livro: se alguém mudar o prato na cozinha, o chefe refaz pelo livro.',
  },
  {
    id: 'argocd', termo: 'Argo CD', padroes: ['argo ?cd', 'appproject', 'applicationset'],
    definicao: 'Ferramenta de GitOps que compara o cluster com o Git e sincroniza; cada Application aponta um repositório para um destino.',
    analogia: 'O fiscal que confere a obra contra a planta todo dia e corrige o que estiver diferente.',
  },
  {
    id: 'flux', termo: 'Flux', padroes: ['flux( ?cd)?', 'gitrepository', 'kustomization'],
    definicao: 'Outra ferramenta de GitOps: o GitRepository diz o repositório e a Kustomization, a pasta que vai para o cluster.',
    analogia: 'Um assinante que recebe e aplica cada nova edição do jornal.',
  },
  {
    id: 'sync', termo: 'Sincronização (sync)', padroes: ['sync', 'sincroniza[çc][ãa]o', 'selfheal', 'prune'],
    definicao: 'Deixar o cluster igual ao Git. Com selfHeal, desfaz mudanças manuais; com prune, apaga o que saiu do Git.',
    analogia: 'Sincronizar as fotos do celular com a nuvem: o que você apagar lá some aqui também.',
  },
  {
    id: 'helm', termo: 'Helm', padroes: ['helm', 'charts?', 'helmrelease', 'values\\.yaml'],
    definicao: 'O gerenciador de pacotes do Kubernetes: um chart é um conjunto de manifestos com variáveis (values) para reaproveitar.',
    analogia: 'Um kit de móveis com manual: você escolhe a cor e o tamanho, e a montagem é sempre a mesma.',
    exemplo: 'helm install loja ./chart --set replicas=3',
  },
  {
    id: 'kustomize', termo: 'Kustomize', padroes: ['kustomize', 'overlays?'],
    definicao: 'Monta os manifestos de cada ambiente a partir de uma base comum, com overlays que mudam só o que precisa.',
    analogia: 'Uma roupa base e os acessórios de cada ocasião: a mesma camisa, gravata no trabalho, boné no fim de semana.',
  },
  {
    id: 'crd', termo: 'CRD (tipo personalizado)', padroes: ['crds?', 'customresourcedefinitions?', 'recursos? personalizados?'],
    definicao: 'Ensina um tipo novo de recurso à API do Kubernetes (Application, Certificate...), que um operador sabe tratar.',
    analogia: 'Acrescentar um campo novo no formulário da escola, e um funcionário que sabe o que fazer com ele.',
  },
  {
    id: 'operador', termo: 'Operador', padroes: ['operador(es)?', 'operators?', 'controladores?', 'controllers?'],
    definicao: 'Um programa que roda no cluster e cuida de um tipo de recurso, fazendo o que uma pessoa faria (criar, corrigir, atualizar).',
    analogia: 'Um zelador especializado: sabe exatamente como cuidar da piscina, sem ninguém pedir.',
  },

  // ---------- AWS ----------
  {
    id: 'aws', termo: 'AWS', padroes: ['aws', 'amazon web services'],
    definicao: 'A nuvem da Amazon: aluga máquinas, discos, redes e serviços prontos, pagando pelo uso.',
    analogia: 'Uma imobiliária gigante: você aluga o espaço que precisa, pelo tempo que precisar.',
  },
  {
    id: 'eks', termo: 'EKS', padroes: ['eks'],
    definicao: 'O Kubernetes gerenciado da AWS: a Amazon cuida do plano de controle e você cuida dos nós e dos Pods.',
    analogia: 'Um condomínio com administradora contratada: você só se preocupa com o seu apartamento.',
  },
  {
    id: 'iam', termo: 'IAM', padroes: ['iam'],
    definicao: 'O sistema de permissões da AWS: usuários, roles e políticas que dizem quem pode fazer o quê na conta.',
    analogia: 'A portaria da AWS, que confere o crachá antes de abrir cada porta.',
  },
  {
    id: 'irsa', termo: 'IRSA', padroes: ['irsa', 'pod identity'],
    definicao: 'Liga uma ServiceAccount do Kubernetes a uma role do IAM, para o Pod acessar a AWS sem chaves guardadas.',
    analogia: 'Um crachá do condomínio que também abre a garagem do vizinho, só para quem tem autorização.',
    exemplo: 'annotations:\n  eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/app',
  },
  {
    id: 'aws-auth', termo: 'aws-auth', padroes: ['aws-auth'],
    definicao: 'O ConfigMap que dizia quais usuários e roles do IAM entram no cluster EKS (hoje há também as access entries).',
    analogia: 'A lista de convidados na portaria.',
  },
  {
    id: 'node-group', termo: 'Grupo de nós (node group, node pool)', padroes: ['node ?groups?', 'node ?pools?', 'grupos? de n[óo]s'],
    definicao: 'Um conjunto de nós iguais (mesmo tamanho de máquina), que a nuvem cria, atualiza e escala junto.',
    analogia: 'Uma frota de vans do mesmo modelo: manutenção e troca são feitas para todas de uma vez.',
  },
  {
    id: 'addon', termo: 'Add-on', padroes: ['add-ons?', 'addons?'],
    definicao: 'Componentes extras instalados no cluster (rede, DNS, drivers de disco), muitas vezes gerenciados pela nuvem.',
    analogia: 'Os acessórios do carro: rádio, alarme, engate.',
  },
  {
    id: 'vpc', termo: 'VPC e sub-rede', padroes: ['vpcs?', 'sub-redes?', 'subnets?'],
    definicao: 'A rede privada da sua conta na nuvem, dividida em sub-redes (públicas, com saída para a internet, ou privadas).',
    analogia: 'O terreno cercado do condomínio, com as ruas internas.',
  },
  {
    id: 'cni', termo: 'CNI (rede dos Pods)', padroes: ['cni', 'vpc cni', 'kubenet'],
    definicao: 'O plugin que dá IP e rede aos Pods. No EKS, o VPC CNI dá a cada Pod um IP da própria VPC.',
    analogia: 'A companhia telefônica que distribui os ramais.',
  },
  {
    id: 'alb', termo: 'ALB', padroes: ['alb', 'application load balancer', 'aws load balancer controller'],
    definicao: 'O balanceador HTTP da AWS. O AWS Load Balancer Controller cria um ALB a partir de um Ingress.',
    analogia: 'A recepção do prédio comercial, que lê o crachá e manda cada visitante para o andar certo.',
  },
  {
    id: 'security-group', termo: 'Security group', padroes: ['security ?groups?', 'grupos? de seguran[çc]a'],
    definicao: 'O firewall de uma máquina (ou Pod) na AWS: diz quais portas e origens podem entrar.',
    analogia: 'O segurança da porta com a lista de quem pode entrar.',
  },
  {
    id: 'ebs', termo: 'EBS', padroes: ['ebs', 'gp3'],
    definicao: 'O disco da AWS que se pluga em uma máquina por vez, numa zona (como ReadWriteOnce).',
    analogia: 'Um HD externo: liga em um computador de cada vez.',
  },
  {
    id: 'efs', termo: 'EFS', padroes: ['efs'],
    definicao: 'O sistema de arquivos compartilhado da AWS: vários Pods, em vários nós e zonas, leem e escrevem juntos (RWX).',
    analogia: 'Uma pasta na rede da empresa que todo mundo abre ao mesmo tempo.',
  },

  // ---------- Azure ----------
  {
    id: 'azure', termo: 'Azure', padroes: ['azure', 'microsoft azure'],
    definicao: 'A nuvem da Microsoft, com máquinas, redes, bancos e serviços gerenciados, organizados em grupos de recursos.',
    analogia: 'Outra imobiliária gigante, com regras e nomes próprios.',
  },
  {
    id: 'aks', termo: 'AKS', padroes: ['aks'],
    definicao: 'O Kubernetes gerenciado da Azure: a Microsoft cuida do plano de controle, e você dos node pools e dos Pods.',
    analogia: 'O mesmo condomínio com administradora, só que de outra empresa.',
  },
  {
    id: 'entra-id', termo: 'Entra ID (Azure AD)', padroes: ['entra id', 'azure ad', 'aad', 'microsoft entra'],
    definicao: 'O serviço de identidades da Microsoft: contas de pessoas e de aplicações, que podem entrar no AKS.',
    analogia: 'O RH que emite os crachás de todos os funcionários.',
  },
  {
    id: 'identidade-gerenciada', termo: 'Identidade gerenciada (Workload Identity)', padroes: ['identidades? gerenciadas?', 'managed identity', 'workload identity'],
    definicao: 'Uma identidade da Azure ligada ao Pod (pela ServiceAccount), para acessar serviços sem senha no código.',
    analogia: 'Um crachá com digital: não precisa decorar senha nenhuma.',
  },
  {
    id: 'spot', termo: 'Spot', padroes: ['spot'],
    definicao: 'Máquinas que sobraram na nuvem, bem mais baratas, mas que podem ser tomadas de volta a qualquer momento.',
    analogia: 'A passagem de última hora: barata, mas você pode perder o lugar.',
  },
  {
    id: 'agic', termo: 'AGIC (Application Gateway)', padroes: ['agic', 'application gateway'],
    definicao: 'O controlador que transforma um Ingress em regras do Application Gateway, o balanceador HTTP da Azure.',
    analogia: 'O tradutor que passa as regras do porteiro para a recepção do prédio vizinho.',
  },
  {
    id: 'azure-disk-files', termo: 'Azure Disk e Azure Files', padroes: ['azure disk', 'azure files', 'managed-csi', 'azurefile'],
    definicao: 'Azure Disk é o disco de uma máquina por vez (RWO); Azure Files é a pasta compartilhada por vários Pods (RWX).',
    analogia: 'O HD externo e a pasta da rede, versão Microsoft.',
  },

  // ---------- Projetos ----------
  {
    id: 'microsservico', termo: 'Microsserviços', padroes: ['micro-?servi[çc]os?', 'microservices?'],
    definicao: 'Dividir a aplicação em serviços pequenos (frontend, API, banco), cada um com o seu Deployment e o seu Service.',
    analogia: 'Uma praça de alimentação: cada loja faz uma coisa, e todas atendem juntas.',
  },
  {
    id: 'frontend-backend', termo: 'Frontend e backend', padroes: ['frontend', 'backend'],
    definicao: 'Frontend é a parte que a pessoa vê (o site); backend é a que guarda e calcula (a API e o banco).',
    analogia: 'O salão do restaurante e a cozinha.',
  },
  {
    id: 'service-discovery', termo: 'Service discovery', padroes: ['service discovery', 'descoberta de servi[çc]os?'],
    definicao: 'Como um serviço acha o outro: pelo nome do Service no DNS ou pelas variáveis que o Kubernetes injeta no Pod.',
    analogia: 'A placa com o mapa das lojas na entrada do shopping.',
  },
  {
    id: 'ambientes', termo: 'Ambientes (dev, homologação, produção)', padroes: ['ambientes', 'produ[çc][ãa]o', 'homologa[çc][ãa]o', 'staging'],
    definicao: 'Cópias da aplicação para fases diferentes: dev para testar, homologação para conferir e produção para o público.',
    analogia: 'Ensaio, ensaio geral e estreia de uma peça de teatro.',
  },
  {
    id: 'multicloud', termo: 'Multicloud', padroes: ['multi-?cloud', 'multi-?nuvem', 'cloud-agnostic'],
    definicao: 'Usar mais de uma nuvem (AWS e Azure, por exemplo) com manifestos que funcionam nas duas.',
    analogia: 'Ter conta em dois bancos: se um sair do ar, você usa o outro.',
  },
  {
    id: 'ci-cd', termo: 'CI/CD (pipeline)', padroes: ['ci/cd', 'pipelines?', 'integra[çc][ãa]o cont[íi]nua', 'entrega cont[íi]nua'],
    definicao: 'A esteira automática que testa (CI) e publica (CD) cada mudança, sem passos manuais.',
    analogia: 'A linha de montagem de uma fábrica: cada etapa confere e passa para a próxima.',
  },

  // ---------- Comparação com o Terraform ----------
  {
    id: 'terraform', termo: 'Terraform', padroes: ['terraform'],
    definicao: 'Ferramenta de infraestrutura como código que cria a infraestrutura (redes, clusters, bancos); o Kubernetes cuida do que roda dentro do cluster.',
    analogia: 'O Terraform constrói o prédio; o Kubernetes administra quem mora nele.',
  },
  {
    id: 'iac', termo: 'Infraestrutura como Código (IaC)', padroes: ['infraestrutura como c[óo]digo', 'iac'],
    definicao: 'Criar servidores, redes e bancos escrevendo código, em vez de clicar num painel.',
    analogia: 'Uma receita de bolo: qualquer pessoa que seguir a receita chega no mesmo bolo, sempre.',
  },
  {
    id: 'provider', termo: 'Provider (provedor)', padroes: ['providers?', 'provedor(es)?'],
    definicao: 'No Terraform, o plugin que fala com uma plataforma (aws, azurerm, kubernetes).',
    analogia: 'Um tradutor: o Terraform fala uma língua só, e cada provider traduz para a plataforma certa.',
  },
  {
    id: 'workspace', termo: 'Workspace', padroes: ['workspaces?'],
    definicao: 'No Terraform, estados separados do mesmo código (dev, prod). No Kubernetes, o mais parecido é o namespace.',
    analogia: 'Cadernos diferentes para cada matéria, com a mesma capa.',
  },
  {
    id: 'state-backend', termo: 'Estado e backend remoto', padroes: ['tfstate', 'backend remoto', 'locking'],
    definicao: 'O Terraform guarda o que criou num arquivo de estado, de preferência remoto e com trava para duas pessoas não aplicarem juntas.',
    analogia: 'O livro de registro da obra, guardado no escritório, com uma pessoa escrevendo por vez.',
  },
  {
    id: 'imutavel', termo: 'Infraestrutura imutável', padroes: ['imut[áa]ve(l|is)', 'immutable'],
    definicao: 'Em vez de consertar uma máquina ou um Pod, você troca por um novo, feito da imagem atualizada.',
    analogia: 'Trocar a lâmpada queimada por uma nova, em vez de tentar consertar o filamento.',
  },
  {
    id: 'policy', termo: 'Política como código (OPA, Sentinel)', padroes: ['opa', 'sentinel', 'gatekeeper', 'kyverno', 'pol[íi]ticas? como c[óo]digo'],
    definicao: 'Regras escritas em código que barram o que não pode (imagem sem versão, Pod como root) antes de chegar ao cluster.',
    analogia: 'O fiscal da prefeitura que confere a planta antes de liberar a obra.',
  },
];

// Letras (com acento), dígitos, _ e $ contam como parte de uma palavra.
const LETRA = '[\\p{L}\\p{N}_$]';
const REGEX = new Map(GLOSSARIO.map((t) => [
  t.id,
  new RegExp(`(?<!${LETRA})(?:${t.padroes.join('|')})(?!${LETRA})`, 'iu'),
]));

// Nível de cada termo: o módulo em que ele aparece primeiro (a ordem do glossário).
const ORDEM_MODULOS = ['fundamentos', 'avancados', 'aws', 'azure', 'projeto-microservicos', 'projeto-multicloud', 'comparacao'];
const INICIO_DO_NIVEL = { fundamentos: 'kubernetes', avancados: 'rbac', aws: 'aws', azure: 'azure', 'projeto-microservicos': 'microsservico', 'projeto-multicloud': 'multicloud', comparacao: 'terraform' };
const NIVEL = new Map();
{
  let nivel = 0;
  for (const t of GLOSSARIO) {
    const novo = Object.entries(INICIO_DO_NIVEL).find(([, id]) => id === t.id);
    if (novo) nivel = ORDEM_MODULOS.indexOf(novo[0]);
    NIVEL.set(t.id, nivel);
  }
}

/**
 * Termos do glossário que aparecem no texto, na ordem em que aparecem.
 * Se passarem de `max`, ficam os do nível do módulo (ou o mais próximo dele):
 * num exercício de AWS, "IRSA" importa mais do que "Pod", já visto no começo.
 */
export function termosDoTexto(texto, { max = MAX_TERMOS, modulo } = {}) {
  const nivelItem = modulo ? ORDEM_MODULOS.indexOf(modulo) : Infinity;
  const prioridade = (t) => Math.min(NIVEL.get(t.id), nivelItem);
  return GLOSSARIO
    .map((t) => ({ termo: t, posicao: texto.search(REGEX.get(t.id)) }))
    .filter((x) => x.posicao >= 0)
    .sort((a, b) => prioridade(b.termo) - prioridade(a.termo) || a.posicao - b.posicao)
    .slice(0, max)
    .sort((a, b) => a.posicao - b.posicao)
    .map((x) => x.termo);
}
