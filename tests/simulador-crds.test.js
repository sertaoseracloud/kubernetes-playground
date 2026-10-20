// O esquema das CRDs dos add-ons (Karpenter, AWS Load Balancer Controller, VPC CNI, ACK, snapshots,
// Secrets Store, OpenTelemetry, KEDA, Cilium, App Routing) e o Pod Security Admission do Kubernetes 1.31:
// o apply recusa o que o servidor de API recusaria, com a mensagem do kubectl.
import { describe, it, expect, beforeEach } from 'vitest';
import { aplicarYaml, resetarEstado, simularApply } from '../src/k8s/simulador.js';
import { nivelPss, admissaoPss, validarCrd } from '../src/k8s/crds.js';
import { comOcultos } from '../src/conteudo/util.js';

beforeEach(() => resetarEstado());

const doc = (apiVersion, kind, corpo, nome = 'x') => `apiVersion: ${apiVersion}\nkind: ${kind}\nmetadata:\n  name: ${nome}\n${corpo}`;
const erro = (texto) => aplicarYaml(texto).mensagem;

describe('Karpenter', () => {
  const nodePool = (spec) => doc('karpenter.sh/v1', 'NodePool', `spec:\n  template:\n    spec:\n${spec}`);
  const ref = '      nodeClassRef:\n        group: karpenter.k8s.aws\n        kind: EC2NodeClass\n        name: padrao\n';

  it('NodePool precisa de nodeClassRef e requirements (a lista pode ser vazia)', () => {
    expect(erro(nodePool('      requirements: []'))).toContain('spec.template.spec.nodeClassRef.name: Required value');
    expect(erro(nodePool(ref))).toContain('spec.template.spec.requirements: Required value');
    expect(aplicarYaml(nodePool(`${ref}      requirements: []`)).ok).toBe(true);
  });

  it('NodePool recusa operador, efeito de taint e política de consolidação inválidos', () => {
    expect(erro(nodePool(`${ref}      requirements:\n        - key: a\n          operator: Equals\n          values: ["b"]`))).toContain('requirements[0].operator: Unsupported value: "Equals"');
    expect(erro(nodePool(`${ref}      requirements: []\n      taints:\n        - key: a\n          effect: NO_SCHEDULE`))).toContain('taints[0].effect: Unsupported value: "NO_SCHEDULE"');
    expect(erro(`${nodePool(`${ref}      requirements: []`)}\n  disruption:\n    consolidationPolicy: Always`)).toContain('"WhenEmpty", "WhenEmptyOrUnderutilized"');
  });

  it('EC2NodeClass exige os seletores e exatamente um entre role e instanceProfile', () => {
    const base = 'spec:\n  amiSelectorTerms:\n    - alias: al2023@latest\n  subnetSelectorTerms:\n    - tags: {a: b}\n  securityGroupSelectorTerms:\n    - tags: {a: b}\n';
    expect(aplicarYaml(doc('karpenter.k8s.aws/v1', 'EC2NodeClass', `${base}  role: R`)).ok).toBe(true);
    expect(erro(doc('karpenter.k8s.aws/v1', 'EC2NodeClass', base))).toContain('exactly one of ["role", "instanceProfile"]');
    expect(erro(doc('karpenter.k8s.aws/v1', 'EC2NodeClass', `${base}  role: R\n  instanceProfile: P`))).toContain('exactly one');
    expect(erro(doc('karpenter.k8s.aws/v1', 'EC2NodeClass', 'spec:\n  role: R'))).toContain('spec.amiSelectorTerms: Required value');
  });

  it('AKSNodeClass só aceita as famílias de imagem do AKS', () => {
    expect(aplicarYaml(doc('karpenter.azure.com/v1beta1', 'AKSNodeClass', 'spec:\n  imageFamily: AzureLinux')).ok).toBe(true);
    expect(erro(doc('karpenter.azure.com/v1beta1', 'AKSNodeClass', 'spec:\n  imageFamily: Windows'))).toContain('Unsupported value: "Windows"');
  });
});

