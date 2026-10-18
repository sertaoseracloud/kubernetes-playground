import { describe, it, expect, beforeEach } from 'vitest';
import { buscarRecurso, aplicarYaml, resetarEstado } from '../src/k8s/simulador.js';

const CHAVE = 'test-datasource';

beforeEach(() => {
  resetarEstado(CHAVE);
});

describe('buscarRecurso', () => {
  it('retorna null para recurso inexistente', () => {
    const resultado = buscarRecurso('Pod', 'nao-existe');
    expect(resultado).toBeNull();
  });

  it('retorna null para kind desconhecido', () => {
    const resultado = buscarRecurso('UnknownKind', 'qualquer');
    expect(resultado).toBeNull();
  });

  it('encontra Pod após apply', () => {
    const yaml = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25`;
    aplicarYaml(yaml, CHAVE);
    const resultado = buscarRecurso('Pod', 'nginx');
    expect(resultado).not.toBeNull();
    expect(resultado.nome).toBe('nginx');
  });

  it('encontra Service após apply', () => {
    const yaml = `apiVersion: v1\nkind: Service\nmetadata:\n  name: web-svc\nspec:\n  selector:\n    app: web\n  ports:\n    - port: 80`;
    aplicarYaml(yaml, CHAVE);
    const resultado = buscarRecurso('Service', 'web-svc');
    expect(resultado).not.toBeNull();
    expect(resultado.nome).toBe('web-svc');
  });

  it('encontra ConfigMap após apply', () => {
    const yaml = `apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: app-config\ndata:\n  key: value`;
    aplicarYaml(yaml, CHAVE);
    const resultado = buscarRecurso('ConfigMap', 'app-config');
    expect(resultado).not.toBeNull();
    expect(resultado.nome).toBe('app-config');
  });

  it('encontra Deployment após apply', () => {
    const yaml = `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web-deploy\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: web\n  template:\n    metadata:\n      labels:\n        app: web\n    spec:\n      containers:\n        - name: web\n          image: nginx:1.25`;
    aplicarYaml(yaml, CHAVE);
    const resultado = buscarRecurso('Deployment', 'web-deploy');
    expect(resultado).not.toBeNull();
    expect(resultado.nome).toBe('web-deploy');
  });

  it('distingue recursos com mesmo nome em tipos diferentes', () => {
    const podYaml = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: shared-name\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25`;
    const svcYaml = `apiVersion: v1\nkind: Service\nmetadata:\n  name: shared-name\nspec:\n  selector:\n    app: web\n  ports:\n    - port: 80`;
    aplicarYaml(podYaml, CHAVE);
    aplicarYaml(svcYaml, CHAVE);

    const pod = buscarRecurso('Pod', 'shared-name');
    const svc = buscarRecurso('Service', 'shared-name');
    expect(pod).not.toBeNull();
    expect(svc).not.toBeNull();
    expect(pod.nome).toBe('shared-name');
    expect(svc.nome).toBe('shared-name');
  });
});