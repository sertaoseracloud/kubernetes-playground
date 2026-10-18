import { describe, it, expect, beforeEach } from 'vitest';
import { detectarDrift, aplicarYaml, resetarEstado } from '../src/k8s/simulador.js';

const CHAVE = 'test-drift';

beforeEach(() => {
  resetarEstado(CHAVE);
});

describe('detectarDrift', () => {
  it('retorna temDrift: false quando YAML e estado estão vazios', () => {
    const resultado = detectarDrift('');
    expect(resultado.temDrift).toBe(false);
    expect(resultado.drifts).toHaveLength(0);
  });

  it('detecta recurso adicionado (no YAML mas não no estado)', () => {
    const yaml = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25`;
    const resultado = detectarDrift(yaml);
    expect(resultado.temDrift).toBe(true);
    const adicionado = resultado.drifts.find((d) => d.tipo === 'adicionado');
    expect(adicionado).toBeDefined();
    expect(adicionado.nome).toBe('nginx');
    expect(adicionado.kind).toBe('Pod');
  });

  it('detecta recurso removido (no estado mas não no YAML)', () => {
    // Primeiro aplica um recurso para criar estado
    const yamlInicial = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25`;
    aplicarYaml(yamlInicial, CHAVE);

    // Agora detecta drift com YAML vazio (recurso existe no estado mas não no YAML)
    const resultado = detectarDrift('');
    expect(resultado.temDrift).toBe(true);
    const removido = resultado.drifts.find((d) => d.tipo === 'removido');
    expect(removido).toBeDefined();
    expect(removido.nome).toBe('nginx');
  });

  it('detecta recurso modificado (campo diferente entre YAML e estado)', () => {
    const yamlInicial = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx\nspec:\n  containers:\n    - name: web\n      image: nginx:1.24`;
    aplicarYaml(yamlInicial, CHAVE);

    const yamlModificado = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25`;
    const resultado = detectarDrift(yamlModificado);
    expect(resultado.temDrift).toBe(true);
    const modificado = resultado.drifts.find((d) => d.tipo === 'modificado');
    expect(modificado).toBeDefined();
    expect(modificado.nome).toBe('nginx');
  });

  it('retorna temDrift: false quando YAML corresponde ao estado', () => {
    const yaml = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25`;
    aplicarYaml(yaml, CHAVE);

    const resultado = detectarDrift(yaml);
    expect(resultado.temDrift).toBe(false);
    expect(resultado.drifts).toHaveLength(0);
  });

  it('lida com YAML inválido sem lançar erro', () => {
    const resultado = detectarDrift('{{invalid yaml::');
    expect(resultado.temDrift).toBe(false);
    expect(resultado.drifts).toHaveLength(0);
  });
});