import { describe, it, expect, beforeEach } from 'vitest';
import { aplicarYaml, resetarEstado } from '../src/k8s/simulador.js';

const CHAVE = 'test-validacao';

beforeEach(() => {
  resetarEstado(CHAVE);
});

describe('validação de campos obrigatórios', () => {
  it('rejeita Pod sem containers com mensagem estilo Terraform', () => {
    const yaml = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx\nspec: {}`;
    const resultado = aplicarYaml(yaml, CHAVE);
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toContain('Missing required argument');
    expect(resultado.mensagem).toContain('containers');
  });

  it('rejeita Pod sem metadata.name', () => {
    const yaml = `apiVersion: v1\nkind: Pod\nspec:\n  containers:\n    - name: web\n      image: nginx`;
    const resultado = aplicarYaml(yaml, CHAVE);
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toContain('name');
  });

  it('aceita Pod válido com todos os campos obrigatórios', () => {
    const yaml = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25`;
    const resultado = aplicarYaml(yaml, CHAVE);
    expect(resultado.ok).toBe(true);
  });

  it('rejeita Service sem selector', () => {
    const yaml = `apiVersion: v1\nkind: Service\nmetadata:\n  name: web-svc\nspec:\n  ports:\n    - port: 80`;
    const resultado = aplicarYaml(yaml, CHAVE);
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toContain('selector');
  });

  it('rejeita Deployment sem replicas ou selector', () => {
    const yaml = `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web\nspec:\n  template:\n    spec:\n      containers:\n        - name: web\n          image: nginx`;
    const resultado = aplicarYaml(yaml, CHAVE);
    expect(resultado.ok).toBe(false);
  });
});

describe('sugestões Levenshtein para campos desconhecidos', () => {
  it('reporta campo desconhecido no nível raiz do Pod', () => {
    // xyzcampo não existe em CAMPOS_CONHECIDOS; metadata e containers válidos evitam erro prévio
    const yaml = `apiVersion: v1\nkind: Pod\nxyzcampo: true\nmetadata:\n  name: nginx\nspec:\n  containers:\n    - name: web\n      image: nginx`;
    const resultado = aplicarYaml(yaml, CHAVE);
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toContain('Unknown field');
    expect(resultado.mensagem).toContain('xyzcampo');
  });

  it('reporta campo desconhecido sem sugestão quando não há similar', () => {
    const yaml = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx\nxyzabc: true\nspec:\n  containers:\n    - name: web\n      image: nginx`;
    const resultado = aplicarYaml(yaml, CHAVE);
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toContain('Unknown field');
    expect(resultado.mensagem).toContain('xyzabc');
  });
});