// Máquina de estados da ilha Exercicio: todas as transições, inclusive as ignoradas
// (plano, seção 7.2: 100% das transições). Vai para o pacote junto com a ilha.
import { describe, expect, it } from 'vitest';
import {
  ESTADO_INICIAL, ocupado, podeExecutar, reduzirExercicio, resumoDoEstado,
  type EstadoExercicio, type EventoExercicio,
} from '../../src/pacote/exercicio/maquina.ts';
import type { DesfechoExecucao, Diagnostico, Relatorio, ResultadoExecucao } from '../../src/pacote/motor/tipos.ts';

const DIAG: Diagnostico = { gravidade: 'erro', fase: 'compilacao', mensagem: 'yaml inválido' };
const execucao = (desfecho: DesfechoExecucao, extra: Partial<ResultadoExecucao> = {}): ResultadoExecucao => ({
  desfecho, stdout: '', stderr: '', codigoSaida: null, ms: 1, diagnosticos: [], detalhes: null, ...extra,
});
const APROVADO: Relatorio = { aprovado: true, casos: [{ oculto: false, ok: true, resultados: [], cenario: [], desfecho: 'ok', ms: 1 }] };
const REPROVADO: Relatorio = {
  aprovado: false,
  casos: [{ oculto: false, ok: true, resultados: [], cenario: [], desfecho: 'ok', ms: 1 }, { oculto: true, ok: false, resultados: [], cenario: [], desfecho: 'ok', ms: 1 }],
};

const E = {
  carregando: ESTADO_INICIAL,
  falhaCarga: { tipo: 'falhaCarga', erro: 'sem rede', recuperavel: true },
  ocioso: { tipo: 'ocioso' },
  executando: { tipo: 'executando', modo: 'executar', editadoDurante: false },
  executandoEnvio: { tipo: 'executando', modo: 'enviar', editadoDurante: false },
  executandoEditado: { tipo: 'executando', modo: 'executar', editadoDurante: true },
  corrigindo: { tipo: 'corrigindo', modo: 'executar', editadoDurante: false },
  corrigindoEditado: { tipo: 'corrigindo', modo: 'executar', editadoDurante: true },
  resultado: { tipo: 'resultado', modo: 'executar', relatorio: APROVADO, desatualizado: false },
  resultadoDesatualizado: { tipo: 'resultado', modo: 'executar', relatorio: APROVADO, desatualizado: true },
  erroCompilacao: { tipo: 'erroCompilacao', modo: 'executar', diagnosticos: [DIAG], stderr: 'error', desatualizado: false },
  tempoEsgotado: { tipo: 'tempoEsgotado', modo: 'executar', desatualizado: false },
  erroInterno: { tipo: 'erroInterno', mensagem: 'quebrou' },
} satisfies Record<string, EstadoExercicio>;

const EV = {
  pronto: { tipo: 'RUNTIME_PRONTO' },
  falhou: { tipo: 'RUNTIME_FALHOU', erro: 'sem rede', recuperavel: true },
  executar: { tipo: 'EXECUTAR', modo: 'executar' },
  enviar: { tipo: 'EXECUTAR', modo: 'enviar' },
  ok: { tipo: 'EXECUTOU', resultado: execucao('ok') },
  erroExecucao: { tipo: 'EXECUTOU', resultado: execucao('erro-execucao') },
  erroCompilacao: { tipo: 'EXECUTOU', resultado: execucao('erro-compilacao', { diagnosticos: [DIAG], stderr: 'error' }) },
  tempo: { tipo: 'EXECUTOU', resultado: execucao('tempo-esgotado') },
  cancelado: { tipo: 'EXECUTOU', resultado: execucao('cancelado') },
  falhaMotor: { tipo: 'EXECUTOU', resultado: execucao('falha-motor', { diagnosticos: [{ gravidade: 'erro', fase: 'execucao', mensagem: 'worker caiu' }] }) },
  falhaMotorSemDiag: { tipo: 'EXECUTOU', resultado: execucao('falha-motor', { stderr: 'parou' }) },
  corrigiu: { tipo: 'CORRIGIU', relatorio: APROVADO },
  correcaoFalhou: { tipo: 'CORRECAO_FALHOU', mensagem: 'Regra desconhecida' },
  editou: { tipo: 'EDITOU' },
  reiniciar: { tipo: 'REINICIAR' },
} satisfies Record<string, EventoExercicio>;

