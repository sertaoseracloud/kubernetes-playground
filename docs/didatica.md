# Padrão didático da trilha

Guia para quem escreve ou revisa lições e exercícios do DivergeKubernetes. O público é
**quem nunca usou Kubernetes**: se uma palavra, um campo do YAML ou um passo não foi
explicado antes, o aluno trava. Os atalhos para escrever o conteúdo estão em
`src/conteudo/util.js`, e o glossário em `src/conteudo/glossario.js`. Os testes do padrão
ficam em `tests/didatica.test.js`.

## As 10 regras

1. **Uma ideia nova por exercício.** Se o exercício precisa de Namespace *e* de ConfigMap,
   pelo menos um deles já foi praticado antes. O resto do YAML é repetição do que o aluno já sabe.
2. **Lição antes de todo conceito novo.** Nenhum exercício usa um `kind` ou um campo que
   nenhuma lição anterior apresentou. Se faltar, crie a lição antes (não remova exercícios).
3. **A lição tem analogia e exemplo comentado.** Uma comparação do dia a dia ("o Service é o
   telefone fixo da empresa") e um YAML comentado linha a linha no campo `codigo`. O exemplo
   aparece na lição e abre no editor, para o aluno clicar em ▶ Apply e ver o resultado.
4. **O enunciado é uma lista de passos numerados** (`<ol>`), cada passo com um único pedido
   e o valor exato (nome, imagem, porta). Contexto e "por quê" ficam num parágrafo curto
   antes da lista, nunca misturados com a tarefa.
5. **Esqueleto `inicial` com `# TODO`.** O editor nunca abre vazio: abre com a estrutura que
   o aluno já conhece e comentários `# TODO` onde entra a parte nova. O esqueleto não pode
   passar nos testes (há um teste que confere isso).
6. **Dicas progressivas.** `dica` é uma lista: a primeira só aponta o caminho, a do meio
   mostra o campo, a última quase dá a resposta. A tela mostra uma de cada vez.
7. **Glossário no primeiro uso.** Todo termo técnico do texto precisa estar em
   `glossario.js`, com definição simples, analogia e, se ajudar, um exemplo. A tela mostra
   os termos que aparecem no item, primeiro os que o aluno ainda não viu na trilha. Termo
   novo? Acrescente ao glossário no mesmo PR.
8. **O teste diz o que corrigir.** Cada caso de teste tem `dica`: uma frase no imperativo que
   diz onde mexer ("Coloque `namespace: dev-env` dentro de `metadata` do Pod"). Ela aparece
   como "🔧 Como corrigir" quando o caso falha e é lida pelo leitor de tela. Não revele
   detalhes de como a validação funciona.
9. **Do fácil para o difícil.** Dentro de cada tópico: lição → exercício fácil (um campo) →
   médio (dois recursos que se ligam) → difícil (juntar o que já foi visto).
10. **Explique o que acontece no cluster.** Termine o enunciado com "No cluster" ou "Por que
    isso importa": o que o Kubernetes faz com aquele YAML (o kubelet reinicia, o Service
    passa a mandar tráfego, o Pod sai dos endpoints...).

## Modelo de lição

```js
licao('basico-namespaces-licao', 'Namespaces: as pastas do cluster', 'facil', `
  <p>Analogia em uma frase. O que é, para que serve.</p>
  <ul><li>Um ponto por linha.</li></ul>
  <p><b>No cluster:</b> o que muda quando você aplica.</p>`,
  `
  # Comentário explicando a linha de baixo.
  apiVersion: v1
  kind: Namespace
  metadata:
    name: dev-env   # o nome da "pasta"
  `),
```

O quinto argumento (`codigo`) é opcional, mas toda lição que apresenta um `kind` novo deve ter.
O recuo comum é removido sozinho, então o YAML pode ficar indentado junto com o código.

## Modelo de exercício (pronto para copiar)

Copie, troque os valores e apague os comentários `//`. Este modelo segue os testes do padrão
(`tests/didatica.test.js`) e os testes do conteúdo (`tests/conteudo.test.js`).

