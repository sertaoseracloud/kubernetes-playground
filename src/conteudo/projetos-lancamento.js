// Projeto: lançar uma versão nova da loja sem susto (blue-green pelo Service e canary pelo Ingress).
// Segue docs/didatica.md: lição de arquitetura e 5 etapas; cada etapa parte da anterior.
import { licao, exercicio, teste, existe, campo, docs } from './util.js';

const info = (n) => `<p class="etapa-info">🧩 <b>Projeto Lançamento</b> · etapa ${n} de 5. A versão 2 da loja entra no ar sem ninguém perceber.</p>`;
const NGINX = 'nginx.ingress.kubernetes.io';

/** O Deployment de uma cor da loja (blue = v1, green = v2). */
const deployCor = (cor, versao) => `
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: loja-${cor}
  spec:
    replicas: 3
    selector:
      matchLabels:
        app: loja
        cor: ${cor}
    template:
      metadata:
        labels:
          app: loja
          cor: ${cor}
      spec:
        containers:
          - name: loja
            image: ghcr.io/stefanprodan/podinfo:${versao}
            ports:
              - containerPort: 9898
`;

/** O Service da loja apontando para uma cor. */
const serviceLoja = (cor) => `
  apiVersion: v1
  kind: Service
  metadata:
    name: loja
  spec:
    selector:
      app: loja
      cor: ${cor}
    ports:
      - port: 80
        targetPort: 9898
`;

/** Um Service só de uma cor (para o canary pelo Ingress). */
const serviceCor = (nome, cor) => `
  apiVersion: v1
  kind: Service
  metadata:
    name: ${nome}
  spec:
    selector:
      app: loja
      cor: ${cor}
    ports:
      - port: 80
        targetPort: 9898
`;

/** Um Ingress do NGINX para loja.exemplo.com; `anotacoes` vão em metadata.annotations. */
const ingress = (nome, servico, anotacoes = '') => `
  apiVersion: networking.k8s.io/v1
  kind: Ingress
  metadata:
    name: ${nome}
${anotacoes ? `    annotations:\n${anotacoes}\n` : ''}  spec:
    ingressClassName: nginx
    rules:
      - host: loja.exemplo.com
        http:
          paths:
            - path: /
              pathType: Prefix
              backend:
                service:
                  name: ${servico}
                  port:
                    number: 80
`;

const BLUE = deployCor('blue', '6.6.0');
const GREEN = deployCor('green', '6.7.0');
const CANARY_BASE = docs(BLUE, GREEN, serviceCor('loja-estavel', 'blue'), serviceCor('loja-nova', 'green'), ingress('loja', 'loja-estavel'));