describe('AWS Load Balancer Controller e VPC CNI', () => {
  it('TargetGroupBinding: serviceRef, target group e targetType', () => {
    const tgb = (s) => doc('elbv2.k8s.aws/v1beta1', 'TargetGroupBinding', `spec:\n${s}`);
    expect(erro(tgb('  targetType: ip'))).toContain('spec.serviceRef.name: Required value');
    expect(erro(tgb('  serviceRef: {name: web, port: 80}'))).toContain('spec.targetGroupARN: Required value');
    expect(aplicarYaml(tgb('  serviceRef: {name: web, port: 80}\n  targetGroupName: web')).ok).toBe(true);
    expect(erro(tgb('  serviceRef: {name: web, port: 80}\n  targetGroupARN: arn\n  targetType: pod'))).toContain('"instance", "ip"');
  });

  it('IngressClassParams: scheme e ipAddressType', () => {
    expect(erro(doc('elbv2.k8s.aws/v1beta1', 'IngressClassParams', 'spec:\n  scheme: public'))).toContain('"internal", "internet-facing"');
    expect(erro(doc('elbv2.k8s.aws/v1beta1', 'IngressClassParams', 'spec:\n  ipAddressType: ipv6'))).toContain('Unsupported value: "ipv6"');
  });

  it('SecurityGroupPolicy precisa dos SGs e de um seletor; ENIConfig precisa da sub-rede', () => {
    const sgp = (s) => doc('vpcresources.k8s.aws/v1beta1', 'SecurityGroupPolicy', `spec:\n${s}`);
    expect(erro(sgp('  podSelector: {}'))).toContain('spec.securityGroups.groupIds: Required value');
    expect(erro(sgp('  securityGroups:\n    groupIds: [sg-1]'))).toContain('podSelector or serviceAccountSelector');
    expect(aplicarYaml(sgp('  serviceAccountSelector: {}\n  securityGroups:\n    groupIds: [sg-1]')).ok).toBe(true);
    expect(erro(doc('crd.k8s.amazonaws.com/v1alpha1', 'ENIConfig', 'spec:\n  securityGroups: [sg-1]'))).toContain('spec.subnet: Required value');
  });
});

describe('ACK (recursos do EKS em YAML)', () => {
  const ack = (kind, spec) => doc('eks.services.k8s.aws/v1alpha1', kind, `spec:\n${spec}`);

  it('PodIdentityAssociation exige cluster, namespace, ServiceAccount e role', () => {
    expect(erro(ack('PodIdentityAssociation', '  clusterName: c\n  namespace: n\n  serviceAccount: s'))).toContain('spec.roleARN: Required value');
  });

  it('AccessEntry: principal, tipo e escopo das políticas', () => {
    const base = '  clusterName: c\n  principalARN: arn\n';
    expect(erro(ack('AccessEntry', '  clusterName: c'))).toContain('spec.principalARN: Required value');
    expect(erro(ack('AccessEntry', `${base}  type: ADMIN`))).toContain('Unsupported value: "ADMIN"');
    expect(erro(ack('AccessEntry', `${base}  accessPolicies:\n    - accessScope: {type: cluster}`))).toContain('accessPolicies[0].policyARN: Required value');
    expect(erro(ack('AccessEntry', `${base}  accessPolicies:\n    - policyARN: p\n      accessScope: {type: conta}`))).toContain('"cluster", "namespace"');
    expect(erro(ack('AccessEntry', `${base}  accessPolicies:\n    - policyARN: p\n      accessScope: {type: namespace}`))).toContain('accessScope.namespaces: Required value');
    expect(aplicarYaml(ack('AccessEntry', `${base}  accessPolicies:\n    - policyARN: p\n      accessScope: {type: namespace, namespaces: [loja]}`)).ok).toBe(true);
  });

  it('Nodegroup: campos obrigatórios, capacidade, taints no formato da AWS e tamanhos coerentes', () => {
    const base = '  clusterName: c\n  name: g\n  nodeRole: r\n  subnets: [s]\n';
    expect(erro(ack('Nodegroup', '  clusterName: c'))).toContain('spec.nodeRole: Required value');
    expect(erro(ack('Nodegroup', `${base}  capacityType: spot`))).toContain('Unsupported value: "spot"');
    expect(erro(ack('Nodegroup', `${base}  taints:\n    - key: a\n      effect: NoSchedule`))).toContain('"NO_SCHEDULE", "NO_EXECUTE", "PREFER_NO_SCHEDULE"');
    expect(erro(ack('Nodegroup', `${base}  scalingConfig: {minSize: 3, maxSize: 2}`))).toContain('minSize must be less than or equal to maxSize');
    expect(erro(ack('Nodegroup', `${base}  scalingConfig: {minSize: 1, maxSize: 2, desiredSize: 5}`))).toContain('desiredSize: Invalid value');
    expect(aplicarYaml(ack('Nodegroup', `${base}  scalingConfig: {minSize: 1, maxSize: 3, desiredSize: 2}`)).mensagem).toBe('nodegroup.eks.services.k8s.aws/x created');
  });
});

