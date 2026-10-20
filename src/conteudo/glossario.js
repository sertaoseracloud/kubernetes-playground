// Glossário: cada termo técnico com uma explicação simples, uma analogia do dia a dia e,
// quando ajuda, um exemplo curto de YAML. A descrição de cada lição e exercício mostra os
// termos que aparecem no texto dele (até MAX_TERMOS), para o iniciante nunca ficar com uma
// palavra sem explicação no primeiro uso.
//
// `padroes` são regex (sem flags; usamos 'iu'), testadas no texto visível do item.
// Bordas de palavra são tratadas em `termosDoTexto`, porque \b não entende acentos.
// `nivel` é o módulo em que o termo passa a importar: num exercício de AWS, "IRSA" vale
// mais do que "Pod", que o aluno já viu nos Fundamentos.

export const MAX_TERMOS = 8;

const NIVEIS = ['fundamentos', 'avancados', 'aws', 'azure'];

export const GLOSSARIO = [
  // ---------- Fundamentos: o cluster ----------
  {
    id: 'kubernetes', termo: 'Kubernetes (K8s)', nivel: 'fundamentos', padroes: ['kubernetes', 'k8s'],
    definicao: 'Um sistema que roda e cuida de containers em várias máquinas: decide onde cada um roda, reinicia o que cai e conecta tudo.',
    analogia: 'Um gerente de restaurante: você diz quantos pratos de cada tipo quer, e ele distribui o trabalho entre os cozinheiros e substitui quem faltar.',
  },
  {
    id: 'cluster', termo: 'Cluster', nivel: 'fundamentos', padroes: ['clusters?'],
    definicao: 'O conjunto de máquinas (nós) que o Kubernetes administra como se fossem uma só.',
    analogia: 'Um condomínio: vários prédios (nós), uma administração (control plane) e regras comuns para todos.',
  },
  {
    id: 'no', termo: 'Nó (node)', nivel: 'fundamentos', padroes: ['nó', 'nodes?', 'worker nodes?'],
    definicao: 'Uma máquina (física ou virtual) do cluster onde os Pods rodam de verdade.',
    analogia: 'Um fogão da cozinha: é onde as panelas (Pods) ficam no fogo.',
  },
  {
    id: 'control-plane', termo: 'Control plane', nivel: 'fundamentos', padroes: ['control plane', 'plano de controle'],
    definicao: 'O "cérebro" do cluster: API Server, etcd, Scheduler e controladores. Ele decide; os nós executam.',
    analogia: 'A torre de controle do aeroporto: não voa nenhum avião, mas diz quem decola, quando e por qual pista.',
  },
  {
    id: 'api-server', termo: 'API Server', nivel: 'fundamentos', padroes: ['api server', 'kube-apiserver'],
    definicao: 'A porta de entrada do cluster: todo kubectl apply passa por ele, que valida e grava o pedido.',
    analogia: 'O balcão de atendimento: ninguém entra na cozinha; os pedidos são entregues no balcão.',
  },
  {
    id: 'etcd', termo: 'etcd', nivel: 'fundamentos', padroes: ['etcd'],
    definicao: 'O banco de dados do cluster: guarda o estado desejado de todos os recursos.',
    analogia: 'O caderno de pedidos do restaurante: se não está anotado, ninguém vai preparar.',
  },
  {
    id: 'scheduler', termo: 'Scheduler', nivel: 'fundamentos', padroes: ['scheduler', 'kube-scheduler', 'escalonador'],
    definicao: 'Escolhe em qual nó cada Pod novo vai rodar, olhando CPU, memória e regras de afinidade.',
    analogia: 'O recepcionista que escolhe a mesa de cada grupo que chega, conforme o tamanho do grupo e as mesas livres.',
  },
  {
    id: 'kubelet', termo: 'kubelet', nivel: 'fundamentos', padroes: ['kubelet'],
    definicao: 'O agente que roda em cada nó: recebe a lista de Pods daquele nó e liga, vigia e reinicia os containers.',
    analogia: 'O chefe de cada fogão: confere se as panelas certas estão no fogo e troca a que queimou.',
  },
  {
    id: 'kubectl', termo: 'kubectl', nivel: 'fundamentos', padroes: ['kubectl'],
    definicao: 'A ferramenta de linha de comando para falar com o cluster: aplicar YAML, listar, descrever e apagar recursos.',
    analogia: 'O controle remoto da TV: você aperta botões (comandos) e a TV (cluster) obedece.',
    exemplo: 'kubectl apply -f pod.yaml\nkubectl get pods\nkubectl describe pod nginx-demo',
  },
  {
    id: 'container', termo: 'Container', nivel: 'fundamentos', padroes: ['containers?', 'contêineres?'],
    definicao: 'Um programa empacotado com tudo de que precisa para rodar (bibliotecas, configurações), isolado dos outros.',
    analogia: 'Uma marmita fechada: leva a comida e os talheres juntos, e funciona igual em qualquer mesa.',
  },
  {
    id: 'imagem', termo: 'Imagem', nivel: 'fundamentos', padroes: ['imagem', 'imagens', 'image'],
    definicao: 'O "molde" de onde o container é criado, com nome e versão (tag), como nginx:1.25.',
    analogia: 'A receita impressa: cada container é um prato feito a partir dela. A tag (1.25) é a edição da receita.',
    exemplo: 'image: nginx:1.25',
  },
  {
    id: 'yaml', termo: 'YAML', nivel: 'fundamentos', padroes: ['yaml'],
    definicao: 'O formato de texto dos manifestos: chave: valor, com a indentação (espaços) mostrando o que está dentro de quê.',
    analogia: 'Um índice de livro: os itens recuados são subitens do item de cima.',
    exemplo: 'metadata:\n  name: nginx-demo   # "name" está dentro de "metadata"',
  },
  {
    id: 'manifesto', termo: 'Manifesto', nivel: 'fundamentos', padroes: ['manifestos?'],
    definicao: 'Um arquivo YAML que descreve um recurso do jeito que você quer que ele exista.',
    analogia: 'Uma ficha de pedido preenchida: diz o que você quer, não como a cozinha vai fazer.',
  },
  {
    id: 'apiversion', termo: 'apiVersion', nivel: 'fundamentos', padroes: ['apiversion'],
    definicao: 'A versão da API que define o recurso. Pod, Service e ConfigMap usam v1; Deployment usa apps/v1.',
    analogia: 'A edição do formulário: o cartório só aceita a ficha no modelo certo.',
    exemplo: 'apiVersion: v1        # Pod, Service, ConfigMap\napiVersion: apps/v1   # Deployment',
  },
  {
    id: 'kind', termo: 'kind', nivel: 'fundamentos', padroes: ['kind'],
    definicao: 'O tipo do recurso que o manifesto descreve: Pod, Service, Deployment, ConfigMap...',
    analogia: 'O título do formulário: "Pedido de matrícula" é diferente de "Pedido de transferência".',
    exemplo: 'kind: Pod',
  },
  {
    id: 'metadata', termo: 'metadata', nivel: 'fundamentos', padroes: ['metadata'],
    definicao: 'Os dados de identificação do recurso: name (obrigatório), namespace, labels e annotations.',
    analogia: 'A etiqueta de uma caixa de mudança: nome, cômodo e observações.',
    exemplo: 'metadata:\n  name: nginx-demo\n  labels:\n    app: web',
  },
  {
    id: 'spec', termo: 'spec', nivel: 'fundamentos', padroes: ['spec'],
    definicao: 'A especificação: o estado desejado do recurso. Num Pod, a lista de containers; num Service, as portas e o selector.',
    analogia: 'O corpo do pedido: "2 pizzas grandes, uma sem cebola". É o que você quer de fato.',
  },
  {
    id: 'pod', termo: 'Pod', nivel: 'fundamentos', padroes: ['pods?'],
    definicao: 'A menor unidade do Kubernetes: um ou mais containers que nascem, rodam e morrem juntos, com o mesmo IP.',
    analogia: 'Uma vagem de ervilhas (pod, em inglês): as ervilhas (containers) ficam juntas na mesma casca.',
    exemplo: 'kind: Pod\nspec:\n  containers:\n    - name: nginx\n      image: nginx:1.25',
  },
  {
    id: 'containerport', termo: 'containerPort', nivel: 'fundamentos', padroes: ['containerport'],
    definicao: 'A porta em que o programa dentro do container escuta (o nginx escuta na 80). Serve de documentação e de alvo para o Service.',
    analogia: 'O número do apartamento: o prédio (Pod) tem um endereço, e a porta diz em qual apartamento bater.',
    exemplo: 'ports:\n  - containerPort: 80',
  },
  {
    id: 'namespace', termo: 'Namespace', nivel: 'fundamentos', padroes: ['namespaces?'],
    definicao: 'Uma divisão lógica do cluster: separa recursos de times ou ambientes (dev, produção). Nomes só precisam ser únicos dentro do namespace.',
    analogia: 'As pastas do computador: pode haver um "relatorio.txt" na pasta Trabalho e outro na pasta Pessoal.',
    exemplo: 'metadata:\n  name: nginx-dev\n  namespace: dev-env',
  },
  {
    id: 'label', termo: 'Label', nivel: 'fundamentos', padroes: ['labels?', 'rótulos?'],
    definicao: 'Um par chave: valor colado no recurso para identificá-lo e agrupá-lo, como app: api ou env: production.',
    analogia: 'As etiquetas coloridas de pastas: "azul = financeiro". Depois você procura "todas as azuis".',
    exemplo: 'metadata:\n  labels:\n    app: api\n    env: production',
  },
  {
    id: 'selector', termo: 'Selector', nivel: 'fundamentos', padroes: ['selectors?', 'seletor(es)?', 'matchlabels'],
    definicao: 'Um filtro de labels: "todos os Pods com app: api". É assim que Service e Deployment encontram os seus Pods.',
    analogia: 'O filtro de uma loja online: "mostrar só tamanho M, cor azul".',
    exemplo: 'selector:\n  app: api',
  },
  {
    id: 'annotation', termo: 'Annotation', nivel: 'fundamentos', padroes: ['annotations?', 'anotaç(ão|ões)'],
    definicao: 'Uma anotação chave: valor para guardar informação extra (autor, descrição, configuração de ferramenta). Não serve para filtrar.',
    analogia: 'Um post-it colado na pasta: dá contexto, mas ninguém organiza o arquivo pelos post-its.',
    exemplo: 'metadata:\n  annotations:\n    description: "Servidor web de teste"',
  },
  {
    id: 'requests-limits', termo: 'requests e limits', nivel: 'fundamentos', padroes: ['requests', 'limits'],
    definicao: 'requests é o mínimo de CPU e memória reservado para o container; limits é o máximo que ele pode usar.',
    analogia: 'Reserva de mesa (requests: garantido) e lotação máxima (limits: daqui não passa).',
    exemplo: 'resources:\n  requests: { cpu: "100m", memory: "128Mi" }\n  limits:   { cpu: "250m", memory: "256Mi" }',
  },
  {
    id: 'env', termo: 'Variável de ambiente', nivel: 'fundamentos', padroes: ['variáve(l|is) de ambiente'],
    definicao: 'Um valor (nome=valor) que o programa lê ao iniciar, como APP_MODE=production. Muda o comportamento sem mudar a imagem.',
    analogia: 'O bilhete deixado para quem vai cuidar da casa: "regue as plantas às 18h".',
    exemplo: 'env:\n  - name: APP_MODE\n    value: "production"',
  },
  {
    id: 'configmap', termo: 'ConfigMap', nivel: 'fundamentos', padroes: ['configmaps?'],
    definicao: 'Um recurso que guarda configurações (chave: valor) fora da imagem, para os Pods lerem como variável ou arquivo.',
    analogia: 'O quadro de avisos da empresa: muda o aviso e todo mundo lê a versão nova, sem reimprimir os crachás.',
    exemplo: 'kind: ConfigMap\ndata:\n  DATABASE_HOST: db.exemplo.com',
  },
  {
    id: 'secret', termo: 'Secret', nivel: 'fundamentos', padroes: ['secrets?'],
    definicao: 'Parecido com o ConfigMap, mas para dados sensíveis (senhas, tokens). O acesso pode ser restrito por RBAC.',
    analogia: 'O cofre do escritório: guarda o que não pode ficar no quadro de avisos.',
  },
  {
    id: 'estado-desejado', termo: 'Estado desejado', nivel: 'fundamentos', padroes: ['estado desejado', 'declarativo'],
    definicao: 'O que você escreveu no manifesto. O Kubernetes compara com o que existe (estado real) e corrige a diferença.',
    analogia: 'O termostato do ar-condicionado: você diz 23 °C e ele liga e desliga sozinho até chegar lá.',
  },
  {
    id: 'reconciliacao', termo: 'Reconciliação', nivel: 'fundamentos', padroes: ['reconciliação', 'controladores?'],
    definicao: 'O ciclo dos controladores: olhar o estado real, comparar com o desejado e agir até ficarem iguais. Nunca para.',
    analogia: 'O piloto automático do carro: corrige o volante o tempo todo para continuar na faixa.',
  },
  {
    id: 'diff', termo: 'Diff', nivel: 'fundamentos', padroes: ['diff'],
    definicao: 'A prévia do que um apply vai mudar: o que será criado, alterado ou removido. Como o terraform plan.',
    analogia: 'Conferir o carrinho antes de pagar: você vê o que vai entrar no pedido antes de confirmar.',
    exemplo: 'kubectl diff -f pod.yaml',
  },
  {
    id: 'drift', termo: 'Drift', nivel: 'fundamentos', padroes: ['drift'],
    definicao: 'Quando o que está rodando no cluster ficou diferente do que está escrito no YAML (alguém mudou à mão, por exemplo).',
    analogia: 'A planta da casa diz parede branca, mas alguém pintou de azul: a casa "derivou" da planta.',
  },
  {
    id: 'restartpolicy', termo: 'restartPolicy', nivel: 'fundamentos', padroes: ['restartpolicy', 'restart policy'],
    definicao: 'O que o kubelet faz quando um container termina: Always (sempre reinicia), OnFailure (só se deu erro) ou Never.',
    analogia: 'A regra do despertador: tocar todo dia, só se você não levantou, ou nunca.',
    exemplo: 'spec:\n  restartPolicy: OnFailure',
  },
  {
    id: 'volume', termo: 'Volume', nivel: 'fundamentos', padroes: ['volumes?', 'volumemounts?'],
    definicao: 'Um diretório que o Pod disponibiliza para os containers. É declarado em spec.volumes e montado com volumeMounts.',
    analogia: 'Uma gaveta compartilhada: o Pod tem a gaveta, e cada container decide em que lugar da mesa ela fica (mountPath).',
    exemplo: 'volumes:\n  - name: dados\n    emptyDir: {}\n# no container:\nvolumeMounts:\n  - name: dados\n    mountPath: /dados',
  },
  {
    id: 'emptydir', termo: 'emptyDir', nivel: 'fundamentos', padroes: ['emptydir'],
    definicao: 'Um volume vazio, criado junto com o Pod e apagado com ele. Serve para os containers do mesmo Pod trocarem arquivos.',
    analogia: 'Uma lousa da sala de reunião: todos escrevem nela durante a reunião, e ela é apagada no fim.',
  },
  {
    id: 'init-container', termo: 'Init container', nivel: 'fundamentos', padroes: ['initcontainers?', 'init containers?'],
    definicao: 'Um container que roda e termina antes dos containers principais, para preparar algo (arquivos, espera por um banco).',
    analogia: 'Quem arruma a mesa antes do jantar: termina o trabalho e sai antes de os convidados chegarem.',
  },
  {
    id: 'sidecar', termo: 'Sidecar', nivel: 'fundamentos', padroes: ['sidecars?'],
    definicao: 'Um container auxiliar que roda ao lado do principal no mesmo Pod (coletar logs, fazer proxy).',
    analogia: 'O sidecar da moto: vai junto, no mesmo passeio, com uma função de apoio.',
  },
  {
    id: 'probe', termo: 'Probe', nivel: 'fundamentos', padroes: ['probes?', 'livenessprobe', 'readinessprobe', 'startupprobe', 'health ?checks?'],
    definicao: 'Uma checagem periódica do container. liveness: está vivo? (senão, reinicia). readiness: pode receber tráfego? (senão, sai do Service).',
    analogia: 'O médico medindo o pulso (liveness) e perguntando "já pode voltar ao trabalho?" (readiness).',
    exemplo: 'livenessProbe:\n  httpGet:\n    path: /\n    port: 80',
  },
  {
    id: 'service', termo: 'Service', nivel: 'fundamentos', padroes: ['services?'],
    definicao: 'Um endereço fixo (nome e IP) que entrega o tráfego aos Pods escolhidos pelo selector, mesmo quando eles são recriados.',
    analogia: 'O telefone fixo de uma empresa: os atendentes mudam, mas o número continua o mesmo.',
    exemplo: 'kind: Service\nspec:\n  selector:\n    app: api\n  ports:\n    - port: 80\n      targetPort: 80',
  },
  {
    id: 'port-targetport', termo: 'port e targetPort', nivel: 'fundamentos', padroes: ['targetport'],
    definicao: 'port é a porta em que o Service atende; targetPort é a porta do container para onde ele encaminha.',
    analogia: 'O ramal da recepção (port) que transfere a ligação para a mesa da pessoa (targetPort).',
  },
  {
    id: 'clusterip', termo: 'ClusterIP', nivel: 'fundamentos', padroes: ['clusterip'],
    definicao: 'O tipo padrão de Service: um IP que só existe dentro do cluster.',
    analogia: 'O ramal interno da empresa: funciona de mesa para mesa, mas não recebe ligação da rua.',
  },
  {
    id: 'nodeport', termo: 'NodePort', nivel: 'fundamentos', padroes: ['nodeport'],
    definicao: 'Service que abre a mesma porta (30000 a 32767) em todos os nós, para acessar de fora do cluster.',
    analogia: 'Uma porta lateral numerada em todos os prédios do condomínio.',
  },
  {
    id: 'loadbalancer', termo: 'LoadBalancer', nivel: 'fundamentos', padroes: ['loadbalancer', 'balanceador( de carga)?'],
    definicao: 'Service que pede à nuvem um balanceador com IP público, distribuindo o tráfego entre os Pods.',
    analogia: 'A recepção do shopping que encaminha cada visitante para um caixa livre.',
  },
  {
    id: 'dns', termo: 'DNS do cluster', nivel: 'fundamentos', padroes: ['dns', 'coredns'],
    definicao: 'Todo Service ganha um nome: servico.namespace.svc.cluster.local. Os Pods se acham pelo nome, não pelo IP.',
    analogia: 'A agenda do celular: você liga para "Maria", não decora o número.',
  },
  {
    id: 'ingress', termo: 'Ingress', nivel: 'fundamentos', padroes: ['ingress(es)?'],
    definicao: 'Regras de entrada HTTP: qual domínio e caminho vão para qual Service. Precisa de um Ingress Controller.',
    analogia: 'A placa de direção na entrada do hospital: "Pediatria, 2º andar; Raio-X, térreo".',
  },
  {
    id: 'deployment', termo: 'Deployment', nivel: 'fundamentos', padroes: ['deployments?'],
    definicao: 'Um controlador que mantém N cópias de um Pod rodando e troca as versões aos poucos (rolling update).',
    analogia: 'O gerente de turno: garante que sempre há 3 caixas abertos e troca os funcionários sem fechar a loja.',
    exemplo: 'kind: Deployment\nspec:\n  replicas: 3\n  selector:\n    matchLabels: { app: web }\n  template: ...',
  },
  {
    id: 'replica', termo: 'Réplica', nivel: 'fundamentos', padroes: ['réplicas?', 'replicas'],
    definicao: 'Uma cópia idêntica do Pod. Mais réplicas: mais capacidade e menos risco se uma cair.',
    analogia: 'Vários caixas abertos no supermercado: se um para, a fila anda nos outros.',
  },
  {
    id: 'replicaset', termo: 'ReplicaSet', nivel: 'fundamentos', padroes: ['replicasets?'],
    definicao: 'O controlador que o Deployment cria para manter o número certo de Pods de uma versão.',
    analogia: 'O supervisor de uma equipe: conta as pessoas e chama reforço quando falta alguém.',
  },
  {
    id: 'template', termo: 'template (do Pod)', nivel: 'fundamentos', padroes: ['template'],
    definicao: 'Dentro do Deployment, o "molde" dos Pods que ele cria: metadata.labels e spec.containers, como num Pod.',
    analogia: 'O carimbo: cada Pod novo é uma impressão igual do carimbo.',
  },
  {
    id: 'rolling-update', termo: 'Rolling update', nivel: 'fundamentos', padroes: ['rolling ?updates?', 'rollingupdate'],
    definicao: 'Trocar a versão aos poucos: sobe um Pod novo, tira um antigo, até todos estarem atualizados, sem parar o serviço.',
    analogia: 'Trocar os pneus de um ônibus um de cada vez, com o ônibus em uso.',
  },
  {
    id: 'rollback', termo: 'Rollback', nivel: 'fundamentos', padroes: ['rollbacks?', 'rollout undo'],
    definicao: 'Voltar para a versão anterior quando a nova deu problema.',
    analogia: 'O "desfazer" (Ctrl+Z) do editor de texto.',
  },
  {
    id: 'hpa', termo: 'HPA', nivel: 'fundamentos', padroes: ['hpa', 'horizontalpodautoscaler', 'autoscal(er|ing)'],
    definicao: 'HorizontalPodAutoscaler: aumenta ou diminui as réplicas sozinho conforme o uso de CPU ou memória.',
    analogia: 'O gerente que abre mais caixas quando a fila cresce e fecha quando esvazia.',
  },
  {
    id: 'affinity', termo: 'Afinidade (affinity)', nivel: 'fundamentos', padroes: ['affinity', 'afinidade', 'nodeaffinity'],
    definicao: 'Regras que dizem em quais nós um Pod prefere (ou precisa) rodar, ou de quais Pods ele quer ficar perto ou longe.',
    analogia: 'Escolher a mesa no restaurante: "perto da janela" (preferência) ou "precisa ser acessível" (obrigatório).',
  },
  {
    id: 'securitycontext', termo: 'securityContext', nivel: 'fundamentos', padroes: ['securitycontext'],
    definicao: 'Configurações de segurança do Pod ou container: rodar sem ser root, disco só leitura, sem privilégios extras.',
    analogia: 'O crachá de visitante: entra no prédio, mas não abre todas as portas.',
  },
  {
    id: 'pdb', termo: 'PodDisruptionBudget', nivel: 'fundamentos', padroes: ['poddisruptionbudget', 'pdb'],
    definicao: 'Garante um mínimo de Pods de pé durante manutenções planejadas (como esvaziar um nó).',
    analogia: 'A regra do hospital: nunca menos de 2 médicos de plantão, nem na troca de turno.',
  },
  {
    id: 'daemonset', termo: 'DaemonSet', nivel: 'fundamentos', padroes: ['daemonsets?'],
    definicao: 'Roda exatamente um Pod em cada nó (ou nos nós escolhidos): ótimo para agentes de log e monitoramento.',
    analogia: 'Um extintor em cada andar do prédio.',
  },
  {
    id: 'resourcequota', termo: 'ResourceQuota', nivel: 'fundamentos', padroes: ['resourcequotas?', 'quotas?', 'cotas?'],
    definicao: 'Um teto de recursos para um namespace inteiro: total de CPU, memória ou número de Pods.',
    analogia: 'O orçamento mensal de um departamento: cada pessoa gasta, mas o total não passa do teto.',
  },

  {
    id: 'priorityclass', termo: 'PriorityClass', nivel: 'fundamentos', padroes: ['priorityclass(es)?', 'priorityclassname'],
    definicao: 'Um número de importância para Pods. Quando falta espaço, os de prioridade maior são agendados primeiro.',
    analogia: 'A fila preferencial do banco: quem tem prioridade é atendido antes.',
  },
  {
    id: 'topology-spread', termo: 'topologySpreadConstraints', nivel: 'fundamentos', padroes: ['topologyspreadconstraints', 'maxskew'],
    definicao: 'Regras para espalhar as réplicas entre zonas ou nós, para uma queda não derrubar todas.',
    analogia: 'Não guardar todos os ovos na mesma cesta.',
  },
  {
    id: 'headless', termo: 'Headless Service', nivel: 'fundamentos', padroes: ['headless'],
    definicao: 'Um Service sem IP próprio (clusterIP: None): o DNS responde com o IP de cada Pod.',
    analogia: 'Uma lista com o telefone de cada atendente, em vez da central única.',
  },
  {
    id: 'externalname', termo: 'ExternalName', nivel: 'fundamentos', padroes: ['externalname'],
    definicao: 'Um Service que é só um apelido de DNS para um endereço de fora do cluster.',
    analogia: 'Um atalho na área de trabalho que aponta para um site.',
  },
  {
    id: 'endpointslice', termo: 'EndpointSlice', nivel: 'fundamentos', padroes: ['endpointslices?', 'endpoints'],
    definicao: 'A lista de IPs dos Pods prontos que um Service atende, mantida automaticamente a partir do selector.',
    analogia: 'A lista de chamada da turma, atualizada a cada entrada e saída.',
  },
  {
    id: 'canary', termo: 'Canary e blue-green', nivel: 'fundamentos', padroes: ['canary', 'blue-green'],
    definicao: 'Jeitos de lançar uma versão nova com segurança: para poucos usuários primeiro (canary) ou com troca total e volta rápida (blue-green).',
    analogia: 'Provar a comida antes de servir para todos os convidados.',
  },
  {
    id: 'downward-api', termo: 'Downward API', nivel: 'fundamentos', padroes: ['downward api', 'fieldref'],
    definicao: 'Entrega ao container dados do próprio Pod (nome, namespace, nó) como variável ou arquivo.',
    analogia: 'O crachá entregue pelo RH: você não escolhe o número, mas pode lê-lo.',
  },
  {
    id: 'prestop', termo: 'preStop', nivel: 'fundamentos', padroes: ['prestop', 'terminationgraceperiodseconds'],
    definicao: 'Um comando que roda antes de o container ser desligado, para terminar o trabalho em andamento.',
    analogia: 'Virar a placa para "fechado" e esperar os clientes saírem antes de apagar a luz.',
  },
  {
    id: 'hostpath', termo: 'hostPath', nivel: 'fundamentos', padroes: ['hostpath'],
    definicao: 'Um volume que monta uma pasta do próprio nó dentro do container. Prende o Pod àquela máquina.',
    analogia: 'Usar a gaveta da mesa de um colega: só funciona sentado na mesa dele.',
  },

  // ---------- Recursos avançados ----------
  {
    id: 'rbac', termo: 'RBAC', nivel: 'avancados', padroes: ['rbac'],
    definicao: 'Controle de acesso por papéis: quem (usuário ou ServiceAccount) pode fazer o quê (verbos) em quais recursos.',
    analogia: 'Os crachás de um hospital: o enfermeiro abre a farmácia, o visitante não.',
  },
  {
    id: 'role', termo: 'Role e RoleBinding', nivel: 'avancados', padroes: ['roles?', 'rolebindings?', 'clusterroles?', 'clusterrolebindings?'],
    definicao: 'A Role lista permissões (verbos em recursos); o RoleBinding entrega essa Role a alguém. ClusterRole vale para o cluster todo.',
    analogia: 'A Role é a descrição do cargo; o RoleBinding é a pessoa sendo contratada para esse cargo.',
  },
  {
    id: 'serviceaccount', termo: 'ServiceAccount', nivel: 'avancados', padroes: ['serviceaccounts?', 'service accounts?'],
    definicao: 'A identidade de um Pod (de um programa, não de uma pessoa) ao falar com a API do Kubernetes ou da nuvem.',
    analogia: 'O crachá de um robô da fábrica: diz quem ele é e o que pode fazer.',
  },
  {
    id: 'statefulset', termo: 'StatefulSet', nivel: 'avancados', padroes: ['statefulsets?'],
    definicao: 'Como o Deployment, mas cada Pod tem nome fixo (db-0, db-1) e o próprio disco. Para bancos de dados.',
    analogia: 'Cadeiras numeradas no cinema: cada pessoa volta sempre para a mesma cadeira.',
  },
  {
    id: 'pvc', termo: 'PersistentVolumeClaim (PVC)', nivel: 'avancados', padroes: ['pvcs?', 'persistentvolumeclaims?', 'persistentvolumes?'],
    definicao: 'Um pedido de disco persistente: "quero 10 GiB". O cluster entrega um volume que sobrevive ao Pod.',
    analogia: 'Alugar um guarda-volumes: você pede o tamanho, recebe a chave, e as coisas ficam lá mesmo que você saia.',
  },
  {
    id: 'storageclass', termo: 'StorageClass', nivel: 'avancados', padroes: ['storageclass(es)?'],
    definicao: 'O "tipo de disco" que o cluster sabe criar (SSD, HDD, de qual provedor). O PVC escolhe uma StorageClass.',
    analogia: 'O cardápio de quartos do hotel: standard, luxo, suíte.',
  },
  {
    id: 'job', termo: 'Job e CronJob', nivel: 'avancados', padroes: ['jobs?', 'cronjobs?'],
    definicao: 'O Job roda uma tarefa até terminar (backup, migração). O CronJob cria Jobs num horário (agenda cron).',
    analogia: 'Job: chamar o eletricista uma vez. CronJob: a faxina toda segunda às 8h.',
    exemplo: 'schedule: "0 3 * * *"   # todo dia às 3h',
  },
  {
    id: 'networkpolicy', termo: 'NetworkPolicy', nivel: 'avancados', padroes: ['networkpolic(y|ies)', 'network polic(y|ies)'],
    definicao: 'Regras de firewall entre Pods: quem pode falar com quem e em quais portas.',
    analogia: 'A portaria do condomínio com lista de visitantes autorizados para cada apartamento.',
  },
  {
    id: 'gitops', termo: 'GitOps', nivel: 'avancados', padroes: ['gitops'],
    definicao: 'O Git é a fonte da verdade: um agente no cluster lê o repositório e aplica sozinho o que estiver lá.',
    analogia: 'A partitura na estante: a orquestra toca o que está escrito; para mudar a música, muda-se a partitura.',
  },
  {
    id: 'argocd', termo: 'Argo CD', nivel: 'avancados', padroes: ['argo ?cd'],
    definicao: 'Ferramenta de GitOps: compara o Git com o cluster, mostra o drift e sincroniza.',
    analogia: 'Um fiscal de obra que compara a construção com a planta todos os dias.',
  },
  {
    id: 'flux', termo: 'Flux', nivel: 'avancados', padroes: ['flux'],
    definicao: 'Outra ferramenta de GitOps, montada com controladores (GitRepository, Kustomization, HelmRelease).',
    analogia: 'Uma equipe de fiscais, cada um cuidando de uma parte da obra.',
  },
  {
    id: 'helm', termo: 'Helm', nivel: 'avancados', padroes: ['helm', 'charts?'],
    definicao: 'Um gerenciador de pacotes para Kubernetes: um chart é um modelo de manifestos com valores configuráveis.',
    analogia: 'Um formulário com lacunas: você preenche os valores e sai o documento pronto.',
  },
  {
    id: 'kustomize', termo: 'Kustomize', nivel: 'avancados', padroes: ['kustomize', 'kustomization', 'overlays?'],
    definicao: 'Monta variações de manifestos (dev, produção) a partir de uma base, com pequenos "remendos" (overlays).',
    analogia: 'A mesma roupa com ajustes do alfaiate para cada pessoa.',
  },
  {
    id: 'crd', termo: 'CRD', nivel: 'avancados', padroes: ['crds?', 'customresourcedefinitions?', 'operador(es)?', 'operators?'],
    definicao: 'CustomResourceDefinition: ensina ao Kubernetes um tipo novo de recurso. Um operador é o controlador que cuida dele.',
    analogia: 'Acrescentar um prato novo ao cardápio e treinar um cozinheiro só para ele.',
  },

  // ---------- AWS ----------
  {
    id: 'eks', termo: 'EKS', nivel: 'aws', padroes: ['eks'],
    definicao: 'Amazon Elastic Kubernetes Service: a AWS cuida do control plane; você cuida dos nós e dos manifestos.',
    analogia: 'Alugar uma cozinha montada: o prédio e a gerência são do shopping; o cardápio é seu.',
  },
  {
    id: 'irsa', termo: 'IRSA', nivel: 'aws', padroes: ['irsa', 'role-arn', 'iam'],
    definicao: 'IAM Roles for Service Accounts: dá a um Pod permissões da AWS (S3, DynamoDB) pela ServiceAccount, sem chave guardada.',
    analogia: 'Um crachá temporário emitido na portaria, em vez de uma cópia da chave mestra.',
    exemplo: 'metadata:\n  annotations:\n    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/app',
  },
  {
    id: 'alb', termo: 'ALB', nivel: 'aws', padroes: ['alb'],
    definicao: 'Application Load Balancer da AWS. O AWS Load Balancer Controller cria um ALB a partir de um Ingress.',
    analogia: 'A recepção do prédio comercial que manda cada visitante para o andar certo.',
  },
  {
    id: 'ebs', termo: 'EBS', nivel: 'aws', padroes: ['ebs', 'gp3'],
    definicao: 'Disco de bloco da AWS, ligado a um nó por vez (ReadWriteOnce). Usado via CSI driver e StorageClass.',
    analogia: 'Um HD externo: só um computador usa por vez.',
  },
  {
    id: 'efs', termo: 'EFS', nivel: 'aws', padroes: ['efs'],
    definicao: 'Sistema de arquivos de rede da AWS: vários Pods em vários nós leem e escrevem ao mesmo tempo (ReadWriteMany).',
    analogia: 'Uma pasta compartilhada na rede do escritório.',
  },
  {
    id: 'vpc-cni', termo: 'VPC CNI', nivel: 'aws', padroes: ['vpc cni', 'cni'],
    definicao: 'O plugin de rede que dá a cada Pod um IP de verdade da VPC.',
    analogia: 'Cada morador ganha um endereço próprio da rua, em vez de dividir o do prédio.',
  },
  {
    id: 'arn', termo: 'ARN', nivel: 'aws', padroes: ['arns?'],
    definicao: 'Amazon Resource Name: o "endereço completo" de qualquer coisa na AWS, como arn:aws:iam::123456789012:role/Leitores.',
    analogia: 'O CPF de um recurso: identifica um só, em toda a AWS.',
  },
  {
    id: 'access-entry', termo: 'Access entry e aws-auth', nivel: 'aws', padroes: ['access entr(y|ies)', 'accessentry', 'aws-auth', 'access polic(y|ies)'],
    definicao: 'Como o EKS decide quem entra no cluster: o ConfigMap aws-auth (jeito antigo) ou as access entries da API do EKS, com políticas prontas de acesso.',
    analogia: 'A lista da portaria do prédio: diz quem entra e em quais andares.',
    exemplo: 'spec:\n  principalARN: arn:aws:iam::123456789012:role/Leitores\n  accessPolicies:\n    - policyARN: arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy',
  },
  {
    id: 'ack', termo: 'ACK', nivel: 'aws', padroes: ['ack', 'aws controllers for kubernetes'],
    definicao: 'AWS Controllers for Kubernetes: operadores que leem recursos YAML do cluster (Nodegroup, AccessEntry...) e criam o equivalente na AWS.',
    analogia: 'Um despachante: você preenche o formulário no balcão do cluster e ele resolve na repartição da AWS.',
  },
  {
    id: 'pod-identity', termo: 'EKS Pod Identity', nivel: 'aws', padroes: ['pod identity', 'podidentityassociation'],
    definicao: 'Liga uma ServiceAccount a uma role do IAM por uma associação no EKS, sem annotation e sem provedor OIDC por cluster.',
    analogia: 'Uma lista na portaria: o porteiro acha o nome e entrega a chave certa, sem precisar de crachá com foto.',
  },
  {
    id: 'node-group', termo: 'Managed node group', nivel: 'aws', padroes: ['node groups?', 'nodegroups?'],
    definicao: 'Um grupo de máquinas EC2 iguais que a AWS cria, escala (mínimo, máximo, desejado) e atualiza para o cluster.',
    analogia: 'Uma frota de carros alugados do mesmo modelo: a locadora faz a manutenção.',
  },
  {
    id: 'taint', termo: 'Taint e toleration', nivel: 'avancados', padroes: ['taints?', 'tolerations?'],
    definicao: 'O taint é uma marca no nó que afasta os Pods; a toleration no Pod é a permissão para entrar mesmo assim.',
    analogia: 'Uma placa de "acesso restrito" na porta (taint) e o crachá que libera a entrada (toleration).',
    exemplo: 'tolerations:\n  - key: dedicado\n    operator: Equal\n    value: gpu\n    effect: NoSchedule',
  },
  {
    id: 'nodeselector', termo: 'nodeSelector', nivel: 'avancados', padroes: ['nodeselector'],
    definicao: 'Um mapa de labels no spec do Pod: ele só pode rodar em nós que tenham todas essas labels.',
    analogia: 'Pedir mesa "na varanda": o recepcionista só oferece mesas com essa etiqueta.',
  },
  {
    id: 'karpenter', termo: 'Karpenter', nivel: 'aws', padroes: ['karpenter', 'nodepools?', 'ec2nodeclass', 'nodeclaims?'],
    definicao: 'Um autoscaler de nós que olha os Pods Pending e compra a máquina certa na hora. NodePool diz quais máquinas; EC2NodeClass diz como.',
    analogia: 'Chamar um carro de aplicativo do tamanho do grupo, em vez de manter uma frota parada.',
  },
  {
    id: 'cluster-autoscaler', termo: 'Cluster Autoscaler', nivel: 'aws', padroes: ['cluster autoscaler', 'cluster-autoscaler'],
    definicao: 'Aumenta e diminui o tamanho dos node groups que já existem, conforme há Pods sem lugar ou nós ociosos.',
    analogia: 'O gerente que chama mais um ônibus igual aos outros quando a fila cresce.',
  },
  {
    id: 'spot', termo: 'Spot', nivel: 'aws', padroes: ['spot'],
    definicao: 'Capacidade que sobra na nuvem, com grande desconto, mas que pode ser recolhida com pouco aviso.',
    analogia: 'A passagem de última hora: muito mais barata, mas a companhia pode remarcar.',
  },
  {
    id: 'nlb', termo: 'NLB', nivel: 'aws', padroes: ['nlb', 'network load balancer'],
    definicao: 'Network Load Balancer da AWS: balanceia conexões TCP e UDP, muito rápido, sem olhar caminhos HTTP. Nasce de um Service LoadBalancer.',
    analogia: 'Uma esteira que só leva o pacote adiante, sem abrir a carta.',
  },
  {
    id: 'security-group', termo: 'Security group', nivel: 'aws', padroes: ['security groups?', 'securitygrouppolicy'],
    definicao: 'O firewall da AWS ligado a uma placa de rede: diz quais portas e origens podem entrar e sair.',
    analogia: 'O segurança na porta de cada sala, com a lista de quem pode entrar.',
  },
  {
    id: 'ingressclass', termo: 'IngressClass', nivel: 'avancados', padroes: ['ingressclass(es)?', 'ingressclassname', 'ingressclassparams'],
    definicao: 'Diz qual controlador cuida de um Ingress (ALB, NGINX, AGIC...) e, com parâmetros, as escolhas fixas daquela classe.',
    analogia: 'A bandeira do táxi: diz de qual cooperativa ele é e quais regras segue.',
  },
  {
    id: 'target-group', termo: 'Target group', nivel: 'aws', padroes: ['target groups?', 'targetgroupbinding'],
    definicao: 'A lista de destinos (IPs ou máquinas) para onde um ALB ou NLB manda o tráfego.',
    analogia: 'A lista de caixas abertos para onde o fiscal manda cada cliente da fila.',
  },
  {
    id: 'csi', termo: 'CSI driver', nivel: 'avancados', padroes: ['csi'],
    definicao: 'Container Storage Interface: o plugin que cria e liga discos e arquivos do provedor (EBS, EFS, Azure Disk) aos Pods.',
    analogia: 'O adaptador de tomada: cada país tem o seu, e o aparelho (o Pod) não precisa saber.',
  },
  {
    id: 'snapshot', termo: 'Snapshot de volume', nivel: 'avancados', padroes: ['snapshots?', 'volumesnapshots?', 'volumesnapshotclass'],
    definicao: 'Uma foto do disco num instante. Serve de backup e para criar um disco novo com os mesmos dados.',
    analogia: 'Tirar uma foto do quadro antes de apagar: dá para copiar tudo de novo depois.',
  },
  {
    id: 'kms', termo: 'KMS', nivel: 'aws', padroes: ['kms'],
    definicao: 'O serviço de chaves de criptografia da AWS. Discos, snapshots e segredos podem ser cifrados com uma chave sua.',
    analogia: 'O chaveiro do cofre da empresa: sem a chave certa, o cofre não abre.',
  },
  {
    id: 'cloudwatch', termo: 'CloudWatch e Container Insights', nivel: 'aws', padroes: ['cloudwatch', 'container insights', 'fluent ?bit'],
    definicao: 'O serviço de logs e métricas da AWS. O Container Insights coleta dados dos nós e Pods; o Fluent Bit leva os logs.',
    analogia: 'O painel e a caixa-preta do avião.',
  },
  {
    id: 'opentelemetry', termo: 'OpenTelemetry e ADOT', nivel: 'aws', padroes: ['opentelemetry', 'adot', 'otlp', 'x-ray'],
    definicao: 'O padrão aberto para coletar traces, métricas e logs. ADOT é a versão da AWS; o coletor recebe em OTLP e manda ao X-Ray e ao CloudWatch.',
    analogia: 'O rastreio de uma encomenda: cada parada (serviço) registra por onde o pacote (a requisição) passou.',
  },
  {
    id: 'pss', termo: 'Pod Security Standards', nivel: 'aws', padroes: ['pod security( standards| admission)?', 'pss', 'restricted', 'baseline'],
    definicao: 'Três níveis de regras de segurança para Pods (privileged, baseline e restricted), aplicados por labels no Namespace.',
    analogia: 'O fiscal da obra: confere os equipamentos de segurança na entrada e barra quem está sem.',
    exemplo: 'metadata:\n  labels:\n    pod-security.kubernetes.io/enforce: restricted',
  },
  {
    id: 'secrets-manager', termo: 'Secrets Manager e SecretProviderClass', nivel: 'aws', padroes: ['secrets manager', 'secretproviderclass', 'secrets store'],
    definicao: 'O cofre de senhas da AWS. Com o Secrets Store CSI Driver, a SecretProviderClass diz quais segredos montar no Pod como arquivos.',
    analogia: 'Um cofre no banco: o Pod mostra a identidade e recebe só a senha que pode ver.',
  },
  {
    id: 'consolidacao', termo: 'Consolidação e disruption', nivel: 'aws', padroes: ['consolidação', 'consolidar', 'consolidation', 'disruption'],
    definicao: 'Quando o Karpenter junta Pods em menos nós e desliga os que sobram, dentro dos limites de budgets e PDBs.',
    analogia: 'Juntar os passageiros de dois ônibus meio vazios num só e liberar o outro.',
  },

  // ---------- Azure ----------
  {
    id: 'aks', termo: 'AKS', nivel: 'azure', padroes: ['aks'],
    definicao: 'Azure Kubernetes Service: o Kubernetes gerenciado da Microsoft Azure.',
    analogia: 'O mesmo aluguel de cozinha montada, agora em outro shopping.',
  },
  {
    id: 'entra', termo: 'Microsoft Entra ID', nivel: 'azure', padroes: ['entra( id)?', 'aad', 'azure ad'],
    definicao: 'O serviço de identidade da Azure (antigo Azure AD). No AKS, autentica pessoas e, com Workload Identity, Pods.',
    analogia: 'O RH que emite os crachás de todos os funcionários.',
  },
  {
    id: 'workload-identity', termo: 'Workload Identity', nivel: 'azure', padroes: ['workload identity', 'identidade gerenciada', 'managed identity'],
    definicao: 'Dá ao Pod uma identidade da Azure pela ServiceAccount, sem senha guardada no cluster.',
    analogia: 'O crachá temporário da portaria, versão Azure.',
  },
  {
    id: 'agic', termo: 'AGIC', nivel: 'azure', padroes: ['agic', 'application gateway'],
    definicao: 'Application Gateway Ingress Controller: transforma um Ingress em regras do Application Gateway da Azure.',
    analogia: 'A recepção do prédio, agora configurada a partir das placas (Ingress).',
  },
  {
    id: 'azure-disk', termo: 'Azure Disk e Azure Files', nivel: 'azure', padroes: ['azure disk', 'azure files', 'managed-csi', 'azurefile'],
    definicao: 'Azure Disk: disco de um nó por vez (ReadWriteOnce). Azure Files: compartilhamento de rede para vários Pods (ReadWriteMany).',
    analogia: 'O HD externo e a pasta compartilhada, versão Azure.',
  },
  {
    id: 'node-pool', termo: 'Node pool', nivel: 'azure', padroes: ['node pools?', 'managedclustersagentpool'],
    definicao: 'Um grupo de máquinas virtuais iguais do AKS. Pools System rodam os add-ons; pools User, as aplicações.',
    analogia: 'Uma frota de carros do mesmo modelo, separada por tipo de trabalho.',
  },
  {
    id: 'aso', termo: 'Azure Service Operator', nivel: 'azure', padroes: ['azure service operator', 'aso'],
    definicao: 'Um operador que lê recursos YAML do cluster (como um node pool) e cria o equivalente na Azure.',
    analogia: 'O despachante que leva o formulário do cluster até a repartição da Azure.',
  },
  {
    id: 'keda', termo: 'KEDA', nivel: 'azure', padroes: ['keda', 'scaledobjects?', 'triggerauthentication'],
    definicao: 'Escala um Deployment por eventos (mensagens numa fila, horário, métricas), inclusive até zero réplicas.',
    analogia: 'O gerente que olha o tamanho da fila do caixa para decidir quantos caixas abrir.',
    exemplo: 'triggers:\n  - type: cron\n    metadata:\n      start: "0 8 * * *"\n      end: "0 20 * * *"\n      desiredReplicas: "5"',
  },
  {
    id: 'nap', termo: 'Node auto-provisioning (NAP)', nivel: 'azure', padroes: ['node auto-provisioning', 'nap', 'aksnodeclass'],
    definicao: 'O Karpenter gerenciado pelo AKS: cria a VM certa para os Pods Pending, a partir de NodePools e AKSNodeClass.',
    analogia: 'O carro de aplicativo do tamanho do grupo, agora no shopping da Azure.',
  },
  {
    id: 'cilium', termo: 'Cilium', nivel: 'azure', padroes: ['cilium', 'ciliumnetworkpolic(y|ies)', 'ebpf'],
    definicao: 'Um plugin de rede que usa eBPF no kernel dos nós. No AKS, aplica NetworkPolicies e CiliumNetworkPolicies, até por nome de domínio.',
    analogia: 'Um porteiro eletrônico que reconhece cada morador e cada entregador pelo nome, não só pelo número da casa.',
  },
  {
    id: 'app-routing', termo: 'App Routing', nivel: 'azure', padroes: ['app routing', 'webapprouting', 'nginxingresscontroller'],
    definicao: 'Add-on do AKS que instala e atualiza um NGINX Ingress Controller gerenciado pela Azure.',
    analogia: 'O porteiro terceirizado: a empresa contrata, treina e troca o uniforme por você.',
  },
  {
    id: 'azure-monitor', termo: 'Azure Monitor e Managed Prometheus', nivel: 'azure', padroes: ['azure monitor', 'managed prometheus', 'log analytics', 'podmonitor', 'servicemonitor', 'prometheus'],
    definicao: 'Onde ficam logs e métricas do AKS: o Container Insights manda logs ao Log Analytics; o Managed Prometheus guarda as métricas.',
    analogia: 'O painel do carro e o diário de bordo, guardados na central da frota.',
  },
  {
    id: 'key-vault', termo: 'Key Vault', nivel: 'azure', padroes: ['key vault', 'keyvault'],
    definicao: 'O cofre da Azure para senhas, chaves e certificados. O Secrets Store CSI Driver monta os segredos no Pod como arquivos.',
    analogia: 'O cofre do banco: o Pod mostra a identidade e recebe só o que pode ver.',
  },
];

