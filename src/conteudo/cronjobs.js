import { exercicio, teste, existe, campo } from './util.js';

// Módulo avançado: CronJobs e Jobs.
// Lições sobre Jobs, CronJobs e padrões de uso.
// Exercícios com validação via recurso-existe, container-imagem e cronjob-schedule.

export const cronjobs = {
  id: 'cronjobs',
  titulo: 'CronJobs e Jobs',
  descricao: 'Tarefas únicas com Jobs e tarefas agendadas com CronJobs no Kubernetes.',
  icone: '⏰',
  itens: [
    {
      id: 'jobs-conceito',
      tipo: 'licao',
      titulo: 'Jobs no Kubernetes',
      dificuldade: 'facil',
      xp: 5,
      resumo: `<p>Um <b>Job</b> cria um ou mais Pods que rodam até completar uma tarefa e depois terminam. Diferente de Deployments, Jobs não ficam rodando para sempre.</p>
        <p>Campos importantes do Job:</p>
        <ul>
          <li><code>completions</code>: quantos Pods precisam terminar com sucesso (padrão: 1).</li>
          <li><code>parallelism</code>: quantos Pods podem rodar ao mesmo tempo.</li>
          <li><code>backoffLimit</code>: número máximo de falhas antes de considerar o Job como fracassado (padrão: 6).</li>
          <li><code>activeDeadlineSeconds</code>: tempo máximo total de execução; se ultrapassar, o Job é terminado.</li>
        </ul>
        <p>Use Cases: migrações de banco de dados, processamento em lote, backups pontuais, geração de relatórios.</p>`,
    },
    {
      id: 'cronjobs-scheduling',
      tipo: 'licao',
      titulo: 'CronJobs e scheduling',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>Um <b>CronJob</b> cria Jobs periodicamente seguindo uma expressão cron. A sintaxe é <code>"minuto hora diaDoMes mes diaDaSemana"</code>.</p>
        <p>Exemplos comuns:</p>
        <ul>
          <li><code>"*/5 * * * *"</code> — a cada 5 minutos</li>
          <li><code>"0 2 * * *"</code> — diariamente às 2h</li>
          <li><code>"0 */6 * * *"</code> — a cada 6 horas</li>
        </ul>
        <p>Campos de controle:</p>
        <dl>
          <dt><code>concurrencyPolicy</code></dt><dd><b>Allow</b> (padrão): permite Jobs simultâneos. <b>Forbid</b>: pula nova execução se a anterior ainda roda. <b>Replace</b>: substitui o Job ativo.</dd>
          <dt><code>successfulJobsHistoryLimit</code></dt><dd>Quantos Jobs bem-sucedidos manter no histórico (padrão: 3).</dd>
          <dt><code>failedJobsHistoryLimit</code></dt><dd>Quantos Jobs falhos manter (padrão: 1).</dd>
          <dt><code>suspend</code></dt><dd>Se <code>true</code>, pausa as execuções futuras sem deletar o CronJob.</dd>
        </dl>`,
    },
    {
      id: 'cronjobs-padroes',
      tipo: 'licao',
      titulo: 'Padrões de uso de Jobs',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>Além dos usos óbvios, Jobs e CronJobs aparecem em vários padrões arquiteturais:</p>
        <ul>
          <li><b>Database migrations</b>: um Job roda scripts de migration antes do Deployment principal subir. Pode ser orquestrado como init container ou como Job separado com dependência.</li>
          <li><b>Backups agendados</b>: CronJob que faz dump do banco e envia para storage externo (S3, GCS).</li>
          <li><b>Batch processing</b>: Jobs com <code>parallelism > 1</code> para processar filas ou datasets grandes.</li>
          <li><b>Init Containers vs Jobs</b>: Init containers rodam <i>dentro</i> do Pod antes do container principal e são bons para setup leve. Jobs são melhores para tarefas pesadas ou que precisam de retry independente.</li>
          <li><b>Cleanup jobs</b>: CronJob para limpar logs antigos, tokens expirados ou recursos temporários.</li>
        </ul>
        <p>Dica: sempre defina <code>activeDeadlineSeconds</code> em Jobs de produção para evitar execuções infinitas.</p>`,
    },
    {
      id: 'cronjobs-job-backup',
      tipo: 'exercicio',
      titulo: 'Job de backup único',
      dificuldade: 'facil',
      xp: 10,
      resumo: `<p>Crie um <b>Job</b> chamado <code>backup-db</code> que rode um container de backup.</p>
        <ul>
          <li>Imagem: <code>busybox:1.36</code></li>
          <li>Comando: <code>["sh", "-c", "echo Backup iniciado && sleep 5 && echo Backup concluido"]</code></li>
          <li><code>backoffLimit</code>: 2</li>
        </ul>`,
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
        {
          descricao: 'O Job backup-db existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Job', nome: 'backup-db' }],
        },
        {
          descricao: 'O container usa a imagem busybox:1.36',
          regras: [{ tipo: 'container-imagem', pod: 'backup-db', container: 'backup', imagem: 'busybox:1.36' }],
        },
      ],
    },
    {
      id: 'cronjobs-cronjob-agendado',
      tipo: 'exercicio',
      titulo: 'CronJob agendado',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um <b>CronJob</b> chamado <code>limpeza-logs</code> que rode a cada 5 minutos.</p>
        <ul>
          <li>Schedule: <code>*/5 * * * *</code></li>
          <li><code>concurrencyPolicy</code>: <code>Forbid</code></li>
          <li>Container: imagem <code>busybox:1.36</code>, comando <code>["sh", "-c", "echo Limpando logs..."]</code></li>
        </ul>`,
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
        {
          descricao: 'O CronJob limpeza-logs existe',
          regras: [{ tipo: 'recurso-existe', kind: 'CronJob', nome: 'limpeza-logs' }],
        },
        {
          descricao: 'O schedule está configurado como */5 * * * *',
          regras: [{ tipo: 'cronjob-schedule', nome: 'limpeza-logs', schedule: '*/5 * * * *' }],
        },
      ],
    },
    exercicio({
      id: 'jobs-indexado',
      titulo: 'Job indexado em paralelo',
      dificuldade: 'medio',
      resumo: `<p>Processe 5 lotes de arquivos, 2 de cada vez. Crie o Job <code>processa-lotes</code>:</p>
        <ul>
          <li><code>completions: 5</code>, <code>parallelism: 2</code> e <code>completionMode: Indexed</code> (cada Pod recebe o
            número do lote na variável <code>JOB_COMPLETION_INDEX</code>).</li>
          <li><code>backoffLimit: 3</code> e <code>ttlSecondsAfterFinished: 600</code> (o Job some 10 minutos depois de terminar).</li>
          <li>Container <code>lote</code> com a imagem <code>busybox:1.36</code>, comando
            <code>["sh", "-c", "echo processando o lote $JOB_COMPLETION_INDEX"]</code> e <code>restartPolicy: Never</code>.</li>
        </ul>`,
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
        teste('O Job processa 5 lotes, 2 por vez', existe('Job', 'processa-lotes'), campo('Job', 'processa-lotes', 'spec.completions', { valor: 5 }), campo('Job', 'processa-lotes', 'spec.parallelism', { valor: 2 })),
        teste('Cada Pod recebe o número do lote', campo('Job', 'processa-lotes', 'spec.completionMode', { valor: 'Indexed' })),
        teste('O Job é limpo 10 minutos depois de terminar', campo('Job', 'processa-lotes', 'spec.ttlSecondsAfterFinished', { valor: 600 }), campo('Job', 'processa-lotes', 'spec.backoffLimit', { valor: 3 })),
      ],
    }),
  ],
};