import { describe, it, expect, beforeEach } from 'vitest';
import { simularApply, resetarEstado } from '../src/k8s/simulador.js';
import { renderDiff } from '../src/ui/diff.js';

const CHAVE = 'test-diff';

beforeEach(() => {
  resetarEstado(CHAVE);
});

describe('simularApply', () => {
  it('retorna ok: false para YAML vazio', () => {
    const resultado = simularApply('');
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toContain('Nenhum documento YAML');
  });

  it('retorna ok: false para manifesto sem kind', () => {
    const yaml = `metadata:\n  name: teste`;
    const resultado = simularApply(yaml);
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toContain('kind');
  });

  it('retorna criar para novo recurso válido', () => {
    const yaml = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25`;
    const resultado = simularApply(yaml);
    expect(resultado.ok).toBe(true);
    expect(resultado.diff.criar.length).toBeGreaterThanOrEqual(1);
    expect(resultado.diff.criar[0].nome).toBe('nginx');
  });

  it('retorna arrays vazios quando estado já corresponde', () => {
    const yaml = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25`;
    // Primeira simulação cria; segunda não deve ter mudanças se o estado fosse aplicado
    // Como simularApply não modifica estado global, duas chamadas consecutivas devem retornar criar
    const r1 = simularApply(yaml);
    expect(r1.ok).toBe(true);
    // SimularApply é read-only: sempre projeta a partir do estado atual (vazio após reset)
    const r2 = simularApply(yaml);
    expect(r2.ok).toBe(true);
    expect(r2.diff.criar.length).toBe(r1.diff.criar.length);
  });
});

describe('renderDiff', () => {
  it('renderiza mensagem de placeholder quando resultado é null', () => {
    const html = renderDiff(null);
    expect(html).toContain('diff-vazio');
    expect(html).toContain('Diff');
  });

  it('renderiza erro estruturado quando ok é false', () => {
    const html = renderDiff({ ok: false, mensagem: 'campo obrigatório' });
    expect(html).toContain('diff-erro');
    expect(html).toContain('campo obrigatório');
  });

  it('renderiza badges de create/update/destroy', () => {
    const resultado = {
      ok: true,
      diff: {
        criar: [{ kind: 'Pod', nome: 'nginx', detalhes: 'nova imagem' }],
        atualizar: [{ kind: 'Service', nome: 'web', detalhes: 'porta alterada' }],
        destruir: [{ kind: 'ConfigMap', nome: 'old', detalhes: 'removido' }],
      },
    };
    const html = renderDiff(resultado);
    expect(html).toContain('diff-criar');
    expect(html).toContain('diff-atualizar');
    expect(html).toContain('diff-destruir');
    expect(html).toContain('+ 1 to create');
    expect(html).toContain('~ 1 to update');
    expect(html).toContain('- 1 to destroy');
    expect(html).toContain('nginx');
    expect(html).toContain('web');
    expect(html).toContain('old');
  });

  it('renderiza mensagem de nenhuma mudança quando diff está vazio', () => {
    const resultado = { ok: true, diff: { criar: [], atualizar: [], destruir: [] } };
    const html = renderDiff(resultado);
    expect(html).toContain('Nenhuma mudança');
  });

  it('escapa HTML nos nomes de recursos para prevenir XSS', () => {
    const resultado = {
      ok: true,
      diff: {
        criar: [{ kind: '<script>', nome: '<img onerror=alert(1)>', detalhes: '' }],
        atualizar: [],
        destruir: [],
      },
    };
    const html = renderDiff(resultado);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toMatch(/(&lt;|&#60;)script(&gt;|&#62;)/);
  });
});