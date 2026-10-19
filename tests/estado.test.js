import { describe, it, expect } from 'vitest';
import { compararEstados } from '../src/k8s/simulador.js';
import { renderEstado, formatarJson } from '../src/ui/estado.js';

describe('compararEstados', () => {
  const estadoVazio = { pods: [], services: [], deployments: [] };

  it('retorna adicionados quando recurso existe apenas no atual', () => {
    const anterior = { ...estadoVazio, pods: [] };
    const atual = { ...estadoVazio, pods: [{ nome: 'nginx', imagem: 'nginx:1.25' }] };
    const diff = compararEstados(anterior, atual);
    expect(diff.adicionados).toHaveLength(1);
    expect(diff.adicionados[0].nome).toBe('nginx');
    expect(diff.adicionados[0].tipo).toBe('pods');
    expect(diff.removidos).toHaveLength(0);
    expect(diff.alterados).toHaveLength(0);
  });

  it('retorna removidos quando recurso existe apenas no anterior', () => {
    const anterior = { ...estadoVazio, pods: [{ nome: 'nginx', imagem: 'nginx:1.25' }] };
    const atual = { ...estadoVazio, pods: [] };
    const diff = compararEstados(anterior, atual);
    expect(diff.removidos).toHaveLength(1);
    expect(diff.removidos[0].nome).toBe('nginx');
    expect(diff.adicionados).toHaveLength(0);
  });

  it('retorna alterados quando recurso muda entre estados', () => {
    const anterior = { ...estadoVazio, pods: [{ nome: 'nginx', imagem: 'nginx:1.24' }] };
    const atual = { ...estadoVazio, pods: [{ nome: 'nginx', imagem: 'nginx:1.25' }] };
    const diff = compararEstados(anterior, atual);
    expect(diff.alterados).toHaveLength(1);
    expect(diff.alterados[0].nome).toBe('nginx');
    expect(diff.alterados[0].anterior.imagem).toBe('nginx:1.24');
    expect(diff.alterados[0].atual.imagem).toBe('nginx:1.25');
  });

  it('retorna tudo vazio quando estados são idênticos', () => {
    const estado = { ...estadoVazio, pods: [{ nome: 'nginx', imagem: 'nginx:1.25' }] };
    const diff = compararEstados(estado, structuredClone(estado));
    expect(diff.adicionados).toHaveLength(0);
    expect(diff.removidos).toHaveLength(0);
    expect(diff.alterados).toHaveLength(0);
  });

  it('lida com tipos ausentes sem erro', () => {
    const diff = compararEstados({}, { pods: [{ nome: 'a' }] });
    expect(diff.adicionados).toHaveLength(1);
  });
});

describe('formatarJson', () => {
  it('formata objeto com indentação', () => {
    const resultado = formatarJson({ a: 1 });
    expect(resultado).toContain('"a": 1');
    expect(resultado).toContain('\n');
  });

  it('retorna string para valores não serializáveis', () => {
    const circular = {};
    circular.self = circular;
    expect(formatarJson(circular)).toBe('[object Object]');
  });
});

describe('renderEstado', () => {
  it('renderiza mensagem de cluster vazio', () => {
    const html = renderEstado(null);
    expect(html).toContain('estado-vazio');
    expect(html).toContain('Cluster vazio');
  });

  it('renderiza badges de diff quando há mudanças', () => {
    const estado = { pods: [{ nome: 'nginx' }] };
    const diff = {
      adicionados: [{ tipo: 'pods', nome: 'nginx', recurso: {} }],
      removidos: [],
      alterados: [],
    };
    const html = renderEstado(estado, diff);
    expect(html).toContain('estado-adicionado');
    expect(html).toContain('+1');
    expect(html).toContain('nginx');
  });

  it('renderiza JSON do estado completo', () => {
    const estado = { pods: [{ nome: 'test' }] };
    const html = renderEstado(estado);
    expect(html).toContain('estado-codigo');
    expect(html).toContain('test');
  });

  it('escapa HTML no conteúdo do estado', () => {
    const estado = { pods: [{ nome: '<script>alert(1)</script>' }] };
    const html = renderEstado(estado);
    expect(html).not.toContain('<script>');
    // esc() pode usar entidades nomeadas (&lt;) ou numéricas (&#60;)
    expect(html).toMatch(/(&lt;|&#60;)script(&gt;|&#62;)/);
  });
});
describe('painel de Estado com recursos genéricos', () => {
  it('mostra o kind dos recursos genéricos e não repete os manifestos guardados', () => {
    const anterior = { pods: [], outros: [], manifestos: {} };
    const atual = { pods: [], outros: [{ kind: 'StatefulSet', nome: 'db', spec: {} }], manifestos: { 'StatefulSet/db': { kind: 'StatefulSet' } } };
    const html = renderEstado(atual, compararEstados(anterior, atual));
    expect(html).toContain('StatefulSet/db');
    expect(html).not.toContain('outros/db');
    expect(html).not.toContain('manifestos');
  });
});
