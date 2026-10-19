// Recursos Avançados: Jobs (tarefas que terminam) e CronJobs (tarefas agendadas).
// Segue docs/didatica.md: lição com exemplo comentado antes de cada recurso novo.
import { licao, exercicio, teste, existe, campo } from './util.js';

export const cronjobs = {
  id: 'cronjobs',
  titulo: 'CronJobs e Jobs',
  descricao: 'Tarefas únicas com Jobs e tarefas agendadas com CronJobs no Kubernetes.',
  icone: '⏰',
  itens: [
    licao('jobs-conceito', 'Jobs: tarefas que terminam', 'facil', `
      <p>Deployments rodam para sempre (um servidor web nunca "acaba"). Mas há tarefas que <b>terminam</b>: um backup, uma
      migração de banco, um relatório. Para elas existe o <b>Job</b>: ele cria Pods, espera terminarem com sucesso e para.
      É chamar o eletricista uma vez: ele faz o serviço e vai embora.</p>
      <p>Campos importantes (<code>apiVersion: batch/v1</code>):</p>
      <ul>
        <li><code>template</code>: o molde do Pod, como no Deployment. Aqui, <code>restartPolicy</code> é obrigatório e precisa ser
          <code>Never</code> ou <code>OnFailure</code> (o <code>Always</code> faria a tarefa nunca acabar).</li>
        <li><code>backoffLimit</code>: quantas falhas aceitar antes de desistir (padrão: 6).</li>
        <li><code>completions</code>: quantos Pods precisam terminar bem (padrão: 1). <code>parallelism</code>: quantos rodam ao mesmo tempo.</li>
        <li><code>completionMode: Indexed</code>: cada Pod recebe um número (0, 1, 2...) na variável <code>JOB_COMPLETION_INDEX</code>,
          para dividir o trabalho em lotes.</li>
        <li><code>activeDeadlineSeconds</code>: tempo máximo total; <code>ttlSecondsAfterFinished</code>: apaga o Job sozinho depois de terminar.</li>
      </ul>
      <p><b>No cluster:</b> <code>kubectl get jobs</code> mostra <code>COMPLETIONS 1/1</code> quando acaba; o Pod fica como
      <code>Completed</code> para você ler o resultado.</p>`,
    `
      apiVersion: batch/v1
      kind: Job
      metadata:
        name: eletricista
      spec:
        backoffLimit: 1            # falhou 2 vezes? desiste
        template:                  # o molde do Pod
          spec:
            restartPolicy: Never   # obrigatório num Job: Never ou OnFailure
            containers:
              - name: servico
                image: busybox:1.36
                command: ["sh", "-c", "echo trocando a tomada && sleep 2"]
    `),

    exercicio({
      id: 'cronjobs-job-backup',
      titulo: 'Job de backup único',
      dificuldade: 'facil',
      resumo: `
        <p>Rode um backup uma única vez, aceitando no máximo 2 falhas.</p>
        <ol>
          <li>Crie o Job <code>backup-db</code> (<code>apiVersion: batch/v1</code>).</li>
          <li>Em <code>spec</code>, <code>backoffLimit: 2</code>.</li>
          <li>No molde do Pod, <code>restartPolicy: Never</code> e o container <code>backup</code> com a imagem <code>busybox:1.36</code>.</li>
          <li>O comando: <code>["sh", "-c", "echo Backup iniciado &amp;&amp; sleep 5 &amp;&amp; echo Backup concluido"]</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Pod roda o comando, termina e fica <code>Completed</code>. Se falhasse, o Job criaria outro Pod,
        até 2 vezes.</p>`,
      inicial: `
        apiVersion: batch/v1
        kind:                  # TODO: Job
        metadata:
          name: backup-db
        spec:
          # TODO: backoffLimit: 2
          template:
            spec:
              restartPolicy:   # TODO: Never
              containers:
                - name: backup
                  image:       # TODO: busybox:1.36
                  command: ["sh", "-c", "echo Backup iniciado && sleep 5 && echo Backup concluido"]
      `,
      dica: [
        'Compare com o exemplo da lição "Jobs": a estrutura é a mesma.',
        'backoffLimit fica em spec (alinhado com template); restartPolicy fica em template.spec (alinhado com containers).',
      ],
      solucao: `apiVersion: batch/v1
kind: Job
metadata:
  name: backup-db
spec:
  backoffLimit: 2
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: backup
          image: busybox:1.36
          command: ["sh", "-c", "echo Backup iniciado && sleep 5 && echo Backup concluido"]`,
      testes: [
        teste({ descricao: 'O Job backup-db existe', dica: 'kind: Job e todos os TODO preenchidos (num Job, restartPolicy é obrigatório).' },
          { tipo: 'recurso-existe', kind: 'Job', nome: 'backup-db' }),
        teste({ descricao: 'O container usa a imagem busybox:1.36', dica: 'No container backup, escreva image: busybox:1.36.' },
          { tipo: 'container-imagem', pod: 'backup-db', container: 'backup', imagem: 'busybox:1.36' }),
        teste({ descricao: 'O Job desiste depois de 2 falhas', dica: 'Em spec, escreva backoffLimit: 2.' },
          campo('Job', 'backup-db', 'spec.backoffLimit', { valor: 2 })),
      ],
    }),

    exercicio({
      id: 'jobs-indexado',
      titulo: 'Job indexado em paralelo',
      dificuldade: 'medio',
      resumo: `
        <p>Processe 5 lotes de arquivos, 2 de cada vez, com cada Pod sabendo qual lote é o dele.</p>
        <ol>
          <li>No Job <code>processa-lotes</code>: <code>completions: 5</code> e <code>parallelism: 2</code>.</li>
          <li><code>completionMode: Indexed</code> (cada Pod recebe o número do lote em <code>JOB_COMPLETION_INDEX</code>).</li>
          <li><code>backoffLimit: 3</code> e <code>ttlSecondsAfterFinished: 600</code> (o Job some 10 minutos depois de terminar).</li>
        </ol>
        <p><b>No cluster:</b> sobem os Pods dos lotes 0 e 1; quando um termina, sobe o próximo, até o lote 4. Dez minutos
        depois do fim, o Job e os Pods são apagados sozinhos.</p>`,
      inicial: `
        apiVersion: batch/v1
        kind: Job
        metadata:
          name: processa-lotes
        spec:
          completions:         # TODO: 5 (quantos lotes)
          parallelism:         # TODO: 2 (quantos ao mesmo tempo)
          # TODO: completionMode: Indexed
          # TODO: backoffLimit: 3 e ttlSecondsAfterFinished: 600
          template:
            spec:
              restartPolicy: Never
              containers:
                - name: lote
                  image: busybox:1.36
                  command: ["sh", "-c", "echo processando o lote $JOB_COMPLETION_INDEX"]
      `,
      dica: [
        'Todos esses campos ficam direto em spec do Job, alinhados com template.',
        'completions: 5 / parallelism: 2 / completionMode: Indexed / backoffLimit: 3 / ttlSecondsAfterFinished: 600',
      ],
      solucao: `apiVersion: batch/v1
kind: Job
metadata:
  name: processa-lotes
spec:
  completions: 5
  parallelism: 2
  completionMode: Indexed
  backoffLimit: 3
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: lote
          image: busybox:1.36
          command: ["sh", "-c", "echo processando o lote $JOB_COMPLETION_INDEX"]`,
      testes: [
        teste({ descricao: 'O Job processa 5 lotes, 2 por vez', dica: 'Em spec: completions: 5 e parallelism: 2.' },
          existe('Job', 'processa-lotes'), campo('Job', 'processa-lotes', 'spec.completions', { valor: 5 }), campo('Job', 'processa-lotes', 'spec.parallelism', { valor: 2 })),
        teste({ descricao: 'Cada Pod recebe o número do lote', dica: 'Em spec: completionMode: Indexed (I maiúsculo).' },
          campo('Job', 'processa-lotes', 'spec.completionMode', { valor: 'Indexed' })),
        teste({ descricao: 'O Job é limpo 10 minutos depois de terminar', dica: 'Em spec: ttlSecondsAfterFinished: 600 e backoffLimit: 3.' },
          campo('Job', 'processa-lotes', 'spec.ttlSecondsAfterFinished', { valor: 600 }), campo('Job', 'processa-lotes', 'spec.backoffLimit', { valor: 3 })),
      ],
    }),

    licao('cronjobs-scheduling', 'CronJobs e a agenda cron', 'medio', `
      <p>Um <b>CronJob</b> cria um Job novo em cada horário marcado: a faxina toda segunda às 8h. O horário é escrito numa
      <b>expressão cron</b>, com cinco campos separados por espaço:</p>
      <p><code>minuto hora dia-do-mês mês dia-da-semana</code> (o <code>*</code> quer dizer "qualquer")</p>
      <ul>
        <li><code>"*/5 * * * *"</code>: a cada 5 minutos.</li>
        <li><code>"0 2 * * *"</code>: todo dia às 2h00.</li>
        <li><code>"0 8 * * 1"</code>: toda segunda (1) às 8h00.</li>
      </ul>
      <p>Use aspas na expressão: o <code>*</code> no começo confunde o YAML.</p>
      <p>A estrutura tem <b>três níveis</b>, e é aí que se erra: CronJob → <code>jobTemplate</code> (o molde do Job) →
      <code>template</code> (o molde do Pod). Campos de controle, em <code>spec</code> do CronJob:</p>
      <dl>
        <dt><code>concurrencyPolicy</code></dt><dd><b>Allow</b> (padrão): pode haver dois rodando juntos. <b>Forbid</b>: se o anterior
          ainda roda, pula este. <b>Replace</b>: para o anterior e começa o novo.</dd>
        <dt><code>successfulJobsHistoryLimit</code> e <code>failedJobsHistoryLimit</code></dt><dd>Quantos Jobs antigos guardar (padrão: 3 e 1).</dd>
        <dt><code>suspend: true</code></dt><dd>Pausa os próximos horários sem apagar o CronJob.</dd>
      </dl>`,
    `
      apiVersion: batch/v1
      kind: CronJob
      metadata:
        name: faxina
      spec:
        schedule: "0 8 * * 1"      # toda segunda às 8h (com aspas!)
        concurrencyPolicy: Forbid  # não começa outra se a anterior não acabou
        jobTemplate:               # nível 2: o molde do Job
          spec:
            template:              # nível 3: o molde do Pod
              spec:
                restartPolicy: OnFailure
                containers:
                  - name: faxina
                    image: busybox:1.36
                    command: ["sh", "-c", "echo limpando"]
    `),

    exercicio({
      id: 'cronjobs-cronjob-agendado',
      titulo: 'CronJob agendado',
      dificuldade: 'medio',
      resumo: `
        <p>Limpe os logs a cada 5 minutos, sem deixar duas limpezas rodarem ao mesmo tempo.</p>
        <ol>
          <li>Crie o CronJob <code>limpeza-logs</code> com <code>schedule: "*/5 * * * *"</code> (com aspas).</li>
          <li>Em <code>spec</code>, <code>concurrencyPolicy: Forbid</code>.</li>
          <li>Em <code>jobTemplate.spec.template.spec</code>: <code>restartPolicy: OnFailure</code> e o container <code>limpeza</code>
            com a imagem <code>busybox:1.36</code> e o comando <code>["sh", "-c", "echo Limpando logs..."]</code>.</li>
        </ol>
        <p><b>No cluster:</b> a cada 5 minutos nasce um Job <code>limpeza-logs-&lt;número&gt;</code>. Se o anterior ainda estiver
        rodando, aquele horário é pulado.</p>`,
      inicial: `
        apiVersion: batch/v1
        kind: CronJob
        metadata:
          name: limpeza-logs
        spec:
          schedule:            # TODO: "*/5 * * * *" (com aspas)
          # TODO: concurrencyPolicy: Forbid
          jobTemplate:
            spec:
              template:
                spec:
                  restartPolicy: OnFailure
                  containers:
                    - name: limpeza
                      image:   # TODO: busybox:1.36
                      command: ["sh", "-c", "echo Limpando logs..."]
      `,
      dica: [
        'schedule e concurrencyPolicy ficam no spec do CronJob, alinhados com jobTemplate.',
        'schedule: "*/5 * * * *"  (sem aspas, o * no começo vira um erro de YAML).',
      ],
      solucao: `apiVersion: batch/v1
kind: CronJob
metadata:
  name: limpeza-logs
spec:
  schedule: "*/5 * * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: limpeza
              image: busybox:1.36
              command: ["sh", "-c", "echo Limpando logs..."]`,
      testes: [
        teste({ descricao: 'O CronJob limpeza-logs existe', dica: 'Preencha os TODO: um campo vazio impede o apply.' },
          { tipo: 'recurso-existe', kind: 'CronJob', nome: 'limpeza-logs' }),
        teste({ descricao: 'O schedule está configurado como */5 * * * *', dica: 'Em spec: schedule: "*/5 * * * *", com aspas.' },
          { tipo: 'cronjob-schedule', nome: 'limpeza-logs', schedule: '*/5 * * * *' }),
        teste({ descricao: 'Duas limpezas nunca rodam juntas', dica: 'Em spec: concurrencyPolicy: Forbid.' },
          campo('CronJob', 'limpeza-logs', 'spec.concurrencyPolicy', { valor: 'Forbid' })),
      ],
    }),

    licao('cronjobs-padroes', 'Padrões de uso de Jobs', 'medio', `
      <p>Jobs e CronJobs aparecem em vários padrões do dia a dia:</p>
      <ul>
        <li><b>Migração de banco</b>: um Job roda os scripts antes de a versão nova do Deployment subir.</li>
        <li><b>Backups agendados</b>: um CronJob faz o dump do banco e envia para um armazenamento externo (S3, Blob Storage).</li>
        <li><b>Processamento em lote</b>: Jobs com <code>parallelism</code> maior que 1 (e <code>Indexed</code>) dividem um trabalho grande.</li>
        <li><b>Init container ou Job?</b> O init container roda <i>dentro</i> do Pod, antes do principal, e é bom para preparações
          leves e rápidas. O Job é melhor para tarefas pesadas ou que precisam de novas tentativas independentes.</li>
        <li><b>Limpeza</b>: um CronJob apaga logs antigos ou arquivos temporários.</li>
      </ul>
      <p>Regra de produção: sempre defina <code>activeDeadlineSeconds</code> (ou um tempo limite na própria tarefa), para um Job
      travado não ficar rodando para sempre.</p>`),
  ],
};
