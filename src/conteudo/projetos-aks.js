// Projeto: o catálogo de uma loja no AKS, com Workload Identity, Key Vault, App Routing e KEDA.
// Segue docs/didatica.md: lição de arquitetura e 5 etapas; cada etapa parte da anterior.
import { licao, exercicio, teste, campo, docs } from './util.js';

const info = (n) => `<p class="etapa-info">🧩 <b>Projeto Loja no AKS</b> · etapa ${n} de 5. O catálogo da loja rodando na Azure, do pool ao KEDA.</p>`;
const CLIENTE = '88888888-1111-2222-3333-444444444444';
const TENANT = 'aaaaaaaa-0000-0000-0000-000000000000';
const URI_CERT = 'https://kv-loja.vault.azure.net/certificates/catalogo';

/** O Deployment do catálogo; `rotulos` entram nas labels do Pod, `pod` no spec do Pod e `container` no container. */
const deployCatalogo = ({ rotulos = '', pod = '', container = '' } = {}) => `
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: catalogo
  spec:
    replicas: 2
    selector:
      matchLabels:
        app: catalogo
    template:
      metadata:
        labels:
          app: catalogo
${rotulos}      spec:
        nodeSelector:
          kubernetes.azure.com/agentpool: geral
${pod}        containers:
          - name: catalogo
            image: mcr.microsoft.com/azuredocs/aks-helloworld:v1
            ports:
              - containerPort: 80
${container}`;

const SERVICE = `
  apiVersion: v1
  kind: Service
  metadata:
    name: catalogo
  spec:
    selector:
      app: catalogo
    ports:
      - port: 80
        targetPort: 80
`;

const SA = `
  apiVersion: v1
  kind: ServiceAccount
  metadata:
    name: catalogo
    annotations:
      azure.workload.identity/client-id: ${CLIENTE}
`;

const SPC = `
  apiVersion: secrets-store.csi.x-k8s.io/v1
  kind: SecretProviderClass
  metadata:
    name: kv-catalogo
  spec:
    provider: azure
    parameters:
      usePodIdentity: "false"
      clientID: "${CLIENTE}"
      keyvaultName: kv-loja
      tenantId: "${TENANT}"
      objects: |
        array:
          - |
            objectName: chave-busca
            objectType: secret
`;

const ROTULO_WI = '          azure.workload.identity/use: "true"\n';
const SA_POD = '        serviceAccountName: catalogo\n';
const VOLUME = `        volumes:
          - name: segredos
            csi:
              driver: secrets-store.csi.k8s.io
              readOnly: true
              volumeAttributes:
                secretProviderClass: kv-catalogo
`;
const MONTAGEM = `            volumeMounts:
              - name: segredos
                mountPath: /mnt/segredos
                readOnly: true
`;

