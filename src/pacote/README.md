# src/pacote: o primeiro corte da ilha `Exercicio`

Tudo nesta pasta vai para o `@sertaoseracloud/playground-ui` na fase 3 do plano de migração (ADR 0003). Ela nasceu aqui, no spike da fase 1, para ser medida com um motor de verdade. Nada daqui importa do repositório: o ESLint barra (`no-restricted-imports` em `eslint.config.js`).

| Pasta | Vai para | O que é |
|---|---|---|
| `motor/tipos.ts` | `/dominio` | O contrato `Motor` (`estudo-componentizacao/analise-codigo/contrato-motor.md`, seção 3): capacidades, situação, `executar` que nunca rejeita, desfechos, diagnósticos, estado por contexto, comandos do terminal e os tipos da correção |
| `motor/corretor.ts` | `/dominio` | O corretor único: passos, contexto `'testes'`, reaproveitamento das execuções iguais nos motores determinísticos e o registro de regras |
| `motor/regras-comuns.ts` | `/dominio` | `semErros`, `codigo` e `semCodigo`. As outras comuns (`saidaIgual`, `contem`, `seletor`…) chegam com o Go e o PHP |
| `exercicio/` | `/react` | A ilha: máquina de estados, `useExercicio`, `useEditor` (CodeMirror, com a linguagem e o tema vindos do repositório), `PainelTestes`, terminal de saída e os slots de painéis |
| `react/` | `/react` | `Botao` (à mão), `Abas` e `Dialogo` (React Aria Components) |

A suíte de contrato fica em `tests/pacote/contrato-do-motor.ts` e vai para `/testes`.

## O que fica no repositório

- `src/k8s/motor-k8s.ts`: o adaptador do simulador de `kubectl` para o contrato, com um cluster por contexto, a gravação do cluster do aluno, os diagnósticos e os comandos do terminal.
- `src/k8s/regras-k8s.ts`: as regras `tipo:` no registro.
- `src/exercicio-k8s/`: a ilha do repositório (motor, regras, editor de YAML, painel 📦 Cluster) e os adaptadores do `localStorage`, com as mesmas chaves de sempre.

## O que falta para a fase 3c

- Terminal interativo (perguntas, histórico, Tab, Ctrl+C/D/L) sobre `InterpretadorComandos`. O adaptador do Kubernetes já implementa `comandos`, e a suíte de contrato cobre esse lado.
- Marcadores do editor a partir dos `Diagnostico` (linha e coluna).
- O provedor por contexto React (`ProvedorMotor`), no lugar das props `motor` e `regras`.
- Abas de arquivos no editor (hoje edita o arquivo principal e preserva os outros).
