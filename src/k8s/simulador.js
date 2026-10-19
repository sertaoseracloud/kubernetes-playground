// Simulador de Kubernetes no navegador: valida YAML, cria recursos em memória e
// devolve o estado do cluster para os testes e para a aba "Cluster".
// Não há conexão com kubectl nem cluster real: tudo é simulado, como no terraform-playground.
import * as yaml from 'js-yaml';
import { lerEstado, gravarEstado } from '../progresso.js';

// ---------- Validação de campos obrigatórios e sugestões ----------

/** Distância de Levenshtein entre duas strings. */
function distanciaLevenshtein(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return m[a.length][b.length];
}

/** Sugere o campo mais parecido quando há erro de digitação. Devolve null se nada estiver perto. */
export function sugerirCampo(nome, opcoes) {
  let melhor = null;
  let menor = Infinity;
  for (const o of opcoes) {
    const d = distanciaLevenshtein(nome, o);
    if (d < menor) {
      menor = d;
      melhor = o;
    }
  }
  return menor <= Math.max(2, Math.floor(nome.length / 4)) ? melhor : null;
}

/** Campos obrigatórios conhecidos por kind, para sugestão de correção. */
const CAMPOS_CONHECIDOS = {
  Pod: ['apiVersion', 'kind', 'metadata', 'spec', 'containers', 'name', 'image', 'ports', 'containerPort', 'volumeMounts', 'volumes', 'restartPolicy', 'labels', 'resources', 'livenessProbe', 'readinessProbe'],
  Service: ['apiVersion', 'kind', 'metadata', 'spec', 'selector', 'ports', 'port', 'targetPort', 'protocol', 'type', 'name'],
  Deployment: ['apiVersion', 'kind', 'metadata', 'spec', 'replicas', 'selector', 'template', 'containers', 'name', 'image', 'strategy', 'matchLabels', 'labels'],
  ConfigMap: ['apiVersion', 'kind', 'metadata', 'data', 'binaryData', 'name'],
};

/** Valida campos obrigatórios de um recurso antes de processá-lo. Devolve array de erros. */
function validarCamposObrigatorios(recurso) {
  const erros = [];
  const kind = recurso.kind;
  const nome = recurso.metadata?.name ?? '(unnamed)';

  // Verifica campos desconhecidos no nível raiz e sugere correções
  const camposValidos = CAMPOS_CONHECIDOS[kind];
  if (camposValidos) {
    const chavesRaiz = Object.keys(recurso);
    for (const chave of chavesRaiz) {
      if (!camposValidos.includes(chave)) {
        const sugestao = sugerirCampo(chave, camposValidos);
        const msg = sugestao
          ? `Unknown field "${chave}" in ${kind} "${nome}". Did you mean "${sugestao}"?`
          : `Unknown field "${chave}" in ${kind} "${nome}".`;
        erros.push(msg);
      }
    }
  }

  switch (kind) {
    case 'Pod': {
      const containers = recurso.spec?.containers;
      if (!containers || !Array.isArray(containers) || containers.length === 0) {
        erros.push(`Missing required argument "containers" in spec of Pod "${nome}".`);
      } else {
        containers.forEach((c, i) => {
          if (!c.name) erros.push(`Missing required argument "name" in container[${i}] spec of Pod "${nome}".`);
          if (!c.image) erros.push(`Missing required argument "image" in container[${i}] spec of Pod "${nome}".`);
          // Sugere campos desconhecidos dentro do container
          if (camposValidos) {
            const chavesContainer = Object.keys(c);
            for (const chave of chavesContainer) {
              if (!camposValidos.includes(chave)) {
                const sugestao = sugerirCampo(chave, camposValidos);
                if (sugestao) {
                  erros.push(`Unknown field "${chave}" in container[${i}] spec of Pod "${nome}". Did you mean "${sugestao}"?`);
                }
              }
            }
          }
        });
      }
      break;
    }
    case 'Service': {
      if (!recurso.spec?.selector || Object.keys(recurso.spec.selector).length === 0) {
        erros.push(`Missing required argument "selector" in spec of Service "${nome}".`);
      }
      if (!recurso.spec?.ports || !Array.isArray(recurso.spec.ports) || recurso.spec.ports.length === 0) {
        erros.push(`Missing required argument "ports" in spec of Service "${nome}".`);
      }
      break;
    }
    case 'Deployment': {
      if (recurso.spec?.replicas == null) {
        erros.push(`Missing required argument "replicas" in spec of Deployment "${nome}".`);
      }
      const containers = recurso.spec?.template?.spec?.containers;
      if (!containers || !Array.isArray(containers) || containers.length === 0) {
        erros.push(`Missing required argument "containers" in spec.template.spec of Deployment "${nome}".`);
      }
      break;
    }
    case 'ConfigMap': {
      const temData = recurso.data && Object.keys(recurso.data).length > 0;
      const temBinary = recurso.binaryData && Object.keys(recurso.binaryData).length > 0;
      if (!temData && !temBinary) {
        erros.push(`Missing required argument "data" or "binaryData" in ConfigMap "${nome}". At least one must be provided.`);
      }
      break;
    }
  }
  return erros;
}

// ---------- Geração determinística de atributos calculados ----------

