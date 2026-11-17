// Suíte de contrato da porta Motor (plano, seção 7.4, I2; contrato-motor.md, seção 3): uma suíte
// só, que roda contra cada motor real. Vai para @sertaoseracloud/playground-ui/testes na fase 3.
// O que o motor não sabe fazer (Capacidades) é pulado, não fingido.
import { describe, expect, it, vi } from 'vitest';
import { corrigir } from '../../src/pacote/motor/corretor.ts';
import type { Arquivos, CasoDeTeste, LinhaTerminal, Motor, RegistroRegras, ResultadoExecucao } from '../../src/pacote/motor/tipos.ts';

export interface CasosDoContrato<Extra> {
  /** Roda e escreve algo que casa com `saidaEsperada`. */
  readonly valido: Arquivos;
  readonly saidaEsperada: RegExp;
  /** Não compila: vira 'erro-compilacao' com diagnóstico, nunca exceção. */
  readonly invalido: Arquivos;
  /** Correção pelo corretor único com as regras do motor. */
  readonly regras: RegistroRegras<never>;
  readonly testes: readonly CasoDeTeste[];
  readonly aprovado: Arquivos;
  readonly reprovado: Arquivos;
  readonly extra?: Extra;
  /** Só para motores com limite: um código que nunca termina. */
  readonly infinito?: Arquivos;
}

const DESFECHOS = ['ok', 'erro-compilacao', 'erro-execucao', 'tempo-esgotado', 'cancelado', 'falha-motor'];

function conferirForma(r: ResultadoExecucao) {
  expect(DESFECHOS).toContain(r.desfecho);
  expect(typeof r.stdout).toBe('string');
  expect(typeof r.stderr).toBe('string');
  expect(r.ms).toBeGreaterThanOrEqual(0);
  expect(() => structuredClone(r)).not.toThrow(); // serializável: vai para painéis e testes
}

function saidaFalsa() {
  const linhas: LinhaTerminal[] = [];
  return {
    linhas,
    saida: {
      escrever: (texto: string, estilo?: LinhaTerminal['estilo']) => { linhas.push({ texto, ...(estilo ? { estilo } : {}) }); },
      mostrar: (novas: readonly LinhaTerminal[]) => { linhas.push(...novas); return Promise.resolve(); },
      limpar: () => { linhas.length = 0; },
    },
  };
}