export const projetoLancamento = {
  id: 'proj-lancamento',
  titulo: 'Projeto Lançamento: blue-green e canary',
  icone: '🐤',
  itens: [
    licao('proj-lancamento-arquitetura', 'Arquitetura do lançamento sem susto', 'dificil', `
      <p>Trocar a versão de uma loja aberta é como trocar o pneu com o carro andando. Dois jeitos seguros, que você viu nos Fundamentos:</p>
      <ul>
        <li><b>Blue-green</b>: duas cópias inteiras, a <b>blue</b> (versão atual) e a <b>green</b> (versão nova). O Service escolhe uma delas pela label
          <code>cor</code>. Trocar a cor no selector do Service troca a versão para todo mundo de uma vez, e voltar é só trocar de novo.</li>
        <li><b>Canary</b>: a versão nova recebe só uma parte dos clientes. Com o <b>NGINX Ingress Controller</b>, um segundo Ingress para o mesmo host
          ganha as annotations <code>nginx.ingress.kubernetes.io/canary: "true"</code> e <code>canary-weight</code> (a porcentagem). Com
          <code>canary-by-header</code>, quem manda um cabeçalho (por exemplo <code>X-Beta: sim</code>) sempre cai na versão nova.</li>
      </ul>
      <p>As cinco etapas: a versão blue no ar, a green ao lado sem tráfego, a troca pelo Service, o canary com 10% e o canary por cabeçalho para os testadores.</p>
      <p><b>No cluster:</b> <code>kubectl get endpoints loja</code> mostra para quais Pods o Service manda; no canary, o NGINX divide as requisições entre os dois
      Services pelo peso.</p>`,
    `
      # O Ingress canary: 10% de loja.exemplo.com vai para a versão nova
      apiVersion: networking.k8s.io/v1
      kind: Ingress
      metadata:
        name: loja-canary
        annotations:
          ${NGINX}/canary: "true"        # este Ingress é o canary
          ${NGINX}/canary-weight: "10"   # 10% das requisições
      spec:
        ingressClassName: nginx
        rules:
          - host: loja.exemplo.com       # o mesmo host do Ingress principal
            http:
              paths:
                - path: /
                  pathType: Prefix
                  backend:
                    service:
                      name: loja-nova    # o Service da versão nova
                      port:
                        number: 80
    `),

    exercicio({
      id: 'proj-lanc-blue',
      titulo: 'Etapa 1: a versão blue no ar',
      dificuldade: 'facil',
      resumo: `
        ${info(1)}
        <p>A versão atual (6.6.0) é a <b>blue</b>. O Service <code>loja</code> manda os clientes só para ela.</p>
        <ol>
          <li>O Deployment <code>loja-blue</code> já vem pronto, com as labels <code>app: loja</code> e <code>cor: blue</code>.</li>
          <li>No Service <code>loja</code>, o <code>selector</code> tem <code>app: loja</code> e <code>cor: blue</code>.</li>
        </ol>
        <p><b>No cluster:</b> <code>kubectl get endpoints loja</code> mostra só os 3 Pods da blue.</p>`,
      inicial: docs(BLUE, `
        apiVersion: v1
        kind: Service
        metadata:
          name: loja
        spec:
          selector:
            app: loja
            # TODO: cor: blue
          ports:
            - port: 80
              targetPort: 9898
      `),
      dica: [
        'O selector precisa das duas labels: só app: loja pegaria todas as versões.',
        'selector:\n  app: loja\n  cor: blue',
      ],
      solucao: docs(BLUE, serviceLoja('blue')),
      testes: [
        teste({ descricao: 'O Service escolhe a cor blue', dica: 'No selector do Service: cor: blue.' },
          { tipo: 'service-selector', service: 'loja', chave: 'cor', valor: 'blue' }),
        teste({ descricao: 'E só os Pods da loja', dica: 'Mantenha app: loja no selector.' },
          campo('Service', 'loja', 'spec.selector.app', { valor: 'loja' })),
      ],
    }),

    exercicio({
      id: 'proj-lanc-green',
      titulo: 'Etapa 2: a versão green ao lado, sem clientes',
      dificuldade: 'medio',
      existentes: docs(BLUE, serviceLoja('blue')),
      resumo: `
        ${info(2)}
        <p>A versão nova (6.7.0) sobe ao lado da blue. Os testes internos podem acessá-la direto nos Pods, mas nenhum cliente chega lá ainda.</p>
        <ol>
          <li>Crie o Deployment <code>loja-green</code> com 3 réplicas e as labels <code>app: loja</code> e <code>cor: green</code> (no selector e no template).</li>
          <li>A imagem é <code>ghcr.io/stefanprodan/podinfo:6.7.0</code>, porta 9898.</li>
        </ol>
        <p><b>No cluster:</b> agora há 6 Pods da loja, mas o Service <code>loja</code> continua mandando só para os 3 da blue.</p>`,
      inicial: `
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: loja-green
        spec:
          replicas: 3
          selector:
            matchLabels:
              app: loja
              cor:             # TODO: green
          template:
            metadata:
              labels:
                app: loja
                cor:           # TODO: green
            spec:
              containers:
                - name: loja
                  image:       # TODO: a imagem da versão 6.7.0
                  ports:
                    - containerPort: 9898
      `,
      dica: [
        'É uma cópia do loja-blue com a cor e a imagem trocadas.',
        'cor: green (nos dois lugares)\nimage: ghcr.io/stefanprodan/podinfo:6.7.0',
      ],
      solucao: GREEN,
      testes: [
        teste({ descricao: 'A green tem as próprias labels', dica: 'No selector e no template: cor: green.' },
          campo('Deployment', 'loja-green', 'spec.template.metadata.labels.cor', { valor: 'green' })),
        teste({ descricao: 'A green roda a versão nova', dica: 'image: ghcr.io/stefanprodan/podinfo:6.7.0.' },
          campo('Deployment', 'loja-green', 'spec.template.spec.containers[name=loja].image', { valor: 'ghcr.io/stefanprodan/podinfo:6.7.0' })),
      ],
    }),

    exercicio({
      id: 'proj-lanc-troca',
      titulo: 'Etapa 3: a troca de blue para green',
      dificuldade: 'medio',
      existentes: docs(BLUE, GREEN, serviceLoja('blue')),
      resumo: `
        ${info(3)}
        <p>Os testes da green passaram. A troca é uma linha: o Service passa a escolher a cor green. Se der problema, voltar é trocar de novo.</p>
        <ol>
          <li>No Service <code>loja</code>, troque <code>cor: blue</code> por <code>cor: green</code> no <code>selector</code>.</li>
        </ol>
        <p><b>No cluster:</b> no mesmo instante, os endpoints do Service passam a ser os 3 Pods da green. A blue continua rodando, pronta para a volta.</p>`,
      inicial: `
        apiVersion: v1
        kind: Service
        metadata:
          name: loja
        spec:
          selector:
            app: loja
            cor: blue          # TODO: troque para green
          ports:
            - port: 80
              targetPort: 9898
      `,
      dica: [
        'Só o selector muda; os Deployments ficam como estão.',
        'cor: green',
      ],
      solucao: serviceLoja('green'),
      testes: [
        teste({ descricao: 'O Service manda para a green', dica: 'No selector: cor: green.' },
          { tipo: 'service-selector', service: 'loja', chave: 'cor', valor: 'green' }),
        teste({ descricao: 'A blue continua no ar para a volta', dica: 'Não apague o Deployment loja-blue.' },
          existe('Deployment', 'loja-blue')),
      ],
    }),

    exercicio({
      id: 'proj-lanc-canary',
      titulo: 'Etapa 4: canary com 10% dos clientes',
      dificuldade: 'dificil',
      existentes: CANARY_BASE,
      resumo: `
        ${info(4)}
        <p>Na próxima versão, o time quer ir com calma: 10% dos clientes primeiro. O Ingress <code>loja</code> leva tudo ao Service <code>loja-estavel</code>;
        um segundo Ingress leva uma parte ao <code>loja-nova</code>.</p>
        <ol>
          <li>Crie o Ingress <code>loja-canary</code> para o mesmo host <code>loja.exemplo.com</code>, levando <code>/</code> ao Service <code>loja-nova</code>.</li>
          <li>Annotation <code>nginx.ingress.kubernetes.io/canary: "true"</code>.</li>
          <li>Annotation <code>nginx.ingress.kubernetes.io/canary-weight: "10"</code>.</li>
        </ol>
        <p><b>No cluster:</b> o NGINX manda 1 a cada 10 requisições para a versão nova. Subir o peso aos poucos (25, 50, 100) completa o lançamento.</p>`,
      inicial: ingress('loja-canary', 'loja-nova', `      # TODO: ${NGINX}/canary: "true" (passo 2)
      # TODO: ${NGINX}/canary-weight: "10" (passo 3)`),
      dica: [
        'O exemplo da lição "Arquitetura do lançamento sem susto" é este Ingress.',
        'Valores de annotation são texto: "true" e "10" com aspas.',
        `${NGINX}/canary: "true"\n${NGINX}/canary-weight: "10"`,
      ],
      solucao: ingress('loja-canary', 'loja-nova', `      ${NGINX}/canary: "true"
      ${NGINX}/canary-weight: "10"`),
      testes: [
        teste({ descricao: 'O Ingress é um canary', dica: `Annotation ${NGINX}/canary: "true".` },
          campo('Ingress', 'loja-canary', `metadata.annotations["${NGINX}/canary"]`, { valor: 'true' })),
        teste({ descricao: 'Com 10% das requisições', dica: `Annotation ${NGINX}/canary-weight: "10".` },
          campo('Ingress', 'loja-canary', `metadata.annotations["${NGINX}/canary-weight"]`, { valor: '10' })),
        teste({ descricao: 'Leva à versão nova, no mesmo host', dica: 'Host loja.exemplo.com e backend loja-nova.' },
          campo('Ingress', 'loja-canary', 'spec.rules[0].host', { valor: 'loja.exemplo.com' }),
          campo('Ingress', 'loja-canary', 'spec.rules[0].http.paths[0].backend.service.name', { valor: 'loja-nova' })),
      ],
    }),

    exercicio({
      id: 'proj-lanc-header',
      titulo: 'Etapa 5: os testadores sempre na versão nova',
      dificuldade: 'dificil',
      existentes: CANARY_BASE,
      resumo: `
        ${info(5)}
        <p>Os testadores querem ver a versão nova sempre, não só por sorte. Quem mandar o cabeçalho <code>X-Beta: sim</code> cai nela; o resto continua
        no sorteio, agora com 25%.</p>
        <ol>
          <li>No Ingress <code>loja-canary</code>, mantenha <code>canary: "true"</code> e suba o <code>canary-weight</code> para <code>"25"</code>.</li>
          <li>Annotation <code>nginx.ingress.kubernetes.io/canary-by-header: X-Beta</code>.</li>
          <li>Annotation <code>nginx.ingress.kubernetes.io/canary-by-header-value: "sim"</code>.</li>
        </ol>
        <p><b>No cluster:</b> requisições com <code>X-Beta: sim</code> vão 100% para a versão nova; as outras, 25%. O cabeçalho vale antes do peso.</p>`,
      inicial: ingress('loja-canary', 'loja-nova', `      ${NGINX}/canary: "true"
      ${NGINX}/canary-weight: "10"   # TODO: suba para "25"
      # TODO: canary-by-header e canary-by-header-value (passos 2 e 3)`),
      dica: [
        'São mais duas annotations com o prefixo nginx.ingress.kubernetes.io/canary-by-header.',
        `${NGINX}/canary-weight: "25"\n${NGINX}/canary-by-header: X-Beta\n${NGINX}/canary-by-header-value: "sim"`,
      ],
      solucao: ingress('loja-canary', 'loja-nova', `      ${NGINX}/canary: "true"
      ${NGINX}/canary-weight: "25"
      ${NGINX}/canary-by-header: X-Beta
      ${NGINX}/canary-by-header-value: "sim"`),
      testes: [
        teste({ descricao: 'O sorteio vai a 25%', dica: `${NGINX}/canary-weight: "25".` },
          campo('Ingress', 'loja-canary', `metadata.annotations["${NGINX}/canary-weight"]`, { valor: '25' })),
        teste({ descricao: 'Quem manda X-Beta: sim vê a versão nova', dica: `${NGINX}/canary-by-header: X-Beta e ${NGINX}/canary-by-header-value: "sim".` },
          campo('Ingress', 'loja-canary', `metadata.annotations["${NGINX}/canary-by-header"]`, { valor: 'X-Beta' }),
          campo('Ingress', 'loja-canary', `metadata.annotations["${NGINX}/canary-by-header-value"]`, { valor: 'sim' })),
      ],
    }),
  ],
  ocultos: {
    'proj-lanc-blue': { dica: 'Confira a porta do Service e o targetPort da loja.', regras: [campo('Service', 'loja', 'spec.ports[0].targetPort', { valor: 9898 })] },
    'proj-lanc-green': { dica: 'O selector do Deployment green também tem a cor dele, e são 3 réplicas.', regras: [campo('Deployment', 'loja-green', 'spec.selector.matchLabels.cor', { valor: 'green' }), campo('Deployment', 'loja-green', 'spec.replicas', { valor: 3 })] },
    'proj-lanc-troca': { dica: 'O Service continua escolhendo só os Pods da loja.', regras: [campo('Service', 'loja', 'spec.selector.app', { valor: 'loja' })] },
    'proj-lanc-canary': { dica: 'O canary usa a mesma classe do Ingress principal.', regras: [campo('Ingress', 'loja-canary', 'spec.ingressClassName', { valor: 'nginx' })] },
    'proj-lanc-header': { dica: 'O Ingress continua marcado como canary.', regras: [campo('Ingress', 'loja-canary', `metadata.annotations["${NGINX}/canary"]`, { valor: 'true' })] },
  },
};
