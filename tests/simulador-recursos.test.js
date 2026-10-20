// Recursos que o simulador passou a entender para os módulos avançados, AWS e Azure:
// apiVersion de cada kind (como o servidor de API), validações reais (restartPolicy do Job,
// pathType do Ingress, selector x labels...), CRDs simuladas e a regra "campo", que lê
// qualquer campo do manifesto aplicado.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  aplicarYaml, resetarEstado, obterEstado, verificarRegra, descreverRegra, removerRecurso, simularApply, lerCampo,
} from '../src/k8s/simulador.js';
import { interpretar, explicarKind } from '../src/k8s/comandos.js';

beforeEach(() => resetarEstado());

const deploy = (extra = '') => `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      serviceAccountName: leitor
      containers:
        - name: app
          image: nginx:1.27
          ports:
            - containerPort: 80
${extra}`;

describe('apiVersion de cada kind', () => {
  it('aceita a versão certa e recusa uma que o servidor não serve', () => {
    expect(aplicarYaml(deploy()).ok).toBe(true);
    const r = aplicarYaml(deploy().replace('apps/v1', 'extensions/v1beta1'));
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain('no matches for kind "Deployment" in version "extensions/v1beta1"');
  });

  it('recusa versões removidas do Kubernetes (CronJob batch/v1beta1, HPA autoscaling/v2beta2)', () => {
    const cron = `apiVersion: batch/v1beta1
kind: CronJob
metadata:
  name: c
spec:
  schedule: "0 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: c
              image: busybox:1.36`;
    expect(aplicarYaml(cron).ok).toBe(false);
    expect(aplicarYaml(cron.replace('batch/v1beta1', 'batch/v1')).ok).toBe(true);
  });

  it('exige o apiVersion', () => {
    const r = aplicarYaml('kind: ConfigMap\nmetadata:\n  name: a\ndata:\n  x: "1"');
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain('apiVersion not set');
  });

  it('o diff também recusa a versão errada', () => {
    expect(simularApply(deploy().replace('apps/v1', 'v1')).ok).toBe(false);
  });
});

