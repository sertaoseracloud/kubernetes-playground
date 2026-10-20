// Certificados: um por módulo e um de conclusão total, emitidos pela Sertão será cloud.
// Adaptado do terraform-playground para Kubernetes.
import { paraBase64Url, deBase64Url } from './compartilhar.js';
import { hmacSha256 } from './sha256.js';
import { assinar, verificar, CHAVE_PUBLICA } from './ed25519.js';
import { textoHoras } from './cargaHoraria.js';
import { SITE_ATUAL } from './ambiente.js';

export const SITE = SITE_ATUAL;

export const EMISSOR = {
  organizacao: 'Sertão será cloud',
  responsavel: 'Cláudio Raposo',
  cargo: 'Instrutor responsável',
  curso: 'DivergeKubernetes: aprenda Kubernetes no navegador',
  logo: `${SITE}favicon.svg`,
};

export const CERTIFICADOS = {
  fundamentos: {
    titulo: 'Fundamentos do Kubernetes',
    cargaHoraria: 32,
    resumo: 'concluiu o módulo Fundamentos do Kubernetes, dominando arquitetura, Pods, Services e Deployments',
    hashtags: ['Kubernetes', 'K8s', 'DevOps'],
    conteudos: ['Arquitetura do Kubernetes', 'Pods e Containers', 'Services e Networking', 'Deployments e Escalabilidade'],
  },
  avancados: {
    titulo: 'Recursos Avançados de Kubernetes',
    cargaHoraria: 22,
    resumo: 'concluiu o módulo Recursos Avançados, dominando RBAC, escala automática, StatefulSet, NetworkPolicy, Ingress e GitOps',
    hashtags: ['Kubernetes', 'GitOps', 'Security'],
    conteudos: ['RBAC e ServiceAccounts', 'HPA, probes e recursos', 'StatefulSet, DaemonSet e Storage', 'Jobs e CronJobs', 'NetworkPolicy e Ingress', 'Secrets', 'GitOps com Argo CD e Flux'],
  },
  aws: {
    titulo: 'Kubernetes na AWS (EKS)',
    cargaHoraria: 34,
    resumo: 'concluiu o módulo Kubernetes na AWS, dominando EKS, identidade com IAM, nós e Karpenter, rede, storage, observabilidade, segurança e custo',
    hashtags: ['Kubernetes', 'AWS', 'EKS', 'Cloud'],
    conteudos: ['EKS e identidade (access entries, IRSA, Pod Identity)', 'Nós e escala (node groups, Karpenter, Cluster Autoscaler)', 'Rede (VPC CNI, ALB, NLB)', 'Storage (EBS, snapshots, EFS)', 'Observabilidade e segurança (CloudWatch, ADOT, Pod Security, Secrets Manager)', 'Custo e operação (Spot, PDB, requests)'],
  },
  azure: {
    titulo: 'Kubernetes no Azure (AKS)',
    cargaHoraria: 32,
    resumo: 'concluiu o módulo Kubernetes no Azure, dominando AKS, identidade com Entra ID, node pools e KEDA, rede, storage, observabilidade, Key Vault e custo',
    hashtags: ['Kubernetes', 'Azure', 'AKS', 'Cloud'],
    conteudos: ['AKS e identidade (Entra ID, RBAC, Workload Identity)', 'Nós e escala (node pools, Spot, KEDA, NAP)', 'Rede (Azure CNI com Cilium, AGIC, App Routing, Load Balancer)', 'Storage (Azure Disk, snapshots, Azure Files)', 'Observabilidade e segredos (Container Insights, Managed Prometheus, Key Vault)', 'Custo e operação (upgrades, Spot, requests)'],
  },
  'projeto-microservicos': {
    titulo: 'Projeto: Microserviços em Kubernetes',
    cargaHoraria: 4,
    resumo: 'construiu uma aplicação completa de microserviços em Kubernetes',
    hashtags: ['Kubernetes', 'Microserviços', 'DevOps'],
    conteudos: ['Deployments e Services', 'ConfigMaps e Secrets', 'Ingress e HPA'],
  },
  'projeto-multicloud': {
    titulo: 'Projeto: Deploy Multi-Cloud',
    cargaHoraria: 4,
    resumo: 'construiu deploy multi-cloud com abstrações cloud-agnostic',
    hashtags: ['Kubernetes', 'Multi-Cloud', 'AWS', 'Azure'],
    conteudos: ['Manifestos genéricos', 'Kustomize overlays', 'CI/CD multi-cluster', 'Entrada no EKS (ALB) e no AKS (App Routing)'],
  },
  final: {
    titulo: 'Especialista Kubernetes: Trilha Completa',
    cargaHoraria: 128,
    resumo: 'concluiu a trilha completa de Kubernetes, dos fundamentos ao multi-cloud',
    hashtags: ['Kubernetes', 'K8s', 'AWS', 'Azure', 'DevOps', 'Cloud Native'],
    conteudos: ['Fundamentos', 'Recursos Avançados', 'AWS (EKS)', 'Azure (AKS)', 'Projetos Práticos'],
  },
};

