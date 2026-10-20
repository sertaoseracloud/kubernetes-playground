// Projeto: um pipeline de dados em lote (Jobs, Job indexado, CronJob, cotas e prioridade).
// Segue docs/didatica.md: lição de arquitetura e 5 etapas; cada etapa parte da anterior.
import { licao, exercicio, teste, campo, docs } from './util.js';

const info = (n) => `<p class="etapa-info">🧩 <b>Projeto Dados</b> · etapa ${n} de 5. Um pipeline noturno que importa, processa e consolida as vendas.</p>`;

const PVC = `
  apiVersion: v1
  kind: PersistentVolumeClaim
  metadata:
    name: dados
  spec:
    accessModes:
      - ReadWriteOnce
    resources:
      requests:
        storage: 10Gi
`;

/** O CronJob de consolidação; `cron` entra no spec do CronJob, `job` no spec do Job e `pod` no spec do Pod. */
const cronjob = ({ cron = '', job = '', pod = '' } = {}) => `
  apiVersion: batch/v1
  kind: CronJob
  metadata:
    name: consolidar
  spec:
    schedule: "0 3 * * *"
${cron}    jobTemplate:
      spec:
${job}        template:
          spec:
            restartPolicy: OnFailure
${pod}            containers:
              - name: consolidar
                image: busybox:1.36
                command: ["sh", "-c", "echo consolidando as vendas"]
`;

const CRON_POLITICA = `    concurrencyPolicy: Forbid
    successfulJobsHistoryLimit: 3
    failedJobsHistoryLimit: 5
`;