describe('validações do servidor de API', () => {
  it('Job só aceita restartPolicy Never ou OnFailure', () => {
    const job = (politica) => `apiVersion: batch/v1
kind: Job
metadata:
  name: j
spec:
  template:
    spec:
      ${politica ? `restartPolicy: ${politica}` : ''}
      containers:
        - name: j
          image: busybox:1.36`;
    expect(aplicarYaml(job('Never')).ok).toBe(true);
    const r = aplicarYaml(job('Always'));
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain('restartPolicy');
    expect(aplicarYaml(job('')).ok).toBe(false);
  });

  it('o selector do Deployment precisa casar com os labels do template', () => {
    const r = aplicarYaml(deploy().replace('      labels:\n        app: web', '      labels:\n        app: outro'));
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain('selector');
  });

  it('StatefulSet e DaemonSet exigem selector e containers', () => {
    const sts = `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: db
spec:
  serviceName: db
  replicas: 3
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
        - name: db
          image: postgres:16`;
    expect(aplicarYaml(sts).ok).toBe(true);
    expect(aplicarYaml(sts.replace(/ {2}selector:\n {4}matchLabels:\n {6}app: db\n/, '')).ok).toBe(false);
    const ds = sts.replace('StatefulSet', 'DaemonSet').replace('  serviceName: db\n  replicas: 3\n', '');
    expect(aplicarYaml(ds).ok).toBe(true);
    expect(aplicarYaml(ds.replace(/ {6}containers:[\s\S]*$/, '      containers: []')).ok).toBe(false);
  });

  it('Ingress v1 exige pathType e backend.service em cada caminho', () => {
    const ing = (pathType) => `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: i
spec:
  rules:
    - host: app.exemplo.com
      http:
        paths:
          - path: /
            ${pathType}
            backend:
              service:
                name: web
                port:
                  number: 80`;
    expect(aplicarYaml(ing('pathType: Prefix')).ok).toBe(true);
    const r = aplicarYaml(ing(''));
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain('pathType');
  });

  it('Role exige verbs em cada regra; RoleBinding exige roleRef', () => {
    const role = `apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: leitor
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]`;
    expect(aplicarYaml(role).ok).toBe(true);
    expect(aplicarYaml(role.replace('    verbs: ["get", "list"]', '')).ok).toBe(false);
    const rb = `apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: leitor
subjects:
  - kind: ServiceAccount
    name: app
    namespace: default`;
    expect(aplicarYaml(rb).ok).toBe(false);
    expect(aplicarYaml(`${rb}\nroleRef:\n  apiGroup: rbac.authorization.k8s.io\n  kind: Role\n  name: leitor`).ok).toBe(true);
  });

  it('HPA exige scaleTargetRef e maxReplicas; PVC exige accessModes e storage; StorageClass exige provisioner', () => {
    const hpa = `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: h
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 2`;
    expect(aplicarYaml(hpa).ok).toBe(false);
    expect(aplicarYaml(`${hpa}\n  maxReplicas: 5`).ok).toBe(true);
    expect(aplicarYaml(`${hpa}\n  maxReplicas: 1`).ok).toBe(false);
    const pvc = 'apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: d\nspec:\n  accessModes: ["ReadWriteOnce"]';
    expect(aplicarYaml(pvc).ok).toBe(false);
    expect(aplicarYaml(`${pvc}\n  resources:\n    requests:\n      storage: 1Gi`).ok).toBe(true);
    expect(aplicarYaml('apiVersion: storage.k8s.io/v1\nkind: StorageClass\nmetadata:\n  name: s').ok).toBe(false);
    expect(aplicarYaml('apiVersion: storage.k8s.io/v1\nkind: StorageClass\nmetadata:\n  name: s\nprovisioner: ebs.csi.aws.com').ok).toBe(true);
  });

  it('PodDisruptionBudget aceita minAvailable ou maxUnavailable, não os dois', () => {
    const pdb = (campos) => `apiVersion: policy/v1\nkind: PodDisruptionBudget\nmetadata:\n  name: p\nspec:\n${campos}  selector:\n    matchLabels:\n      app: web`;
    expect(aplicarYaml(pdb('  minAvailable: 1\n')).ok).toBe(true);
    expect(aplicarYaml(pdb('  minAvailable: 1\n  maxUnavailable: 1\n')).ok).toBe(false);
  });
});

describe('CRDs simuladas', () => {
  it.each([
    ['karpenter.sh/v1', 'NodePool', 'spec:\n  template:\n    spec:\n      nodeClassRef:\n        group: karpenter.k8s.aws\n        kind: EC2NodeClass\n        name: padrao\n      requirements: []'],
    ['keda.sh/v1alpha1', 'ScaledObject', 'spec:\n  scaleTargetRef:\n    name: web\n  triggers:\n    - type: cpu\n      metadata:\n        value: "60"'],
    ['secrets-store.csi.x-k8s.io/v1', 'SecretProviderClass', 'spec:\n  provider: azure\n  parameters:\n    keyvaultName: kv'],
    ['gateway.networking.k8s.io/v1', 'HTTPRoute', 'spec:\n  parentRefs:\n    - name: gw\n  rules: []'],
    ['argoproj.io/v1alpha1', 'Application', 'spec:\n  project: default'],
  ])('%s %s é aceito e guardado', (apiVersion, kind, spec) => {
    const r = aplicarYaml(`apiVersion: ${apiVersion}\nkind: ${kind}\nmetadata:\n  name: x\n${spec}`);
    expect(r.mensagem).not.toContain('não suportado');
    expect(r.ok).toBe(true);
    expect(verificarRegra({ tipo: 'recurso-existe', kind, nome: 'x' }).ok).toBe(true);
  });

  it('kind desconhecido continua recusado', () => {
    expect(aplicarYaml('apiVersion: v1\nkind: Banana\nmetadata:\n  name: x').ok).toBe(false);
  });
});

