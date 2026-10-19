// Validações que o servidor de API faz com as CRDs dos add-ons da AWS e da Azure (o esquema
// OpenAPI de cada CRD) e com o Pod Security Admission do próprio Kubernetes 1.31.
// As mensagens seguem o formato do kubectl, em inglês, como no cluster real.

const invalido = (kind, nome, campo, motivo) => `The ${kind} "${nome}" is invalid: ${campo}: ${motivo}`;
const obrigatorio = (kind, nome, campo) => invalido(kind, nome, campo, 'Required value');
const vazio = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
const enumInvalido = (kind, nome, campo, valor, aceitos) =>
  invalido(kind, nome, campo, `Unsupported value: "${valor}": supported values: ${aceitos.map((a) => `"${a}"`).join(', ')}`);

/** Confere campos obrigatórios (caminho com pontos a partir da raiz do manifesto). */
function exigir(recurso, caminhos, erros) {
  for (const caminho of caminhos) {
    const valor = caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), recurso);
    if (vazio(valor)) erros.push(obrigatorio(recurso.kind, recurso.metadata.name, caminho));
  }
}

/** Confere um campo que só aceita alguns valores (se estiver preenchido). */
function aceitar(recurso, caminho, aceitos, erros) {
  const valor = caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), recurso);
  if (!vazio(valor) && !aceitos.includes(valor)) erros.push(enumInvalido(recurso.kind, recurso.metadata.name, caminho, valor, aceitos));
}

const EFEITOS_TAINT = ['NoSchedule', 'PreferNoSchedule', 'NoExecute'];

