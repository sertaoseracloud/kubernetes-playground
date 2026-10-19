import { describe, it, expect } from 'vitest';
import { renderEstado, formatarJson } from '../src/ui/estado.js';
import { renderDiff } from '../src/ui/diff.js';
import { renderDrift } from '../src/ui/drift.js';

describe('formatarJson', () => {
  it('formata objeto com indentação', () => {
    const resultado = formatarJson({ a: 1 });
    expect(resultado).toContain('"a": 1');
  });

  it('retorna string para valor não serializável', () => {
    const circular = {};
    circular.self = circular;
    const resultado = formatarJson(circular);
    expect(typeof resultado).toBe('string');
  });
});

describe('renderEstado', () => {
  it('renderiza mensagem de cluster vazio para estado nulo', () => {
    const html = renderEstado(null);
    expect(html).toContain('Cluster vazio');
    expect(html).toContain('role="status"');
  });

  it('renderiza JSON do estado quando fornecido', () => {
    const estado = { pods: [{ nome: 'p1' }], services: [] };
    const html = renderEstado(estado);
    expect(html).toContain('p1');
    expect(html).toContain('Estado completo');
  });

  it('renderiza badges de diff quando mudanças existem', () => {
    const estado = { pods: [], services: [] };
    const diff = {
      adicionados: [{ tipo: 'pods', nome: 'new-pod' }],
      removidos: [{ tipo: 'services', nome: 'old-svc' }],
      alterados: [{ tipo: 'deployments', nome: 'dep1' }],
    };
    const html = renderEstado(estado, diff);
    expect(html).toContain('+1');
    expect(html).toContain('-1');
    expect(html).toContain('~1');
    expect(html).toContain('Mudanças recentes');
    expect(html).toContain('Adicionado:');
    expect(html).toContain('Removido:');
    expect(html).toContain('Alterado:');
  });

  it('não renderiza seção de mudanças quando diff está vazio', () => {
    const estado = { pods: [] };
    const diff = { adicionados: [], removidos: [], alterados: [] };
    const html = renderEstado(estado, diff);
    expect(html).not.toContain('Mudanças recentes');
  });
});

describe('renderDiff', () => {
  it('renderiza mensagem padrão para resultado nulo', () => {
    const html = renderDiff(null);
    expect(html).toContain('Diff');
    expect(html).toContain('role="status"');
  });

  it('renderiza erro quando ok é false', () => {
    const html = renderDiff({ ok: false, mensagem: 'YAML inválido' });
    expect(html).toContain('YAML inválido');
    expect(html).toContain('role="alert"');
  });

  it('renderiza mensagem de nenhuma mudança', () => {
    const html = renderDiff({ ok: true, diff: { criar: [], atualizar: [], destruir: [] }, mensagem: '' });
    expect(html).toContain('Nenhuma mudança');
  });

  it('renderiza itens de criar, atualizar e destruir', () => {
    const resultado = {
      ok: true,
      diff: {
        criar: [{ kind: 'Pod', nome: 'new', detalhes: 'image: nginx' }],
        atualizar: [{ kind: 'Service', nome: 'svc', detalhes: 'port: 80 → 8080' }],
        destruir: [{ kind: 'ConfigMap', nome: 'old', detalhes: 'data keys: k' }],
      },
      mensagem: '',
    };
    const html = renderDiff(resultado);
    expect(html).toContain('+ 1 to create');
    expect(html).toContain('~ 1 to update');
    expect(html).toContain('- 1 to destroy');
    expect(html).toContain('Pod/new');
    expect(html).toContain('Service/svc');
    expect(html).toContain('ConfigMap/old');
    expect(html).toContain('Criar:');
    expect(html).toContain('Atualizar:');
    expect(html).toContain('Destruir:');
  });
});

describe('renderDrift', () => {
  it('renderiza estado sincronizado quando temDrift é false', () => {
    const html = renderDrift({ drifts: [], temDrift: false });
    expect(html).toContain('sincronizados');
    expect(html).toContain('drift-ok');
  });

  it('renderiza estado sincronizado para relatorio nulo', () => {
    const html = renderDrift(null);
    expect(html).toContain('sincronizados');
  });

  it('renderiza lista de drifts com ícones corretos', () => {
    const relatorio = {
      temDrift: true,
      drifts: [
        { tipo: 'modificado', kind: 'Deployment', nome: 'api', detalhes: 'replicas: 2 → 3' },
        { tipo: 'adicionado', kind: 'Service', nome: 'new-svc', detalhes: 'ClusterIP' },
        { tipo: 'removido', kind: 'Pod', nome: 'old-pod', detalhes: 'imagem: nginx' },
      ],
    };
    const html = renderDrift(relatorio);
    expect(html).toContain('3 recursos fora de sincronia');
    expect(html).toContain('⚠️');
    expect(html).toContain('➕');
    expect(html).toContain('➖');
    expect(html).toContain('Deployment/api');
    expect(html).toContain('Service/new-svc');
    expect(html).toContain('Pod/old-pod');
    expect(html).toContain('drift-corrigir');
  });

  it('usa singular quando há apenas um drift', () => {
    const relatorio = {
      temDrift: true,
      drifts: [{ tipo: 'modificado', kind: 'Pod', nome: 'p', detalhes: 'x' }],
    };
    const html = renderDrift(relatorio);
    expect(html).toContain('1 recurso fora de sincronia');
    expect(html).not.toContain('1 recursos');
  });
});