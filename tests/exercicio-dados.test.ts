// Props da ilha (nunca a solução) e o formato do rascunho (as mesmas chaves e o mesmo formato
// do localStorage de sempre: um arquivo só vira texto).
import { describe, expect, it } from 'vitest';
import { ESQUELETO, paraIlha, type ItemDoConteudo } from '../src/exercicio/dados.ts';
import type { TesteK8s } from '../src/exercicio/motor-k8s.ts';
import { descreverFalha } from '../src/exercicio/motor.ts';
import { arquivosDoRascunho, criarRepositorioEmMemoria, formaDeGuardar } from '../src/exercicio/repositorio.ts';
import { buscarItem, problemas } from '../src/conteudo/trilha.js';
import { ESQUELETO as ESQUELETO_DE_SEMPRE } from '../src/ui/item.js';

// O conteúdo ainda é JS sem tipos (vira TS com Zod na fase 4b).
type ExercicioDoConteudo = ItemDoConteudo & { readonly testes: readonly TesteK8s[] };
const exercicios = problemas as unknown as readonly ExercicioDoConteudo[];
const exercicio = (id: string) => buscarItem(id) as ExercicioDoConteudo;

describe('paraIlha', () => {
  it('nunca leva a solução nem campos que a ilha não usa', () => {
    for (const item of exercicios.slice(0, 40)) {
      const ilha = paraIlha(item);
      expect(JSON.stringify(ilha)).not.toContain('"solucao"');
      expect(Object.keys(ilha).sort()).toEqual(expect.arrayContaining(['id', 'inicial', 'testes', 'titulo']));
    }
  });

  it('leva os testes com as regras, a dica e o oculto', () => {
    const item = exercicio('pods-restart-policy');
    const ilha = paraIlha(item, { href: '/x/', titulo: 'Próximo' });
    expect(ilha.testes).toHaveLength(item.testes.length);
    expect(ilha.testes[0]?.regras).toEqual(item.testes[0]?.regras);
    expect(ilha.proximo).toEqual({ href: '/x/', titulo: 'Próximo' });
  });

  it('sem código inicial, começa no mesmo esqueleto da tela de sempre', () => {
    expect(ESQUELETO).toBe(ESQUELETO_DE_SEMPRE);
    expect(paraIlha({ id: 'x', titulo: 'X' }).inicial).toBe(ESQUELETO);
    expect(paraIlha({ id: 'x', titulo: 'X', existentes: 'kind: Pod' }).existentes).toBe('kind: Pod');
  });
});

describe('rascunho', () => {
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

  it('um arquivo só, com o nome padrão, é guardado como texto (formato antigo)', () => {
    expect(formaDeGuardar({ 'manifest.yaml': 'x' })).toBe('x');
    expect(formaDeGuardar({ 'outro.yaml': 'x' })).toEqual({ 'outro.yaml': 'x' });
  });

  it('o repositório nunca rebaixa um exercício resolvido', () => {
    const repo = criarRepositorioEmMemoria();
    repo.gravarRascunho('a', { 'manifest.yaml': 'x' });
    expect(repo.dados.get('rascunho:a')).toBe('x');
    expect(repo.lerRascunho('a')).toEqual({ 'manifest.yaml': 'x' });
    repo.marcar('a', 'resolvido');
    repo.marcar('a', 'tentado');
    expect(repo.statusDe('a')).toBe('resolvido');
    repo.apagarRascunho('a');
    expect(repo.lerRascunho('a')).toBeNull();
  });
});

describe('descreverFalha', () => {
  it.each([
    [{ tipo: 'compilacao', mensagem: 'campo faltando' } as const, 'campo faltando'],
    [{ tipo: 'interno', mensagem: 'quebrou' } as const, 'quebrou'],
    [{ tipo: 'tempo', limiteMs: 5000 } as const, 'O código passou de 5 s e foi interrompido.'],
    [{ tipo: 'cancelado' } as const, 'A execução foi cancelada.'],
  ])('%o', (erro, texto) => {
    expect(descreverFalha(erro)).toBe(texto);
  });
});
