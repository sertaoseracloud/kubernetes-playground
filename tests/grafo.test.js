// @vitest-environment happy-dom
// Grafo de dependências (aba 🕸️ Grafo): quem usa quem no YAML, os níveis e a versão em texto.
import { describe, it, expect, afterEach } from 'vitest';
import { grafoDoYaml } from '../src/k8s/grafo.js';
import { layoutGrafo, desenharGrafo } from '../src/ui/grafo.js';
import { problemas } from '../src/conteudo/trilha.js';

const APP = `apiVersion: v1
kind: ConfigMap
metadata:
  name: config
data:
  COR: azul
---
apiVersion: v1
kind: Secret
metadata:
  name: senhas
stringData:
  SENHA: x
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app
---
apiVersion: apps/v1
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
      serviceAccountName: app
      containers:
        - name: web
          image: nginx:1.25
          envFrom:
            - configMapRef:
                name: config
          env:
            - name: SENHA
              valueFrom:
                secretKeyRef:
                  name: senhas
                  key: SENHA
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    app: web
  ports:
    - port: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
spec:
  rules:
    - host: loja.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 2
  maxReplicas: 5
`;

const pares = (g) => g.arestas.map((a) => `${a.de} -> ${a.para}`).sort();

describe('grafoDoYaml', () => {
  it('liga por nome (envFrom, secretKeyRef, serviceAccountName, backend, scaleTargetRef) e por rótulos (selector)', () => {
    const g = grafoDoYaml(APP);
    expect(g.nos).toHaveLength(7);
    expect(pares(g)).toEqual([
      'Deployment/web -> ConfigMap/config',
      'Deployment/web -> Secret/senhas',
      'Deployment/web -> ServiceAccount/app',
      'HorizontalPodAutoscaler/web -> Deployment/web',
      'Ingress/web -> Service/web',
      'Service/web -> Deployment/web',
    ]);
    expect(g.avisos).toEqual([]);
  });

  it('avisa quando o selector não acha nenhum Pod ou o nome aponta para fora do YAML', () => {
    const g = grafoDoYaml('kind: Service\nmetadata:\n  name: api\nspec:\n  selector:\n    app: api\n---\nkind: Pod\nmetadata:\n  name: p\nspec:\n  containers:\n    - name: c\n      image: x\n      envFrom:\n        - configMapRef:\n            name: falta\n');
    expect(g.arestas).toEqual([]);
    expect(g.avisos.join(' ')).toContain('Service/api não seleciona nenhum Pod');
    expect(g.avisos.join(' ')).toContain('ConfigMap/falta');
  });

  it('YAML inválido vira erro, e não exceção', () => {
    expect(grafoDoYaml('a: [').erro).toMatch(/não pôde ser lido/);
    expect(grafoDoYaml('').nos).toEqual([]);
  });

  it('nenhuma solução da trilha quebra o grafo', () => {
    for (const p of problemas) {
      const g = grafoDoYaml(p.solucao);
      expect(g.erro, p.id).toBeUndefined();
    }
  });
});

describe('layoutGrafo', () => {
  it('quem é usado fica à esquerda de quem usa, sem sobreposição', () => {
    const g = grafoDoYaml(APP);
    const { pos } = layoutGrafo(g);
    expect(pos.get('ConfigMap/config').x).toBeLessThan(pos.get('Deployment/web').x);
    expect(pos.get('Deployment/web').x).toBeLessThan(pos.get('Service/web').x);
    expect(pos.get('Service/web').x).toBeLessThan(pos.get('Ingress/web').x);
    const lugares = [...pos.values()].map((p) => `${p.x},${p.y}`);
    expect(new Set(lugares).size).toBe(lugares.length);
  });

  it('um ciclo não trava o cálculo', () => {
    const no = (id) => ({ id, rotulo: id, kind: 'X', grupo: 'outro' });
    expect(() => layoutGrafo({ nos: [no('a'), no('b')], arestas: [{ de: 'a', para: 'b' }, { de: 'b', para: 'a' }] })).not.toThrow();
  });
});

describe('desenharGrafo', () => {
  afterEach(() => document.documentElement.classList.remove('a11y-leitor-tela'));

  it('desenha o SVG e a lista em texto com as mesmas dependências', () => {
    const el = document.createElement('div');
    desenharGrafo(el, APP);
    expect(el.querySelector('svg[role="img"]').getAttribute('aria-label')).toContain('lista em texto');
    expect(el.querySelectorAll('.no-grafo')).toHaveLength(7);
    expect(el.querySelector('.lista-grafo').textContent).toMatch(/Ingress\/web\s*usa\s*Service\/web/);
  });

  it('no modo leitor de tela, a lista em texto já vem aberta', () => {
    document.documentElement.classList.add('a11y-leitor-tela');
    const el = document.createElement('div');
    desenharGrafo(el, APP);
    expect(el.querySelector('.lista-grafo').open).toBe(true);
  });

  it('sem recursos, explica o que escrever; com erro, pede para corrigir', () => {
    const el = document.createElement('div');
    desenharGrafo(el, '');
    expect(el.textContent).toContain('Ainda não há recursos');
    desenharGrafo(el, 'a: [');
    expect(el.textContent).toContain('Corrija o YAML');
  });
});