```js
import { licao, exercicio, teste, existe, campo } from './util.js';

exercicio({
  id: 'eks-sa-s3-leitor',          // único, curto, com o prefixo do tópico. NUNCA mude depois de publicado.
  titulo: 'ServiceAccount que lê o S3',
  dificuldade: 'facil',            // facil (1 campo novo) | medio (2 recursos ligados) | dificil (junta o tópico)
  // existentes: `...`,            // o que o cluster já tem quando o exercício abre (o aluno consulta com kubectl get)
  resumo: `
    <p>Uma ou duas frases: o problema do dia a dia que este exercício resolve.</p>
    <ol>
      <li>Um pedido por passo, com o valor exato: crie a ServiceAccount <code>s3-leitor</code>.</li>
      <li>Em <code>metadata.annotations</code>, a chave <code>eks.amazonaws.com/role-arn</code>.</li>
      <li>O valor é <code>arn:aws:iam::123456789012:role/S3Leitor</code>.</li>
    </ol>
    <p><b>No cluster:</b> o que o Kubernetes (ou o provedor) faz com isso, em uma ou duas frases.</p>`,
  inicial: `
    apiVersion: v1
    kind: ServiceAccount
    metadata:
      name: s3-leitor
      annotations:
        # TODO: eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/S3Leitor
  `,                               // o que o aluno já sabe vem pronto; o conceito novo vem como # TODO
  dica: [
    'Leve: onde procurar (a lição, o exercício parecido).',
    'Média: em qual campo mexer e em que nível de indentação.',
    'Forte: o trecho de YAML quase pronto.',
  ],
  solucao: `
    apiVersion: v1
    kind: ServiceAccount
    metadata:
      name: s3-leitor
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/S3Leitor
  `,
  testes: [
    // cada caso: descricao (o que se confere) + dica (o que corrigir, no imperativo) + regras
    teste({ descricao: 'A ServiceAccount s3-leitor existe', dica: 'Mantenha kind: ServiceAccount e metadata.name: s3-leitor.' },
      existe('ServiceAccount', 's3-leitor')),
    teste({ descricao: 'A ServiceAccount assume a role S3Leitor', dica: 'Em metadata.annotations, escreva eks.amazonaws.com/role-arn com o ARN completo.' },
      campo('ServiceAccount', 's3-leitor', 'metadata.annotations["eks.amazonaws.com/role-arn"]', { contem: 'role/S3Leitor' })),
    // teste({ descricao: '...', dica: '...', oculto: true }, ...)  // casos ocultos rodam só no ⬆ Enviar
  ],
}),
```

Cuidados que costumam ser esquecidos:

- Todo exercício confere **pelo menos duas coisas** (o recurso existe + o campo que é a ideia nova).
- **Casos ocultos** rodam só no ⬆ Enviar e conferem o resto do que os passos pedem (um valor que veio no
  esqueleto, um campo que não pode estar lá, outro valor do enunciado), para o código não ficar "decorado"
  nos casos visíveis. Nos módulos novos, todo exercício tem pelo menos um: escreva-os na propriedade
  `ocultos` do tópico (`{ idDoExercicio: { dica, regras } }`), que `comOcultos` (de `util.js`) acrescenta.
  O texto do enunciado não diz o que eles conferem, e a `dica` só aponta onde reler.
- O `inicial` **não pode passar** nos testes: o caso do campo novo precisa falhar com o esqueleto.
  Atenção ao `# TODO` dentro de um bloco `|` do YAML: lá o comentário vira texto do valor.
- Prefira `campo(...)` a regras genéricas: quando falha, a mensagem diz em linguagem simples o que
  falta ("Em Role "leitor", rules → verbs ainda não tem watch. Inclua watch."), e o caminho técnico
  fica num "Detalhe técnico" recolhido.
- Valores de ConfigMap e de annotations são sempre texto: escreva `"true"`, `"60"`, `"1.2.0"`.
- Se o enunciado diz que algo "já existe no cluster", coloque esse recurso em `existentes`.

