// Suíte de contrato da porta Motor (plano, seção 7.4, I2): uma suíte só, que roda contra cada
// motor real. Vai para @sertaoseracloud/playground-ui/testes na fase 3; cada playground passa o
// seu motor e os seus casos. O que o motor não sabe fazer (Capacidades) é pulado, não fingido.
import { describe, expect, it } from 'vitest';
import type { Arquivos, ContextoDoExercicio, Motor } from '../../src/exercicio/motor.ts';

export interface CasosDoContrato<Teste> {
  /** Dois exercícios diferentes, para conferir o isolamento entre eles. */
  readonly contexto: ContextoDoExercicio;
  readonly outroContexto: ContextoDoExercicio;
  /** Roda e escreve algo que casa com `saidaEsperada`. */
  readonly valido: Arquivos;
  readonly saidaEsperada: RegExp;
  /** Não compila (ou não é YAML válido): vira erro de compilação, não exceção. */
  readonly invalido: Arquivos;
  readonly testes: readonly Teste[];
  /** Passa em todos os testes. */
  readonly aprovado: Arquivos;
  /** Falha em pelo menos um teste. */
  readonly reprovado: Arquivos;
  /** Só para motores com tempoLimite: um código que nunca termina. */
  readonly infinito?: Arquivos;
}

export function testarContratoDoMotor<Teste>(criarMotor: () => Motor<Teste>, casos: CasosDoContrato<Teste>): void {
  const preparado = async (contexto = casos.contexto): Promise<Motor<Teste>> => {
    const motor = criarMotor();
    await motor.preparar(contexto);
    return motor;
  };

  describe(`contrato do Motor: ${criarMotor().nome}`, () => {
    it('executar: um código válido roda e a saída aparece', async () => {
      const r = await (await preparado()).executar(casos.valido);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.valor.saida.map((l) => l.texto).join('\n')).toMatch(casos.saidaEsperada);
    });

    it('executar: erro de compilação é um resultado, nunca uma exceção', async () => {
      const r = await (await preparado()).executar(casos.invalido);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.erro.tipo).toBe('compilacao');
      expect(r.erro.tipo === 'compilacao' && r.erro.mensagem.length).toBeGreaterThan(0);
    });

    it('executar: arquivos vazios também viram resultado', async () => {
      const r = await (await preparado()).executar({});
      expect(r.ok).toBe(false);
    });

    it('corrigir: o código certo passa em todos os casos, um resultado por teste', async () => {
      const r = await (await preparado()).corrigir(casos.aprovado, casos.testes);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.valor.aprovado).toBe(true);
      expect(r.valor.casos).toHaveLength(casos.testes.length);
      expect(r.valor.casos.every((c) => c.ok)).toBe(true);
    });

    it('corrigir: o código errado reprova e diz o que falhou', async () => {
      const r = await (await preparado()).corrigir(casos.reprovado, casos.testes);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.valor.aprovado).toBe(false);
      const falhas = r.valor.casos.flatMap((c) => c.verificacoes).filter((v) => !v.ok);
      expect(falhas.length).toBeGreaterThan(0);
      expect(falhas.every((v) => v.mensagem.length > 0)).toBe(true);
    });

    it('corrigir: erro de compilação é um resultado', async () => {
      const r = await (await preparado()).corrigir(casos.invalido, casos.testes);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erro.tipo).toBe('compilacao');
    });

    it('isolamento: corrigir não depende do que já foi executado', async () => {
      const motor = await preparado();
      const antes = await motor.corrigir(casos.reprovado, casos.testes);
      await motor.executar(casos.aprovado);
      const depois = await motor.corrigir(casos.reprovado, casos.testes);
      expect(depois).toEqual(antes);
    });

    it('isolamento: um exercício não vê o que o outro executou', async () => {
      const a = await preparado(casos.contexto);
      await a.executar(casos.aprovado);
      const b = await preparado(casos.outroContexto);
      const r = await b.corrigir(casos.reprovado, casos.testes);
      expect(r.ok && r.valor.aprovado).toBe(false);
    });

    it('cancelamento: com o sinal já abortado, nada roda e o resultado diz "cancelado"', async () => {
      const motor = await preparado();
      const controle = new AbortController();
      controle.abort();
      const r = await motor.executar(casos.valido, { sinal: controle.signal });
      const c = await motor.corrigir(casos.aprovado, casos.testes, { sinal: controle.signal });
      expect(!r.ok && r.erro.tipo).toBe('cancelado');
      expect(!c.ok && c.erro.tipo).toBe('cancelado');
    });

    it('cancelamento: abortar durante a execução também cancela', async () => {
      const motor = await preparado();
      const controle = new AbortController();
      const promessa = motor.executar(casos.valido, { sinal: controle.signal });
      controle.abort();
      const r = await promessa;
      expect(!r.ok && r.erro.tipo).toBe('cancelado');
    });

    it.skipIf(!criarMotor().capacidades.tempoLimite)('tempo esgotado: um laço infinito para no limite', async () => {
      const motor = await preparado();
      const r = await motor.executar(casos.infinito ?? casos.valido, { tempoLimiteMs: 500 });
      expect(!r.ok && r.erro.tipo).toBe('tempo');
    });
  });
}
