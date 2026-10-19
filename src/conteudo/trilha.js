// Trilha de Kubernetes: módulos, lições e exercícios.
// Importa cada módulo de conteúdo e os consolida em listas planas para a UI e gamificação.
import { fundamentos } from './fundamentos.js';
import { avancados } from './avancados.js';
import { aws } from './aws.js';
import { azure } from './azure.js';
import { projetoMicroservicos } from './projeto-microservicos.js';
import { projetoMulticloud } from './projeto-multicloud.js';
import { comparacao } from './comparacao.js';

// GitOps já faz parte de Recursos Avançados (avancados.js): listá-lo de novo aqui duplicava
// 19 itens e desalinhava os troféus dos certificados. A comparação com o Terraform é um
// módulo extra: não tem certificado próprio e não conta para o certificado final.
export const modulos = [fundamentos, avancados, aws, azure, projetoMicroservicos, projetoMulticloud, comparacao];

/** Projetos completos da trilha (os módulos projeto-*); os grupos dos outros módulos são tópicos. */
export const contarProjetos = (lista = modulos) => lista.filter((m) => m.id.startsWith('projeto-')).length;

/** Lista plana de todos os itens da trilha (lições + exercícios). */
// Cada item sabe de que módulo é (o aviso de módulo bloqueado e a descrição da página usam isso).
export const itens = modulos.flatMap((m) => (m.itens ?? []).map((item) => ({ ...item, modulo: m.id })));

/** Apenas os exercícios (itens com testes automáticos). */
export const problemas = itens.filter((i) => i.tipo === 'exercicio');

/** Playground livre (#/livre): escreva o YAML que quiser; o estado fica salvo no navegador. */
export const LIVRE = {
  id: 'livre',
  tipo: 'livre',
  titulo: 'Playground livre',
  resumo: `
    <p>Escreva o manifesto que quiser e clique em <b>▶ Apply</b>: o simulador cria os recursos e mostra a saída do
    <code>kubectl</code>. Separe vários recursos com <code>---</code>.</p>
    <p><b>Diff</b> mostra o que mudaria antes do apply, a aba <b>Estado</b> mostra o cluster e <b>Drift</b> compara o
    YAML com o que está rodando. Nada é criado de verdade: zero custo.</p>`,
  inicial: `apiVersion: v1
kind: Pod
metadata:
  name: nginx-demo
  labels:
    app: web
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80
`,
};

/** Mapeia ID → item para busca rápida (inclui o playground livre). */
export const porId = Object.fromEntries([...itens, LIVRE].map((i) => [i.id, i]));

/** Dificuldades usadas na gamificação e na UI. */
export const DIFICULDADES = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

/** Busca um item por ID. */
export function buscarItem(id) {
  return porId[id] ?? null;
}

/** Vizinhos (anterior e próximo) de um item na trilha plana. */
export function vizinhos(id) {
  const idx = itens.findIndex((i) => i.id === id);
  if (idx < 0) return {};
  return {
    anterior: idx > 0 ? itens[idx - 1] : null,
    proximo: idx < itens.length - 1 ? itens[idx + 1] : null,
  };
}