export const projetoAks = {
  id: 'proj-aks',
  titulo: 'Projeto Loja no AKS',
  icone: '🔵',
  itens: [
    licao('proj-aks-arquitetura', 'Arquitetura da loja no AKS', 'dificil', `
      <p>O catálogo da loja vai para um cluster <b>AKS</b>, usando o que você praticou no módulo da Azure. É a mesma loja do shopping, agora
      em outro prédio, com o crachá da Azure, o cofre da Azure e a recepção da Azure.</p>
      <ol>
        <li><b>Base</b>: o Deployment e o Service do catálogo, rodando no node pool <code>geral</code>.</li>
        <li><b>Identidade</b>: a ServiceAccount <code>catalogo</code> com Workload Identity.</li>
        <li><b>Segredos</b>: a chave da busca vem do Key Vault, por um volume do Secrets Store CSI Driver.</li>
        <li><b>Entrada</b>: o NGINX gerenciado do App Routing, com o certificado HTTPS também no Key Vault.</li>
        <li><b>Escala</b>: o KEDA sobe as réplicas no horário de pico, e um PDB protege os upgrades.</li>
      </ol>
      <p><b>No cluster:</b> no fim, <code>https://catalogo.contoso.com</code> abre o catálogo, que lê a chave da busca no cofre sem nenhuma senha
      no cluster e tem mais réplicas no horário comercial.</p>`,
    `
      # O desenho do projeto:
      #
      #   cliente -> App Routing (NGINX, certificado do Key Vault) -> Service catalogo
      #          -> Pods catalogo (pool geral, Workload Identity) --volume csi--> Key Vault kv-loja
      #   KEDA (cron) -> mais réplicas das 8h às 20h
      #
      # Etapa 1: o catálogo no pool geral.
      apiVersion: v1
      kind: Pod
      metadata:
        name: teste-pool
      spec:
        nodeSelector:
          kubernetes.azure.com/agentpool: geral   # o pool das aplicações
        containers:
          - name: web
            image: mcr.microsoft.com/azuredocs/aks-helloworld:v1
    `),

    exercicio({
      id: 'proj-aks-base',
      titulo: 'Etapa 1: o catálogo no pool das aplicações',
      dificuldade: 'facil',
      resumo: `
        ${info(1)}
        <p>O catálogo roda no pool User <code>geral</code>, longe do pool System dos add-ons.</p>
        <ol>
          <li>No Deployment <code>catalogo</code>, em <code>nodeSelector</code>: <code>kubernetes.azure.com/agentpool: geral</code>.</li>
          <li>Crie o Service <code>catalogo</code> (selector <code>app: catalogo</code>, porta 80).</li>
        </ol>
        <p><b>No cluster:</b> as 2 réplicas vão para os nós do pool geral, e o Service passa a mandar tráfego para elas.</p>`,
      inicial: docs(deployCatalogo().replace('          kubernetes.azure.com/agentpool: geral\n', '          # TODO: kubernetes.azure.com/agentpool: geral\n'), `
        # TODO: o Service catalogo (selector app: catalogo, porta 80)
      `),
      dica: [
        'É a label do exercício "Deployment no pool certo" do módulo da Azure.',
        'nodeSelector:\n  kubernetes.azure.com/agentpool: geral\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: catalogo\nspec:\n  selector:\n    app: catalogo\n  ports:\n    - port: 80\n      targetPort: 80',
      ],
      solucao: docs(deployCatalogo(), SERVICE),
      testes: [
        teste({ descricao: 'O catálogo roda no pool geral', dica: 'Em nodeSelector: kubernetes.azure.com/agentpool: geral.' },
          campo('Deployment', 'catalogo', 'spec.template.spec.nodeSelector["kubernetes.azure.com/agentpool"]', { valor: 'geral' })),
        teste({ descricao: 'O Service manda para o catálogo', dica: 'Crie o Service catalogo com selector app: catalogo.' },
          { tipo: 'service-selector', service: 'catalogo', chave: 'app', valor: 'catalogo' }),
      ],
    }),

    exercicio({
      id: 'proj-aks-identidade',
      titulo: 'Etapa 2: o catálogo com Workload Identity',
      dificuldade: 'medio',
      existentes: SERVICE,
      resumo: `
        ${info(2)}
        <p>O catálogo vai ler o Key Vault. Antes, ele precisa de uma identidade: a <code>id-catalogo</code>, com client ID <code>${CLIENTE}</code>.</p>
        <ol>
          <li>Crie a ServiceAccount <code>catalogo</code> com a annotation <code>azure.workload.identity/client-id</code>.</li>
          <li>No template do Deployment, a label <code>azure.workload.identity/use: "true"</code> e <code>serviceAccountName: catalogo</code>.</li>
        </ol>
        <p><b>No cluster:</b> os Pods recriados recebem o token federado e as variáveis <code>AZURE_CLIENT_ID</code> e <code>AZURE_TENANT_ID</code>.</p>`,
      inicial: docs(`
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: catalogo
          annotations:
            # TODO: azure.workload.identity/client-id (passo 1)
      `, deployCatalogo({ rotulos: '          # TODO: a label do Workload Identity (passo 2)\n', pod: '        # TODO: serviceAccountName: catalogo (passo 2)\n' })),
      dica: [
        'São as peças do exercício "Do zero: ServiceAccount e Deployment com Workload Identity".',
        `azure.workload.identity/client-id: ${CLIENTE}\n...\nlabels:\n  azure.workload.identity/use: "true"\n...\nserviceAccountName: catalogo`,
      ],
      solucao: docs(SA, deployCatalogo({ rotulos: ROTULO_WI, pod: SA_POD })),
      testes: [
        teste({ descricao: 'A ServiceAccount representa a id-catalogo', dica: 'Na ServiceAccount: azure.workload.identity/client-id com o client ID.' },
          campo('ServiceAccount', 'catalogo', 'metadata.annotations["azure.workload.identity/client-id"]', { valor: CLIENTE })),
        teste({ descricao: 'Os Pods usam o Workload Identity', dica: 'No template: a label azure.workload.identity/use: "true" e serviceAccountName: catalogo.' },
          campo('Deployment', 'catalogo', 'spec.template.metadata.labels["azure.workload.identity/use"]', { valor: 'true' }),
          campo('Deployment', 'catalogo', 'spec.template.spec.serviceAccountName', { valor: 'catalogo' })),
      ],
    }),

    exercicio({
      id: 'proj-aks-keyvault',
      titulo: 'Etapa 3: a chave da busca vem do Key Vault',
      dificuldade: 'dificil',
      existentes: docs(SERVICE, SA),
      resumo: `
        ${info(3)}
        <p>A chave do serviço de busca está no Key Vault <code>kv-loja</code> com o nome <code>chave-busca</code>.</p>
        <ol>
          <li>Na SecretProviderClass <code>kv-catalogo</code>, preencha <code>keyvaultName: kv-loja</code> e, em <code>objects</code>, o item
            <code>objectName: chave-busca</code>.</li>
          <li>No Deployment, declare o volume <code>segredos</code> do tipo <code>csi</code> com a classe <code>kv-catalogo</code>.</li>
          <li>Monte <code>segredos</code> em <code>/mnt/segredos</code>, só leitura.</li>
        </ol>
        <p><b>No cluster:</b> ao subir, cada Pod troca o token da ServiceAccount por um token do Entra ID, lê o cofre e recebe o arquivo
        <code>/mnt/segredos/chave-busca</code>.</p>`,
      inicial: docs(SPC.replace('      keyvaultName: kv-loja\n', '      keyvaultName:      # TODO: kv-loja\n').replace('            objectName: chave-busca\n', '            objectName: TROQUE-PELO-NOME-DO-SEGREDO\n'),
        deployCatalogo({ rotulos: ROTULO_WI, pod: `${SA_POD}        # TODO: volumes com o volume csi segredos (passo 2)
`, container: '            # TODO: volumeMounts de segredos em /mnt/segredos (passo 3)\n' })),
      dica: [
        'A classe é a do exercício "SecretProviderClass do Key Vault"; o volume, o do exercício "Montando os segredos do Key Vault no Pod".',
        'Dentro do texto de objects não há comentário: troque o texto TROQUE-PELO-NOME-DO-SEGREDO pelo nome do segredo.',
        'volumes:\n  - name: segredos\n    csi:\n      driver: secrets-store.csi.k8s.io\n      readOnly: true\n      volumeAttributes:\n        secretProviderClass: kv-catalogo',
      ],
      solucao: docs(SPC, deployCatalogo({ rotulos: ROTULO_WI, pod: `${SA_POD}${VOLUME}`, container: MONTAGEM })),
      testes: [
        teste({ descricao: 'A classe lê o cofre kv-loja', dica: 'Em parameters: keyvaultName: kv-loja.' },
          campo('SecretProviderClass', 'kv-catalogo', 'spec.parameters.keyvaultName', { valor: 'kv-loja' })),
        teste({ descricao: 'Busca o segredo chave-busca', dica: 'No texto de objects: objectName: chave-busca.' },
          campo('SecretProviderClass', 'kv-catalogo', 'spec.parameters.objects', { contem: 'objectName: chave-busca' })),
        teste({ descricao: 'O Deployment monta o cofre em /mnt/segredos', dica: 'Volume csi segredos com secretProviderClass: kv-catalogo, montado em /mnt/segredos.' },
          campo('Deployment', 'catalogo', 'spec.template.spec.volumes[name=segredos].csi.volumeAttributes.secretProviderClass', { valor: 'kv-catalogo' }),
          { tipo: 'volume-montado', pod: 'catalogo', container: 'catalogo', volume: 'segredos', caminho: '/mnt/segredos' }),
      ],
    }),

    exercicio({
      id: 'proj-aks-entrada',
      titulo: 'Etapa 4: HTTPS com o App Routing e o Key Vault',
      dificuldade: 'medio',
      existentes: SERVICE,
      resumo: `
        ${info(4)}
        <p>O App Routing busca o certificado HTTPS direto no Key Vault: uma annotation diz qual, e o <code>tls</code> do Ingress usa um Secret com nome
        <code>keyvault-</code> mais o nome do Ingress.</p>
        <ol>
          <li>No Ingress <code>catalogo</code>, <code>ingressClassName: webapprouting.kubernetes.azure.com</code>.</li>
          <li>A annotation <code>kubernetes.azure.com/tls-cert-keyvault-uri</code> com <code>${URI_CERT}</code>.</li>
          <li>Em <code>tls</code>: <code>hosts: ["catalogo.contoso.com"]</code> e <code>secretName: keyvault-catalogo</code>.</li>
        </ol>
        <p><b>No cluster:</b> o add-on copia o certificado do cofre para o Secret <code>keyvault-catalogo</code> e o NGINX passa a servir HTTPS em
        <code>catalogo.contoso.com</code>. Quando o certificado é renovado no cofre, o add-on atualiza o Secret.</p>`,
      inicial: `
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: catalogo
          annotations:
            # TODO: kubernetes.azure.com/tls-cert-keyvault-uri (passo 2)
        spec:
          ingressClassName:    # TODO: a classe do App Routing
          # TODO: tls com hosts e secretName keyvault-catalogo (passo 3)
          rules:
            - host: catalogo.contoso.com
              http:
                paths:
                  - path: /
                    pathType: Prefix
                    backend:
                      service:
                        name: catalogo
                        port:
                          number: 80
      `,
      dica: [
        'A classe é a do exercício "Ingress no NGINX gerenciado".',
        'O nome do Secret segue a regra do App Routing: keyvault- seguido do nome do Ingress.',
        `annotations:\n  kubernetes.azure.com/tls-cert-keyvault-uri: ${URI_CERT}\nspec:\n  ingressClassName: webapprouting.kubernetes.azure.com\n  tls:\n    - hosts: ["catalogo.contoso.com"]\n      secretName: keyvault-catalogo`,
      ],
      solucao: `
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: catalogo
          annotations:
            kubernetes.azure.com/tls-cert-keyvault-uri: ${URI_CERT}
        spec:
          ingressClassName: webapprouting.kubernetes.azure.com
          tls:
            - hosts: ["catalogo.contoso.com"]
              secretName: keyvault-catalogo
          rules:
            - host: catalogo.contoso.com
              http:
                paths:
                  - path: /
                    pathType: Prefix
                    backend:
                      service:
                        name: catalogo
                        port:
                          number: 80
      `,
      testes: [
        teste({ descricao: 'Usa o NGINX do App Routing', dica: 'No spec: ingressClassName: webapprouting.kubernetes.azure.com.' },
          campo('Ingress', 'catalogo', 'spec.ingressClassName', { valor: 'webapprouting.kubernetes.azure.com' })),
        teste({ descricao: 'O certificado vem do Key Vault', dica: 'Annotation kubernetes.azure.com/tls-cert-keyvault-uri com o endereço do certificado.' },
          campo('Ingress', 'catalogo', 'metadata.annotations["kubernetes.azure.com/tls-cert-keyvault-uri"]', { valor: URI_CERT })),
        teste({ descricao: 'O HTTPS usa o Secret keyvault-catalogo', dica: 'Em tls: secretName: keyvault-catalogo.' },
          campo('Ingress', 'catalogo', 'spec.tls[0].secretName', { valor: 'keyvault-catalogo' })),
      ],
    }),

    exercicio({
      id: 'proj-aks-escala',
      titulo: 'Etapa 5: mais réplicas no pico, sem queda nos upgrades',
      dificuldade: 'dificil',
      existentes: docs(SERVICE, SA, SPC, deployCatalogo({ rotulos: ROTULO_WI, pod: `${SA_POD}${VOLUME}`, container: MONTAGEM })),
      resumo: `
        ${info(5)}
        <p>O catálogo tem pico das 8h às 20h (horário de Brasília). O KEDA sobe as réplicas nesse horário, e um PDB segura o esvaziamento dos nós.</p>
        <ol>
          <li>Crie o ScaledObject <code>catalogo</code> para o Deployment <code>catalogo</code>, com <code>minReplicaCount: 2</code> e
            <code>maxReplicaCount: 10</code>.</li>
          <li>O trigger <code>cron</code> com <code>timezone: America/Sao_Paulo</code>, <code>start: "0 8 * * *"</code>, <code>end: "0 20 * * *"</code> e
            <code>desiredReplicas: "6"</code>.</li>
          <li>Crie o PodDisruptionBudget <code>catalogo</code> com <code>maxUnavailable: 1</code> e <code>selector</code> <code>app: catalogo</code>.</li>
        </ol>
        <p><b>No cluster:</b> às 8h o catálogo vai a 6 réplicas, às 20h volta a 2; no upgrade do pool, sai no máximo uma por vez.</p>`,
      inicial: `
        apiVersion: keda.sh/v1alpha1
        kind: ScaledObject
        metadata:
          name: catalogo
        spec:
          scaleTargetRef:
            name: catalogo
          # TODO: minReplicaCount 2 e maxReplicaCount 10 (passo 1)
          triggers:
            - type: cron
              metadata:
                timezone: America/Sao_Paulo
                # TODO: start, end e desiredReplicas (passo 2)
        ---
        # TODO: o PodDisruptionBudget catalogo (passo 3)
      `,
      dica: [
        'O ScaledObject é o do exercício "Mais réplicas no horário comercial"; o PDB, o do exercício "PDB para o upgrade do AKS".',
        'Os valores do metadata do trigger são texto, entre aspas.',
        'minReplicaCount: 2\nmaxReplicaCount: 10\n...\nstart: "0 8 * * *"\nend: "0 20 * * *"\ndesiredReplicas: "6"\n---\napiVersion: policy/v1\nkind: PodDisruptionBudget\nmetadata:\n  name: catalogo\nspec:\n  maxUnavailable: 1\n  selector:\n    matchLabels:\n      app: catalogo',
      ],
      solucao: `
        apiVersion: keda.sh/v1alpha1
        kind: ScaledObject
        metadata:
          name: catalogo
        spec:
          scaleTargetRef:
            name: catalogo
          minReplicaCount: 2
          maxReplicaCount: 10
          triggers:
            - type: cron
              metadata:
                timezone: America/Sao_Paulo
                start: "0 8 * * *"
                end: "0 20 * * *"
                desiredReplicas: "6"
        ---
        apiVersion: policy/v1
        kind: PodDisruptionBudget
        metadata:
          name: catalogo
        spec:
          maxUnavailable: 1
          selector:
            matchLabels:
              app: catalogo
      `,
      testes: [
        teste({ descricao: 'O KEDA escala o catálogo de 2 a 10', dica: 'No ScaledObject: minReplicaCount: 2 e maxReplicaCount: 10.' },
          campo('ScaledObject', 'catalogo', 'spec.minReplicaCount', { valor: 2 }),
          campo('ScaledObject', 'catalogo', 'spec.maxReplicaCount', { valor: 10 })),
        teste({ descricao: 'Com 6 réplicas das 8h às 20h', dica: 'No trigger cron: start: "0 8 * * *", end: "0 20 * * *" e desiredReplicas: "6".' },
          campo('ScaledObject', 'catalogo', 'spec.triggers[0].metadata.start', { valor: '0 8 * * *' }),
          campo('ScaledObject', 'catalogo', 'spec.triggers[0].metadata.desiredReplicas', { valor: '6' })),
        teste({ descricao: 'No upgrade, sai uma réplica por vez', dica: 'Crie o PodDisruptionBudget catalogo com maxUnavailable: 1.' },
          campo('PodDisruptionBudget', 'catalogo', 'spec.maxUnavailable', { valor: 1 })),
      ],
    }),
  ],
  ocultos: {
    'proj-aks-base': { dica: 'Confira a porta do Service.', regras: [campo('Service', 'catalogo', 'spec.ports[0].port', { valor: 80 })] },
    'proj-aks-identidade': { dica: 'O catálogo continua no pool geral.', regras: [campo('Deployment', 'catalogo', 'spec.template.spec.nodeSelector["kubernetes.azure.com/agentpool"]', { valor: 'geral' })] },
    'proj-aks-keyvault': { dica: 'A montagem é só de leitura, e o Deployment continua com o Workload Identity.', regras: [campo('Deployment', 'catalogo', 'spec.template.spec.containers[name=catalogo].volumeMounts[name=segredos].readOnly', { valor: true }), campo('Deployment', 'catalogo', 'spec.template.metadata.labels["azure.workload.identity/use"]', { valor: 'true' })] },
    'proj-aks-entrada': { dica: 'O certificado vale para o host da regra.', regras: [campo('Ingress', 'catalogo', 'spec.tls[0].hosts', { contem: 'catalogo.contoso.com' })] },
    'proj-aks-escala': { dica: 'Confira o fuso e o fim do horário, e o selector do PDB.', regras: [campo('ScaledObject', 'catalogo', 'spec.triggers[0].metadata.end', { valor: '0 20 * * *' }), campo('ScaledObject', 'catalogo', 'spec.triggers[0].metadata.timezone', { valor: 'America/Sao_Paulo' }), campo('PodDisruptionBudget', 'catalogo', 'spec.selector.matchLabels.app', { valor: 'catalogo' })] },
  },
};