describe('reduzirExercicio: transições válidas', () => {
  it.each<[string, EstadoExercicio, EventoExercicio, EstadoExercicio]>([
    ['carregando → ocioso', E.carregando, EV.pronto, E.ocioso],
    ['carregando → falhaCarga', E.carregando, EV.falhou, E.falhaCarga],
    ['falhaCarga → ocioso (tentou de novo)', E.falhaCarga, EV.pronto, E.ocioso],
    ['ocioso → executando', E.ocioso, EV.executar, E.executando],
    ['ocioso → executando (enviar)', E.ocioso, EV.enviar, E.executandoEnvio],
    ['resultado → executando', E.resultado, EV.executar, E.executando],
    ['erroCompilacao → executando', E.erroCompilacao, EV.executar, E.executando],
    ['tempoEsgotado → executando', E.tempoEsgotado, EV.executar, E.executando],
    ['erroInterno → executando', E.erroInterno, EV.executar, E.executando],
    ['executando + ok → corrigindo', E.executando, EV.ok, E.corrigindo],
    ['executando + erro-execucao → corrigindo (as regras rodam)', E.executando, EV.erroExecucao, E.corrigindo],
    ['executando editado + ok → corrigindo editado', E.executandoEditado, EV.ok, E.corrigindoEditado],
    ['executando + erro-compilacao → erroCompilacao', E.executando, EV.erroCompilacao, E.erroCompilacao],
    ['executando + tempo → tempoEsgotado', E.executando, EV.tempo, E.tempoEsgotado],
    ['executando editado + tempo → tempoEsgotado desatualizado', E.executandoEditado, EV.tempo, { ...E.tempoEsgotado, desatualizado: true }],
    ['executando + cancelado → ocioso', E.executando, EV.cancelado, E.ocioso],
    ['executando + falha-motor → erroInterno', E.executando, EV.falhaMotor, { tipo: 'erroInterno', mensagem: 'worker caiu' }],
    ['falha-motor sem diagnóstico usa o stderr', E.executando, EV.falhaMotorSemDiag, { tipo: 'erroInterno', mensagem: 'parou' }],
    ['corrigindo → resultado', E.corrigindo, EV.corrigiu, E.resultado],
    ['corrigindo editado → resultado desatualizado', E.corrigindoEditado, EV.corrigiu, E.resultadoDesatualizado],
    ['executando (enviar) → resultado', E.executandoEnvio, EV.corrigiu, { tipo: 'resultado', modo: 'enviar', relatorio: APROVADO, desatualizado: false }],
    ['corrigindo + correção falhou → erroInterno', E.corrigindo, EV.correcaoFalhou, { tipo: 'erroInterno', mensagem: 'Regra desconhecida' }],
    ['executando + editou', E.executando, EV.editou, E.executandoEditado],
    ['corrigindo + editou', E.corrigindo, EV.editou, E.corrigindoEditado],
    ['resultado + editou', E.resultado, EV.editou, E.resultadoDesatualizado],
    ['erroCompilacao + editou', E.erroCompilacao, EV.editou, { ...E.erroCompilacao, desatualizado: true }],
    ['tempoEsgotado + editou', E.tempoEsgotado, EV.editou, { ...E.tempoEsgotado, desatualizado: true }],
    ['resultado + reiniciar', E.resultado, EV.reiniciar, E.ocioso],
    ['erroInterno + reiniciar', E.erroInterno, EV.reiniciar, E.ocioso],
  ])('%s', (_nome, antes, evento, depois) => {
    expect(reduzirExercicio(antes, evento)).toEqual(depois);
  });
});

describe('reduzirExercicio: eventos fora de hora são ignorados (mesmo objeto)', () => {
  it.each<[string, EstadoExercicio, EventoExercicio]>([
    ['pronto depois de pronto', E.ocioso, EV.pronto],
    ['falhou depois de pronto', E.ocioso, EV.falhou],
    ['executar enquanto carrega', E.carregando, EV.executar],
    ['executar com a carga falha', E.falhaCarga, EV.executar],
    ['executar enquanto executa', E.executando, EV.enviar],
    ['executar enquanto corrige', E.corrigindo, EV.executar],
    ['executou sem estar executando', E.ocioso, EV.ok],
    ['executou durante a correção', E.corrigindo, EV.ok],
    ['corrigiu sem estar rodando', E.resultado, EV.corrigiu],
    ['correção falhou sem estar rodando', E.ocioso, EV.correcaoFalhou],
    ['editou enquanto carrega', E.carregando, EV.editou],
    ['editou com a carga falha', E.falhaCarga, EV.editou],
    ['editou no ocioso', E.ocioso, EV.editou],
    ['editou no erro interno', E.erroInterno, EV.editou],
    ['editou de novo durante a execução', E.executandoEditado, EV.editou],
    ['editou de novo durante a correção', E.corrigindoEditado, EV.editou],
    ['editou de novo no resultado desatualizado', E.resultadoDesatualizado, EV.editou],
    ['reiniciar enquanto carrega', E.carregando, EV.reiniciar],
    ['reiniciar com a carga falha', E.falhaCarga, EV.reiniciar],
  ])('%s', (_nome, antes, evento) => {
    expect(reduzirExercicio(antes, evento)).toBe(antes);
  });
});

describe('podeExecutar e ocupado', () => {
  it.each<[EstadoExercicio, boolean, boolean]>([
    [E.carregando, false, false],
    [E.falhaCarga, false, false],
    [E.ocioso, true, false],
    [E.executando, false, true],
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
    [E.carregando, 'preparando…'],
    [E.falhaCarga, 'não carregou: sem rede'],
    [E.ocioso, '3 casos · aguardando'],
    [E.executando, 'executando…'],
    [E.executandoEnvio, 'rodando todos os casos…'],
    [E.corrigindo, 'conferindo os casos…'],
    [E.resultado, '✅ 1/1 casos visíveis'],
    [{ ...E.resultado, modo: 'enviar', relatorio: REPROVADO }, '❌ 1/2 casos (todos)'],
    [E.resultadoDesatualizado, 'código alterado · execute novamente'],
    [E.erroCompilacao, '❌ não compilou'],
    [{ ...E.erroCompilacao, desatualizado: true }, 'código alterado · execute novamente'],
    [E.tempoEsgotado, '❌ tempo esgotado'],
    [{ ...E.tempoEsgotado, desatualizado: true }, 'código alterado · execute novamente'],
    [E.erroInterno, 'erro: quebrou'],
  ])('%o → %s', (estado, texto) => {
    expect(resumoDoEstado(estado, 3)).toBe(texto);
  });
});
