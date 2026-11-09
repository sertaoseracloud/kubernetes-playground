// Primitivos do design system num Chromium de verdade: papel e nome acessível, teclado e axe.
import '@sertaoseracloud/playground-ui/tokens.css';
import '../../src/estilo.css';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Abas } from '../../src/react/Abas.tsx';
import { Botao } from '../../src/react/Botao.tsx';
import { Confirmacao } from '../../src/react/Dialogo.tsx';
import { semViolacoes } from './apoio.ts';

describe('Botao', () => {
  it('é um botão com nome, clica e não envia formulário', async () => {
    const clique = vi.fn();
    const tela = await render(<Botao variante="roxo" onClick={clique}>▶ Apply</Botao>);
    const botao = tela.getByRole('button', { name: '▶ Apply' });
    await expect.element(botao).toHaveAttribute('type', 'button');
    await expect.element(botao).toHaveClass('btn', 'btn-roxo');
    await botao.click();
    expect(clique).toHaveBeenCalledOnce();
    await semViolacoes(tela.container);
  });

  it('carregando: avisa (aria-busy) e não aceita outro clique', async () => {
    const clique = vi.fn();
    const tela = await render(<Botao carregando onClick={clique}>Enviar</Botao>);
    const botao = tela.getByRole('button', { name: 'Enviar' });
    await expect.element(botao).toBeDisabled();
    await expect.element(botao).toHaveAttribute('aria-busy', 'true');
  });

  it('Enter e Espaço clicam (botão nativo)', async () => {
    const clique = vi.fn();
    const tela = await render(<Botao onClick={clique}>Restaurar</Botao>);
    const botao = tela.getByRole('button', { name: 'Restaurar' }).element() as HTMLButtonElement;
    botao.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(clique).toHaveBeenCalledTimes(2);
  });
});

function AbasDeExemplo() {
  const [aba, setAba] = useState('um');
  return (
    <Abas selecionada={aba} aoSelecionar={setAba}>
      <Abas.Lista rotulo="Exemplo">
        <Abas.Aba id="um">Descrição</Abas.Aba>
        <Abas.Aba id="dois">Testes</Abas.Aba>
      </Abas.Lista>
      <Abas.Painel id="um"><p>Primeiro painel</p></Abas.Painel>
      <Abas.Painel id="dois"><p>Segundo painel</p></Abas.Painel>
    </Abas>
  );
}

describe('Abas', () => {
  it('tablist com tabs e o painel ligado à aba', async () => {
    const tela = await render(<AbasDeExemplo />);
    await expect.element(tela.getByRole('tablist', { name: 'Exemplo' })).toBeVisible();
    const primeira = tela.getByRole('tab', { name: 'Descrição' });
    await expect.element(primeira).toHaveAttribute('aria-selected', 'true');
    await expect.element(primeira).toHaveClass('aba', 'ativa');
    await expect.element(tela.getByRole('tabpanel')).toHaveTextContent('Primeiro painel');
    await semViolacoes(tela.container);
  });

  it('setas trocam de aba e levam o foco; o painel escondido continua no DOM', async () => {
    const tela = await render(<AbasDeExemplo />);
    await tela.getByRole('tab', { name: 'Descrição' }).click();
    await userEvent.keyboard('{ArrowRight}');
    const segunda = tela.getByRole('tab', { name: 'Testes' });
    await expect.element(segunda).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(segunda.element());
    await expect.element(tela.getByRole('tabpanel')).toHaveTextContent('Segundo painel');
    expect(tela.container.textContent).toContain('Primeiro painel');
    await userEvent.keyboard('{Home}');
    await expect.element(tela.getByRole('tab', { name: 'Descrição' })).toHaveAttribute('aria-selected', 'true');
  });
});

function ConfirmacaoDeExemplo({ aoConfirmar }: { readonly aoConfirmar: () => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Botao onClick={() => { setAberto(true); }}>Restaurar</Botao>
      <Confirmacao aberto={aberto} titulo="Voltar ao código original?" mensagem="Suas alterações serão perdidas." confirmar="Restaurar código"
        aoConfirmar={aoConfirmar} aoFechar={() => { setAberto(false); }} />
    </>
  );
}

describe('Confirmacao', () => {
  it('abre como alertdialog com título, foco em Cancelar e sem violações', async () => {
    const tela = await render(<ConfirmacaoDeExemplo aoConfirmar={vi.fn()} />);
    await tela.getByRole('button', { name: 'Restaurar' }).click();
    const dialogo = tela.getByRole('alertdialog', { name: 'Voltar ao código original?' });
    await expect.element(dialogo).toBeVisible();
    await expect.element(tela.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await semViolacoes(document.body);
  });

  it('Esc fecha sem confirmar e o foco volta para quem abriu', async () => {
    const confirmar = vi.fn();
    const tela = await render(<ConfirmacaoDeExemplo aoConfirmar={confirmar} />);
    const abrir = tela.getByRole('button', { name: 'Restaurar' });
    await abrir.click();
    await userEvent.keyboard('{Escape}');
    await expect.element(tela.getByRole('alertdialog')).not.toBeInTheDocument();
    expect(confirmar).not.toHaveBeenCalled();
    await expect.element(abrir).toHaveFocus();
  });

  it('confirmar chama a ação e fecha', async () => {
    const confirmar = vi.fn();
    const tela = await render(<ConfirmacaoDeExemplo aoConfirmar={confirmar} />);
    await tela.getByRole('button', { name: 'Restaurar' }).click();
    await tela.getByRole('button', { name: 'Restaurar código' }).click();
    expect(confirmar).toHaveBeenCalledOnce();
    await expect.element(tela.getByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('Tab fica preso dentro do diálogo', async () => {
    const tela = await render(<ConfirmacaoDeExemplo aoConfirmar={vi.fn()} />);
    await tela.getByRole('button', { name: 'Restaurar' }).click();
    await userEvent.keyboard('{Tab}');
    await userEvent.keyboard('{Tab}');
    const dialogo = tela.getByRole('alertdialog').element();
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });
});
