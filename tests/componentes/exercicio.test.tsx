// A ilha Exercicio do pacote com o Motor falso: um caso por estado da máquina (plano, seção 7.3),
// o progresso gravado pelo repositório, o anúncio no aria-live e o painel do repositório (slot).
import '@sertaoseracloud/playground-ui/tokens.css';
import '../../src/estilo.css';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Exercicio, type ExercicioProps } from '../../src/pacote/exercicio/Exercicio.tsx';
import { criarRepositorioEmMemoria } from '../../src/pacote/exercicio/repositorio.ts';
import { IlhaExercicioK8s } from '../../src/exercicio-k8s/IlhaExercicioK8s.tsx';
import { paraIlha } from '../../src/exercicio-k8s/dados.ts';
import { criarMotorFalso, execucao, regrasFalsas, semViolacoes } from './apoio.ts';

const ITEM: ExercicioProps<unknown, unknown>['item'] = {
  id: 'pods-restart-policy',
  titulo: 'Pod que reinicia só em falha',
  principal: 'manifest.yaml',
  arquivos: { 'manifest.yaml': 'apiVersion: v1\nkind: Pod\n' },
  testes: [
    { descricao: 'o Pod existe', regras: [{ passa: true, msg: 'O Pod existe' }] },
    { descricao: 'reinicia só em falha', dica: 'Fica no spec do Pod.', regras: [{ passa: false, msg: 'restartPolicy é OnFailure' }] },
    { descricao: 'caso escondido', oculto: true, regras: [{ passa: true, msg: 'tem containers' }] },
  ],
  proximo: { href: '/kubernetes-playground/p/proximo/', titulo: 'Próximo exercício' },
};
const APROVADO = { ...ITEM, testes: ITEM.testes.map((t) => ({ ...t, regras: [{ passa: true, msg: 'ok' }] })) };

async function montar(item = ITEM) {
  const motor = criarMotorFalso();
  const repositorio = criarRepositorioEmMemoria();
  const tela = await render(
    <Exercicio item={item} motor={motor} regras={regrasFalsas()} repositorio={repositorio} rotuloExecutar="▶ Apply"
      enunciado={<p>Crie o Pod job-pod.</p>} paineis={[{ id: 'cluster', rotulo: '📦 Cluster', conteudo: () => <p>Pod/job-pod</p> }]} />,
  );
  return { motor, repositorio, tela };
}