const DATA = /^\d{4}-\d{2}-\d{2}$/;

const CHAVE = typeof __CHAVE_CERTIFICADO__ === 'undefined' ? null : __CHAVE_CERTIFICADO__;

export const ORDEM = Object.keys(CERTIFICADOS);
export const anteriores = (modulo) => ORDEM.slice(0, ORDEM.indexOf(modulo));

export function hashCertificado({ nome, modulo, data }, anterior = '') {
  if (!CHAVE) throw new Error('Chave do certificado indisponível fora do build do site.');
  return hmacSha256(CHAVE, mensagemAssinada({ nome, modulo, data }, anterior));
}

export function montarCadeia({ nome, modulo, data, cadeia = [] }) {
  const ids = anteriores(modulo);
  const datas = cadeia.map((c) => (typeof c === 'string' ? c : c.data));
  if (datas.length !== ids.length) {
    throw new Error(`O certificado de ${modulo} precisa das datas de ${ids.length} certificado(s) anterior(es).`);
  }
  const elos = [];
  let anterior = '';
  [...ids, modulo].forEach((id, i) => {
    const elo = { modulo: id, data: i < datas.length ? datas[i] : data, anterior };
    elo.hash = hashCertificado({ nome, modulo: id, data: elo.data }, anterior);
    elos.push(elo);
    anterior = elo.hash;
  });
  return elos;
}

const idDoHash = (data, hash) => `SSC-${data.slice(0, 4)}-${hash.slice(0, 4)}-${hash.slice(4, 8)}`.toUpperCase();
export const idCertificado = (cert) => cert.id ?? idDoHash(cert.data, montarCadeia(cert).at(-1).hash);

export function codificarCertificado(cert) {
  const elos = montarCadeia(cert);
  const dados = { n: cert.nome, m: cert.modulo, d: cert.data, h: elos.at(-1).hash };
  if (elos.length > 1) dados.c = elos.slice(0, -1).map((e) => e.data);
  return paraBase64Url(new TextEncoder().encode(JSON.stringify(dados)));
}

export function decodificarCertificado(codigo) {
  try {
    const { n, m, d, h, c } = JSON.parse(new TextDecoder().decode(deBase64Url(codigo)));
    const nome = typeof n === 'string' ? n.trim() : '';
    if (!nome || nome.length > 80 || !(m in CERTIFICADOS) || !DATA.test(d)) return null;
    const cert = { nome, modulo: m, data: d };
    const precisaCadeia = anteriores(m).length > 0;

    if (typeof h !== 'string' || (precisaCadeia && c === undefined)) {
      return { ...cert, cadeia: [], anterior: '', hash: h ?? '', id: idDoHash(d, h ?? '00000000'), selo: 'ausente' };
    }
    const datas = Array.isArray(c) ? c : [];
    if (!datas.every((x) => typeof x === 'string' && DATA.test(x)) || datas.length !== anteriores(m).length) {
      return { ...cert, cadeia: [], anterior: '', hash: h, id: idDoHash(d, h), selo: 'nao-confere' };
    }
    const elos = montarCadeia({ ...cert, cadeia: datas });
    const ultimo = elos.at(-1);
    const selo = h === ultimo.hash ? 'confere' : 'nao-confere';
    return {
      ...cert,
      cadeia: elos.slice(0, -1),
      anterior: ultimo.anterior,
      hash: selo === 'confere' ? ultimo.hash : h,
      id: idDoHash(d, selo === 'confere' ? ultimo.hash : h),
      selo,
    };
  } catch {
    return null;
  }
}

export const linkCertificado = (cert) => `#/certificado/${codificarCertificado(cert)}`;

export const linkPublico = (cert, site = SITE) => `${site}badge/${cert.modulo}/?c=${codificarCertificado(cert)}`;

export function linkLinkedInPerfil(cert, urlCertificado = linkPublico(cert)) {
  const parametros = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: CERTIFICADOS[cert.modulo].titulo,
    organizationName: EMISSOR.organizacao,
    issueYear: cert.data.slice(0, 4),
    issueMonth: String(Number(cert.data.slice(5, 7))),
    certUrl: urlCertificado,
    certId: cert.id ?? idCertificado(cert),
  });
  return `https://www.linkedin.com/profile/add?${parametros}`;
}