describe('regra campo', () => {
  const ann = 'metadata:\n  name: leitor\n  annotations:\n    eks.amazonaws.com/role-arn: arn:aws:iam::111122223333:role/leitor';

  it('lê caminhos com índice, filtro, chave com ponto e [*]', () => {
    const obj = { spec: { containers: [{ name: 'a', image: 'x', ports: [{ containerPort: 80 }] }, { name: 'b', image: 'y' }] }, metadata: { annotations: { 'a.b/c': 'v' } } };
    expect(lerCampo(obj, 'spec.containers[1].image')).toBe('y');
    expect(lerCampo(obj, 'spec.containers[name=a].ports[0].containerPort')).toBe(80);
    expect(lerCampo(obj, 'metadata.annotations["a.b/c"]')).toBe('v');
    expect(lerCampo(obj, 'spec.containers[*].name')).toEqual(['a', 'b']);
    expect(lerCampo(obj, 'spec.nada.mesmo')).toBeUndefined();
  });

  it('valor, contem, ausente, minimo e existência', () => {
    aplicarYaml(deploy());
    aplicarYaml(`apiVersion: v1\nkind: ServiceAccount\n${ann}`);
    const ok = (regra) => verificarRegra({ tipo: 'campo', kind: 'Deployment', nome: 'web', ...regra }).ok;
    expect(ok({ caminho: 'spec.template.spec.serviceAccountName', valor: 'leitor' })).toBe(true);
    expect(ok({ caminho: 'spec.template.spec.serviceAccountName', valor: 'outro' })).toBe(false);
    expect(ok({ caminho: 'spec.replicas', valor: '2' })).toBe(true);
    expect(ok({ caminho: 'spec.replicas', minimo: 3 })).toBe(false);
    expect(ok({ caminho: 'spec.template.spec.containers', minimo: 1 })).toBe(true);
    expect(ok({ caminho: 'spec.template.spec.containers[name=app].image', contem: 'nginx' })).toBe(true);
    expect(ok({ caminho: 'spec.template.spec.containers[*].name', contem: 'app' })).toBe(true);
    expect(ok({ caminho: 'spec.selector.matchLabels', contem: { app: 'web' } })).toBe(true);
    expect(ok({ caminho: 'spec.template.spec.hostNetwork', ausente: true })).toBe(true);
    expect(ok({ caminho: 'spec.template.spec.dnsPolicy' })).toBe(false);
    expect(verificarRegra({ tipo: 'campo', kind: 'ServiceAccount', nome: 'leitor', caminho: 'metadata.annotations["eks.amazonaws.com/role-arn"]', contem: ':role/leitor' }).ok).toBe(true);
    expect(verificarRegra({ tipo: 'campo', kind: 'Role', nome: 'web', caminho: 'rules' }).ok).toBe(false);
  });

  it('naoContem e [*] achatado (todos os verbos de todas as regras)', () => {
    aplicarYaml('apiVersion: rbac.authorization.k8s.io/v1\nkind: Role\nmetadata:\n  name: r\nrules:\n  - apiGroups: [""]\n    resources: ["pods"]\n    verbs: ["get", "list"]\n  - apiGroups: ["apps"]\n    resources: ["deployments"]\n    verbs: ["get"]');
    const ok = (regra) => verificarRegra({ tipo: 'campo', kind: 'Role', nome: 'r', caminho: 'rules[*].verbs', ...regra }).ok;
    expect(ok({ contem: 'list' })).toBe(true);
    expect(ok({ naoContem: 'delete' })).toBe(true);
    expect(ok({ naoContem: 'get' })).toBe(false);
    expect(ok({ caminho: 'rules[*].resources', naoContem: '*' })).toBe(true);
    expect(descreverRegra({ tipo: 'campo', kind: 'Role', nome: 'r', caminho: 'rules[*].verbs', naoContem: 'delete' })).toBe('Em Role "r", rules[*].verbs não contém "delete"');
  });

  it('tem descrição em português', () => {
    expect(descreverRegra({ tipo: 'campo', kind: 'Deployment', nome: 'web', caminho: 'spec.replicas', valor: 3 })).toBe('Em Deployment "web", spec.replicas é 3');
    expect(descreverRegra({ tipo: 'campo', kind: 'Role', nome: 'r', caminho: 'rules[0].verbs', contem: 'get' })).toBe('Em Role "r", rules[0].verbs contém "get"');
    expect(descreverRegra({ tipo: 'campo', kind: 'Pod', nome: 'p', caminho: 'spec.hostNetwork', ausente: true })).toBe('Em Pod "p", spec.hostNetwork não está definido');
    expect(descreverRegra({ tipo: 'campo', kind: 'Pod', nome: 'p', caminho: 'spec.x', texto: 'Texto próprio' })).toBe('Texto próprio');
  });

  it('o manifesto sai do estado quando o recurso é apagado', () => {
    aplicarYaml(`apiVersion: v1\nkind: ServiceAccount\n${ann}`);
    expect(obterEstado().manifestos['ServiceAccount/leitor']).toBeTruthy();
    expect(removerRecurso('ServiceAccount', 'leitor')).toBe(true);
    expect(obterEstado().manifestos['ServiceAccount/leitor']).toBeUndefined();
    aplicarYaml('apiVersion: rbac.authorization.k8s.io/v1\nkind: Role\nmetadata:\n  name: r\nrules:\n  - apiGroups: [""]\n    resources: ["pods"]\n    verbs: ["get"]');
    expect(removerRecurso('Role', 'r')).toBe(true);
    expect(verificarRegra({ tipo: 'recurso-existe', kind: 'Role', nome: 'r' }).ok).toBe(false);
  });

  it('o diff mostra o kind de verdade dos recursos genéricos', () => {
    const r = simularApply('apiVersion: v1\nkind: Namespace\nmetadata:\n  name: loja');
    expect(r.diff.criar[0]).toMatchObject({ kind: 'Namespace', nome: 'loja' });
  });

  it('normaliza tipo_probe (nome antigo) para tipoProbe', () => {
    aplicarYaml(deploy());
    expect(verificarRegra({ tipo: 'probe-configurada', pod: 'web', container: 'app', tipo_probe: 'liveness' }).ok).toBe(false);
  });
});