/** As validações de cada CRD (e de alguns campos de kinds nativos que o simulador guarda de forma genérica). */
const VALIDACOES = {
  // Karpenter v1 (AWS e AKS node auto-provisioning)
  NodePool(r, erros) {
    exigir(r, ['spec.template.spec.nodeClassRef.group', 'spec.template.spec.nodeClassRef.kind', 'spec.template.spec.nodeClassRef.name'], erros);
    // requirements é obrigatório, mas a lista pode vir vazia
    if (!Array.isArray(r.spec?.template?.spec?.requirements)) erros.push(obrigatorio(r.kind, r.metadata.name, 'spec.template.spec.requirements'));
    aceitar(r, 'spec.disruption.consolidationPolicy', ['WhenEmpty', 'WhenEmptyOrUnderutilized'], erros);
    (r.spec?.template?.spec?.requirements ?? []).forEach((req, i) => {
      const ops = ['In', 'NotIn', 'Exists', 'DoesNotExist', 'Gt', 'Lt'];
      if (!ops.includes(req?.operator)) erros.push(enumInvalido(r.kind, r.metadata.name, `spec.template.spec.requirements[${i}].operator`, req?.operator, ops));
    });
    (r.spec?.template?.spec?.taints ?? []).forEach((t, i) => {
      if (!EFEITOS_TAINT.includes(t?.effect)) erros.push(enumInvalido(r.kind, r.metadata.name, `spec.template.spec.taints[${i}].effect`, t?.effect, EFEITOS_TAINT));
    });
  },
  EC2NodeClass(r, erros) {
    exigir(r, ['spec.amiSelectorTerms', 'spec.subnetSelectorTerms', 'spec.securityGroupSelectorTerms'], erros);
    if (vazio(r.spec?.role) === vazio(r.spec?.instanceProfile)) {
      erros.push(invalido(r.kind, r.metadata.name, 'spec', 'Invalid value: must specify exactly one of ["role", "instanceProfile"]'));
    }
  },
  AKSNodeClass(r, erros) {
    aceitar(r, 'spec.imageFamily', ['Ubuntu', 'Ubuntu2204', 'AzureLinux'], erros);
  },
  // AWS Load Balancer Controller
  TargetGroupBinding(r, erros) {
    exigir(r, ['spec.serviceRef.name', 'spec.serviceRef.port'], erros);
    if (vazio(r.spec?.targetGroupARN) && vazio(r.spec?.targetGroupName)) erros.push(obrigatorio(r.kind, r.metadata.name, 'spec.targetGroupARN'));
    aceitar(r, 'spec.targetType', ['instance', 'ip'], erros);
  },
  IngressClassParams(r, erros) {
    aceitar(r, 'spec.scheme', ['internal', 'internet-facing'], erros);
    aceitar(r, 'spec.ipAddressType', ['ipv4', 'dualstack', 'dualstack-without-public-ipv4'], erros);
  },
  // VPC CNI e VPC Resource Controller
  SecurityGroupPolicy(r, erros) {
    exigir(r, ['spec.securityGroups.groupIds'], erros);
    if (!r.spec?.podSelector && !r.spec?.serviceAccountSelector) {
      erros.push(invalido(r.kind, r.metadata.name, 'spec', 'Required value: podSelector or serviceAccountSelector'));
    }
  },
  ENIConfig(r, erros) {
    exigir(r, ['spec.subnet'], erros);
  },
  // ACK (AWS Controllers for Kubernetes): recursos do EKS declarados como YAML
  PodIdentityAssociation(r, erros) {
    exigir(r, ['spec.clusterName', 'spec.namespace', 'spec.serviceAccount', 'spec.roleARN'], erros);
  },
  AccessEntry(r, erros) {
    exigir(r, ['spec.clusterName', 'spec.principalARN'], erros);
    aceitar(r, 'spec.type', ['STANDARD', 'FARGATE_LINUX', 'EC2_LINUX', 'EC2_WINDOWS'], erros);
    (r.spec?.accessPolicies ?? []).forEach((p, i) => {
      if (vazio(p?.policyARN)) erros.push(obrigatorio(r.kind, r.metadata.name, `spec.accessPolicies[${i}].policyARN`));
      const tipo = p?.accessScope?.type;
      if (!['cluster', 'namespace'].includes(tipo)) erros.push(enumInvalido(r.kind, r.metadata.name, `spec.accessPolicies[${i}].accessScope.type`, tipo, ['cluster', 'namespace']));
      else if (tipo === 'namespace' && vazio(p.accessScope.namespaces)) erros.push(obrigatorio(r.kind, r.metadata.name, `spec.accessPolicies[${i}].accessScope.namespaces`));
    });
  },
  Nodegroup(r, erros) {
    exigir(r, ['spec.clusterName', 'spec.name', 'spec.nodeRole', 'spec.subnets'], erros);
    aceitar(r, 'spec.capacityType', ['ON_DEMAND', 'SPOT', 'CAPACITY_BLOCK'], erros);
    const efeitos = ['NO_SCHEDULE', 'NO_EXECUTE', 'PREFER_NO_SCHEDULE'];
    (r.spec?.taints ?? []).forEach((t, i) => {
      if (!efeitos.includes(t?.effect)) erros.push(enumInvalido(r.kind, r.metadata.name, `spec.taints[${i}].effect`, t?.effect, efeitos));
    });
    const s = r.spec?.scalingConfig;
    if (s && Number(s.minSize) > Number(s.maxSize)) erros.push(invalido(r.kind, r.metadata.name, 'spec.scalingConfig', 'Invalid value: minSize must be less than or equal to maxSize'));
    if (s && s.desiredSize != null && (Number(s.desiredSize) < Number(s.minSize ?? 0) || Number(s.desiredSize) > Number(s.maxSize ?? Infinity))) {
      erros.push(invalido(r.kind, r.metadata.name, 'spec.scalingConfig.desiredSize', 'Invalid value: must be between minSize and maxSize'));
    }
  },
  // Snapshots (external-snapshotter)
  VolumeSnapshotClass(r, erros) {
    exigir(r, ['driver', 'deletionPolicy'], erros);
    aceitar(r, 'deletionPolicy', ['Delete', 'Retain'], erros);
  },
  VolumeSnapshot(r, erros) {
    const fonte = r.spec?.source ?? {};
    const origens = ['persistentVolumeClaimName', 'volumeSnapshotContentName'].filter((k) => !vazio(fonte[k]));
    if (origens.length !== 1) {
      erros.push(invalido(r.kind, r.metadata.name, 'spec.source', 'Invalid value: exactly one of persistentVolumeClaimName and volumeSnapshotContentName should be specified'));
    }
  },
  // Secrets Store CSI Driver
  SecretProviderClass(r, erros) {
    exigir(r, ['spec.provider'], erros);
  },
  // OpenTelemetry Operator (ADOT no EKS)
  OpenTelemetryCollector(r, erros) {
    exigir(r, ['spec.config'], erros);
    aceitar(r, 'spec.mode', ['deployment', 'daemonset', 'statefulset', 'sidecar'], erros);
  },
  // KEDA
  ScaledObject(r, erros) {
    exigir(r, ['spec.scaleTargetRef.name', 'spec.triggers'], erros);
    (r.spec?.triggers ?? []).forEach((t, i) => {
      if (vazio(t?.type)) erros.push(obrigatorio(r.kind, r.metadata.name, `spec.triggers[${i}].type`));
    });
    const min = r.spec?.minReplicaCount;
    const max = r.spec?.maxReplicaCount;
    if (min != null && max != null && Number(min) > Number(max)) {
      erros.push(invalido(r.kind, r.metadata.name, 'spec', `MinReplicaCount=${min} must be less than MaxReplicaCount=${max}`));
    }
  },
  TriggerAuthentication(r, erros) {
    aceitar(r, 'spec.podIdentity.provider', ['none', 'azure-workload', 'aws', 'aws-eks', 'gcp'], erros);
  },
  // Cilium (Azure CNI powered by Cilium)
  CiliumNetworkPolicy(r, erros) {
    if (!r.spec?.endpointSelector && !r.spec?.nodeSelector) erros.push(obrigatorio(r.kind, r.metadata.name, 'spec.endpointSelector'));
  },
  // App Routing do AKS
  NginxIngressController(r, erros) {
    exigir(r, ['spec.ingressClassName'], erros);
  },
  // Nativos guardados de forma genérica: só os valores que o servidor recusa
  StorageClass(r, erros) {
    aceitar(r, 'volumeBindingMode', ['Immediate', 'WaitForFirstConsumer'], erros);
    aceitar(r, 'reclaimPolicy', ['Delete', 'Retain'], erros);
  },
  Namespace(r, erros) {
    const niveis = ['privileged', 'baseline', 'restricted'];
    for (const modo of ['enforce', 'audit', 'warn']) {
      const v = r.metadata?.labels?.[`pod-security.kubernetes.io/${modo}`];
      if (v !== undefined && !niveis.includes(v)) {
        erros.push(invalido(r.kind, r.metadata.name, `metadata.labels[pod-security.kubernetes.io/${modo}]`, `Invalid value: "${v}": must be one of privileged, baseline, restricted`));
      }
    }
  },
};