export function textoPublicacao(cert, url = linkPublico(cert)) {
  const def = CERTIFICADOS[cert.modulo];
  const tags = [...def.hashtags, 'SertaoSeraCloud'].map((t) => `#${t}`).join(' ');
  return cert.modulo === 'final'
    ? `🎓 Concluí a trilha completa "${def.titulo}" e recebi o certificado emitido pela ${EMISSOR.organizacao}!\n\nForam ${def.resumo.replace(/^concluiu a trilha completa: /, '')}, com carga horária de ${textoHoras(def.cargaHoraria)}.\n\n${url}\n\n${tags}`
    : `🏆 Conquistei o badge "${def.titulo}", emitido pela ${EMISSOR.organizacao}!\n\nHabilidades: ${def.conteudos.join(', ')}.\nCarga horária: ${textoHoras(def.cargaHoraria)}.\n\n${url}\n\n${tags}`;
}

export const linkLinkedInPublicar = (cert, url = linkPublico(cert)) =>
  `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(textoPublicacao(cert, url))}`;

export function extrairCodigo(texto) {
  const t = String(texto ?? '').trim();
  const doHash = t.match(/#\/(?:certificado|validar)\/([A-Za-z0-9_-]+)/);
  if (doHash) return doHash[1];
  const doBadge = t.match(/[?&]c=([A-Za-z0-9_-]+)/);
  if (doBadge) return doBadge[1];
  return /^[A-Za-z0-9_-]{20,}$/.test(t) ? t : null;
}

const limparHash = (h) => String(h ?? '').toLowerCase().replace(/[^0-9a-f]/g, '');

export function validarImpresso({ nome, modulo, data, selo, anterior }) {
  if (!String(nome ?? '').trim()) return { valido: false, incompleto: true, motivo: 'Informe o nome como está no certificado.' };
  if (!(modulo in CERTIFICADOS)) return { valido: false, incompleto: true, motivo: 'Escolha qual certificado é.' };
  if (!DATA.test(data ?? '')) return { valido: false, incompleto: true, motivo: 'Informe a data de conclusão.' };
  const h = limparHash(selo);
  if (h.length !== 64) return { valido: false, incompleto: true, motivo: 'O selo tem 64 caracteres (letras de a a f e números).' };
  const primeiro = anteriores(modulo).length === 0;
  const a = limparHash(anterior);
  if (!primeiro && a.length !== 64) return { valido: false, incompleto: true, motivo: 'Este certificado tem o campo "Anterior" (64 caracteres). Copie-o também.' };
  const esperado = hashCertificado({ nome, modulo, data }, primeiro ? '' : a);
  return esperado === h
    ? { valido: true, motivo: 'O selo confere com o nome, o certificado, a data e o elo anterior informados.' }
    : { valido: false, motivo: 'O selo não confere. Confira se digitou tudo exatamente como no certificado, inclusive acentos.' };
}

const XML_NS = `${SITE}certificado/v1`;
const URL_CHAVE_PUBLICA = `${SITE}chave-publica-ed25519.txt`;
const escXml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

export function mensagemAssinada({ nome, modulo, data }, anterior = '') {
  const campos = [data, EMISSOR.responsavel, EMISSOR.organizacao, nome.trim(), modulo];
  if (anterior) campos.push(anterior);
  return JSON.stringify(campos);
}

export function certificadoXml(cert, codigo = codificarCertificado(cert)) {
  const elos = montarCadeia(cert);
  const atual = elos.at(-1);
  const url = `${SITE}#/validar/${codigo}`;
  const msg = (e) => mensagemAssinada({ nome: cert.nome, modulo: e.modulo, data: e.data }, e.anterior);
  const bloco = (e, i) => `    <bloco ordem="${i + 1}" modulo="${e.modulo}" titulo="${escXml(CERTIFICADOS[e.modulo].titulo)}" data="${e.data}">
      <selo>${e.hash}</selo>
      <anterior>${e.anterior}</anterior>
      <mensagemAssinada>${escXml(msg(e))}</mensagemAssinada>
      <assinatura algoritmo="Ed25519">${assinar(msg(e))}</assinatura>
    </bloco>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<certificado xmlns="${XML_NS}" versao="1">
  <emissor>
    <organizacao>${escXml(EMISSOR.organizacao)}</organizacao>
    <responsavel>${escXml(EMISSOR.responsavel)}</responsavel>
    <cargo>${escXml(EMISSOR.cargo)}</cargo>
  </emissor>
  <curso>${escXml(EMISSOR.curso)}</curso>
  <aluno>${escXml(cert.nome.trim())}</aluno>
  <modulo id="${cert.modulo}">${escXml(CERTIFICADOS[cert.modulo].titulo)}</modulo>
  <dataConclusao>${cert.data}</dataConclusao>
  <cargaHoraria unidade="horas">${CERTIFICADOS[cert.modulo].cargaHoraria}</cargaHoraria>
  <codigo>${idDoHash(cert.data, atual.hash)}</codigo>
  <selo algoritmo="HMAC-SHA256">${atual.hash}</selo>
  <seloAnterior>${atual.anterior}</seloAnterior>
  <mensagemAssinada>${escXml(msg(atual))}</mensagemAssinada>
  <assinatura algoritmo="Ed25519">
    <chavePublica formato="hex">${CHAVE_PUBLICA}</chavePublica>
    <chavePublicaPublicada>${escXml(URL_CHAVE_PUBLICA)}</chavePublicaPublicada>
    <valor formato="hex">${assinar(msg(atual))}</valor>
  </assinatura>
  <cadeia ordem="${ORDEM.join(' ')}">
${elos.map(bloco).join('\n')}
  </cadeia>
  <validacao>
    <url>${escXml(url)}</url>
    <codigoDoLink>${codigo}</codigoDoLink>
    <regras>
      <regra>A assinatura Ed25519 de cada bloco é sobre a mensagemAssinada (texto UTF-8) e se confere com a chave pública, sem segredo.</regra>
      <regra>Use a chave pública publicada em ${escXml(URL_CHAVE_PUBLICA)}: se a chave deste arquivo for diferente, ele não foi emitido pela ${escXml(EMISSOR.organizacao)}.</regra>
      <regra>Na cadeia, o primeiro bloco tem anterior vazio e cada bloco seguinte tem anterior igual ao selo do bloco anterior.</regra>
      <regra>A conferência completa (com a chave) é feita em: ${escXml(url)}</regra>
    </regras>
  </validacao>
</certificado>
`;
}

export function lerCertificadoXml(texto, parser = new DOMParser()) {
  const doc = parser.parseFromString(String(texto ?? ''), 'application/xml');
  if (doc.querySelector('parsererror') || doc.documentElement?.localName !== 'certificado') {
    return { erro: 'O arquivo não é um XML de certificado do DivergeKubernetes.' };
  }
  const pega = (nome) => doc.getElementsByTagNameNS(XML_NS, nome)[0]?.textContent?.trim() ?? '';
  const codigo = pega('codigoDoLink');
  if (!codigo) return { erro: 'O XML não tem o código de validação (codigoDoLink).' };
  const blocos = [...doc.getElementsByTagNameNS(XML_NS, 'bloco')].map((b) => ({
    modulo: b.getAttribute('modulo'),
    data: b.getAttribute('data'),
    selo: b.getElementsByTagNameNS(XML_NS, 'selo')[0]?.textContent.trim() ?? '',
    anterior: b.getElementsByTagNameNS(XML_NS, 'anterior')[0]?.textContent.trim() ?? '',
    mensagem: b.getElementsByTagNameNS(XML_NS, 'mensagemAssinada')[0]?.textContent ?? '',
    assinatura: b.getElementsByTagNameNS(XML_NS, 'assinatura')[0]?.textContent.trim() ?? '',
  }));
  return {
    codigo,
    xml: {
      aluno: pega('aluno'),
      modulo: doc.getElementsByTagNameNS(XML_NS, 'modulo')[0]?.getAttribute('id') ?? '',
      data: pega('dataConclusao'),
      selo: pega('selo'),
      anterior: pega('seloAnterior'),
      chavePublica: pega('chavePublica'),
      blocos,
    },
  };
}

export function cadeiaCoerente(blocos) {
  return blocos.length > 0 && blocos.every((b, i) => (i === 0 ? b.anterior === '' : b.anterior === blocos[i - 1].selo));
}

export function conferirAssinaturas(xml, chaveOficial = CHAVE_PUBLICA) {
  const chaveConfere = Boolean(chaveOficial) && xml.chavePublica?.toLowerCase() === chaveOficial.toLowerCase();
  const blocos = xml.blocos.map((b) => verificar(b.mensagem, b.assinatura, chaveOficial));
  return { chaveConfere, blocos, todas: chaveConfere && blocos.length > 0 && blocos.every(Boolean) };
}

/** Gera o objeto de certificado completo a partir dos dados salvos (usado pela UI de início). */
export function gerarCertificado({ nome, modulo, data, cadeia }) {
  const cert = { nome, modulo, data, cadeia: cadeia ?? [] };
  const elos = montarCadeia(cert);
  const ultimo = elos.at(-1);
  return {
    ...cert,
    cadeia: elos.slice(0, -1),
    anterior: ultimo.anterior,
    hash: ultimo.hash,
    id: idDoHash(data, ultimo.hash),
    selo: 'confere',
  };
}