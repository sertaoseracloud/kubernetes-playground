// O corretor único e as regras comuns com um Motor falso: passos, contextos, reaproveitamento das
// execuções iguais, desfechos e a dica do caso.
import { describe, expect, it } from 'vitest';
import { corrigir, criarRegistroRegras } from '../../src/pacote/motor/corretor.ts';
import { REGRAS_COMUNS } from '../../src/pacote/motor/regras-comuns.ts';
import type { Motor, PedidoExecucao, ResultadoExecucao, VerificadorRegra } from '../../src/pacote/motor/tipos.ts';

function motorFalso(responder: (p: PedidoExecucao) => Partial<ResultadoExecucao>, deterministico = true) {
  const pedidos: PedidoExecucao[] = [];
  const motor: Motor = {
    capacidades: {
      id: 'go', rotulo: 'falso', natureza: 'compilado', compilacaoSeparada: false, entrada: 'lote', entradaInterativa: false,
      streaming: false, cancelavel: false, limiteMsPadrao: null, saida: 'texto', estadoPersistente: false, deterministico,
    },
    situacao: () => ({ fase: 'pronto' }),
    aoMudarSituacao: () => () => {},
    preparar: () => Promise.resolve(),
    executar(pedido) {
      pedidos.push(pedido);
      return Promise.resolve({ desfecho: 'ok', stdout: '', stderr: '', codigoSaida: 0, ms: 2, diagnosticos: [], detalhes: null, ...responder(pedido) });
    },
    cancelar: () => {},
    descartar: () => {},
  };
  return { motor, pedidos };
}

const saidaIgual: VerificadorRegra = {
  chave: 'saidaIgual',
  categoria: 'Saída',
  descrever: (r) => `A saída é ${String(r.saidaIgual)}`,
  verificar: (r, { execucao }) => ({ ok: execucao.stdout === r.saidaIgual, mensagem: 'A saída é a pedida', categoria: 'Saída', obtido: execucao.stdout }),
};
const regras = criarRegistroRegras().registrar(saidaIgual, ...REGRAS_COMUNS);

