// Máquina de estados da tela do exercício: todas as transições, inclusive as ignoradas
// (plano, seção 7.2: 100% das transições).
import { describe, expect, it } from 'vitest';
import {
  ESTADO_INICIAL,
  ocupado,
  podeExecutar,
  reduzirExercicio,
  resumoDoEstado,
  type EstadoExercicio,
  type EventoExercicio,
} from '../src/exercicio/maquina.ts';
import type { Correcao, LinhaSaida } from '../src/exercicio/motor.ts';

const SAIDA: readonly LinhaSaida[] = [{ texto: 'pod/web created', tipo: 'sucesso' }];
const APROVADO: Correcao = { aprovado: true, casos: [{ ok: true, verificacoes: [{ ok: true, mensagem: 'ok' }] }] };
const REPROVADO: Correcao = { aprovado: false, casos: [{ ok: true, verificacoes: [] }, { ok: false, verificacoes: [{ ok: false, mensagem: 'falta' }] }] };

const E = {
  carregando: ESTADO_INICIAL,
  ocioso: { tipo: 'ocioso' },
  executandoApply: { tipo: 'executando', modo: 'apply', editadoDurante: false },
  executandoEnvio: { tipo: 'executando', modo: 'enviar', editadoDurante: false },
  executandoEditado: { tipo: 'executando', modo: 'apply', editadoDurante: true },
  corrigindo: { tipo: 'corrigindo', modo: 'apply', saida: SAIDA, editadoDurante: false },
  corrigindoEditado: { tipo: 'corrigindo', modo: 'apply', saida: SAIDA, editadoDurante: true },
  resultado: { tipo: 'resultado', modo: 'apply', correcao: APROVADO, saida: SAIDA, desatualizado: false },
  resultadoDesatualizado: { tipo: 'resultado', modo: 'apply', correcao: APROVADO, saida: SAIDA, desatualizado: true },
  erroCompilacao: { tipo: 'erroCompilacao', modo: 'apply', mensagem: 'yaml inválido', saida: [], desatualizado: false },
  tempoEsgotado: { tipo: 'tempoEsgotado', modo: 'apply', limiteMs: 5000, desatualizado: false },
  erroInterno: { tipo: 'erroInterno', mensagem: 'quebrou' },
} satisfies Record<string, EstadoExercicio>;

const EV = {
  pronto: { tipo: 'RUNTIME_PRONTO' },
  apply: { tipo: 'EXECUTAR', modo: 'apply' },
  enviar: { tipo: 'EXECUTAR', modo: 'enviar' },
  executou: { tipo: 'EXECUTOU', saida: SAIDA },
  corrigiu: { tipo: 'CORRIGIU', correcao: APROVADO },
  falhouCompilacao: { tipo: 'FALHOU', erro: { tipo: 'compilacao', mensagem: 'yaml inválido' }, saida: [] },
  falhouTempo: { tipo: 'FALHOU', erro: { tipo: 'tempo', limiteMs: 5000 }, saida: [] },
  cancelou: { tipo: 'FALHOU', erro: { tipo: 'cancelado' }, saida: [] },
  falhouInterno: { tipo: 'FALHOU', erro: { tipo: 'interno', mensagem: 'quebrou' }, saida: [] },
  editou: { tipo: 'EDITOU' },
  reiniciar: { tipo: 'REINICIAR' },
} satisfies Record<string, EventoExercicio>;