## Mapa de progressão (para a trilha de 260 exercícios)

A meta é **Fundamentos 50, Recursos Avançados 40, AWS/EKS 60, Azure/AKS 60 e Projetos 10 × 5**.
Cada bloco abaixo é um tópico (`grupo`) do módulo. "Lições antes" é o que precisa existir
**antes do primeiro exercício do bloco** (crie a lição se não houver). Os testes conferem que
nenhum exercício usa um `kind` que nenhuma lição anterior apresentou.

### 1. Fundamentos (50, completo)

| Bloco | Conceitos, nesta ordem | Lições antes |
|---|---|---|
| Básico | YAML, anatomia do manifesto, Pod, Namespace, labels e annotations, Service (primeiro olhar), env e ConfigMap, requests e limits, Diff e Drift | O que é Kubernetes, Arquitetura, Estado desejado, YAML em 5 minutos, Anatomia, Namespaces, Labels, Config, Recursos, Olhar antes de mexer |
| Pods | restartPolicy, campos obrigatórios, probes, volumes (emptyDir, hostPath, projected), sidecar e init, Downward API, ResourceQuota, afinidade, securityContext, preStop, depuração | Ciclo de vida, Probes, Volumes, Vários containers, Downward API, ResourceQuota, Afinidade, securityContext, Desligamento, Investigando um Pod |
| Services | ClusterIP, Pod existente, várias portas, NodePort, LoadBalancer, ExternalName, DNS, headless e SRV, EndpointSlices e topologia, Ingress | Services, DNS, EndpointSlices, Ingress, Valores que o cluster preenche |
| Deployments | Deployment, limits no template, ConfigMap como volume, rolling, Recreate e histórico, canary e blue-green, HPA, PDB, espalhamento e prioridade, DaemonSet | Deployments e ReplicaSets, Rolling update, Canary e blue-green, HPA, Disponibilidade, DaemonSet |

### 2. Recursos Avançados (35 → 40)

| Bloco | Conceitos | Lições antes | Para chegar a 40 |
|---|---|---|---|
| RBAC | ServiceAccount, Role e RoleBinding, ClusterRole, SA no Deployment | RBAC | +1: Role por namespace testada com `kubectl auth can-i` |
| Escala | HPA v2 com behavior, startupProbe, LimitRange e Quota | O trio da estabilidade | +1: VPA em modo recomendação |
| Stateful | StorageClass e PVC, DaemonSet com hostPath, StatefulSet | Workloads com estado | +1: snapshot de volume |
| Jobs | Job, Job indexado, CronJob | Jobs, CronJobs, Padrões | — |
| Rede | Ingress com TLS, negar tudo, frontend → backend com DNS | Firewall entre Pods | +1: Gateway e HTTPRoute (a lição já apresenta) |
| Secrets | Opaque, volume e envFrom | Secrets, ConfigMap vs Secret, Vault | +1: ExternalSecret |
| GitOps | ConfigMap no papel da CRD → Helm e Kustomize renderizados → CRDs reais | Princípios, Argo CD, Flux, Helm e Kustomize, Condicionais, CRDs | — |

### 3. AWS/EKS (6 → 60)

Ordem dos blocos e lições obrigatórias antes de cada um (as que já existem estão marcadas com ✓):

1. **EKS e identidade** (≈10): arquitetura, access entries vs `aws-auth`, IRSA, EKS Pod Identity.
   Lições: Arquitetura do EKS ✓, IRSA ✓, Pod Identity.
2. **Nós e escala** (≈10): managed node groups, labels e taints de nós, Karpenter (`NodePool`,
   `EC2NodeClass`), Cluster Autoscaler. Lições: Add-ons e node groups ✓, Karpenter.
3. **Rede** (≈12): VPC CNI e IPs de Pod, `SecurityGroupPolicy`, ALB Ingress (annotations,
   `IngressClassParams`, `TargetGroupBinding`), NLB por Service, NetworkPolicy no VPC CNI.
   Lições: VPC CNI ✓, ALB Ingress ✓, NLB.