describe('snapshots, Secrets Store, OpenTelemetry, KEDA, Cilium e App Routing', () => {
  it('VolumeSnapshotClass e VolumeSnapshot', () => {
    expect(erro(doc('snapshot.storage.k8s.io/v1', 'VolumeSnapshotClass', 'driver: d'))).toContain('deletionPolicy: Required value');
    expect(erro(doc('snapshot.storage.k8s.io/v1', 'VolumeSnapshotClass', 'driver: d\ndeletionPolicy: Keep'))).toContain('"Delete", "Retain"');
    expect(erro(doc('snapshot.storage.k8s.io/v1', 'VolumeSnapshot', 'spec:\n  source: {}'))).toContain('exactly one of persistentVolumeClaimName and volumeSnapshotContentName');
    expect(erro(doc('snapshot.storage.k8s.io/v1', 'VolumeSnapshot', 'spec:\n  source: {persistentVolumeClaimName: a, volumeSnapshotContentName: b}'))).toContain('exactly one');
  });

  it('SecretProviderClass precisa do provedor; OpenTelemetryCollector, da config e de um modo válido', () => {
    expect(erro(doc('secrets-store.csi.x-k8s.io/v1', 'SecretProviderClass', 'spec:\n  parameters: {}'))).toContain('spec.provider: Required value');
    expect(erro(doc('opentelemetry.io/v1beta1', 'OpenTelemetryCollector', 'spec:\n  mode: deployment'))).toContain('spec.config: Required value');
    expect(erro(doc('opentelemetry.io/v1beta1', 'OpenTelemetryCollector', 'spec:\n  mode: job\n  config: {a: 1}'))).toContain('Unsupported value: "job"');
  });

  it('ScaledObject e TriggerAuthentication do KEDA', () => {
    const so = (s) => doc('keda.sh/v1alpha1', 'ScaledObject', `spec:\n${s}`);
    expect(erro(so('  scaleTargetRef: {name: w}'))).toContain('spec.triggers: Required value');
    expect(erro(so('  scaleTargetRef: {name: w}\n  triggers:\n    - metadata: {}'))).toContain('spec.triggers[0].type: Required value');
    expect(erro(so('  scaleTargetRef: {name: w}\n  minReplicaCount: 5\n  maxReplicaCount: 2\n  triggers:\n    - type: cron'))).toContain('MinReplicaCount=5 must be less than MaxReplicaCount=2');
    expect(erro(doc('keda.sh/v1alpha1', 'TriggerAuthentication', 'spec:\n  podIdentity: {provider: azure}'))).toContain('Unsupported value: "azure"');
  });

  it('CiliumNetworkPolicy precisa de um seletor; NginxIngressController, da classe', () => {
    expect(erro(doc('cilium.io/v2', 'CiliumNetworkPolicy', 'spec:\n  ingress: []'))).toContain('spec.endpointSelector: Required value');
    expect(erro(doc('approuting.kubernetes.azure.com/v1alpha1', 'NginxIngressController', 'spec:\n  controllerNamePrefix: x'))).toContain('spec.ingressClassName: Required value');
  });

  it('StorageClass recusa modo de binding e política de retenção inexistentes', () => {
    expect(erro(doc('storage.k8s.io/v1', 'StorageClass', 'provisioner: p\nvolumeBindingMode: Lazy'))).toContain('"Immediate", "WaitForFirstConsumer"');
    expect(erro(doc('storage.k8s.io/v1', 'StorageClass', 'provisioner: p\nreclaimPolicy: Recycle'))).toContain('"Delete", "Retain"');
  });

  it('a validação de uma CRD sem esquema conhecido não acusa nada', () => {
    const erros = [];
    validarCrd({ kind: 'Application', metadata: { name: 'a' } }, erros);
    expect(erros).toEqual([]);
  });
});

