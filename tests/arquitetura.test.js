import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do DOM mínimo para testar renderArquitetura sem navegador real
const mockElement = { innerHTML: '', style: {}, classList: { toggle: vi.fn(), add: vi.fn(), remove: vi.fn() }, setAttribute: vi.fn(), appendChild: vi.fn() };
vi.stubGlobal('document', {
  createElement: vi.fn(() => ({ ...mockElement, onload: null, onerror: null, src: '' })),
  head: { appendChild: vi.fn() },
  documentElement: { dataset: { theme: 'default' } },
});

describe('renderArquitetura', () => {
  beforeEach(() => {
    vi.resetModules();
    delete globalThis.window?.mermaid;
  });

  it('retorna fallback acessível quando Mermaid não carrega', async () => {
    // Simula falha no carregamento do script CDN
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tag) => {
      if (tag === 'script') {
        const el = { ...mockElement, onload: null, onerror: null, src: '', setAttribute: vi.fn() };
        // Dispara onerror no próximo tick para simular falha de rede
        setTimeout(() => el.onerror?.(), 0);
        return el;
      }
      return originalCreateElement(tag);
    });

    const { renderArquitetura } = await import('../src/ui/arquitetura.js');
    const html = await renderArquitetura();

    expect(html).toContain('arquitetura-fallback');
    expect(html).toContain('role="region"');
    expect(html).toContain('Editor YAML');
    expect(html).toContain('Validador');
    expect(html).toContain('aplicarYaml()');
    expect(html).toContain('buscarRecurso(kind, nome)');

    // Restaura
    document.createElement = originalCreateElement;
  });

  it('inclui todos os componentes da arquitetura no fallback textual', async () => {
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tag) => {
      if (tag === 'script') {
        const el = { ...mockElement, onload: null, onerror: null, src: '', setAttribute: vi.fn() };
        setTimeout(() => el.onerror?.(), 0);
        return el;
      }
      return originalCreateElement(tag);
    });

    const { renderArquitetura } = await import('../src/ui/arquitetura.js');
    const html = await renderArquitetura();

    // Verifica que todos os nós do diagrama estão presentes no fallback
    const componentesEsperados = [
      'Editor YAML',
      'Validador',
      'simularApply()',
      'aplicarYaml()',
      'Estado Global',
      'Painel Estado',
      'Drift Detection',
      'Cenário Visual',
      'Data Sources',
      'Outputs',
    ];

    for (const componente of componentesEsperados) {
      expect(html).toContain(componente);
    }

    document.createElement = originalCreateElement;
  });

  it('exporta reRenderizarArquitetura como função', async () => {
    const { reRenderizarArquitetura } = await import('../src/ui/arquitetura.js');
    expect(typeof reRenderizarArquitetura).toBe('function');
  });
});