describe('kubectl com os novos tipos', () => {
  it('get e describe de StatefulSet, Role e CRD', () => {
    aplicarYaml('apiVersion: rbac.authorization.k8s.io/v1\nkind: Role\nmetadata:\n  name: leitor\nrules:\n  - apiGroups: [""]\n    resources: ["pods"]\n    verbs: ["get"]');
    aplicarYaml('apiVersion: karpenter.sh/v1\nkind: NodePool\nmetadata:\n  name: padrao\nspec:\n  template:\n    spec:\n      nodeClassRef:\n        group: karpenter.k8s.aws\n        kind: EC2NodeClass\n        name: padrao\n      requirements: []');
    const texto = (cmd) => interpretar(cmd, obterEstado()).linhas.map((l) => l.texto).join('\n');
    expect(texto('kubectl get roles')).toContain('leitor');
    expect(texto('kubectl get nodepools')).toContain('padrao');
    expect(texto('kubectl get sts')).toContain('No resources found');
    expect(texto('kubectl describe role leitor')).toContain('Name:         leitor');
    expect(interpretar('kubectl delete role leitor', obterEstado()).acao.apagar[0]).toMatchObject({ kind: 'Role', nome: 'leitor' });
  });

  it('explica os novos kinds na aba Docs', () => {
    for (const k of ['StatefulSet', 'DaemonSet', 'Role', 'RoleBinding', 'NodePool', 'ScaledObject', 'SecretProviderClass', 'StorageClass']) {
      expect(explicarKind(k), k).toBeTruthy();
    }
  });
});

describe('mensagem do apply', () => {
  it('usa kind.grupo como o kubectl', () => {
    expect(aplicarYaml('apiVersion: karpenter.sh/v1\nkind: NodePool\nmetadata:\n  name: padrao\nspec:\n  template:\n    spec:\n      nodeClassRef:\n        group: karpenter.k8s.aws\n        kind: EC2NodeClass\n        name: padrao\n      requirements: []').mensagem).toBe('nodepool.karpenter.sh/padrao created');
    expect(aplicarYaml('apiVersion: v1\nkind: Namespace\nmetadata:\n  name: loja').mensagem).toBe('namespace/loja created');
  });
});
