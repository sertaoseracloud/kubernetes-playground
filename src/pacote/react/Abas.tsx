// Abas do design system (DS3), sobre o Tabs do React Aria Components: setas, Home/End, foco
// itinerante e ARIA (tablist, tab, tabpanel, aria-controls) por construção. API composta:
// <Abas> <Abas.Lista> <Abas.Aba/> </Abas.Lista> <Abas.Painel/> </Abas>.
// Mantém as classes do estilo.css (abas, aba, ativa) para ficar igual ao site.
import type { ReactNode } from 'react';
import { Tab, TabList, TabPanel, Tabs, type Key } from 'react-aria-components';

interface AbasProps {
  readonly selecionada?: string;
  readonly aoSelecionar?: (id: string) => void;
  readonly children: ReactNode;
}

function AbasRaiz({ selecionada, aoSelecionar, children }: AbasProps) {
  const controle = selecionada === undefined ? {} : { selectedKey: selecionada };
  return (
    <Tabs {...controle} onSelectionChange={(chave: Key) => aoSelecionar?.(String(chave))} className="abas-raiz">
      {children}
    </Tabs>
  );
}

function Lista({ rotulo, children }: { readonly rotulo: string; readonly children: ReactNode }) {
  return (
    <div className="abas">
      <TabList aria-label={rotulo} className="abas-grupo">{children}</TabList>
    </div>
  );
}

function Aba({ id, children, rotulo }: { readonly id: string; readonly children: ReactNode; readonly rotulo?: string }) {
  return (
    <Tab id={id} {...(rotulo === undefined ? {} : { 'aria-label': rotulo })} className={({ isSelected }) => (isSelected ? 'aba ativa' : 'aba')}>
      {children}
    </Tab>
  );
}

function Painel({ id, children, className }: { readonly id: string; readonly children: ReactNode; readonly className?: string }) {
  // shouldForceMount: o painel escondido continua no DOM (o editor e o terminal não perdem o estado).
  return <TabPanel id={id} shouldForceMount className={className ?? 'conteudo-desc'}>{children}</TabPanel>;
}

export const Abas = Object.assign(AbasRaiz, { Lista, Aba, Painel });
