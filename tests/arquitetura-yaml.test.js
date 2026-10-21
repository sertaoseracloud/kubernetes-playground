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
});