describe('Pod Security Admission', () => {
  const ns = (nivel) => `apiVersion: v1\nkind: Namespace\nmetadata:\n  name: seguro\n  labels:\n    pod-security.kubernetes.io/enforce: ${nivel}\n`;
  const pod = (spec) => `apiVersion: v1\nkind: Pod\nmetadata:\n  name: api\n  namespace: seguro\nspec:\n${spec}`;
  const containerSeguro = '  containers:\n    - name: app\n      image: nginxinc/nginx-unprivileged:1.27\n      securityContext:\n        allowPrivilegeEscalation: false\n        capabilities:\n          drop: ["ALL"]\n';

  it('o nível vem da label do Namespace (privileged quando não há)', () => {
    expect(nivelPss('seguro', [])).toBe('privileged');
    aplicarYaml(ns('baseline'));
    expect(aplicarYaml('apiVersion: v1\nkind: Namespace\nmetadata:\n  name: n\n  labels:\n    pod-security.kubernetes.io/warn: total').mensagem).toContain('must be one of privileged, baseline, restricted');
    expect(admissaoPss({ kind: 'Deployment' }, [])).toBeNull();
  });

  it('restricted recusa o Pod e lista o que falta, como o kube-apiserver', () => {
    aplicarYaml(ns('restricted'));
    const r = aplicarYaml(pod('  containers:\n    - name: app\n      image: nginx:1.27'));
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain('pods "api" is forbidden: violates PodSecurity "restricted:latest"');
    expect(r.mensagem).toContain('allowPrivilegeEscalation != false (container "app" must set securityContext.allowPrivilegeEscalation=false)');
    expect(r.mensagem).toContain('unrestricted capabilities');
    expect(r.mensagem).toContain('runAsNonRoot != true');
    expect(r.mensagem).toContain('seccompProfile (pod or container "app"');
  });

  it('restricted aceita o Pod com os quatro campos (no Pod ou no container)', () => {
    aplicarYaml(ns('restricted'));
    expect(aplicarYaml(pod(`  securityContext:\n    runAsNonRoot: true\n    seccompProfile:\n      type: RuntimeDefault\n${containerSeguro}`)).ok).toBe(true);
    const uid0 = aplicarYaml(pod(`  securityContext:\n    runAsNonRoot: true\n    runAsUser: 0\n    seccompProfile:\n      type: RuntimeDefault\n${containerSeguro}`));
    expect(uid0.mensagem).toContain('runAsUser=0');
    const volume = aplicarYaml(pod(`  securityContext:\n    runAsNonRoot: true\n    seccompProfile:\n      type: RuntimeDefault\n  volumes:\n    - name: nfs\n      nfs: {server: a, path: /}\n${containerSeguro}`));
    expect(volume.mensagem).toContain('restricted volume types (volume "nfs"');
  });

  it('baseline barra privilegiado, rede do host, hostPath, hostPort e capacidades extras', () => {
    aplicarYaml(ns('baseline'));
    const r = aplicarYaml(pod('  hostNetwork: true\n  volumes:\n    - name: raiz\n      hostPath: {path: /}\n  containers:\n    - name: a\n      image: x\n      ports:\n        - containerPort: 80\n          hostPort: 80\n      securityContext:\n        privileged: true\n        capabilities:\n          add: ["NET_ADMIN"]\n    - name: b\n      image: x\n      securityContext:\n        privileged: true'));
    expect(r.mensagem).toContain('violates PodSecurity "baseline:latest"');
    expect(r.mensagem).toContain('privileged (containers "a", "b" must not set securityContext.privileged=true)');
    expect(r.mensagem).toContain('host namespaces (hostNetwork=true)');
    expect(r.mensagem).toContain('hostPath volumes (volume "raiz")');
    expect(r.mensagem).toContain('hostPort (container "a" uses hostPort)');
    expect(r.mensagem).toContain('non-default capabilities');
    expect(aplicarYaml(pod('  containers:\n    - name: a\n      image: x\n      securityContext:\n        capabilities:\n          add: ["NET_BIND_SERVICE"]')).ok).toBe(true);
  });

  it('o Diff também mostra a recusa, e Pods em outros namespaces não são conferidos', () => {
    aplicarYaml(ns('restricted'));
    expect(simularApply(pod('  containers:\n    - name: app\n      image: nginx')).mensagem).toContain('forbidden');
    expect(aplicarYaml('apiVersion: v1\nkind: Pod\nmetadata:\n  name: livre\nspec:\n  containers:\n    - name: app\n      image: nginx').ok).toBe(true);
  });
});

describe('casos ocultos do conteúdo', () => {
  it('comOcultos acrescenta os casos marcados como ocultos só aos exercícios do mapa', () => {
    const itens = [
      { id: 'l', tipo: 'licao' },
      { id: 'e', tipo: 'exercicio', testes: [{ descricao: 'v', regras: [] }] },
      { id: 'f', tipo: 'exercicio', testes: [] },
    ];
    const r = comOcultos(itens, { e: { dica: 'confira x', regras: [{ tipo: 'diff-usado' }] }, l: { dica: 'nada', regras: [] } });
    expect(r[0]).toBe(itens[0]);
    expect(r[1].testes).toEqual([{ descricao: 'v', regras: [] }, { descricao: 'Caso oculto', dica: 'confira x', oculto: true, regras: [{ tipo: 'diff-usado' }] }]);
    expect(r[2]).toBe(itens[2]);
    expect(comOcultos(itens, { e: [{ dica: 'a', regras: [] }, { dica: 'b', regras: [] }] })[1].testes).toHaveLength(3);
  });
});