/** Validações do esquema das CRDs (e de alguns kinds nativos genéricos). */
export function validarCrd(recurso, erros) {
  VALIDACOES[recurso.kind]?.(recurso, erros);
}

// ---------- Pod Security Admission (Kubernetes 1.31) ----------

const CAPACIDADES_BASELINE = ['AUDIT_WRITE', 'CHOWN', 'DAC_OVERRIDE', 'FOWNER', 'FSETID', 'KILL', 'MKNOD', 'NET_BIND_SERVICE', 'SETFCAP', 'SETGID', 'SETPCAP', 'SETUID', 'SYS_CHROOT'];
const VOLUMES_RESTRICTED = ['configMap', 'csi', 'downwardAPI', 'emptyDir', 'ephemeral', 'persistentVolumeClaim', 'projected', 'secret'];

/** Os containers do Pod (containers, initContainers e ephemeralContainers). */
const todosOsContainers = (spec) => [...(spec?.containers ?? []), ...(spec?.initContainers ?? []), ...(spec?.ephemeralContainers ?? [])];
const lista = (nomes) => nomes.map((n) => `"${n}"`).join(', ');
const containersComo = (nomes) => (nomes.length === 1 ? `container ${lista(nomes)}` : `containers ${lista(nomes)}`);

/** As violações do nível baseline (as mesmas mensagens do kube-apiserver). */
function violacoesBaseline(spec) {
  const v = [];
  const cs = todosOsContainers(spec);
  const privilegiados = cs.filter((c) => c.securityContext?.privileged === true).map((c) => c.name);
  if (privilegiados.length) v.push(`privileged (${containersComo(privilegiados)} must not set securityContext.privileged=true)`);
  const hosts = ['hostNetwork', 'hostPID', 'hostIPC'].filter((k) => spec?.[k] === true);
  if (hosts.length) v.push(`host namespaces (${hosts.map((k) => `${k}=true`).join(', ')})`);
  const hostPath = (spec?.volumes ?? []).filter((vol) => vol.hostPath).map((vol) => vol.name);
  if (hostPath.length) v.push(`hostPath volumes (${hostPath.length === 1 ? 'volume' : 'volumes'} ${lista(hostPath)})`);
  const portas = cs.filter((c) => (c.ports ?? []).some((p) => p.hostPort)).map((c) => c.name);
  if (portas.length) v.push(`hostPort (${containersComo(portas)} uses hostPort)`);
  const caps = cs.filter((c) => (c.securityContext?.capabilities?.add ?? []).some((cap) => !CAPACIDADES_BASELINE.includes(cap))).map((c) => c.name);
  if (caps.length) v.push(`non-default capabilities (${containersComo(caps)} must not include added capabilities)`);
  return v;
}

