// A ilha da tela do exercício com o Motor falso: um caso por estado da máquina (plano, seção 7.3),
// o progresso gravado pelo repositório e o anúncio no aria-live.
import '@sertaoseracloud/playground-ui/tokens.css';
import '../../src/estilo.css';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { TelaExercicio } from '../../src/exercicio/TelaExercicio.tsx';
import type { ExercicioDaIlha } from '../../src/exercicio/dados.ts';
import { criarRepositorioEmMemoria } from '../../src/exercicio/repositorio.ts';
import { REPROVADO, criarMotorFalso, semViolacoes } from './apoio.ts';

const EXERCICIO: ExercicioDaIlha = {
  id: 'pods-restart-policy',
  titulo: 'Pod que reinicia só em falha',
  inicial: 'apiVersion: v1\nkind: Pod\n',
  testes: [
    { descricao: 'o Pod existe', regras: [{ tipo: 'campo', kind: 'Pod', nome: 'job-pod', caminho: 'metadata.name' }] },
    { descricao: 'reinicia só em falha', regras: [{ tipo: 'campo', kind: 'Pod', nome: 'job-pod', caminho: 'spec.restartPolicy', valor: 'OnFailure' }] },
    { descricao: 'caso escondido', oculto: true, regras: [{ tipo: 'campo', kind: 'Pod', nome: 'job-pod', caminho: 'spec.containers' }] },
  ],
  proximo: { href: '/kubernetes-playground/p/proximo/', titulo: 'Próximo exercício' },
};

async function montar() {
  const motor = criarMotorFalso();
  const repositorio = criarRepositorioEmMemoria();
  const tela = await render(
    <TelaExercicio exercicio={EXERCICIO} motor={motor} repositorio={repositorio} enunciado={<p>Crie o Pod job-pod.</p>} />,
  );
  return { motor, repositorio, tela };
}

describe('TelaExercicio', () => {
  it('carregando: os botões esperam o motor ficar pronto', async () => {
    const motor = criarMotorFalso();
    const liberar = motor.segurarPreparo();
    const tela = await render(<TelaExercicio exercicio={EXERCICIO} motor={motor} repositorio={criarRepositorioEmMemoria()} />);
    await expect.element(tela.getByRole('button', { name: '▶ Apply' })).toBeDisabled();
    liberar();
    await expect.element(tela.getByRole('button', { name: '▶ Apply' })).toBeEnabled();
  });

  it('ocioso: título, enunciado, editor com o código inicial e sem violações de acessibilidade', async () => {
    const { tela } = await montar();
    await expect.element(tela.getByRole('heading', { level: 1, name: EXERCICIO.titulo })).toBeVisible();
    await expect.element(tela.getByText('Crie o Pod job-pod.')).toBeVisible();
    await expect.element(tela.getByRole('textbox', { name: 'Editor de manifest.yaml' })).toHaveTextContent('kind: Pod');
    await semViolacoes(tela.container);
  });

  it('▶ Apply: escreve no terminal e roda só os casos visíveis', async () => {
    const { tela, motor } = await montar();
    await tela.getByRole('button', { name: '▶ Apply' }).click();
    await expect.element(tela.getByRole('log')).toHaveTextContent('pod/job-pod created');
    await expect.element(tela.getByText('Casos visíveis passaram')).toBeVisible();
    const correcao = motor.chamadas.find((c) => c.metodo === 'corrigir');
    expect(correcao?.testes).toHaveLength(2);
    expect(correcao?.arquivos).toEqual({ 'manifest.yaml': EXERCICIO.inicial });
  });

  it('erro de compilação: mostra o erro com o campo destacado, nunca testes pendentes sem explicação', async () => {
    const { tela, motor } = await montar();
    motor.proximaExecucao = { ok: false, erro: { tipo: 'compilacao', mensagem: 'Missing required argument "metadata.name"' }, saida: [{ texto: 'error: falta o nome', tipo: 'erro' }] };
    await tela.getByRole('button', { name: '▶ Apply' }).click();
    await expect.element(tela.getByText('O YAML não pôde ser aplicado. Corrija o erro abaixo e rode de novo.')).toBeVisible();
    await expect.element(tela.getByRole('note')).toHaveTextContent('Missing required argument metadata.name');
    await expect.element(tela.getByRole('log')).toHaveTextContent('error: falta o nome');
    await semViolacoes(tela.container);
  });

  it('testes falhando: diz quantos passaram e abre o caso com a dica', async () => {
    const { tela, motor, repositorio } = await montar();
    motor.proximaCorrecao = { ok: true, valor: REPROVADO };
    await tela.getByRole('button', { name: '⬆ Enviar' }).click();
    await expect.element(tela.getByText('Resposta errada')).toBeVisible();
    await expect.element(tela.getByText(/1 de 2 casos já funcionam/)).toBeVisible();
    await expect.element(tela.getByText('🔧 Como corrigir: Fica no spec do Pod.')).toBeVisible();
    expect(repositorio.statusDe(EXERCICIO.id)).toBe('tentado');
    await semViolacoes(tela.container);
  });

  it('aceito: marca resolvido, mostra o próximo e anuncia no aria-live', async () => {
    const { tela, repositorio, motor } = await montar();
    await tela.getByRole('button', { name: '⬆ Enviar' }).click();
    await expect.element(tela.getByText('Aceito 🎉 Você acertou a questão!')).toBeVisible();
    await expect.element(tela.getByRole('link', { name: /Próximo: Próximo exercício/ })).toHaveAttribute('href', EXERCICIO.proximo?.href);
    await expect.element(tela.getByRole('status').last()).toHaveTextContent('Parabéns! Exercício resolvido.');
    expect(repositorio.statusDe(EXERCICIO.id)).toBe('resolvido');
    expect(motor.chamadas.find((c) => c.metodo === 'corrigir')?.testes).toHaveLength(3);
    expect(motor.chamadas.some((c) => c.metodo === 'executar')).toBe(false);
  });

  it('tempo esgotado: vira uma mensagem, não uma exceção', async () => {
    const { tela, motor } = await montar();
    motor.proximaExecucao = { ok: false, erro: { tipo: 'tempo', limiteMs: 5000 }, saida: [] };
    await tela.getByRole('button', { name: '▶ Apply' }).click();
    await tela.getByRole('tab', { name: /Testes/ }).click();
    await expect.element(tela.getByText('Tempo esgotado: o código passou de 5 s.')).toBeVisible();
  });

  it('restaurar: pede confirmação e apaga o rascunho', async () => {
    const { tela, repositorio } = await montar();
    repositorio.gravarRascunho(EXERCICIO.id, { 'manifest.yaml': 'meu código' });
    await tela.getByRole('button', { name: /Restaurar/ }).click();
    await tela.getByRole('alertdialog').getByRole('button', { name: 'Restaurar' }).click();
    expect(repositorio.lerRascunho(EXERCICIO.id)).toBeNull();
    await expect.element(tela.getByRole('textbox', { name: 'Editor de manifest.yaml' })).toHaveTextContent('kind: Pod');
  });

  it('o rascunho salvo abre no editor (mesmo formato do localStorage de sempre)', async () => {
    const motor = criarMotorFalso();
    const repositorio = criarRepositorioEmMemoria();
    repositorio.gravarRascunho(EXERCICIO.id, { 'manifest.yaml': 'kind: Deployment' });
    const tela = await render(<TelaExercicio exercicio={EXERCICIO} motor={motor} repositorio={repositorio} />);
    await expect.element(tela.getByRole('textbox', { name: 'Editor de manifest.yaml' })).toHaveTextContent('kind: Deployment');
  });
});
