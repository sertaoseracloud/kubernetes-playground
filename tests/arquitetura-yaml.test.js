// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { grafoDoYaml } from '../src/k8s/grafo.js';
import { renderArquiteturaRecursos } from '../src/ui/arquitetura-recursos.js';

describe('arquitetura a partir dos manifestos', () => {
  it('mostra Pod, Service e relação de selector sem inventar AWS ou Azure', () => {
    const codigo = `apiVersion: v1
kind: Pod
metadata:
  name: web
  labels:
    app: web
spec:
  containers:
    - name: web
      image: nginx:alpine
---
apiVersion: v1
kind: Service
metadata:
  name: entrada
spec:
  selector:
    app: web
  ports:
    - port: 80
`;
    const g = grafoDoYaml(codigo);
    expect(g.erro).toBeFalsy();
    const el = document.createElement('div');
    el.innerHTML = renderArquiteturaRecursos(g);
    expect(el.querySelector('image[href$="k8s-pod.svg"]')).not.toBeNull();
    expect(el.querySelector('image[href$="k8s-svc.svg"]')).not.toBeNull();
    expect(el.querySelectorAll('.arq-ligacao')).toHaveLength(1);
    expect(el.querySelector('.arq-lista').textContent).toMatch(/Service.*entrada.*usa.*Pod.*web/s);
    expect(el.querySelector('image[href*="aws-"], image[href*="azure-"]')).toBeNull();
  });

  it('não apresenta uma arquitetura antiga para YAML inválido', () => {
    const el = document.createElement('div');
    el.innerHTML = renderArquiteturaRecursos(grafoDoYaml('kind: ['));
    expect(el.querySelector('svg')).toBeNull();
    expect(el.querySelector('[role="status"]').textContent).toContain('Corrija o código');
  });

  it('contém os recursos no namespace declarado sem selecionar Pods de outro namespace', () => {
    const yaml = `apiVersion: v1
kind: Namespace
metadata:
  name: loja
---
apiVersion: v1
kind: Pod
metadata:
  name: web
  namespace: loja
  labels:
    app: web
spec:
  containers:
    - name: web
      image: nginx
---
apiVersion: v1
kind: Pod
metadata:
  name: web
  namespace: outro
  labels:
    app: web
spec:
  containers:
    - name: web
      image: nginx
---
apiVersion: v1
kind: Service
metadata:
  name: entrada
  namespace: loja
spec:
  selector:
    app: web
  ports:
    - port: 80
`;
    const g = grafoDoYaml(yaml);
    expect(g.contencoes).toEqual([
      { filho: 'Pod/loja/web', pai: 'Namespace/loja', motivo: 'metadata.namespace' },
      { filho: 'Service/loja/entrada', pai: 'Namespace/loja', motivo: 'metadata.namespace' },
    ]);
    expect(g.arestas).toEqual([{ de: 'Service/loja/entrada', para: 'Pod/loja/web', motivo: 'selector' }]);
    const el = document.createElement('div');
    el.innerHTML = renderArquiteturaRecursos(g);
    expect(el.querySelectorAll('.arq-contencao')).toHaveLength(1);
    expect(el.querySelector('.arq-lista').textContent).toContain('Pod/loja/web está em Namespace/loja');
    expect(el.querySelectorAll('.arq-recurso')).toHaveLength(3);
  });

  it('não coloca recursos cluster-wide dentro de um namespace e não inventa namespaces ausentes', () => {
    const g = grafoDoYaml(`kind: Namespace
metadata:
  name: default
---
kind: Pod
metadata:
  name: implicito
---
kind: Pod
metadata:
  name: externo
  namespace: ausente
---
kind: PersistentVolume
metadata:
  name: compartilhado
`);
    expect(g.contencoes).toEqual([{ filho: 'Pod/implicito', pai: 'Namespace/default', motivo: 'namespace default (implícito)' }]);
    expect(g.nos.find((n) => n.kind === 'PersistentVolume').namespace).toBe('');
    expect(g.nos.map((n) => n.id)).not.toContain('Namespace/ausente');
  });

  it('resolve referências de Pod e ServiceAccount no namespace correto', () => {
    const g = grafoDoYaml(`kind: ConfigMap
metadata:
  name: config
  namespace: loja
---
kind: Pod
metadata:
  name: web
  namespace: loja
spec:
  containers:
    - name: web
      envFrom:
        - configMapRef:
            name: config
---
kind: ClusterRoleBinding
metadata:
  name: acesso
roleRef:
  kind: ClusterRole
  name: leitor
subjects:
  - kind: ServiceAccount
    name: app
    namespace: loja
---
kind: ServiceAccount
metadata:
  name: app
  namespace: loja
---
kind: ClusterRole
metadata:
  name: leitor
`);
    expect(g.arestas).toContainEqual({ de: 'Pod/loja/web', para: 'ConfigMap/loja/config', motivo: 'envFrom' });
    expect(g.arestas).toContainEqual({ de: 'ClusterRoleBinding/acesso', para: 'ServiceAccount/loja/app', motivo: 'subjects' });
    expect(g.arestas).toContainEqual({ de: 'ClusterRoleBinding/acesso', para: 'ClusterRole/leitor', motivo: 'roleRef' });
  });
});
