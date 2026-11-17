// Paridade do corretor único com a correção de sempre (contrato-motor.md, risco R1): para cada
// exercício do conteúdo, a solução e o código inicial dão o mesmo resultado, caso a caso, no
// corretor novo (contrato Motor + regras `tipo:`) e na lógica do item.js (validarNoCluster).
import { describe, expect, it } from 'vitest';
import { corrigir } from '../../src/pacote/motor/corretor.ts';
import type { CasoDeTeste } from '../../src/pacote/motor/tipos.ts';
import { criarMotorK8s } from '../../src/k8s/motor-k8s.ts';
import { criarRegrasK8s } from '../../src/k8s/regras-k8s.ts';
import { aplicarYaml, avaliarIsolado, definirDiffUsado, verificarRegra, type RegraK8s } from '../../src/k8s/simulador.js';
import { problemas } from '../../src/conteudo/trilha.js';
import { ESQUELETO } from '../../src/exercicio-k8s/dados.ts';

interface Exercicio {
  readonly id: string;
  readonly solucao?: string;
  readonly inicial?: string;
  readonly existentes?: string;
  readonly testes: readonly (CasoDeTeste & { readonly regras?: readonly RegraK8s[] })[];
}

const exercicios = (problemas as unknown as readonly Exercicio[]).filter((p) => p.testes.length > 0);

/** O validarNoCluster do item.js: um apply num cluster isolado e as regras de todos os casos. */
function corrigirComoAntes(ex: Exercicio, yaml: string): boolean[] {
  definirDiffUsado(false);
  return avaliarIsolado(() => {
    const apply = aplicarYaml({ 'manifest.yaml': yaml });
    if (!apply.ok) return ex.testes.map(() => false);
    return ex.testes.map((t) => (t.regras ?? []).every((r) => verificarRegra(r as RegraK8s).ok));
  }, ex.existentes);
}

async function corrigirComoAgora(ex: Exercicio, yaml: string): Promise<boolean[]> {
  const relatorio = await corrigir(
    { testes: ex.testes, ...(ex.existentes === undefined ? {} : { inicial: ex.existentes }) },
    { 'manifest.yaml': yaml },
    criarMotorK8s({ armazenamento: { ler: () => null, gravar: () => {}, apagar: () => {} } }),
    criarRegrasK8s(),
    { incluirOcultos: true },
  );
  return relatorio.casos.map((c) => c.ok);
}

describe('paridade do corretor único com o de sempre (Kubernetes)', () => {
  it(`tem exercícios para comparar (${String(exercicios.length)})`, () => {
    expect(exercicios.length).toBeGreaterThan(100);
  });

  it('a solução de cada exercício dá o mesmo resultado, caso a caso', async () => {
    const divergentes: string[] = [];
    for (const ex of exercicios.filter((e) => e.solucao)) {
      const antes = corrigirComoAntes(ex, ex.solucao ?? '');
      const agora = await corrigirComoAgora(ex, ex.solucao ?? '');
      if (JSON.stringify(antes) !== JSON.stringify(agora)) divergentes.push(`${ex.id}: antes ${JSON.stringify(antes)}, agora ${JSON.stringify(agora)}`);
    }
    expect(divergentes).toEqual([]);
  });

  it('o código inicial de cada exercício dá o mesmo resultado, caso a caso', async () => {
    const divergentes: string[] = [];
    for (const ex of exercicios) {
      const yaml = ex.inicial ?? ESQUELETO;
      const antes = corrigirComoAntes(ex, yaml);
      const agora = await corrigirComoAgora(ex, yaml);
      if (JSON.stringify(antes) !== JSON.stringify(agora)) divergentes.push(`${ex.id}: antes ${JSON.stringify(antes)}, agora ${JSON.stringify(agora)}`);
    }
    expect(divergentes).toEqual([]);
  });
});