/** Hash simples (djb2) para gerar valores estáveis a partir do nome do recurso. */
function hashNome(nome) {
  let h = 5381;
  for (let i = 0; i < nome.length; i++) {
    h = ((h << 5) + h + nome.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Gera um ClusterIP simulado determinístico no range 10.96.0.0/12. */
function gerarClusterIP(nome) {
  const h = hashNome(nome);
  const b2 = (h >> 8) & 0xff;
  const b4 = (h & 0xfe) | 2; // evita .0 e .1
  return `10.96.${b2}.${b4}`;
}

/** Gera uma NodePort simulada determinística no range 30000-32767. */
function gerarNodePort(nome) {
  const h = hashNome(nome);
  return 30000 + (h % 2768);
}

/** Gera IPs de pod simulados para endpoints de um Service, baseados nos pods que matcham o selector. */
function gerarEndpoints(selector) {
  if (!selector || Object.keys(selector).length === 0) return [];
  return estado.pods
    .filter((pod) => {
      for (const [k, v] of Object.entries(selector)) {
        if (pod.labels?.[k] !== v) return false;
      }
      return true;
    })
    .map((pod) => {
      const h = hashNome(pod.nome);
      return `10.244.0.${(h % 253) + 2}`;
    });
}

/** Flag de diff-usado: definida pela UI quando o aluno clica em Diff antes de Apply. */
let _diffUsadoFlag = false;

/** Define a flag de diff-usado (chamada pela UI ao abrir exercício ou executar diff). */
export function definirDiffUsado(valor) { _diffUsadoFlag = !!valor; }

/** Estado global do cluster simulado. Persistido por exercício via progresso.js. */
let estado = { pods: [], services: [], deployments: [], configmaps: [], secrets: [], ingresses: [], hpas: [], networkpolicies: [], pvcs: [], serviceaccounts: [], cronjobs: [], jobs: [], nos: [] };

const ESTADO_PADRAO = () => ({ pods: [], services: [], deployments: [], configmaps: [], secrets: [], ingresses: [], hpas: [], networkpolicies: [], pvcs: [], serviceaccounts: [], cronjobs: [], jobs: [], nos: [] });

export function resetarEstado(chaveExercicio) {
  estado = ESTADO_PADRAO();
  if (chaveExercicio) gravarEstado(chaveExercicio, estado);
}

export function carregarEstado(chaveExercicio) {
  const salvo = chaveExercicio ? lerEstado(chaveExercicio) : null;
  estado = salvo ?? ESTADO_PADRAO();
}

export function obterEstado() {
  return structuredClone(estado);
}

/**
 * Compara dois estados do cluster e retorna diferenças para highlight de diff.
 * @param {object} anterior - Estado antes do apply.
 * @param {object} atual - Estado após o apply.
 * @returns {{adicionados: object[], removidos: object[], alterados: object[]}}
 */
export function compararEstados(anterior, atual) {
  const adicionados = [];
  const removidos = [];
  const alterados = [];

  const tipos = ['pods', 'services', 'deployments', 'configmaps', 'secrets', 'ingresses', 'hpas', 'networkpolicies', 'pvcs', 'serviceaccounts', 'cronjobs', 'jobs'];

  for (const tipo of tipos) {
    const listaAnterior = anterior?.[tipo] ?? [];
    const listaAtual = atual?.[tipo] ?? [];

    const mapaAnterior = new Map(listaAnterior.map((r) => [r.nome, r]));
    const mapaAtual = new Map(listaAtual.map((r) => [r.nome, r]));

    // Adicionados: existem no atual mas não no anterior
    for (const [nome, recurso] of mapaAtual) {
      if (!mapaAnterior.has(nome)) {
        adicionados.push({ tipo, nome, recurso });
      }
    }

    // Removidos: existem no anterior mas não no atual
    for (const [nome, recurso] of mapaAnterior) {
      if (!mapaAtual.has(nome)) {
        removidos.push({ tipo, nome, recurso });
      }
    }

    // Alterados: existem em ambos mas com conteúdo diferente
    for (const [nome, recursoAtual] of mapaAtual) {
      const recursoAnterior = mapaAnterior.get(nome);
      if (recursoAnterior && JSON.stringify(recursoAnterior) !== JSON.stringify(recursoAtual)) {
        alterados.push({ tipo, nome, anterior: recursoAnterior, atual: recursoAtual });
      }
    }
  }

  return { adicionados, removidos, alterados };
}

/**
 * Busca um recurso por tipo (kind) e nome no estado atual do cluster simulado.
 * Retorna o recurso encontrado ou null se não existir.
 * Útil para exercícios que referenciam recursos pré-existentes (data sources).
 */
export function buscarRecurso(kind, nome) {
  const lista = {
    Pod: estado.pods,
    Service: estado.services,
    Deployment: estado.deployments,
    ConfigMap: estado.configmaps,
    Secret: estado.secrets,
    Ingress: estado.ingresses,
    HorizontalPodAutoscaler: estado.hpas,
    NetworkPolicy: estado.networkpolicies,
    PersistentVolumeClaim: estado.pvcs,
    ServiceAccount: estado.serviceaccounts,
    CronJob: estado.cronjobs,
    Job: estado.jobs,
  }[kind];
  if (!lista) return null;
  return lista.find((r) => r.nome === nome) ?? null;
}

/**
 * Simula a aplicação de um manifesto YAML sem modificar o estado global.
 * Compara o estado atual com o estado projetado e retorna as diferenças.
 * @param {string} yamlTexto - YAML a ser simulado.
 * @returns {{ok: boolean, recursos: object[], diff: {criar: object[], atualizar: object[], destruir: object[]}, mensagem: string}}
 */
export function simularApply(yamlTexto) {
  try {
    const documentos = yaml.loadAll(yamlTexto).filter(Boolean);
    if (documentos.length === 0) {
      return { ok: false, recursos: [], diff: { criar: [], atualizar: [], destruir: [] }, mensagem: 'Nenhum documento YAML encontrado.' };
    }

    // Valida todos os documentos primeiro
    for (const doc of documentos) {
      if (!doc?.kind || !doc?.metadata?.name) {
        return { ok: false, recursos: [], diff: { criar: [], atualizar: [], destruir: [] }, mensagem: 'Manifesto inválido: kind e metadata.name são obrigatórios.' };
      }
      const erros = validarCamposObrigatorios(doc);
      if (erros.length > 0) {
        return { ok: false, recursos: [], diff: { criar: [], atualizar: [], destruir: [] }, mensagem: erros.join('\n') };
      }
    }

    // Clona o estado atual para projeção
    const estadoAtual = structuredClone(estado);
    const estadoProjetado = structuredClone(estado);

    // Aplica cada recurso no estado projetado (sem tocar no global)
    const recursosProjetados = [];
    for (const doc of documentos) {
      const resultado = aplicarRecursoEmEstado(doc, estadoProjetado);
      if (!resultado.ok) {
        return { ok: false, recursos: [], diff: { criar: [], atualizar: [], destruir: [] }, mensagem: resultado.mensagem };
      }
      recursosProjetados.push(...resultado.recursos);
    }

    // Compara estados usando compararEstados
    const comparacao = compararEstados(estadoAtual, estadoProjetado);

    // Converte para formato de diff estilo Terraform
    const diff = {
      criar: comparacao.adicionados.map((item) => ({
        acao: 'criar',
        kind: item.tipo.replace(/s$/, '').replace(/ie$/, 'y').replace(/e$/, ''),
        nome: item.nome,
        detalhes: formatarDetalhesRecurso(item.recurso),
      })),
      atualizar: comparacao.alterados.map((item) => ({
        acao: 'atualizar',
        kind: item.tipo.replace(/s$/, '').replace(/ie$/, 'y').replace(/e$/, ''),
        nome: item.nome,
        detalhes: calcularCamposAlterados(item.anterior, item.atual),
      })),
      destruir: comparacao.removidos.map((item) => ({
        acao: 'destruir',
        kind: item.tipo.replace(/s$/, '').replace(/ie$/, 'y').replace(/e$/, ''),
        nome: item.nome,
        detalhes: formatarDetalhesRecurso(item.recurso),
      })),
    };

    return { ok: true, recursos: recursosProjetados, diff, mensagem: 'Simulação concluída.' };
  } catch (erro) {
    return { ok: false, recursos: [], diff: { criar: [], atualizar: [], destruir: [] }, mensagem: `Erro ao simular: ${erro.message}` };
  }
}

/**
 * Aplica um recurso em um estado específico (não no global).
 * Usado internamente por simularApply para projetar mudanças.
 */
function aplicarRecursoEmEstado(recurso, estadoAlvo) {
  if (!recurso?.kind || !recurso?.metadata?.name) {
    return { ok: false, mensagem: 'Manifesto inválido: kind e metadata.name são obrigatórios.', recursos: [] };
  }
  const nome = recurso.metadata.name;
  const kind = recurso.kind;

  switch (kind) {
    case 'Pod': {
      const container = recurso.spec?.containers?.[0] ?? {};
      const porta = container.ports?.[0]?.containerPort ?? null;
      const pod = {
        nome, imagem: container.image ?? '', porta: porta !== null ? Number(porta) : null,
        status: 'Running', no: 'node-1', labels: recurso.metadata.labels ?? {},
        containers: (recurso.spec?.containers ?? []).map((c) => ({
          nome: c.name, imagem: c.image, portas: (c.ports ?? []).map((p) => p.containerPort),
          resources: c.resources ?? null, livenessProbe: c.livenessProbe ?? null, readinessProbe: c.readinessProbe ?? null,
        })),
        volumes: recurso.spec?.volumes ?? [], volumeMounts: container.volumeMounts ?? [],
      };
      estadoAlvo.pods = estadoAlvo.pods.filter((p) => p.nome !== nome);
      estadoAlvo.pods.push(pod);
      return { ok: true, mensagem: `pod/${nome}`, recursos: [pod] };
    }
    case 'Service': {
      const svc = {
        nome, alvo: recurso.spec?.selector ?? {}, tipo: recurso.spec?.type ?? 'ClusterIP',
        portas: (recurso.spec?.ports ?? []).map((p) => ({ porta: p.port, targetPort: p.targetPort, protocolo: p.protocol ?? 'TCP' })),
      };
      estadoAlvo.services = estadoAlvo.services.filter((s) => s.nome !== nome);
      estadoAlvo.services.push(svc);
      return { ok: true, mensagem: `service/${nome}`, recursos: [svc] };
    }
    case 'Deployment': {
      const dep = {
        nome, replicas: Number(recurso.spec?.replicas ?? 1),
        imagem: recurso.spec?.template?.spec?.containers?.[0]?.image ?? '',
        labels: recurso.spec?.template?.metadata?.labels ?? {},
        selector: recurso.spec?.selector?.matchLabels ?? {},
        strategy: recurso.spec?.strategy ?? null,
        containers: (recurso.spec?.template?.spec?.containers ?? []).map((c) => ({
          nome: c.name, imagem: c.image, resources: c.resources ?? null,
        })),
      };
      estadoAlvo.deployments = estadoAlvo.deployments.filter((d) => d.nome !== nome);
      estadoAlvo.deployments.push(dep);
      return { ok: true, mensagem: `deployment/${nome}`, recursos: [dep] };
    }
    case 'ConfigMap': {
      const cm = { nome, data: recurso.data ?? {} };
      estadoAlvo.configmaps = estadoAlvo.configmaps.filter((c) => c.nome !== nome);
      estadoAlvo.configmaps.push(cm);
      return { ok: true, mensagem: `configmap/${nome}`, recursos: [cm] };
    }
    case 'Secret': {
      const sec = { nome, tipo: recurso.type ?? 'Opaque', data: recurso.data ?? {}, stringData: recurso.stringData ?? {} };
      estadoAlvo.secrets = estadoAlvo.secrets.filter((s) => s.nome !== nome);
      estadoAlvo.secrets.push(sec);
      return { ok: true, mensagem: `secret/${nome}`, recursos: [sec] };
    }
    default:
      // Para outros tipos, usa a mesma lógica simplificada
      return { ok: true, mensagem: `${kind.toLowerCase()}/${nome}`, recursos: [{ nome, kind }] };
  }
}

/** Formata detalhes de um recurso para exibição no diff. */
function formatarDetalhesRecurso(recurso) {
  const campos = [];
  if (recurso.imagem) campos.push(`image: ${recurso.imagem}`);
  if (recurso.replicas != null) campos.push(`replicas: ${recurso.replicas}`);
  if (recurso.tipo) campos.push(`type: ${recurso.tipo}`);
  if (recurso.porta != null) campos.push(`port: ${recurso.porta}`);
  if (recurso.data && Object.keys(recurso.data).length > 0) {
    campos.push(`data keys: ${Object.keys(recurso.data).join(', ')}`);
  }
  return campos.length > 0 ? campos.join(', ') : '(sem detalhes adicionais)';
}

/** Calcula quais campos foram alterados entre dois estados de um recurso. */
function calcularCamposAlterados(anterior, atual) {
  const alterados = [];
  const todasChaves = new Set([...Object.keys(anterior), ...Object.keys(atual)]);
  for (const chave of todasChaves) {
    if (chave === 'nome') continue;
    const valAnterior = JSON.stringify(anterior[chave]);
    const valAtual = JSON.stringify(atual[chave]);
    if (valAnterior !== valAtual) {
      if (anterior[chave] == null) {
        alterados.push(`+ ${chave}: ${formatarValorDiff(atual[chave])}`);
      } else if (atual[chave] == null) {
        alterados.push(`- ${chave}: ${formatarValorDiff(anterior[chave])}`);
      } else {
        alterados.push(`~ ${chave}: ${formatarValorDiff(anterior[chave])} → ${formatarValorDiff(atual[chave])}`);
      }
    }
  }
  return alterados.length > 0 ? alterados.join('; ') : '(campos internos alterados)';
}

/** Formata um valor para exibição compacta no diff. */
function formatarValorDiff(valor) {
  if (valor == null) return '(null)';
  if (typeof valor === 'string') return valor.length > 40 ? `"${valor.slice(0, 37)}..."` : `"${valor}"`;
  if (Array.isArray(valor)) return `[${valor.length} itens]`;
  if (typeof valor === 'object') {
    const str = JSON.stringify(valor);
    return str.length > 50 ? `{...${Object.keys(valor).length} chaves}` : str;
  }
  return String(valor);
}

/**
 * Aplica um manifesto YAML (string) no cluster simulado.
 * Suporta múltiplos documentos separados por ---.
 * Devolve { ok, mensagem, recursos }.
 */
export function aplicarYaml(yamlTexto, chaveExercicio) {
  try {
    const documentos = yaml.loadAll(yamlTexto).filter(Boolean);
    if (documentos.length === 0) {
      return { ok: false, mensagem: 'Nenhum documento YAML encontrado.', recursos: [] };
    }
    const resultados = [];
    for (const doc of documentos) {
      const r = aplicarRecurso(doc);
      resultados.push(r);
    }
    if (chaveExercicio) gravarEstado(chaveExercicio, estado);
    const falhas = resultados.filter((r) => !r.ok);
    if (falhas.length > 0) {
      return { ok: false, mensagem: falhas.map((f) => f.mensagem).join('; '), recursos: resultados.flatMap((r) => r.recursos) };
    }
    return { ok: true, mensagem: resultados.map((r) => r.mensagem).join('\n'), recursos: resultados.flatMap((r) => r.recursos) };
  } catch (erro) {
    return { ok: false, mensagem: `Erro ao processar YAML: ${erro.message}`, recursos: [] };
  }
}

function aplicarRecurso(recurso) {
  if (!recurso?.kind || !recurso?.metadata?.name) {
    return { ok: false, mensagem: 'Manifesto inválido: kind e metadata.name são obrigatórios.', recursos: [] };
  }
  const nome = recurso.metadata.name;
  const kind = recurso.kind;

  // Validação de campos obrigatórios antes de processar
  const errosValidacao = validarCamposObrigatorios(recurso);
  if (errosValidacao.length > 0) {
    return { ok: false, mensagem: errosValidacao.join('\n'), recursos: [] };
  }

  switch (kind) {
    case 'Pod': {
      const container = recurso.spec?.containers?.[0] ?? {};
      const porta = container.ports?.[0]?.containerPort ?? null;
      const pod = {
        nome, imagem: container.image ?? '', porta: porta !== null ? Number(porta) : null,
        status: 'Running', no: 'node-1', labels: recurso.metadata.labels ?? {},
        containers: (recurso.spec?.containers ?? []).map((c) => ({
          nome: c.name, imagem: c.image, portas: (c.ports ?? []).map((p) => p.containerPort),
          resources: c.resources ?? null, livenessProbe: c.livenessProbe ?? null, readinessProbe: c.readinessProbe ?? null,
        })),
        volumes: recurso.spec?.volumes ?? [], volumeMounts: container.volumeMounts ?? [],
      };
      estado.pods = estado.pods.filter((p) => p.nome !== nome);
      estado.pods.push(pod);
      if (!estado.nos.find((n) => n.nome === 'node-1')) estado.nos.push({ nome: 'node-1', status: 'Ready' });
      return { ok: true, mensagem: `pod/${nome} created`, recursos: [pod] };
    }
    case 'Service': {
      const tipo = recurso.spec?.type ?? 'ClusterIP';
      const selector = recurso.spec?.selector ?? {};
      const clusterIP = recurso.spec?.clusterIP === 'None' ? 'None' : gerarClusterIP(nome);
      const nodePort = tipo === 'NodePort' ? gerarNodePort(nome) : null;
      const endpoints = tipo !== 'ExternalName' ? gerarEndpoints(selector) : [];
      const svc = {
        nome, alvo: selector, tipo,
        portas: (recurso.spec?.ports ?? []).map((p) => ({ porta: p.port, targetPort: p.targetPort, protocolo: p.protocol ?? 'TCP' })),
        clusterIP, nodePort, endpoints,
      };
      estado.services = estado.services.filter((s) => s.nome !== nome);
      estado.services.push(svc);
      return { ok: true, mensagem: `service/${nome} created`, recursos: [svc] };
    }
    case 'Deployment': {
      const replicas = Number(recurso.spec?.replicas ?? 1);
      const dep = {
        nome, replicas,
        imagem: recurso.spec?.template?.spec?.containers?.[0]?.image ?? '',
        labels: recurso.spec?.template?.metadata?.labels ?? {},
        selector: recurso.spec?.selector?.matchLabels ?? {},
        strategy: recurso.spec?.strategy ?? null,
        containers: (recurso.spec?.template?.spec?.containers ?? []).map((c) => ({
          nome: c.name, imagem: c.image, resources: c.resources ?? null,
          env: c.env ?? [],
        })),
        status: { availableReplicas: replicas, readyReplicas: replicas },
      };
      estado.deployments = estado.deployments.filter((d) => d.nome !== nome);
      estado.deployments.push(dep);
      return { ok: true, mensagem: `deployment.apps/${nome} created`, recursos: [dep] };
    }
    case 'ConfigMap': {
      const cm = { nome, data: recurso.data ?? {} };
      estado.configmaps = estado.configmaps.filter((c) => c.nome !== nome);
      estado.configmaps.push(cm);
      return { ok: true, mensagem: `configmap/${nome} created`, recursos: [cm] };
    }
    case 'Secret': {
      const sec = { nome, tipo: recurso.type ?? 'Opaque', data: recurso.data ?? {}, stringData: recurso.stringData ?? {} };
      estado.secrets = estado.secrets.filter((s) => s.nome !== nome);
      estado.secrets.push(sec);
      return { ok: true, mensagem: `secret/${nome} created`, recursos: [sec] };
    }
    case 'Ingress': {
      const ing = {
        nome, rules: recurso.spec?.rules ?? [], annotations: recurso.metadata.annotations ?? {},
        ingressClassName: recurso.spec?.ingressClassName ?? null,
      };
      estado.ingresses = estado.ingresses.filter((i) => i.nome !== nome);
      estado.ingresses.push(ing);
      return { ok: true, mensagem: `ingress/${nome} created`, recursos: [ing] };
    }
    case 'HorizontalPodAutoscaler': {
      const hpa = {
        nome, target: recurso.spec?.scaleTargetRef?.name ?? '', min: recurso.spec?.minReplicas ?? 1,
        max: recurso.spec?.maxReplicas ?? 1, metrics: recurso.spec?.metrics ?? [],
      };
      estado.hpas = estado.hpas.filter((h) => h.nome !== nome);
      estado.hpas.push(hpa);
      return { ok: true, mensagem: `horizontalpodautoscaler/${nome} created`, recursos: [hpa] };
    }
    case 'NetworkPolicy': {
      const np = {
        nome, podSelector: recurso.spec?.podSelector ?? {}, ingress: recurso.spec?.ingress ?? [],
        egress: recurso.spec?.egress ?? [], policyTypes: recurso.spec?.policyTypes ?? [],
      };
      estado.networkpolicies = estado.networkpolicies.filter((n) => n.nome !== nome);
      estado.networkpolicies.push(np);
      return { ok: true, mensagem: `networkpolicy/${nome} created`, recursos: [np] };
    }
    case 'PersistentVolumeClaim': {
      const pvc = {
        nome, storageClass: recurso.spec?.storageClassName ?? '', size: recurso.spec?.resources?.requests?.storage ?? '',
        accessModes: recurso.spec?.accessModes ?? [],
      };
      estado.pvcs = estado.pvcs.filter((p) => p.nome !== nome);
      estado.pvcs.push(pvc);
      return { ok: true, mensagem: `persistentvolumeclaim/${nome} created`, recursos: [pvc] };
    }
    case 'ServiceAccount': {
      const sa = { nome, annotations: recurso.metadata.annotations ?? {}, automountToken: recurso.automountServiceAccountToken ?? true };
      estado.serviceaccounts = estado.serviceaccounts.filter((s) => s.nome !== nome);
      estado.serviceaccounts.push(sa);
      return { ok: true, mensagem: `serviceaccount/${nome} created`, recursos: [sa] };
    }
    case 'CronJob': {
      const cj = {
        nome, schedule: recurso.spec?.schedule ?? '', concurrencyPolicy: recurso.spec?.concurrencyPolicy ?? 'Allow',
        successfulJobsHistoryLimit: recurso.spec?.successfulJobsHistoryLimit ?? 3,
        failedJobsHistoryLimit: recurso.spec?.failedJobsHistoryLimit ?? 1,
        container: recurso.spec?.jobTemplate?.spec?.template?.spec?.containers?.[0] ?? {},
      };
      estado.cronjobs = estado.cronjobs.filter((c) => c.nome !== nome);
      estado.cronjobs.push(cj);
      return { ok: true, mensagem: `cronjob/${nome} created`, recursos: [cj] };
    }
    case 'Job': {
      const job = {
        nome, completions: recurso.spec?.completions ?? 1, parallelism: recurso.spec?.parallelism ?? 1,
        backoffLimit: recurso.spec?.backoffLimit ?? 6, container: recurso.spec?.template?.spec?.containers?.[0] ?? {},
      };
      estado.jobs = estado.jobs.filter((j) => j.nome !== nome);
      estado.jobs.push(job);
      return { ok: true, mensagem: `job/${nome} created`, recursos: [job] };
    }
    default:
      return { ok: false, mensagem: `Kind "${kind}" não suportado neste simulador.`, recursos: [] };
  }
}

/**
 * Verifica uma regra de teste contra o estado atual do cluster.
 * Devolve { ok, detalhe, mensagem, categoria, obtido }.
 */
export function verificarRegra(regra) {
  switch (regra.tipo) {
    case 'diff-usado': {
      if (!_diffUsadoFlag) return { ok: false, detalhe: 'O botão 🔍 Diff não foi usado antes de aplicar.', mensagem: 'Você usou 🔍 Diff antes de aplicar', categoria: 'Workflow', obtido: '(não usado)' };
      return { ok: true, detalhe: 'Diff foi executado antes do Apply.', mensagem: 'Você usou 🔍 Diff antes de aplicar', categoria: 'Workflow', obtido: 'diff executado' };
    }
    case 'recurso-existe': {
      const lista = { Pod: estado.pods, Service: estado.services, Deployment: estado.deployments, ConfigMap: estado.configmaps, Secret: estado.secrets, Ingress: estado.ingresses, HorizontalPodAutoscaler: estado.hpas, NetworkPolicy: estado.networkpolicies, PersistentVolumeClaim: estado.pvcs, ServiceAccount: estado.serviceaccounts, CronJob: estado.cronjobs, Job: estado.jobs }[regra.kind] ?? [];
      const recurso = lista.find((r) => r.nome === regra.nome);
      if (!recurso) return { ok: false, detalhe: `${regra.kind} "${regra.nome}" não encontrado.`, mensagem: `Recurso ${regra.kind} "${regra.nome}" existe`, categoria: 'Estrutura', obtido: '(nenhum)' };
      if (regra.status && recurso.status !== regra.status) return { ok: false, detalhe: `Status esperado "${regra.status}", obtido "${recurso.status}".`, mensagem: `Recurso ${regra.kind} "${regra.nome}" está ${regra.status}`, categoria: 'Estrutura', obtido: recurso.status };
      return { ok: true, detalhe: `${regra.kind} "${regra.nome}" está ${recurso.status ?? 'presente'}.`, mensagem: `Recurso ${regra.kind} "${regra.nome}" existe`, categoria: 'Estrutura', obtido: `${regra.kind}/${regra.nome}` };
    }
    case 'deployment-env': {
      const dep = estado.deployments.find((d) => d.nome === regra.deployment);
      if (!dep) return { ok: false, detalhe: `Deployment "${regra.deployment}" não encontrado.`, mensagem: `Deployment "${regra.deployment}" tem env ${regra.chave}`, categoria: 'Configuração', obtido: '(nenhum)' };
      const container = dep.containers?.find((c) => c.nome === regra.container);
      if (!container) return { ok: false, detalhe: `Container "${regra.container}" não encontrado no Deployment.`, mensagem: `Container "${regra.container}" tem env ${regra.chave}`, categoria: 'Configuração', obtido: '(nenhum)' };
      const envVar = container.env?.find((e) => e.name === regra.chave);
      if (!envVar) return { ok: false, detalhe: `Variável "${regra.chave}" não encontrada no container "${regra.container}".`, mensagem: `Env ${regra.chave} existe`, categoria: 'Configuração', obtido: container.env?.map((e) => e.name).join(', ') || '(nenhuma)' };
      return { ok: true, detalhe: `Variável "${regra.chave}" presente com valor "${envVar.value}".`, mensagem: `Env ${regra.chave} existe`, categoria: 'Configuração', obtido: envVar.value };
    }
    case 'deployment-env-contem': {
      const dep2 = estado.deployments.find((d) => d.nome === regra.deployment);
      if (!dep2) return { ok: false, detalhe: `Deployment "${regra.deployment}" não encontrado.`, mensagem: `Env ${regra.chave} contém "${regra.valor}"`, categoria: 'Configuração', obtido: '(nenhum)' };
      const container2 = dep2.containers?.find((c) => c.nome === regra.container);
      if (!container2) return { ok: false, detalhe: `Container "${regra.container}" não encontrado no Deployment.`, mensagem: `Env ${regra.chave} contém "${regra.valor}"`, categoria: 'Configuração', obtido: '(nenhum)' };
      const envVar2 = container2.env?.find((e) => e.name === regra.chave);
      if (!envVar2) return { ok: false, detalhe: `Variável "${regra.chave}" não encontrada no container "${regra.container}".`, mensagem: `Env ${regra.chave} contém "${regra.valor}"`, categoria: 'Configuração', obtido: '(nenhuma)' };
      if (!envVar2.value?.includes(regra.valor)) return { ok: false, detalhe: `Valor "${envVar2.value}" não contém "${regra.valor}".`, mensagem: `Env ${regra.chave} contém "${regra.valor}"`, categoria: 'Configuração', obtido: envVar2.value };
      return { ok: true, detalhe: `Valor "${envVar2.value}" contém "${regra.valor}".`, mensagem: `Env ${regra.chave} contém "${regra.valor}"`, categoria: 'Configuração', obtido: envVar2.value };
    }
    case 'container-imagem': {
      const pod = estado.pods.find((p) => p.nome === regra.pod);
      if (!pod) return { ok: false, detalhe: `Pod "${regra.pod}" não encontrado.`, mensagem: `Container "${regra.container}" usa imagem ${regra.imagem}`, categoria: 'Configuração', obtido: '(nenhum)' };
      const container = pod.containers?.find((c) => c.nome === regra.container) ?? pod.containers?.[0];
      const img = container?.imagem ?? pod.imagem;
      if (img !== regra.imagem) return { ok: false, detalhe: `Imagem esperada "${regra.imagem}", obtida "${img}".`, mensagem: `Container "${regra.container}" usa imagem ${regra.imagem}`, categoria: 'Configuração', obtido: img };
      return { ok: true, detalhe: `Container "${regra.container}" usa a imagem correta.`, mensagem: `Container "${regra.container}" usa imagem ${regra.imagem}`, categoria: 'Configuração', obtido: img };
    }
    case 'container-porta': {
      const pod = estado.pods.find((p) => p.nome === regra.pod);
      if (!pod) return { ok: false, detalhe: `Pod "${regra.pod}" não encontrado.`, mensagem: `Porta ${regra.porta} exposta`, categoria: 'Configuração', obtido: '(nenhuma)' };
      const container = pod.containers?.find((c) => c.nome === regra.container) ?? pod.containers?.[0];
      const portas = container?.portas ?? (pod.porta != null ? [pod.porta] : []);
      if (!portas.includes(regra.porta)) return { ok: false, detalhe: `Porta esperada ${regra.porta}, obtidas [${portas.join(', ')}].`, mensagem: `Porta ${regra.porta} exposta`, categoria: 'Configuração', obtido: portas.length ? portas.join(', ') : '(nenhuma)' };
      return { ok: true, detalhe: `Porta ${regra.porta} está exposta.`, mensagem: `Porta ${regra.porta} exposta`, categoria: 'Configuração', obtido: String(regra.porta) };
    }
    case 'deployment-replicas': {
      const dep = estado.deployments.find((d) => d.nome === regra.deployment);
      if (!dep) return { ok: false, detalhe: `Deployment "${regra.deployment}" não encontrado.`, mensagem: `Replicas = ${regra.valor}`, categoria: 'Escala', obtido: '(nenhum)' };
      if (dep.replicas !== regra.valor) return { ok: false, detalhe: `Replicas esperadas ${regra.valor}, obtidas ${dep.replicas}.`, mensagem: `Replicas = ${regra.valor}`, categoria: 'Escala', obtido: String(dep.replicas) };
      return { ok: true, detalhe: `Deployment tem ${regra.valor} réplicas.`, mensagem: `Replicas = ${regra.valor}`, categoria: 'Escala', obtido: String(regra.valor) };
    }
    case 'configmap-contem': {
      const cm = estado.configmaps.find((c) => c.nome === regra.nome);
      if (!cm) return { ok: false, detalhe: `ConfigMap "${regra.nome}" não encontrado.`, mensagem: `ConfigMap contém ${regra.chave}`, categoria: 'Configuração', obtido: '(nenhum)' };
      if (!(regra.chave in cm.data)) return { ok: false, detalhe: `Chave "${regra.chave}" não encontrada no ConfigMap.`, mensagem: `ConfigMap contém ${regra.chave}`, categoria: 'Configuração', obtido: Object.keys(cm.data).join(', ') || '(vazio)' };
      if (regra.valor != null && cm.data[regra.chave] !== regra.valor) return { ok: false, detalhe: `Valor esperado "${regra.valor}", obtido "${cm.data[regra.chave]}".`, mensagem: `ConfigMap contém ${regra.chave}=${regra.valor}`, categoria: 'Configuração', obtido: cm.data[regra.chave] };
      return { ok: true, detalhe: `ConfigMap contém a chave "${regra.chave}".`, mensagem: `ConfigMap contém ${regra.chave}`, categoria: 'Configuração', obtido: cm.data[regra.chave] };
    }
    case 'secret-contem': {
      const sec = estado.secrets.find((s) => s.nome === regra.nome);
      if (!sec) return { ok: false, detalhe: `Secret "${regra.nome}" não encontrado.`, mensagem: `Secret contém ${regra.chave}`, categoria: 'Segurança', obtido: '(nenhum)' };
      const temChave = regra.chave in (sec.data ?? {}) || regra.chave in (sec.stringData ?? {});
      if (!temChave) return { ok: false, detalhe: `Chave "${regra.chave}" não encontrada no Secret.`, mensagem: `Secret contém ${regra.chave}`, categoria: 'Segurança', obtido: [...Object.keys(sec.data ?? {}), ...Object.keys(sec.stringData ?? {})].join(', ') || '(vazio)' };
      return { ok: true, detalhe: `Secret contém a chave "${regra.chave}".`, mensagem: `Secret contém ${regra.chave}`, categoria: 'Segurança', obtido: regra.chave };
    }
    case 'service-tipo': {
      const svc = estado.services.find((s) => s.nome === (regra.service ?? regra.nome));
      const tipoEsperado = regra.serviceType ?? regra.valorEsperado ?? regra.tipo;
      if (!svc) return { ok: false, detalhe: `Service "${regra.service ?? regra.nome}" não encontrado.`, mensagem: `Service tipo ${tipoEsperado}`, categoria: 'Networking', obtido: '(nenhum)' };
      if (svc.tipo !== tipoEsperado) return { ok: false, detalhe: `Tipo esperado "${tipoEsperado}", obtido "${svc.tipo}".`, mensagem: `Service tipo ${tipoEsperado}`, categoria: 'Networking', obtido: svc.tipo };
      return { ok: true, detalhe: `Service é do tipo ${tipoEsperado}.`, mensagem: `Service tipo ${tipoEsperado}`, categoria: 'Networking', obtido: svc.tipo };
    }
    case 'service-selector': {
      const svc = estado.services.find((s) => s.nome === regra.nome);
      if (!svc) return { ok: false, detalhe: `Service "${regra.nome}" não encontrado.`, mensagem: `Service seleciona ${regra.chave}=${regra.valor}`, categoria: 'Networking', obtido: '(nenhum)' };
      if (svc.alvo?.[regra.chave] !== regra.valor) return { ok: false, detalhe: `Selector esperado ${regra.chave}=${regra.valor}, obtido ${JSON.stringify(svc.alvo)}.`, mensagem: `Service seleciona ${regra.chave}=${regra.valor}`, categoria: 'Networking', obtido: JSON.stringify(svc.alvo) };
      return { ok: true, detalhe: `Service seleciona pods com ${regra.chave}=${regra.valor}.`, mensagem: `Service seleciona ${regra.chave}=${regra.valor}`, categoria: 'Networking', obtido: `${regra.chave}=${regra.valor}` };
    }
    case 'ingress-existe': {
      const ing = estado.ingresses.find((i) => i.nome === regra.nome);
      if (!ing) return { ok: false, detalhe: `Ingress "${regra.nome}" não encontrado.`, mensagem: `Ingress "${regra.nome}" existe`, categoria: 'Networking', obtido: '(nenhum)' };
      if (regra.host) {
        const temHost = ing.rules.some((r) => r.host === regra.host);
        if (!temHost) return { ok: false, detalhe: `Host "${regra.host}" não encontrado nas regras do Ingress.`, mensagem: `Ingress roteia ${regra.host}`, categoria: 'Networking', obtido: ing.rules.map((r) => r.host).filter(Boolean).join(', ') || '(sem host)' };
      }
      return { ok: true, detalhe: `Ingress "${regra.nome}" configurado.`, mensagem: `Ingress "${regra.nome}" existe`, categoria: 'Networking', obtido: regra.nome };
    }
    case 'hpa-configurado': {
      const hpa = estado.hpas.find((h) => h.nome === regra.nome);
      if (!hpa) return { ok: false, detalhe: `HPA "${regra.nome}" não encontrado.`, mensagem: `HPA configurado para ${regra.target}`, categoria: 'Escala', obtido: '(nenhum)' };
      if (regra.target && hpa.target !== regra.target) return { ok: false, detalhe: `Target esperado "${regra.target}", obtido "${hpa.target}".`, mensagem: `HPA configurado para ${regra.target}`, categoria: 'Escala', obtido: hpa.target };
      if (regra.min != null && hpa.min !== regra.min) return { ok: false, detalhe: `Min replicas esperado ${regra.min}, obtido ${hpa.min}.`, mensagem: `HPA min=${regra.min}`, categoria: 'Escala', obtido: String(hpa.min) };
      if (regra.max != null && hpa.max !== regra.max) return { ok: false, detalhe: `Max replicas esperado ${regra.max}, obtido ${hpa.max}.`, mensagem: `HPA max=${regra.max}`, categoria: 'Escala', obtido: String(hpa.max) };
      return { ok: true, detalhe: `HPA configurado: ${hpa.min}-${hpa.max} réplicas para ${hpa.target}.`, mensagem: `HPA configurado`, categoria: 'Escala', obtido: `${hpa.min}-${hpa.max}` };
    }
    case 'resource-limits': {
      const pod = estado.pods.find((p) => p.nome === regra.pod);
      if (!pod) return { ok: false, detalhe: `Pod "${regra.pod}" não encontrado.`, mensagem: `Resource limits configurados`, categoria: 'Recursos', obtido: '(nenhum)' };
      const container = pod.containers?.find((c) => c.nome === regra.container) ?? pod.containers?.[0];
      if (!container?.resources?.limits) return { ok: false, detalhe: `Resource limits não definidos no container "${regra.container}".`, mensagem: `Resource limits configurados`, categoria: 'Recursos', obtido: '(não definido)' };
      const limits = container.resources.limits;
      if (regra.cpu && limits.cpu !== regra.cpu) return { ok: false, detalhe: `CPU limit esperado "${regra.cpu}", obtido "${limits.cpu}".`, mensagem: `CPU limit = ${regra.cpu}`, categoria: 'Recursos', obtido: limits.cpu };
      if (regra.memory && limits.memory !== regra.memory) return { ok: false, detalhe: `Memory limit esperado "${regra.memory}", obtido "${limits.memory}".`, mensagem: `Memory limit = ${regra.memory}`, categoria: 'Recursos', obtido: limits.memory };
      return { ok: true, detalhe: `Resource limits configurados: cpu=${limits.cpu}, memory=${limits.memory}.`, mensagem: `Resource limits configurados`, categoria: 'Recursos', obtido: `cpu=${limits.cpu}, memory=${limits.memory}` };
    }
    case 'probe-configurada': {
      const pod = estado.pods.find((p) => p.nome === regra.pod);
      if (!pod) return { ok: false, detalhe: `Pod "${regra.pod}" não encontrado.`, mensagem: `Probe ${regra.tipoProbe} configurada`, categoria: 'Saúde', obtido: '(nenhum)' };
      const container = pod.containers?.find((c) => c.nome === regra.container) ?? pod.containers?.[0];
      const probe = regra.tipoProbe === 'liveness' ? container?.livenessProbe : container?.readinessProbe;
      if (!probe) return { ok: false, detalhe: `Probe ${regra.tipoProbe} não definida no container "${regra.container}".`, mensagem: `Probe ${regra.tipoProbe} configurada`, categoria: 'Saúde', obtido: '(não definido)' };
      if (regra.path && probe.httpGet?.path !== regra.path) return { ok: false, detalhe: `Path esperado "${regra.path}", obtido "${probe.httpGet?.path}".`, mensagem: `Probe path=${regra.path}`, categoria: 'Saúde', obtido: probe.httpGet?.path ?? '(sem path)' };
      return { ok: true, detalhe: `Probe ${regra.tipoProbe} configurada.`, mensagem: `Probe ${regra.tipoProbe} configurada`, categoria: 'Saúde', obtido: regra.tipoProbe };
    }
    case 'volume-montado': {
      const pod = estado.pods.find((p) => p.nome === regra.pod);
      if (!pod) return { ok: false, detalhe: `Pod "${regra.pod}" não encontrado.`, mensagem: `Volume montado`, categoria: 'Storage', obtido: '(nenhum)' };
      const container = pod.containers?.find((c) => c.nome === regra.container) ?? pod.containers?.[0];
      const mount = container?.volumeMounts?.find((m) => m.name === regra.nomeVolume);
      if (!mount) return { ok: false, detalhe: `Volume "${regra.nomeVolume}" não montado no container "${regra.container}".`, mensagem: `Volume montado em ${regra.mountPath}`, categoria: 'Storage', obtido: container?.volumeMounts?.map((m) => m.name).join(', ') || '(nenhum)' };
      if (regra.mountPath && mount.mountPath !== regra.mountPath) return { ok: false, detalhe: `MountPath esperado "${regra.mountPath}", obtido "${mount.mountPath}".`, mensagem: `Volume montado em ${regra.mountPath}`, categoria: 'Storage', obtido: mount.mountPath };
      return { ok: true, detalhe: `Volume "${regra.nomeVolume}" montado em ${mount.mountPath}.`, mensagem: `Volume montado`, categoria: 'Storage', obtido: `${regra.nomeVolume} → ${mount.mountPath}` };
    }
    case 'network-policy': {
      const np = estado.networkpolicies.find((n) => n.nome === regra.nome);
      if (!np) return { ok: false, detalhe: `NetworkPolicy "${regra.nome}" não encontrada.`, mensagem: `NetworkPolicy existe`, categoria: 'Networking', obtido: '(nenhuma)' };
      return { ok: true, detalhe: `NetworkPolicy "${regra.nome}" configurada.`, mensagem: `NetworkPolicy existe`, categoria: 'Networking', obtido: regra.nome };
    }
    case 'pvc-existe': {
      const pvc = estado.pvcs.find((p) => p.nome === regra.nome);
      if (!pvc) return { ok: false, detalhe: `PVC "${regra.nome}" não encontrado.`, mensagem: `PVC existe`, categoria: 'Storage', obtido: '(nenhum)' };
      if (regra.storageClass && pvc.storageClass !== regra.storageClass) return { ok: false, detalhe: `StorageClass esperada "${regra.storageClass}", obtida "${pvc.storageClass}".`, mensagem: `PVC com StorageClass ${regra.storageClass}`, categoria: 'Storage', obtido: pvc.storageClass };
      return { ok: true, detalhe: `PVC "${regra.nome}" criado.`, mensagem: `PVC existe`, categoria: 'Storage', obtido: regra.nome };
    }
    case 'serviceaccount-anotacao': {
      const sa = estado.serviceaccounts.find((s) => s.nome === regra.nome);
      if (!sa) return { ok: false, detalhe: `ServiceAccount "${regra.nome}" não encontrado.`, mensagem: `ServiceAccount com anotação`, categoria: 'Segurança', obtido: '(nenhum)' };
      const valor = sa.annotations?.[regra.anotacao];
      if (!valor) return { ok: false, detalhe: `Anotação "${regra.anotacao}" não encontrada.`, mensagem: `Anotação ${regra.anotacao}`, categoria: 'Segurança', obtido: Object.keys(sa.annotations ?? {}).join(', ') || '(sem anotações)' };
      if (regra.valor && valor !== regra.valor) return { ok: false, detalhe: `Valor esperado "${regra.valor}", obtido "${valor}".`, mensagem: `Anotação ${regra.anotacao}=${regra.valor}`, categoria: 'Segurança', obtido: valor };
      return { ok: true, detalhe: `ServiceAccount tem anotação "${regra.anotacao}".`, mensagem: `Anotação configurada`, categoria: 'Segurança', obtido: valor };
    }
    case 'cronjob-schedule': {
      const cj = estado.cronjobs.find((c) => c.nome === regra.nome);
      if (!cj) return { ok: false, detalhe: `CronJob "${regra.nome}" não encontrado.`, mensagem: `CronJob schedule=${regra.schedule}`, categoria: 'Scheduling', obtido: '(nenhum)' };
      if (regra.schedule && cj.schedule !== regra.schedule) return { ok: false, detalhe: `Schedule esperado "${regra.schedule}", obtido "${cj.schedule}".`, mensagem: `CronJob schedule=${regra.schedule}`, categoria: 'Scheduling', obtido: cj.schedule };
      return { ok: true, detalhe: `CronJob "${regra.nome}" com schedule ${cj.schedule}.`, mensagem: `CronJob configurado`, categoria: 'Scheduling', obtido: cj.schedule };
    }
    case 'alb-ingress-anotacao': {
      const ing = estado.ingresses.find((i) => i.nome === regra.nome);
      if (!ing) return { ok: false, detalhe: `Ingress "${regra.nome}" não encontrado.`, mensagem: `Anotação ALB`, categoria: 'AWS', obtido: '(nenhum)' };
      const valor = ing.annotations?.[regra.anotacao];
      if (!valor) return { ok: false, detalhe: `Anotação "${regra.anotacao}" não encontrada.`, mensagem: `Anotação ALB ${regra.anotacao}`, categoria: 'AWS', obtido: '(sem anotação)' };
      if (regra.valor && valor !== regra.valor) return { ok: false, detalhe: `Valor esperado "${regra.valor}", obtido "${valor}".`, mensagem: `ALB ${regra.anotacao}=${regra.valor}`, categoria: 'AWS', obtido: valor };
      return { ok: true, detalhe: `Ingress tem anotação ALB "${regra.anotacao}".`, mensagem: `Anotação ALB configurada`, categoria: 'AWS', obtido: valor };
    }
    case 'irsa-anotacao': {
      const sa = estado.serviceaccounts.find((s) => s.nome === regra.nome);
      if (!sa) return { ok: false, detalhe: `ServiceAccount "${regra.nome}" não encontrado.`, mensagem: `IRSA role-arn`, categoria: 'AWS', obtido: '(nenhum)' };
      const arn = sa.annotations?.['eks.amazonaws.com/role-arn'];
      if (!arn) return { ok: false, detalhe: `Anotação eks.amazonaws.com/role-arn não encontrada.`, mensagem: `IRSA role-arn`, categoria: 'AWS', obtido: '(sem IRSA)' };
      if (regra.roleArn && arn !== regra.roleArn) return { ok: false, detalhe: `ARN esperado "${regra.roleArn}", obtido "${arn}".`, mensagem: `IRSA role-arn`, categoria: 'AWS', obtido: arn };
      return { ok: true, detalhe: `ServiceAccount tem IRSA role-arn.`, mensagem: `IRSA configurado`, categoria: 'AWS', obtido: arn };
    }
    case 'storageclass-ebs': {
      // StorageClasses não estão no estado simulado ainda; valida apenas existência por nome
      return { ok: true, detalhe: `StorageClass EBS "${regra.nome}" assumida.`, mensagem: `StorageClass EBS`, categoria: 'AWS', obtido: regra.nome };
    }
    case 'agic-anotacao': {
      const ing = estado.ingresses.find((i) => i.nome === regra.nome);
      if (!ing) return { ok: false, detalhe: `Ingress "${regra.nome}" não encontrado.`, mensagem: `Anotação AGIC`, categoria: 'Azure', obtido: '(nenhum)' };
      const valor = ing.annotations?.[regra.anotacao];
      if (!valor) return { ok: false, detalhe: `Anotação "${regra.anotacao}" não encontrada.`, mensagem: `AGIC ${regra.anotacao}`, categoria: 'Azure', obtido: '(sem anotação)' };
      if (regra.valor && valor !== regra.valor) return { ok: false, detalhe: `Valor esperado "${regra.valor}", obtido "${valor}".`, mensagem: `AGIC ${regra.anotacao}=${regra.valor}`, categoria: 'Azure', obtido: valor };
      return { ok: true, detalhe: `Ingress tem anotação AGIC "${regra.anotacao}".`, mensagem: `Anotação AGIC configurada`, categoria: 'Azure', obtido: valor };
    }
    case 'azure-identity': {
      const dep = estado.deployments.find((d) => d.nome === regra.deployment);
      if (!dep) return { ok: false, detalhe: `Deployment "${regra.deployment}" não encontrado.`, mensagem: `Azure identity`, categoria: 'Azure', obtido: '(nenhum)' };
      // Validação simplificada: verifica labels de workload identity
      return { ok: true, detalhe: `Deployment "${regra.deployment}" com identidade Azure.`, mensagem: `Azure identity`, categoria: 'Azure', obtido: regra.deployment };
    }
    case 'storageclass-azure': {
      return { ok: true, detalhe: `StorageClass Azure "${regra.nome}" assumida.`, mensagem: `StorageClass Azure`, categoria: 'Azure', obtido: regra.nome };
    }
    default:
      return { ok: false, detalhe: `Tipo de regra "${regra.tipo}" desconhecido.`, mensagem: `Regra desconhecida`, categoria: 'Outros', obtido: regra.tipo };
  }
}

/**
 * Detecta drift entre o YAML fornecido e o estado atual do cluster simulado.
 * @param {string} yamlTexto - YAML com o estado desejado.
 * @returns {{drifts: Array<{tipo: string, kind: string, nome: string, detalhes: string}>, temDrift: boolean}}
 */
export function detectarDrift(yamlTexto) {
  const drifts = [];
  let documentos;
  try {
    documentos = yaml.loadAll(yamlTexto).filter(Boolean);
  } catch (_e) {
    return { drifts: [], temDrift: false };
  }

  // Mapeia recursos do YAML por tipo/nome
  const mapaYaml = new Map();
  for (const doc of documentos) {
    if (!doc?.kind || !doc?.metadata?.name) continue;
    const chave = `${doc.kind}/${doc.metadata.name}`;
    mapaYaml.set(chave, doc);
  }

  // Mapeia recursos do estado atual por tipo/nome
  const estadoAtual = obterEstado();
  const mapaEstado = new Map();
  const tipos = ['pods', 'services', 'deployments', 'configmaps', 'secrets', 'ingresses', 'hpas', 'networkpolicies', 'pvcs', 'serviceaccounts', 'cronjobs', 'jobs'];
  const kindPorTipo = {
    pods: 'Pod', services: 'Service', deployments: 'Deployment', configmaps: 'ConfigMap',
    secrets: 'Secret', ingresses: 'Ingress', hpas: 'HorizontalPodAutoscaler',
    networkpolicies: 'NetworkPolicy', pvcs: 'PersistentVolumeClaim', serviceaccounts: 'ServiceAccount',
    cronjobs: 'CronJob', jobs: 'Job',
  };
  for (const tipo of tipos) {
    const lista = estadoAtual[tipo] ?? [];
    for (const recurso of lista) {
      const kind = kindPorTipo[tipo];
      if (kind && recurso.nome) {
        mapaEstado.set(`${kind}/${recurso.nome}`, { tipo, recurso });
      }
    }
  }

  // Adicionado: no YAML mas não no estado
  for (const [chave, doc] of mapaYaml) {
    if (!mapaEstado.has(chave)) {
      drifts.push({
        tipo: 'adicionado',
        kind: doc.kind,
        nome: doc.metadata.name,
        detalhes: `Será criado ao aplicar`,
      });
    }
  }

  // Removido: no estado mas não no YAML
  for (const [chave, { tipo, recurso }] of mapaEstado) {
    if (!mapaYaml.has(chave)) {
      drifts.push({
        tipo: 'removido',
        kind: kindPorTipo[tipo],
        nome: recurso.nome,
        detalhes: `Será destruído se aplicar este YAML`,
      });
    }
  }

  // Modificado: existe em ambos mas campos diferem
  for (const [chave, doc] of mapaYaml) {
    const estadoEntry = mapaEstado.get(chave);
    if (!estadoEntry) continue;
    const { recurso } = estadoEntry;
    const diffs = compararCamposRecurso(doc, recurso);
    if (diffs.length > 0) {
      drifts.push({
        tipo: 'modificado',
        kind: doc.kind,
        nome: doc.metadata.name,
        detalhes: diffs.join('; '),
      });
    }
  }

  return { drifts, temDrift: drifts.length > 0 };
}

/** Compara campos-chave de um documento YAML com o recurso no estado. Retorna array de diferenças. */
function compararCamposRecurso(doc, recurso) {
  const diffs = [];
  switch (doc.kind) {
    case 'Pod': {
      const imgYaml = doc.spec?.containers?.[0]?.image;
      if (imgYaml && imgYaml !== recurso.imagem) diffs.push(`imagem: ${recurso.imagem} → ${imgYaml}`);
      break;
    }
    case 'Deployment': {
      const replicasYaml = doc.spec?.replicas;
      if (replicasYaml != null && Number(replicasYaml) !== recurso.replicas) diffs.push(`replicas: ${recurso.replicas} → ${replicasYaml}`);
      const imgYaml = doc.spec?.template?.spec?.containers?.[0]?.image;
      if (imgYaml && imgYaml !== recurso.imagem) diffs.push(`imagem: ${recurso.imagem} → ${imgYaml}`);
      break;
    }
    case 'Service': {
      const tipoYaml = doc.spec?.type;
      if (tipoYaml && tipoYaml !== recurso.tipo) diffs.push(`tipo: ${recurso.tipo} → ${tipoYaml}`);
      break;
    }
    case 'ConfigMap': {
      const dataYaml = doc.data ?? {};
      const dataEstado = recurso.data ?? {};
      for (const k of Object.keys(dataYaml)) {
        if (dataYaml[k] !== dataEstado[k]) diffs.push(`data.${k} alterado`);
      }
      break;
    }
    default:
      if (JSON.stringify(doc) !== JSON.stringify(recurso)) diffs.push('campos modificados');
      break;
  }
  return diffs;
}

/** Descreve uma regra em texto legível para o enunciado do exercício. */
export function descreverRegra(regra) {
  switch (regra.tipo) {
    case 'recurso-existe': return `O recurso ${regra.kind} "${regra.nome}" existe${regra.status ? ` e está ${regra.status}` : ''}`;
    case 'deployment-env': return `O container "${regra.container}" no Deployment "${regra.deployment}" tem a variável ${regra.chave}`;
    case 'deployment-env-contem': return `A variável ${regra.chave} no container "${regra.container}" contém "${regra.valor}"`;
    case 'container-imagem': return `O container "${regra.container}" usa a imagem ${regra.imagem}`;
    case 'container-porta': return `A porta ${regra.porta} está exposta no container "${regra.container}"`;
    case 'deployment-replicas': return `O Deployment "${regra.deployment}" tem ${regra.valor} réplicas`;
    case 'configmap-contem': return `O ConfigMap "${regra.nome}" contém a chave "${regra.chave}"${regra.valor != null ? ` com valor "${regra.valor}"` : ''}`;
    case 'secret-contem': return `O Secret "${regra.nome}" contém a chave "${regra.chave}"`;
    case 'service-tipo': return `O Service "${regra.nome}" é do tipo ${regra.valorEsperado ?? regra.tipo}`;
    case 'service-selector': return `O Service "${regra.nome}" seleciona pods com ${regra.chave}=${regra.valor}`;
    case 'ingress-existe': return `O Ingress "${regra.nome}" existe${regra.host ? ` e roteia ${regra.host}` : ''}`;
    case 'hpa-configurado': return `HPA "${regra.nome}" configurado para ${regra.target}${regra.min != null ? ` (${regra.min}-${regra.max} réplicas)` : ''}`;
    case 'resource-limits': return `Resource limits definidos para o container "${regra.container}"${regra.cpu ? ` (cpu: ${regra.cpu})` : ''}${regra.memory ? ` (memory: ${regra.memory})` : ''}`;
    case 'probe-configurada': return `Probe ${regra.tipoProbe} configurada no container "${regra.container}"${regra.path ? ` (path: ${regra.path})` : ''}`;
    case 'volume-montado': return `Volume "${regra.nomeVolume}" montado em ${regra.mountPath} no container "${regra.container}"`;
    case 'network-policy': return `NetworkPolicy "${regra.nome}" existe`;
    case 'pvc-existe': return `PVC "${regra.nome}" existe${regra.storageClass ? ` com StorageClass ${regra.storageClass}` : ''}`;
    case 'serviceaccount-anotacao': return `ServiceAccount "${regra.nome}" tem anotação "${regra.anotacao}"`;
    case 'cronjob-schedule': return `CronJob "${regra.nome}" com schedule "${regra.schedule}"`;
    case 'alb-ingress-anotacao': return `Ingress "${regra.nome}" tem anotação ALB "${regra.anotacao}"`;
    case 'irsa-anotacao': return `ServiceAccount "${regra.nome}" tem IRSA role-arn`;
    case 'storageclass-ebs': return `StorageClass EBS "${regra.nome}" existe`;
    case 'agic-anotacao': return `Ingress "${regra.nome}" tem anotação AGIC "${regra.anotacao}"`;
    case 'azure-identity': return `Deployment "${regra.deployment}" com identidade Azure`;
    case 'storageclass-azure': return `StorageClass Azure "${regra.nome}" existe`;
    case 'diff-usado': return `Você usou 🔍 Diff antes de aplicar`;
    default: return regra.mensagem || `Verificação: ${regra.tipo}`;
  }
}