export function testarContratoDoMotor<Extra, Detalhes>(criarMotor: () => Motor<Extra, Detalhes>, casos: CasosDoContrato<Extra>): void {
  const exemplo = criarMotor();
  const { capacidades } = exemplo;
  const extra = casos.extra === undefined ? {} : { extra: casos.extra };
  const pronto = async () => { const m = criarMotor(); await m.preparar(); return m; };

  describe(`contrato do Motor: ${capacidades.rotulo}`, () => {
    it('capacidades coerentes', () => {
      expect(capacidades.rotulo.length).toBeGreaterThan(0);
      if (capacidades.entrada === 'nenhum') expect(capacidades.entradaInterativa).toBe(false);
    });

    it('preparar é idempotente e deixa a situação em "pronto"', async () => {
      const m = criarMotor();
      await Promise.all([m.preparar(), m.preparar()]);
      expect(m.situacao()).toEqual({ fase: 'pronto' });
    });

    it('executar: código válido termina "ok" e a saída aparece', async () => {
      const r = await (await pronto()).executar({ arquivos: casos.valido, ...extra });
      conferirForma(r);
      expect(r.desfecho).toBe('ok');
      expect(r.stdout).toMatch(casos.saidaEsperada);
      expect(r.diagnosticos.filter((d) => d.gravidade === 'erro')).toEqual([]);
    });

    it('executar: erro de compilação é desfecho com diagnóstico, nunca rejeição', async () => {
      const r = await (await pronto()).executar({ arquivos: casos.invalido, ...extra });
      conferirForma(r);
      expect(r.desfecho).toBe('erro-compilacao');
      expect(r.diagnosticos.some((d) => d.gravidade === 'erro' && d.mensagem.length > 0)).toBe(true);
    });

    it('executar: arquivos vazios também viram resultado', async () => {
      const r = await (await pronto()).executar({ arquivos: {} });
      conferirForma(r);
      expect(r.desfecho).not.toBe('ok');
    });

    it('cancelamento: sinal abortado antes ou durante a execução → "cancelado"', async () => {
      const m = await pronto();
      const antes = new AbortController();
      antes.abort();
      expect((await m.executar({ arquivos: casos.valido, sinal: antes.signal })).desfecho).toBe('cancelado');
      const durante = new AbortController();
      const promessa = m.executar({ arquivos: casos.valido, sinal: durante.signal });
      durante.abort();
      if (capacidades.cancelavel || capacidades.natureza === 'simulador') expect((await promessa).desfecho).toBe('cancelado');
      else conferirForma(await promessa);
    });

    it('contexto "testes" sem continuar começa sempre do estado inicial', async () => {
      const m = await pronto();
      await m.executar({ arquivos: casos.aprovado, contexto: 'aluno', continuar: true, ...extra });
      const a = await m.executar({ arquivos: casos.reprovado, contexto: 'testes', ...extra });
      const b = await m.executar({ arquivos: casos.reprovado, contexto: 'testes', ...extra });
      expect(b.stdout).toBe(a.stdout);
      expect(b.desfecho).toBe(a.desfecho);
    });

    it.skipIf(!capacidades.estadoPersistente)('estado: instantâneo muda com a execução, zerar volta ao início e avisa', async () => {
      const m = await pronto();
      const estado = m.estado;
      expect(estado).toBeDefined();
      if (!estado) return;
      await estado.abrir('contrato-estado');
      const vazio = JSON.stringify(estado.instantaneo('aluno'));
      const ouvinte = vi.fn();
      const desligar = estado.aoMudar(ouvinte);
      await m.executar({ arquivos: casos.valido, contexto: 'aluno', continuar: true, ...extra });
      expect(JSON.stringify(estado.instantaneo('aluno'))).not.toBe(vazio);
      await estado.zerar('aluno');
      expect(JSON.stringify(estado.instantaneo('aluno'))).toBe(vazio);
      expect(ouvinte).toHaveBeenCalled();
      desligar();
    });

    it('corretor único: o código certo passa, o errado reprova e diz o que falhou', async () => {
      const m = await pronto();
      const item = { testes: casos.testes };
      const certo = await corrigir(item, casos.aprovado, m, casos.regras as RegistroRegras<Detalhes>, { incluirOcultos: true });
      expect(certo.aprovado).toBe(true);
      expect(certo.casos).toHaveLength(casos.testes.length);
      const errado = await corrigir(item, casos.reprovado, m, casos.regras as RegistroRegras<Detalhes>, { incluirOcultos: true });
      expect(errado.aprovado).toBe(false);
      const falhas = errado.casos.flatMap((c) => c.resultados).filter((r) => !r.ok);
      expect(falhas.length).toBeGreaterThan(0);
      expect(falhas.every((f) => f.mensagem.length > 0)).toBe(true);
    });

    it('corretor único: código que não compila reprova todos os casos com o diagnóstico (nenhum relatório solto)', async () => {
      const m = await pronto();
      const r = await corrigir({ testes: casos.testes }, casos.invalido, m, casos.regras as RegistroRegras<Detalhes>, { incluirOcultos: true });
      expect(r.aprovado).toBe(false);
      expect(r.casos).toHaveLength(casos.testes.length);
      expect(r.casos.every((c) => !c.ok && c.erroExecucao?.gravidade === 'erro')).toBe(true);
    });

    it.skipIf(!exemplo.comandos)('comandos: o terminal roda linhas sem rejeitar e sabe o que o ▶ digita', async () => {
      const m = await pronto();
      const comandos = m.comandos;
      if (!comandos) return;
      expect(comandos.prompt({ pasta: 'x' }).length).toBeGreaterThan(0);
      expect(comandos.ajuda.length).toBeGreaterThan(0);
      const { saida, linhas } = saidaFalsa();
      const ctx = { arquivos: () => casos.valido, saida, perguntar: () => Promise.resolve(null), sinal: new AbortController().signal, sinalizar: vi.fn() };
      await expect(comandos.rodar('help', ctx)).resolves.toBeDefined();
      await expect(comandos.rodar('comando-que-nao-existe', ctx)).resolves.toBeDefined();
      expect(linhas.length).toBeGreaterThan(0);
    });

    it.skipIf(capacidades.limiteMsPadrao === null)('tempo esgotado: um laço infinito para no limite', async () => {
      const r = await (await pronto()).executar({ arquivos: casos.infinito ?? casos.valido, limiteMs: 500 });
      expect(r.desfecho).toBe('tempo-esgotado');
    });

    it('descartar libera o motor sem quebrar', () => {
      expect(() => { criarMotor().descartar(); }).not.toThrow();
    });
  });
}