/** As violações do nível restricted (inclui as do baseline). */
function violacoesRestricted(spec) {
  const v = violacoesBaseline(spec);
  const cs = todosOsContainers(spec);
  const pod = spec?.securityContext ?? {};
  const volumes = (spec?.volumes ?? []).filter((vol) => !Object.keys(vol).some((k) => VOLUMES_RESTRICTED.includes(k)) && !vol.hostPath).map((vol) => vol.name);
  if (volumes.length) v.push(`restricted volume types (${volumes.length === 1 ? 'volume' : 'volumes'} ${lista(volumes)} uses a restricted volume type)`);
  const escalada = cs.filter((c) => c.securityContext?.allowPrivilegeEscalation !== false).map((c) => c.name);
  if (escalada.length) v.push(`allowPrivilegeEscalation != false (${containersComo(escalada)} must set securityContext.allowPrivilegeEscalation=false)`);
  const semDrop = cs.filter((c) => !(c.securityContext?.capabilities?.drop ?? []).includes('ALL')).map((c) => c.name);
  if (semDrop.length) v.push(`unrestricted capabilities (${containersComo(semDrop)} must set securityContext.capabilities.drop=["ALL"])`);
  const raiz = cs.filter((c) => (c.securityContext?.runAsNonRoot ?? pod.runAsNonRoot) !== true).map((c) => c.name);
  if (raiz.length) v.push(`runAsNonRoot != true (pod or ${containersComo(raiz)} must set securityContext.runAsNonRoot=true)`);
  const usuario0 = cs.filter((c) => (c.securityContext?.runAsUser ?? pod.runAsUser) === 0).map((c) => c.name);
  if (usuario0.length) v.push(`runAsUser=0 (pod or ${containersComo(usuario0)} must not set runAsUser=0)`);
  const perfil = (c) => c.securityContext?.seccompProfile?.type ?? pod.seccompProfile?.type;
  const semSeccomp = cs.filter((c) => !['RuntimeDefault', 'Localhost'].includes(perfil(c))).map((c) => c.name);
  if (semSeccomp.length) v.push(`seccompProfile (pod or ${containersComo(semSeccomp)} must set securityContext.seccompProfile.type to "RuntimeDefault" or "Localhost")`);
  return v;
}

/** Nível "enforce" do Pod Security Admission do namespace (privileged quando não há label). */
export function nivelPss(namespace, outros = []) {
  const ns = outros.find((o) => o.kind === 'Namespace' && o.nome === namespace);
  return ns?.metadataLabels?.['pod-security.kubernetes.io/enforce'] ?? 'privileged';
}

/**
 * O Pod Security Admission recusa o Pod que viola o nível do namespace (só Pods: Deployments
 * e outros workloads são aceitos com aviso, e quem é recusado é o Pod que o controlador cria).
 * Devolve a mensagem de erro do kubectl ou null.
 */
export function admissaoPss(recurso, outros) {
  if (recurso.kind !== 'Pod') return null;
  const nivel = nivelPss(recurso.metadata?.namespace ?? 'default', outros);
  const violacoes = nivel === 'restricted' ? violacoesRestricted(recurso.spec) : nivel === 'baseline' ? violacoesBaseline(recurso.spec) : [];
  if (!violacoes.length) return null;
  return `Error from server (Forbidden): error when creating "manifest.yaml": pods "${recurso.metadata.name}" is forbidden: violates PodSecurity "${nivel}:latest": ${violacoes.join(', ')}`;
}
