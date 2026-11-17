// O que fica no repositório: props da ilha (nunca a solução), o formato do rascunho no
// localStorage (o de sempre) e o gravador com atraso da ilha.
import { describe, expect, it, vi } from 'vitest';
import { ESQUELETO, paraIlha, type ItemDoConteudo } from '../src/exercicio-k8s/dados.ts';
import { arquivosDoRascunho, formaDeGuardar } from '../src/exercicio-k8s/armazenamento-local.ts';
import { criarGravadorRascunho, criarRepositorioEmMemoria } from '../src/pacote/exercicio/repositorio.ts';
import { buscarItem, problemas } from '../src/conteudo/trilha.js';
import { ESQUELETO as ESQUELETO_DE_SEMPRE } from '../src/ui/item.js';

const exercicios = problemas as unknown as readonly ItemDoConteudo[];

describe('paraIlha', () => {
  it('nunca leva a solução', () => {
    for (const item of exercicios) expect(JSON.stringify(paraIlha(item))).not.toContain('"solucao"');
  });

  it('leva os testes, os existentes (inicial) e o próximo', () => {
    const item = buscarItem('pods-restart-policy') as ItemDoConteudo;
    const ilha = paraIlha({ ...item, existentes: 'kind: Pod' }, { href: '/x/', titulo: 'Próximo' });
    expect(ilha.testes).toHaveLength(item.testes?.length ?? 0);
    expect(ilha.testes[0]?.regras).toEqual(item.testes?.[0]?.regras);
    expect(ilha.inicial).toBe('kind: Pod');
    expect(ilha.proximo).toEqual({ href: '/x/', titulo: 'Próximo' });
    expect(ilha.principal).toBe('manifest.yaml');
  });

  it('sem código inicial, começa no mesmo esqueleto da tela de sempre', () => {
    expect(ESQUELETO).toBe(ESQUELETO_DE_SEMPRE);
    expect(paraIlha({ id: 'x', titulo: 'X' }).arquivos).toEqual({ 'manifest.yaml': ESQUELETO });
  });
});

describe('rascunho no localStorage (formato de sempre)', () => {
  it.each<[unknown, unknown]>([
    ['apiVersion: v1', { 'manifest.yaml': 'apiVersion: v1' }],
    [{ 'a.yaml': 'a', 'b.yaml': 'b' }, { 'a.yaml': 'a', 'b.yaml': 'b' }],
    [null, null],
    [42, null],
    [{}, null],
    [{ 'a.yaml': 1 }, null],
  ])('arquivosDoRascunho(%o)', (salvo, esperado) => {
    expect(arquivosDoRascunho(salvo)).toEqual(esperado);
  });

  it('um arquivo só, com o nome padrão, é guardado como texto', () => {
    expect(formaDeGuardar({ 'manifest.yaml': 'x' })).toBe('x');
    expect(formaDeGuardar({ 'outro.yaml': 'x' })).toEqual({ 'outro.yaml': 'x' });
  });
});

describe('repositório e gravador da ilha', () => {
  it('nunca rebaixa um exercício resolvido', () => {
    const repo = criarRepositorioEmMemoria();
    repo.gravarRascunho('a', { 'manifest.yaml': 'x' });
    expect(repo.lerRascunho('a')).toEqual({ 'manifest.yaml': 'x' });
    repo.marcar('a', 'resolvido');
    repo.marcar('a', 'tentado');
    expect(repo.statusDe('a')).toBe('resolvido');
    repo.apagarRascunho('a');
    expect(repo.lerRascunho('a')).toBeNull();
  });

  it('grava com atraso, descarrega ao sair e cancela', () => {
    vi.useFakeTimers();
    const gravar = vi.fn();
    const g = criarGravadorRascunho(gravar, 300);
    g.agendar('a', { f: '1' });
    g.agendar('a', { f: '2' });
    vi.advanceTimersByTime(300);
    expect(gravar).toHaveBeenCalledExactlyOnceWith('a', { f: '2' });
    g.agendar('b', { f: '3' });
    g.descarregar();
    expect(gravar).toHaveBeenLastCalledWith('b', { f: '3' });
    g.agendar('c', { f: '4' });
    g.cancelar('c');
    vi.advanceTimersByTime(300);
    expect(gravar).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
