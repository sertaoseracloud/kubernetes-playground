// Diálogo de confirmação do design system (DS3), sobre o Modal do React Aria Components:
// foco preso dentro, Esc fecha, o foco volta para quem abriu e o resto da página fica inerte.
// Substitui o window.confirm (que não segue o tema nem o tamanho de texto do aluno).
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { Botao } from './Botao.tsx';
import estilosDoModulo from './primitivos.module.css';

// As classes que o primitivos.module.css define (o tipo genérico dos CSS Modules aceita qualquer nome).
const estilos = estilosDoModulo as Readonly<Record<'fundo' | 'modal' | 'dialogo' | 'titulo' | 'acoes', string>>;

export interface ConfirmacaoProps {
  readonly aberto: boolean;
  readonly titulo: string;
  readonly mensagem: string;
  readonly confirmar: string;
  readonly aoConfirmar: () => void;
  readonly aoFechar: () => void;
}

export function Confirmacao({ aberto, titulo, mensagem, confirmar, aoConfirmar, aoFechar }: ConfirmacaoProps) {
  return (
    <ModalOverlay isOpen={aberto} onOpenChange={(abrir) => { if (!abrir) aoFechar(); }} isDismissable className={estilos.fundo}>
      <Modal className={estilos.modal}>
        <Dialog role="alertdialog" className={estilos.dialogo}>
          <Heading slot="title" className={estilos.titulo}>{titulo}</Heading>
          <p>{mensagem}</p>
          <div className={estilos.acoes}>
            <Botao onClick={aoFechar} autoFocus>Cancelar</Botao>
            <Botao variante="roxo" onClick={() => { aoConfirmar(); aoFechar(); }}>{confirmar}</Botao>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