describe('Exercicio (ilha do pacote)', () => {
  it('carregando: os botões esperam o motor ficar pronto', async () => {
    const motor = criarMotorFalso();
    const liberar = motor.segurarPreparo();
    const tela = await render(<Exercicio item={ITEM} motor={motor} regras={regrasFalsas()} repositorio={criarRepositorioEmMemoria()} />);
    await expect.element(tela.getByRole('button', { name: '▶ Executar' })).toBeDisabled();
    liberar();
    await expect.element(tela.getByRole('button', { name: '▶ Executar' })).toBeEnabled();
  });

  it('ocioso: título, enunciado, editor, painel do repositório e sem violações de acessibilidade', async () => {
    const { tela } = await montar();
    await expect.element(tela.getByRole('heading', { level: 1, name: ITEM.titulo })).toBeVisible();
    await expect.element(tela.getByText('Crie o Pod job-pod.')).toBeVisible();
    await expect.element(tela.getByRole('textbox', { name: 'Editor de manifest.yaml' })).toHaveTextContent('kind: Pod');
    await expect.element(tela.getByRole('tab', { name: '📦 Cluster' })).toBeVisible();
    await semViolacoes(tela.container);
  });

  it('▶: executa no contexto do aluno, escreve no terminal e corrige só os visíveis', async () => {
    const { tela, motor } = await montar();
    await tela.getByRole('button', { name: '▶ Apply' }).click();
    await expect.element(tela.getByRole('log')).toHaveTextContent('$ kubectl apply -f .');
    await expect.element(tela.getByRole('log')).toHaveTextContent('pod/job-pod created');
    await expect.element(tela.getByText(/1 de 2 casos já funcionam/)).toBeVisible();
    expect(motor.pedidos[0]).toMatchObject({ contexto: 'aluno', continuar: true, arquivos: ITEM.arquivos });
    expect(motor.pedidos.filter((p) => p.contexto === 'testes')).toHaveLength(2);
  });

  it('erro de compilação: mostra o diagnóstico com arquivo, linha e o campo destacado', async () => {
    const { tela, motor } = await montar();
    motor.respostaAluno = execucao({
      desfecho: 'erro-compilacao', stdout: '', stderr: 'error: yaml',
      diagnosticos: [{ gravidade: 'erro', fase: 'compilacao', mensagem: 'campo "spec" inválido', arquivo: 'manifest.yaml', linha: 3 }],
    });
    await tela.getByRole('button', { name: '▶ Apply' }).click();
    await expect.element(tela.getByText('O código não compilou. Corrija o erro abaixo e rode de novo.')).toBeVisible();
    await expect.element(tela.getByRole('note')).toHaveTextContent('manifest.yaml, linha 3: campo spec inválido');
    expect(motor.pedidos.some((p) => p.contexto === 'testes')).toBe(false);
    await semViolacoes(tela.container);
  });

  it('testes falhando no ⬆: diz quantos passaram, abre o caso com a dica e marca "tentado"', async () => {
    const { tela, repositorio } = await montar();
    await tela.getByRole('button', { name: '⬆ Enviar' }).click();
    await expect.element(tela.getByText('Resposta errada')).toBeVisible();
    await expect.element(tela.getByText(/2 de 3 casos já funcionam/)).toBeVisible();
    await expect.element(tela.getByText('🔧 Como corrigir: Fica no spec do Pod.')).toBeVisible();
    expect(repositorio.statusDe(ITEM.id)).toBe('tentado');
    await semViolacoes(tela.container);
  });

  it('aceito: marca resolvido, mostra o próximo e anuncia no aria-live', async () => {
    const { tela, repositorio, motor } = await montar(APROVADO);
    await tela.getByRole('button', { name: '⬆ Enviar' }).click();
    await expect.element(tela.getByText('Aceito 🎉 Você acertou a questão!')).toBeVisible();
    await expect.element(tela.getByRole('link', { name: /Próximo: Próximo exercício/ })).toHaveAttribute('href', ITEM.proximo?.href);
    await expect.element(tela.getByRole('status').last()).toHaveTextContent('Parabéns! Exercício resolvido.');
    expect(repositorio.statusDe(ITEM.id)).toBe('resolvido');
    expect(motor.pedidos.every((p) => p.contexto === 'testes')).toBe(true);
  });

  it('erro de compilação na correção: cada caso mostra o diagnóstico (nenhum relatório solto)', async () => {
    const { tela, motor } = await montar();
    motor.respostaTestes = execucao({ desfecho: 'erro-compilacao', stdout: '', diagnosticos: [{ gravidade: 'erro', fase: 'compilacao', mensagem: 'YAML quebrado' }] });
    await tela.getByRole('button', { name: '⬆ Enviar' }).click();
    await expect.element(tela.getByText(/0 de 3 casos já funcionam/)).toBeVisible();
    expect(tela.getByRole('note').all()).toHaveLength(3);
  });

  it('tempo esgotado e falha do motor viram mensagens, não exceções', async () => {
    const { tela, motor } = await montar();
    motor.respostaAluno = execucao({ desfecho: 'tempo-esgotado', stdout: '' });
    await tela.getByRole('button', { name: '▶ Apply' }).click();
    await expect.element(tela.getByText('Tempo esgotado: a execução foi interrompida.')).toBeVisible();
    motor.respostaAluno = execucao({ desfecho: 'falha-motor', stdout: '', diagnosticos: [{ gravidade: 'erro', fase: 'execucao', mensagem: 'worker caiu' }] });
    await tela.getByRole('button', { name: '▶ Apply' }).click();
    await expect.element(tela.getByText('worker caiu. Tente de novo.')).toBeVisible();
  });

  it('restaurar: pede confirmação e apaga o rascunho', async () => {
    const { tela, repositorio } = await montar();
    repositorio.gravarRascunho(ITEM.id, { 'manifest.yaml': 'meu código' });
    await tela.getByRole('button', { name: /Restaurar/ }).click();
    await tela.getByRole('alertdialog').getByRole('button', { name: 'Restaurar' }).click();
    expect(repositorio.lerRascunho(ITEM.id)).toBeNull();
    await expect.element(tela.getByRole('textbox', { name: 'Editor de manifest.yaml' })).toHaveTextContent('kind: Pod');
  });

  it('o rascunho salvo abre no editor', async () => {
    const repositorio = criarRepositorioEmMemoria();
    repositorio.gravarRascunho(ITEM.id, { 'manifest.yaml': 'kind: Deployment' });
    const tela = await render(<Exercicio item={ITEM} motor={criarMotorFalso()} regras={regrasFalsas()} repositorio={repositorio} />);
    await expect.element(tela.getByRole('textbox', { name: 'Editor de manifest.yaml' })).toHaveTextContent('kind: Deployment');
  });
});

describe('IlhaExercicioK8s (o motor do kubectl de verdade, no navegador)', () => {
  it('▶ Apply cria o Pod no cluster do aluno e o painel 📦 Cluster mostra', async () => {
    const exercicio = paraIlha({
      id: 'componente-k8s', titulo: 'Pod',
      inicial: 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: web\nspec:\n  containers:\n    - name: web\n      image: nginx:1.27\n',
      testes: [{ regras: [{ tipo: 'campo', kind: 'Pod', nome: 'web', caminho: 'metadata.name', valor: 'web' }] }],
    });
    const tela = await render(<IlhaExercicioK8s exercicio={exercicio} repositorio={criarRepositorioEmMemoria()} />);
    await tela.getByRole('button', { name: '▶ Apply' }).click();
    await expect.element(tela.getByRole('log')).toHaveTextContent('pod/web created');
    await expect.element(tela.getByText('Casos visíveis passaram')).toBeVisible();
    await tela.getByRole('tab', { name: '📦 Cluster' }).click();
    await expect.element(tela.getByRole('list', { name: 'Recursos no cluster' })).toHaveTextContent('Pod/web');
    await semViolacoes(tela.container);
  });
});