// Letras (com acento), dígitos, _ e $ contam como parte de uma palavra.
const LETRA = '[\\p{L}\\p{N}_$]';
const REGEX = new Map(GLOSSARIO.map((t) => [
  t.id,
  new RegExp(`(?<!${LETRA})(?:${t.padroes.join('|')})(?!${LETRA})`, 'iu'),
]));

/** Nível do módulo do item: aws-*, azure-* e projeto-* contam como o nível mais alto que usam. */
function nivelDoModulo(modulo) {
  if (!modulo) return Infinity;
  if (modulo.startsWith('projeto') || modulo === 'comparacao') return NIVEIS.length;
  const i = NIVEIS.indexOf(modulo);
  return i < 0 ? Infinity : i;
}

/**
 * Termos do glossário que aparecem no texto, na ordem em que aparecem.
 * Se passarem de `max`, ficam primeiro os que o aluno ainda não viu (`vistos`: ids dos termos
 * que já apareceram em itens anteriores da trilha), depois os do nível do módulo.
 */
export function termosDoTexto(texto, { max = MAX_TERMOS, modulo, vistos } = {}) {
  const nivelItem = nivelDoModulo(modulo);
  const prioridade = (t) => Math.min(NIVEIS.indexOf(t.nivel), nivelItem);
  const novo = (t) => (vistos?.has(t.id) ? 0 : 1);
  return GLOSSARIO
    .map((t) => ({ termo: t, posicao: texto.search(REGEX.get(t.id)) }))
    .filter((x) => x.posicao >= 0)
    .sort((a, b) => novo(b.termo) - novo(a.termo) || prioridade(b.termo) - prioridade(a.termo) || a.posicao - b.posicao)
    .slice(0, max)
    .sort((a, b) => a.posicao - b.posicao)
    .map((x) => x.termo);
}

/** Texto visível de um item (título, enunciado e, na lição, o exemplo comentado). */
export const textoDoItem = (item) => `${item.titulo} ${item.resumo ?? ''} ${item.tipo === 'licao' ? item.inicial ?? '' : ''}`
  .replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/**
 * Para cada item da lista (na ordem da trilha), os termos que já apareceram nos itens
 * anteriores. É o que faz o glossário destacar o termo no primeiro uso.
 */
export function termosVistosAntes(lista) {
  const vistos = new Set();
  const porItem = new Map();
  for (const item of lista) {
    porItem.set(item.id, new Set(vistos));
    const t = textoDoItem(item);
    for (const termo of GLOSSARIO) if (REGEX.get(termo.id).test(t)) vistos.add(termo.id);
  }
  return porItem;
}
