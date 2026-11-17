// Regras comuns aos cinco motores (contrato, seção 3.6), sobre os campos normalizados do
// ResultadoExecucao. As específicas ficam nos adaptadores. O primeiro corte traz as três que
// não dependem de saída de texto; saidaIgual, contem, seletor e as outras chegam com o Go e o PHP.
import type { RegraBase, ResultadoRegra, VerificadorRegra } from './tipos.ts';

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor : '');

export const semErros: VerificadorRegra = {
  chave: 'semErros',
  categoria: 'Execução',
  descrever: () => 'Roda sem erros',
  verificar(_regra, { execucao }): ResultadoRegra {
    const erro = execucao.diagnosticos.find((d) => d.gravidade === 'erro');
    const ok = !erro && execucao.stderr.trim() === '';
    return {
      ok,
      mensagem: 'Roda sem erros',
      categoria: 'Execução',
      ...(ok ? {} : { detalhe: erro?.mensagem ?? execucao.stderr.trim() }),
    };
  },
};

function regraDeCodigo(chave: 'codigo' | 'semCodigo'): VerificadorRegra {
  const quer = chave === 'codigo';
  const descrever = (regra: RegraBase) => texto(regra.msg) || `O código ${quer ? 'usa' : 'não usa'} ${texto(regra[chave])}`;
  return {
    chave,
    categoria: 'Código',
    descrever,
    verificar(regra, { codigo }): ResultadoRegra {
      const padrao = texto(regra[chave]);
      const tem = padrao !== '' && codigo.includes(padrao);
      return { ok: tem === quer, mensagem: descrever(regra), categoria: 'Código' };
    },
  };
}

export const codigo = regraDeCodigo('codigo');
export const semCodigo = regraDeCodigo('semCodigo');

export const REGRAS_COMUNS: readonly VerificadorRegra[] = [semErros, codigo, semCodigo];
