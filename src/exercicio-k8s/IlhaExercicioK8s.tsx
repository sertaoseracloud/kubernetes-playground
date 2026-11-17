// A ilha do exercício no DivergeKubernetes: a ilha Exercicio do pacote com o motor do kubectl, as
// regras `tipo:`, o editor de YAML e o painel do cluster (slot). É tudo o que fica no repositório.
import { useMemo, type ReactNode } from 'react';
import { yaml } from '@codemirror/lang-yaml';
import { Exercicio, type PainelDoRepositorio } from '../pacote/exercicio/Exercicio.tsx';
import type { Motor, RegistroRegras } from '../pacote/motor/tipos.ts';
import type { RepositorioDoExercicio } from '../pacote/exercicio/repositorio.ts';
import { criarMotorK8s, type DetalhesK8s, type ExtraK8s } from '../k8s/motor-k8s.ts';
import { criarRegrasK8s } from '../k8s/regras-k8s.ts';
import { temaEditor } from '../ui/tema-editor.js';
import { armazenamentoLocal, repositorioLocal } from './armazenamento-local.ts';
import type { ExercicioDaIlha } from './dados.ts';

export interface IlhaExercicioK8sProps {
  readonly exercicio: ExercicioDaIlha;
  /** Slot do Astro: o enunciado em HTML estático. */
  readonly enunciado?: ReactNode;
  /** Para os testes: motor e repositório falsos. Na página, os reais. */
  readonly motor?: Motor<ExtraK8s, DetalhesK8s>;
  readonly repositorio?: RepositorioDoExercicio;
}

/** Painel 📦 Cluster: os recursos que estão no cluster do aluno. */
function painelDoCluster(motor: Motor<ExtraK8s, DetalhesK8s>): PainelDoRepositorio {
  return {
    id: 'cluster',
    rotulo: '📦 Cluster',
    conteudo: () => {
      const cluster = motor.estado?.instantaneo('aluno') as DetalhesK8s['cluster'] | undefined;
      const recursos = Object.keys(cluster?.manifestos ?? {}).sort();
      return recursos.length
        ? <ul className="lista-recursos" aria-label="Recursos no cluster">{recursos.map((r) => <li key={r}><code>{r}</code></li>)}</ul>
        : <p className="veredito-sub">O cluster está vazio. Clique em ▶ Apply para criar os recursos do seu YAML.</p>;
    },
  };
}

export function IlhaExercicioK8s({ exercicio, enunciado, motor: motorDado, repositorio = repositorioLocal }: IlhaExercicioK8sProps) {
  const motor = useMemo(() => motorDado ?? criarMotorK8s({ armazenamento: armazenamentoLocal }), [motorDado]);
  const regras: RegistroRegras<DetalhesK8s> = useMemo(() => criarRegrasK8s(), []);
  const paineis = useMemo(() => [painelDoCluster(motor)], [motor]);
  const extensoes = useMemo(() => [yaml(), temaEditor], []);
  return (
    <Exercicio item={exercicio} motor={motor} regras={regras} repositorio={repositorio} enunciado={enunciado}
      paineis={paineis} extensoesDoEditor={extensoes} rotuloExecutar="▶ Apply" />
  );
}

export default IlhaExercicioK8s;