4. **Storage** (≈10): EBS CSI e `gp3`, snapshots, EFS (ReadWriteMany), `volumeBindingMode` por zona.
   Lições: EBS CSI ✓, EFS ✓.
5. **Observabilidade e segurança** (≈10): CloudWatch e ADOT como DaemonSet, Pod Security Standards
   no namespace, Secrets Manager via CSI. Lições: Observabilidade no EKS, Segredos da AWS.
6. **Custo e operação** (≈8): Spot com Karpenter, PDB em upgrades, requests pensando em custo.
   Lição: Custo no EKS.

### 4. Azure/AKS (6 → 60)

Mesma forma do AWS, trocando as peças:

1. **AKS e identidade** (≈10): arquitetura, Entra ID e RBAC, Workload Identity.
   Lições: Arquitetura do AKS ✓, Entra ID e RBAC ✓, Workload Identity.
2. **Nós e escala** (≈10): node pools (system e user), spot, KEDA (`ScaledObject`), Karpenter no AKS
   (`AKSNodeClass`). Lições: Node pools e spot ✓, KEDA.
3. **Rede** (≈12): Azure CNI (overlay, Cilium), AGIC, App Routing (`NginxIngressController`),
   NetworkPolicy com Cilium. Lições: Azure CNI vs Kubenet ✓, AGIC ✓, App Routing.
4. **Storage** (≈10): Azure Disk (`managed-csi`), Azure Files (ReadWriteMany), snapshots.
   Lições: Azure Disk CSI ✓, Azure Files ✓.
5. **Observabilidade e segurança** (≈10): Container Insights e Managed Prometheus (`PodMonitor` em
   `azmonitoring.coreos.com`), Key Vault via `SecretProviderClass`. Lições: Observabilidade no AKS, Key Vault.
6. **Custo e operação** (≈8): spot, PDB em upgrades, requests pensando em custo. Lição: Custo no AKS.

### 5. Projetos (2 → 10 projetos de 5 etapas)

Cada projeto é um módulo `projeto-*` com **uma lição de arquitetura** (o desenho do que será
construído) e **5 etapas**. A etapa N abre com a solução da etapa N-1 no `inicial` (com `# TODO`
na parte nova) ou com o que já está no cluster em `existentes`. O enunciado começa com
`<p class="etapa-info">🧩 <b>Projeto X</b> · etapa N de 5.</p>`. Etapas típicas:

1. Workload (Deployment + Service) · 2. Configuração (ConfigMap + Secret) · 3. Entrada (Ingress) ·
4. Produção (HPA, PDB, probes) · 5. Ambientes ou nuvem (Kustomize, GitOps, EKS ou AKS).

Um projeto só usa conceitos de módulos anteriores; se precisar de algo novo, a lição de arquitetura
explica antes.

## Checklist antes do PR

- [ ] Os `id` dos exercícios existentes continuam os mesmos e nenhum exercício foi removido
      (a dificuldade e o XP também: o progresso salvo e os certificados dependem deles).
- [ ] Todo conceito novo tem lição antes; a lição tem analogia e `codigo` comentado.
- [ ] O enunciado tem `<ol>` com os passos e um parágrafo "No cluster".
- [ ] `inicial` com `# TODO`, `dica` com 2 ou 3 níveis e `dica` em cada caso de teste.
- [ ] Os termos novos estão em `glossario.js`.
- [ ] Módulo novo? Acrescente o id dele em `REVISADOS` e em `COM_OCULTOS`, no começo de `tests/didatica.test.js`.
- [ ] `npm run lint` e `npx vitest run --coverage` passam (os testes aplicam cada `solucao`
      no simulador e conferem os casos; também conferem que o `inicial` não passa).
- [ ] Se o número de lições mudou, atualize a carga horária em `src/certificados.js` e rode
      `npm run badges`.