describe('reduzirExercicio: transições válidas', () => {
  it.each<[string, EstadoExercicio, EventoExercicio, EstadoExercicio]>([
    ['carregando → ocioso', E.carregando, EV.pronto, E.ocioso],
    ['ocioso → executando (apply)', E.ocioso, EV.apply, E.executandoApply],
    ['ocioso → executando (enviar)', E.ocioso, EV.enviar, E.executandoEnvio],
    ['resultado → executando', E.resultado, EV.apply, E.executandoApply],
    ['erroCompilacao → executando', E.erroCompilacao, EV.apply, E.executandoApply],
    ['tempoEsgotado → executando', E.tempoEsgotado, EV.apply, E.executandoApply],
    ['erroInterno → executando', E.erroInterno, EV.apply, E.executandoApply],
    ['executando → corrigindo', E.executandoApply, EV.executou, E.corrigindo],
    ['executando editado → corrigindo editado', E.executandoEditado, EV.executou, E.corrigindoEditado],
    ['corrigindo → resultado', E.corrigindo, EV.corrigiu, E.resultado],
    ['corrigindo editado → resultado desatualizado', E.corrigindoEditado, EV.corrigiu, E.resultadoDesatualizado],
    ['executando (enviar) → resultado sem saída', E.executandoEnvio, EV.corrigiu, { tipo: 'resultado', modo: 'enviar', correcao: APROVADO, saida: [], desatualizado: false }],
    ['executando → erroCompilacao', E.executandoApply, EV.falhouCompilacao, E.erroCompilacao],
    ['corrigindo → erroCompilacao', E.corrigindo, EV.falhouCompilacao, E.erroCompilacao],
    ['executando → tempoEsgotado', E.executandoApply, EV.falhouTempo, E.tempoEsgotado],
    ['executando editado → tempoEsgotado desatualizado', E.executandoEditado, EV.falhouTempo, { ...E.tempoEsgotado, desatualizado: true }],
    ['executando → ocioso (cancelado)', E.executandoApply, EV.cancelou, E.ocioso],
    ['corrigindo → erroInterno', E.corrigindo, EV.falhouInterno, E.erroInterno],
    ['executando + editou → editadoDurante', E.executandoApply, EV.editou, E.executandoEditado],
    ['corrigindo + editou → editadoDurante', E.corrigindo, EV.editou, E.corrigindoEditado],
    ['resultado + editou → desatualizado', E.resultado, EV.editou, E.resultadoDesatualizado],
    ['erroCompilacao + editou → desatualizado', E.erroCompilacao, EV.editou, { ...E.erroCompilacao, desatualizado: true }],
    ['tempoEsgotado + editou → desatualizado', E.tempoEsgotado, EV.editou, { ...E.tempoEsgotado, desatualizado: true }],
    ['resultado → reiniciar → ocioso', E.resultado, EV.reiniciar, E.ocioso],
    ['erroInterno → reiniciar → ocioso', E.erroInterno, EV.reiniciar, E.ocioso],
  ])('%s', (_nome, antes, evento, depois) => {
    expect(reduzirExercicio(antes, evento)).toEqual(depois);
  });
});

describe('reduzirExercicio: eventos fora de hora são ignorados (mesmo objeto)', () => {
  it.each<[string, EstadoExercicio, EventoExercicio]>([
    ['pronto depois de pronto', E.ocioso, EV.pronto],
    ['executar enquanto carrega', E.carregando, EV.apply],
    ['executar enquanto executa (um de cada vez)', E.executandoApply, EV.enviar],
    ['executar enquanto corrige', E.corrigindo, EV.apply],
    ['executou sem estar executando', E.ocioso, EV.executou],
    ['executou durante a correção', E.corrigindo, EV.executou],
    ['corrigiu sem estar rodando', E.resultado, EV.corrigiu],
    ['falhou sem estar rodando', E.ocioso, EV.falhouCompilacao],
    ['editou enquanto carrega', E.carregando, EV.editou],
    ['editou no ocioso', E.ocioso, EV.editou],
    ['editou no erro interno', E.erroInterno, EV.editou],
    ['editou de novo durante a execução', E.executandoEditado, EV.editou],
    ['editou de novo durante a correção', E.corrigindoEditado, EV.editou],
    ['editou de novo no resultado desatualizado', E.resultadoDesatualizado, EV.editou],
    ['reiniciar enquanto carrega', E.carregando, EV.reiniciar],
  ])('%s', (_nome, antes, evento) => {
    expect(reduzirExercicio(antes, evento)).toBe(antes);
  });
});

describe('podeExecutar e ocupado', () => {
  it.each<[EstadoExercicio, boolean, boolean]>([
    [E.carregando, false, false],
    [E.ocioso, true, false],
    [E.executandoApply, false, true],
    [E.corrigindo, false, true],
    [E.resultado, true, false],
    [E.erroCompilacao, true, false],
    [E.tempoEsgotado, true, false],
    [E.erroInterno, true, false],
  ])('%o', (estado, pode, estaOcupado) => {
    expect(podeExecutar(estado)).toBe(pode);
    expect(ocupado(estado)).toBe(estaOcupado);
  });
});

describe('resumoDoEstado', () => {
  it.each<[EstadoExercicio, string]>([
    [E.carregando, 'preparando o cluster simulado…'],
    [E.ocioso, '3 casos · aguardando'],
    [E.executandoApply, 'aplicando o YAML…'],
    [E.executandoEnvio, 'rodando todos os casos…'],
    [E.corrigindo, 'conferindo os casos…'],
    [E.resultado, '✅ 1/1 casos visíveis'],
    [{ ...E.resultado, modo: 'enviar', correcao: REPROVADO }, '❌ 1/2 casos (todos)'],
    [E.resultadoDesatualizado, 'código alterado · execute novamente'],
    [E.erroCompilacao, '❌ o YAML não pôde ser aplicado'],
    [{ ...E.erroCompilacao, desatualizado: true }, 'código alterado · execute novamente'],
    [E.tempoEsgotado, '❌ tempo esgotado (5 s)'],
    [E.erroInterno, 'erro: quebrou'],
  ])('%o → %s', (estado, texto) => {
    expect(resumoDoEstado(estado, 3)).toBe(texto);
  });
});