export const projetoDados = {
  id: 'proj-dados',
  titulo: 'Projeto Dados: um pipeline em lote',
  icone: '📦',
  itens: [
    licao('proj-dados-arquitetura', 'Arquitetura do pipeline de dados', 'medio', `
      <p>Toda noite a loja precisa importar as vendas do dia, processar em pedaços e consolidar os relatórios. É uma <b>linha de produção</b>:
      cada estação faz uma parte e passa adiante, e nenhuma pode travar a fábrica inteira.</p>
      <ol>
        <li><b>Importar</b>: um Job grava os arquivos num PVC.</li>
        <li><b>Processar</b>: um <b>Job indexado</b> divide o trabalho em 4 pedaços, 2 de cada vez. Cada Pod sabe o seu número pela variável
          <code>JOB_COMPLETION_INDEX</code>.</li>
        <li><b>Agendar</b>: um CronJob consolida tudo às 3h, sem execuções em dobro e guardando um histórico curto.</li>
        <li><b>Limitar</b>: ResourceQuota (o teto do namespace) e LimitRange (o padrão para quem esquecer requests e limits).</li>
        <li><b>Priorizar</b>: uma PriorityClass baixa, para o lote nunca tirar do lugar a loja, e prazos para um Job que travou.</li>
      </ol>
      <p><b>No cluster:</b> no fim, o pipeline roda sozinho toda noite, usa só o que a cota deixa e, se faltar espaço, é ele que espera, nunca a loja.</p>`,
    `
      # Um Job indexado: 4 pedaços, 2 rodando ao mesmo tempo
      apiVersion: batch/v1
      kind: Job
      metadata:
        name: processar
      spec:
        completionMode: Indexed     # cada Pod ganha um número de 0 a 3
        completions: 4              # quantos pedaços no total
        parallelism: 2              # quantos ao mesmo tempo
        template:
          spec:
            restartPolicy: Never
            containers:
              - name: processar
                image: busybox:1.36
                # o número do pedaço chega na variável JOB_COMPLETION_INDEX
                command: ["sh", "-c", "echo processando o pedaço $JOB_COMPLETION_INDEX"]
    `),

    exercicio({
      id: 'proj-dados-importar',
      titulo: 'Etapa 1: importar as vendas para o disco',
      dificuldade: 'facil',
      resumo: `
        ${info(1)}
        <p>O Job <code>importar</code> baixa os arquivos do dia e grava no PVC <code>dados</code>, que as próximas etapas vão ler.</p>
        <ol>
          <li>O PVC <code>dados</code> (10Gi) já vem no esqueleto.</li>
          <li>No Job, o volume <code>dados</code> é um <code>persistentVolumeClaim</code> com <code>claimName: dados</code>.</li>
          <li>Monte o volume em <code>/dados</code> no container <code>importar</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Pod do Job grava em <code>/dados</code>, termina com <code>Completed</code> e os arquivos continuam no PVC.</p>`,
      inicial: docs(PVC, `
        apiVersion: batch/v1
        kind: Job
        metadata:
          name: importar
        spec:
          template:
            spec:
              restartPolicy: Never
              containers:
                - name: importar
                  image: busybox:1.36
                  command: ["sh", "-c", "echo vendas > /dados/vendas.csv"]
                  volumeMounts:
                    - name: dados
                      mountPath:   # TODO: /dados
              volumes:
                - name: dados
                  # TODO: persistentVolumeClaim com claimName: dados
      `),
      dica: [
        'É o volume do exercício "Pod com volume persistente", agora dentro de um Job.',
        'persistentVolumeClaim:\n  claimName: dados\n...\nmountPath: /dados',
      ],
      solucao: docs(PVC, `
        apiVersion: batch/v1
        kind: Job
        metadata:
          name: importar
        spec:
          template:
            spec:
              restartPolicy: Never
              containers:
                - name: importar
                  image: busybox:1.36
                  command: ["sh", "-c", "echo vendas > /dados/vendas.csv"]
                  volumeMounts:
                    - name: dados
                      mountPath: /dados
              volumes:
                - name: dados
                  persistentVolumeClaim:
                    claimName: dados
      `),
      testes: [
        teste({ descricao: 'O Job usa o PVC dados', dica: 'No volume dados: persistentVolumeClaim com claimName: dados.' },
          campo('Job', 'importar', 'spec.template.spec.volumes[name=dados].persistentVolumeClaim.claimName', { valor: 'dados' })),
        teste({ descricao: 'Grava em /dados', dica: 'No volumeMounts do container importar: mountPath: /dados.' },
          campo('Job', 'importar', 'spec.template.spec.containers[name=importar].volumeMounts[name=dados].mountPath', { valor: '/dados' })),
      ],
    }),

    exercicio({
      id: 'proj-dados-indexado',
      titulo: 'Etapa 2: processar em quatro pedaços',
      dificuldade: 'medio',
      existentes: PVC,
      resumo: `
        ${info(2)}
        <p>Processar tudo num Pod só leva horas. Com um Job indexado, quatro Pods dividem o trabalho, dois de cada vez.</p>
        <ol>
          <li>No Job <code>processar</code>, <code>completionMode: Indexed</code>.</li>
          <li><code>completions: 4</code> e <code>parallelism: 2</code>.</li>
        </ol>
        <p><b>No cluster:</b> nascem os Pods com os números 0 e 1; quando um termina, nasce o próximo. O Job fica <code>Complete</code> quando os quatro
        pedaços terminam.</p>`,
      inicial: `
        apiVersion: batch/v1
        kind: Job
        metadata:
          name: processar
        spec:
          # TODO: completionMode Indexed, completions 4 e parallelism 2
          template:
            spec:
              restartPolicy: Never
              containers:
                - name: processar
                  image: busybox:1.36
                  command: ["sh", "-c", "echo processando o pedaço $JOB_COMPLETION_INDEX"]
      `,
      dica: [
        'O exemplo da lição "Arquitetura do pipeline de dados" é este Job.',
        'Os três campos ficam no spec do Job, alinhados com template.',
        'completionMode: Indexed\ncompletions: 4\nparallelism: 2',
      ],
      solucao: `
        apiVersion: batch/v1
        kind: Job
        metadata:
          name: processar
        spec:
          completionMode: Indexed
          completions: 4
          parallelism: 2
          template:
            spec:
              restartPolicy: Never
              containers:
                - name: processar
                  image: busybox:1.36
                  command: ["sh", "-c", "echo processando o pedaço $JOB_COMPLETION_INDEX"]
      `,
      testes: [
        teste({ descricao: 'O Job é indexado', dica: 'No spec do Job: completionMode: Indexed.' },
          campo('Job', 'processar', 'spec.completionMode', { valor: 'Indexed' })),
        teste({ descricao: 'Quatro pedaços, dois por vez', dica: 'No spec do Job: completions: 4 e parallelism: 2.' },
          campo('Job', 'processar', 'spec.completions', { valor: 4 }),
          campo('Job', 'processar', 'spec.parallelism', { valor: 2 })),
      ],
    }),

    exercicio({
      id: 'proj-dados-agendar',
      titulo: 'Etapa 3: consolidar todo dia às 3h',
      dificuldade: 'medio',
      existentes: PVC,
      resumo: `
        ${info(3)}
        <p>A consolidação roda às 3h. Se a de ontem ainda estiver rodando, a de hoje espera; e o histórico não pode encher o cluster de Jobs velhos.</p>
        <ol>
          <li>O CronJob <code>consolidar</code> já tem o <code>schedule: "0 3 * * *"</code>.</li>
          <li><code>concurrencyPolicy: Forbid</code>.</li>
          <li><code>successfulJobsHistoryLimit: 3</code> e <code>failedJobsHistoryLimit: 5</code>.</li>
        </ol>
        <p><b>No cluster:</b> às 3h nasce um Job. Ficam guardados só os 3 últimos que deram certo e os 5 últimos que falharam, para investigar.</p>`,
      inicial: cronjob({ cron: `    # TODO: concurrencyPolicy Forbid (passo 2)
    # TODO: os dois limites de histórico (passo 3)
` }),
      dica: [
        'São os campos do exercício de CronJob de Recursos Avançados, no spec do CronJob.',
        'concurrencyPolicy: Forbid\nsuccessfulJobsHistoryLimit: 3\nfailedJobsHistoryLimit: 5',
      ],
      solucao: cronjob({ cron: CRON_POLITICA }),
      testes: [
        teste({ descricao: 'Nunca roda duas vezes ao mesmo tempo', dica: 'No spec do CronJob: concurrencyPolicy: Forbid.' },
          campo('CronJob', 'consolidar', 'spec.concurrencyPolicy', { valor: 'Forbid' })),
        teste({ descricao: 'Guarda um histórico curto', dica: 'successfulJobsHistoryLimit: 3 e failedJobsHistoryLimit: 5.' },
          campo('CronJob', 'consolidar', 'spec.successfulJobsHistoryLimit', { valor: 3 }),
          campo('CronJob', 'consolidar', 'spec.failedJobsHistoryLimit', { valor: 5 })),
      ],
    }),

    exercicio({
      id: 'proj-dados-cotas',
      titulo: 'Etapa 4: o teto e o padrão do namespace',
      dificuldade: 'medio',
      resumo: `
        ${info(4)}
        <p>Um bug no processamento já criou 200 Pods de uma vez. O namespace do pipeline vai ter um teto, e um padrão para quem esquecer requests e limits.</p>
        <ol>
          <li>Na ResourceQuota <code>cota-dados</code>: <code>requests.cpu: "4"</code>, <code>requests.memory: 8Gi</code> e <code>count/jobs.batch: "10"</code>.</li>
          <li>No LimitRange <code>padrao</code>, um limite do tipo <code>Container</code> com <code>defaultRequest</code> de <code>250m</code> e <code>256Mi</code>.</li>
          <li>No mesmo item, <code>default</code> (o limit padrão) de <code>500m</code> e <code>512Mi</code>.</li>
        </ol>
        <p><b>No cluster:</b> um Job que passe da cota é recusado na criação; um container sem resources ganha os valores do LimitRange.</p>`,
      inicial: `
        apiVersion: v1
        kind: ResourceQuota
        metadata:
          name: cota-dados
        spec:
          hard:
            requests.cpu: "4"
            # TODO: requests.memory 8Gi e count/jobs.batch "10" (passo 1)
        ---
        apiVersion: v1
        kind: LimitRange
        metadata:
          name: padrao
        spec:
          limits:
            - type: Container
              # TODO: defaultRequest (passo 2) e default (passo 3)
      `,
      dica: [
        'A ResourceQuota é a dos Fundamentos; o LimitRange, o de Recursos Avançados.',
        'count/jobs.batch conta os Jobs do namespace; o valor é texto.',
        'requests.memory: 8Gi\ncount/jobs.batch: "10"\n...\ndefaultRequest:\n  cpu: 250m\n  memory: 256Mi\ndefault:\n  cpu: 500m\n  memory: 512Mi',
      ],
      solucao: `
        apiVersion: v1
        kind: ResourceQuota
        metadata:
          name: cota-dados
        spec:
          hard:
            requests.cpu: "4"
            requests.memory: 8Gi
            count/jobs.batch: "10"
        ---
        apiVersion: v1
        kind: LimitRange
        metadata:
          name: padrao
        spec:
          limits:
            - type: Container
              defaultRequest:
                cpu: 250m
                memory: 256Mi
              default:
                cpu: 500m
                memory: 512Mi
      `,
      testes: [
        teste({ descricao: 'A cota limita memória e número de Jobs', dica: 'Em spec.hard: requests.memory: 8Gi e count/jobs.batch: "10".' },
          campo('ResourceQuota', 'cota-dados', 'spec.hard["requests.memory"]', { valor: '8Gi' }),
          campo('ResourceQuota', 'cota-dados', 'spec.hard["count/jobs.batch"]', { valor: '10' })),
        teste({ descricao: 'Containers sem resources ganham o padrão', dica: 'No LimitRange: defaultRequest com cpu: 250m e memory: 256Mi.' },
          campo('LimitRange', 'padrao', 'spec.limits[0].defaultRequest.cpu', { valor: '250m' }),
          campo('LimitRange', 'padrao', 'spec.limits[0].defaultRequest.memory', { valor: '256Mi' })),
        teste({ descricao: 'E um limit padrão', dica: 'No LimitRange: default com cpu: 500m e memory: 512Mi.' },
          campo('LimitRange', 'padrao', 'spec.limits[0].default.cpu', { valor: '500m' }),
          campo('LimitRange', 'padrao', 'spec.limits[0].default.memory', { valor: '512Mi' })),
      ],
    }),

    exercicio({
      id: 'proj-dados-prioridade',
      titulo: 'Etapa 5: o lote cede lugar e não trava para sempre',
      dificuldade: 'dificil',
      existentes: PVC,
      resumo: `
        ${info(5)}
        <p>Se o cluster encher, quem espera é o lote, nunca a loja. E um Job travado não pode ficar rodando até de manhã.</p>
        <ol>
          <li>Crie a PriorityClass <code>lote-baixa</code> com <code>value: 1000</code> e <code>preemptionPolicy: Never</code> (ela nunca tira ninguém do lugar).</li>
          <li>No spec do Pod do CronJob <code>consolidar</code>, <code>priorityClassName: lote-baixa</code>.</li>
          <li>No spec do Job (em <code>jobTemplate.spec</code>), <code>backoffLimit: 2</code> e <code>activeDeadlineSeconds: 3600</code>.</li>
        </ol>
        <p><b>No cluster:</b> sem espaço, o Pod do lote fica <code>Pending</code> em vez de derrubar a loja; depois de 2 falhas, ou de 1 hora rodando, o Job
        desiste e fica <code>Failed</code> no histórico.</p>`,
      inicial: docs(`
        apiVersion: scheduling.k8s.io/v1
        kind: PriorityClass
        metadata:
          name: lote-baixa
        value:                 # TODO: 1000
        # TODO: preemptionPolicy: Never
        description: Pipelines em lote, que esperam a vez
      `, cronjob({
        cron: CRON_POLITICA,
        job: '        # TODO: backoffLimit 2 e activeDeadlineSeconds 3600 (passo 3)\n',
        pod: '            # TODO: priorityClassName: lote-baixa (passo 2)\n',
      })),
      dica: [
        'A PriorityClass é a dos Fundamentos (lição "Disponibilidade"); ela não tem spec.',
        'priorityClassName vai no spec do Pod; backoffLimit e activeDeadlineSeconds, no spec do Job, um nível acima de template.',
        'value: 1000\npreemptionPolicy: Never\n...\nbackoffLimit: 2\nactiveDeadlineSeconds: 3600\n...\npriorityClassName: lote-baixa',
      ],
      solucao: docs(`
        apiVersion: scheduling.k8s.io/v1
        kind: PriorityClass
        metadata:
          name: lote-baixa
        value: 1000
        preemptionPolicy: Never
        description: Pipelines em lote, que esperam a vez
      `, cronjob({
        cron: CRON_POLITICA,
        job: '        backoffLimit: 2\n        activeDeadlineSeconds: 3600\n',
        pod: '            priorityClassName: lote-baixa\n',
      })),
      testes: [
        teste({ descricao: 'A prioridade é baixa e não tira ninguém do lugar', dica: 'Na PriorityClass: value: 1000 e preemptionPolicy: Never.' },
          campo('PriorityClass', 'lote-baixa', 'value', { valor: 1000 }),
          campo('PriorityClass', 'lote-baixa', 'preemptionPolicy', { valor: 'Never' })),
        teste({ descricao: 'O lote usa a prioridade baixa', dica: 'No spec do Pod do CronJob: priorityClassName: lote-baixa.' },
          campo('CronJob', 'consolidar', 'spec.jobTemplate.spec.template.spec.priorityClassName', { valor: 'lote-baixa' })),
        teste({ descricao: 'Um Job travado desiste', dica: 'Em jobTemplate.spec: backoffLimit: 2 e activeDeadlineSeconds: 3600.' },
          campo('CronJob', 'consolidar', 'spec.jobTemplate.spec.backoffLimit', { valor: 2 }),
          campo('CronJob', 'consolidar', 'spec.jobTemplate.spec.activeDeadlineSeconds', { valor: 3600 })),
      ],
    }),
  ],
  ocultos: {
    'proj-dados-importar': { dica: 'O Job não reinicia o Pod sozinho, e o PVC é o de 10Gi.', regras: [campo('Job', 'importar', 'spec.template.spec.restartPolicy', { valor: 'Never' }), campo('PersistentVolumeClaim', 'dados', 'spec.resources.requests.storage', { valor: '10Gi' })] },
    'proj-dados-indexado': { dica: 'O container continua usando o número do pedaço.', regras: [campo('Job', 'processar', 'spec.template.spec.containers[name=processar].command', { contem: 'echo processando o pedaço $JOB_COMPLETION_INDEX' })] },
    'proj-dados-agendar': { dica: 'O horário continua o mesmo.', regras: [{ tipo: 'cronjob-schedule', cronjob: 'consolidar', schedule: '0 3 * * *' }] },
    'proj-dados-cotas': { dica: 'O limite padrão é para containers, e a cota de CPU continua lá.', regras: [campo('LimitRange', 'padrao', 'spec.limits[0].type', { valor: 'Container' }), campo('ResourceQuota', 'cota-dados', 'spec.hard["requests.cpu"]', { valor: '4' })] },
    'proj-dados-prioridade': { dica: 'O CronJob continua sem execuções em dobro.', regras: [campo('CronJob', 'consolidar', 'spec.concurrencyPolicy', { valor: 'Forbid' })] },
  },
};