describe('corretor único', () => {
  it('filtra os ocultos no ▶ e roda todos no ⬆, com o contexto "testes"', async () => {
    const { motor, pedidos } = motorFalso(() => ({ stdout: 'oi' }), false);
    const testes = [{ regras: [{ saidaIgual: 'oi' }] }, { oculto: true, regras: [{ saidaIgual: 'oi' }] }];
    expect((await corrigir({ testes }, { 'a.go': 'x' }, motor, regras, { incluirOcultos: false })).casos).toHaveLength(1);
    const todos = await corrigir({ testes }, { 'a.go': 'x' }, motor, regras, { incluirOcultos: true });
    expect(todos.aprovado).toBe(true);
    expect(todos.casos[1]?.oculto).toBe(true);
    expect(pedidos.every((p) => p.contexto === 'testes' && p.continuar === false)).toBe(true);
  });

  it('passos: o segundo continua o estado do primeiro, com os arquivos e a entrada do passo', async () => {
    const { motor, pedidos } = motorFalso((p) => ({ stdout: String(p.entrada ?? '') }));
    const testes = [{ passos: [{ entrada: '1', regras: [{ saidaIgual: '1' }] }, { entrada: '2', arquivos: { 'b.go': 'y' }, regras: [{ saidaIgual: '2' }] }] }];
    const r = await corrigir({ testes, dados: { 'dados.txt': 'd' } }, { 'a.go': 'x' }, motor, regras, { incluirOcultos: true });
    expect(r.aprovado).toBe(true);
    expect(pedidos.map((p) => p.continuar)).toEqual([false, true]);
    expect(pedidos[1]?.arquivos).toEqual({ 'a.go': 'x', 'dados.txt': 'd', 'b.go': 'y' });
    expect(r.casos[0]?.ms).toBe(4);
  });

  it('motor determinístico: casos com o mesmo pedido executam uma vez só', async () => {
    const { motor, pedidos } = motorFalso(() => ({ stdout: 'oi' }));
    const testes = [{ regras: [{ saidaIgual: 'oi' }] }, { regras: [{ saidaIgual: 'tchau' }] }, { regras: [{ saidaIgual: 'oi' }] }];
    const r = await corrigir({ testes }, { 'a.go': 'x' }, motor, regras, { incluirOcultos: true });
    expect(pedidos).toHaveLength(1);
    expect(r.casos.map((c) => c.ok)).toEqual([true, false, true]);
  });

  it('item.inicial e caso.inicial vão em extra.inicial (o caso vale mais)', async () => {
    const { motor, pedidos } = motorFalso(() => ({}), false);
    await corrigir({ testes: [{ regras: [] }, { inicial: 'do-caso', regras: [] }], inicial: 'do-item' }, {}, motor, regras, { incluirOcultos: true });
    expect(pedidos.map((p) => (p.extra as { inicial?: string }).inicial)).toEqual(['do-item', 'do-caso']);
  });

  it.each(['erro-compilacao', 'tempo-esgotado', 'cancelado', 'falha-motor'] as const)('desfecho %s: as regras nem rodam e o caso falha', async (desfecho) => {
    const { motor } = motorFalso(() => ({ desfecho, diagnosticos: [{ gravidade: 'erro', fase: 'compilacao', mensagem: 'x' }] }));
    const r = await corrigir({ testes: [{ regras: [{ saidaIgual: '' }] }] }, {}, motor, regras, { incluirOcultos: true });
    expect(r.casos[0]).toMatchObject({ ok: false, desfecho, resultados: [], erroExecucao: { mensagem: 'x' } });
  });

  it('erro-execucao: as regras rodam (semErros reprova com o diagnóstico)', async () => {
    const { motor } = motorFalso(() => ({ desfecho: 'erro-execucao', stderr: 'panic: x', diagnosticos: [{ gravidade: 'erro', fase: 'execucao', mensagem: 'panic: x' }] }));
    const r = await corrigir({ testes: [{ regras: [{ semErros: true }] }] }, {}, motor, regras, { incluirOcultos: true });
    expect(r.casos[0]?.resultados[0]).toMatchObject({ ok: false, detalhe: 'panic: x' });
  });

  it('a dica do caso vai na primeira regra que falhou; sem casos, não aprova', async () => {
    const { motor } = motorFalso(() => ({ stdout: 'a' }));
    const r = await corrigir({ testes: [{ dica: 'olhe a saída', regras: [{ saidaIgual: 'a' }, { saidaIgual: 'b' }] }] }, {}, motor, regras, { incluirOcultos: true });
    expect(r.casos[0]?.resultados.map((x) => x.dica)).toEqual([undefined, 'olhe a saída']);
    expect((await corrigir({ testes: [] }, {}, motor, regras, { incluirOcultos: true })).aprovado).toBe(false);
  });

  it('regras comuns: codigo, semCodigo e semErros', async () => {
    const { motor } = motorFalso(() => ({}));
    const testes = [{ regras: [{ codigo: 'fmt.Println' }, { semCodigo: 'os.Exit' }, { semErros: true }, { codigo: 'nada', msg: 'Usa nada' }] }];
    const r = await corrigir({ testes }, { 'main.go': 'fmt.Println(1)' }, motor, regras, { incluirOcultos: true });
    expect(r.casos[0]?.resultados.map((x) => x.ok)).toEqual([true, true, true, false]);
    expect(r.casos[0]?.resultados[3]?.mensagem).toBe('Usa nada');
    expect(REGRAS_COMUNS.map((v) => v.descrever({ codigo: 'x', semCodigo: 'y' }))).toEqual(['Roda sem erros', 'O código usa x', 'O código não usa y']);
  });

  it('regra sem verificador: "Regra desconhecida"', () => {
    expect(() => regras.achar({ nada: 1 })).toThrow(/Regra desconhecida/);
  });
});
