// Botão do design system (DS3). Escrito à mão: um <button> nativo já tem o teclado e a
// semântica certos. Usa as classes do estilo.css (btn, btn-roxo...) para ficar igual ao site.
// Vai para @sertaoseracloud/playground-ui/react na fase 2.
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type VarianteDoBotao = 'roxo' | 'verde' | 'fantasma';

export interface BotaoProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  readonly variante?: VarianteDoBotao;
  readonly pequeno?: boolean;
  /** Mostra que está trabalhando: aria-busy e sem novo clique. */
  readonly carregando?: boolean;
  readonly children: ReactNode;
}

export function Botao({ variante = 'fantasma', pequeno = false, carregando = false, disabled, children, ...resto }: BotaoProps) {
  const classes = ['btn', `btn-${variante}`, pequeno ? 'btn-pequeno' : ''].filter(Boolean).join(' ');
  return (
    <button {...resto} type="button" className={classes} disabled={disabled === true || carregando} aria-busy={carregando || undefined}>
      {children}
    </button>
  );
}
