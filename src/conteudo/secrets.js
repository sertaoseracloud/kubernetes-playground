// Recursos Avançados: Secrets e Segurança.
// Segue docs/didatica.md: lição com exemplo comentado antes de cada exercício.
import { licao, exercicio, teste } from './util.js';

/** O Secret do primeiro exercício: o segundo já o encontra no cluster. */
const DB_CREDENTIALS = `apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  username: admin
  password: s3cret0!`;

export const secrets = {
  id: 'secrets',
  titulo: 'Secrets e Segurança',
  descricao: 'Gerenciamento de dados sensíveis com Secrets, boas práticas e integrações externas.',
  icone: '🔐',
  itens: [
    licao('secrets-conceito', 'Secrets no Kubernetes', 'facil', `
      <p><b>Secrets</b> guardam dados sensíveis: senhas, tokens, certificados. Funcionam como os ConfigMaps (chave: valor, lidos
      como variável ou arquivo), mas com cuidados extras: o acesso pode ser restrito por RBAC e o cluster pode criptografá-los
      no etcd. É o cofre do escritório, ao lado do quadro de avisos.</p>
      <ul>
        <li>No campo <code>data</code>, os valores vão em <b>base64</b>. Atenção: base64 <b>não é criptografia</b>, é só outro jeito
          de escrever o texto; qualquer um decodifica.</li>
        <li>No campo <code>stringData</code>, você escreve o texto puro e o Kubernetes converte para base64 sozinho. Mais fácil
          para começar.</li>
        <li><code>immutable: true</code> impede alterações acidentais (para mudar, cria-se outro Secret).</li>
      </ul>
      <p>Tipos comuns (<code>type</code>):</p>
      <dl>
        <dt><code>Opaque</code></dt><dd>O genérico, para pares chave: valor quaisquer.</dd>
        <dt><code>kubernetes.io/dockerconfigjson</code></dt><dd>Credenciais para baixar imagens de registries privados.</dd>
        <dt><code>kubernetes.io/tls</code></dt><dd>Certificado e chave privada, usados no <code>tls</code> do Ingress.</dd>
      </dl>
      <p><b>No cluster:</b> <code>kubectl get secret NOME -o yaml</code> mostra os valores em base64; quem tem permissão de
      ler Secrets consegue ver as senhas. Por isso o RBAC dos Secrets importa tanto.</p>`,
    `
      apiVersion: v1
      kind: Secret
      metadata:
        name: cofre-api
      type: Opaque               # o tipo genérico
      stringData:                # texto puro; o cluster converte para base64
        token: troque-este-token-de-exemplo
      # Com "data" em vez de "stringData", o valor já iria em base64:
      #   data:
      #     token: dHJvcXVlLWVzdGUtdG9rZW4=
    `),

    exercicio({
      id: 'secrets-opaque-credenciais',
      titulo: 'Secret Opaque com credenciais',
      dificuldade: 'facil',
      resumo: `
        <p>Guarde as credenciais do banco de dados num Secret.</p>
        <ol>
          <li>Crie o Secret <code>db-credentials</code> com <code>type: Opaque</code>.</li>
          <li>Em <code>stringData</code>, a chave <code>username</code> com o valor <code>admin</code>.</li>
          <li>E a chave <code>password</code> com o valor <code>s3cret0!</code>.</li>
        </ol>
        <p><b>No cluster:</b> o Secret é guardado com os valores em base64. Os Pods que o usarem recebem o texto original.</p>`,
      inicial: `
        apiVersion: v1
        kind: Secret
        metadata:
          name: db-credentials
        type:                  # TODO: Opaque
        stringData:
          # TODO: username: admin
          # TODO: password: s3cret0!
      `,
      dica: [
        'stringData fica na raiz (o Secret não tem spec), com as chaves 2 espaços para dentro.',
        'stringData:\n  username: admin\n  password: s3cret0!',
      ],
      solucao: DB_CREDENTIALS,
      testes: [
        teste({ descricao: 'O Secret db-credentials existe', dica: 'Preencha o type: um valor vazio impede o apply.' },
          { tipo: 'recurso-existe', kind: 'Secret', nome: 'db-credentials' }),
        teste({ descricao: 'O Secret contém a chave username', dica: 'Em stringData, escreva username: admin.' },
          { tipo: 'secret-contem', nome: 'db-credentials', chave: 'username', valor: 'admin' }),
        teste({ descricao: 'O Secret contém a chave password', dica: 'Em stringData, escreva password: s3cret0!' },
          { tipo: 'secret-contem', nome: 'db-credentials', chave: 'password', valor: 's3cret0!' }),
      ],
    }),

    licao('secrets-vs-configmaps', 'ConfigMaps vs Secrets', 'medio', `
      <p>A escolha depende do dado: se vazar e não fizer mal (o nome do banco), ConfigMap; se fizer (a senha do banco), Secret.</p>
      <table>
        <thead><tr><th scope="col">Aspecto</th><th scope="col">ConfigMap</th><th scope="col">Secret</th></tr></thead>
        <tbody>
          <tr><td>Uso</td><td>Configurações não sensíveis</td><td>Dados sensíveis (senhas, tokens)</td></tr>
          <tr><td>Armazenamento</td><td>Texto puro</td><td>Base64 (o etcd pode criptografar em repouso)</td></tr>
          <tr><td>RBAC</td><td>Permissões padrão</td><td>Pode ter acesso bem restrito</td></tr>
        </tbody>
      </table>
      <p>Três jeitos de entregar um Secret ao container:</p>
      <ul>
        <li><b>Volume</b> (<code>volumes[].secret.secretName</code>): cada chave vira um arquivo. O arquivo é atualizado quando o
          Secret muda. Ideal para certificados. Monte com <code>readOnly: true</code>.</li>
        <li><b>Uma variável</b> (<code>env[].valueFrom.secretKeyRef</code>): igual ao <code>configMapKeyRef</code>.</li>
        <li><b>Todas as chaves de uma vez</b> (<code>envFrom[].secretRef</code>): cada chave vira uma variável com o mesmo nome. O
          Pod precisa reiniciar para pegar mudanças.</li>
      </ul>`,
    `
      apiVersion: v1
      kind: Pod
      metadata:
        name: usa-cofre
      spec:
        containers:
          - name: app
            image: nginx:1.25
            envFrom:                 # todas as chaves viram variáveis
              - secretRef:
                  name: cofre-api
            volumeMounts:            # e também como arquivos em /etc/cofre
              - name: cofre
                mountPath: /etc/cofre
                readOnly: true
        volumes:
          - name: cofre
            secret:                  # o tipo do volume
              secretName: cofre-api
    `),

    exercicio({
      id: 'secrets-pod-volume',
      titulo: 'Pod com Secret montado',
      dificuldade: 'medio',
      existentes: DB_CREDENTIALS,
      resumo: `
        <p>O Secret <code>db-credentials</code> já está no cluster. Entregue-o à aplicação como arquivos e como variáveis.</p>
        <ol>
          <li>No Pod <code>app-com-secret</code> (container <code>app</code>, imagem <code>nginx:1.25</code>), declare o volume
            <code>credenciais</code> do tipo <code>secret</code> com <code>secretName: db-credentials</code>.</li>
          <li>Monte <code>credenciais</code> em <code>/etc/secrets</code> com <code>readOnly: true</code>.</li>
          <li>Em <code>envFrom</code>, um item <code>secretRef</code> com <code>name: db-credentials</code>.</li>
          <li>Em <code>resources.limits</code>: <code>cpu: 200m</code> e <code>memory: 128Mi</code>.</li>
        </ol>
        <p><b>No cluster:</b> o container vê os arquivos <code>/etc/secrets/username</code> e <code>/etc/secrets/password</code> e as
        variáveis <code>username</code> e <code>password</code>.</p>`,
      inicial: `
        apiVersion: v1
        kind: Pod
        metadata:
          name: app-com-secret
        spec:
          containers:
            - name: app
              image: nginx:1.25
              resources:
                limits:
                  cpu:         # TODO: 200m
                  memory:      # TODO: 128Mi
              volumeMounts:
                - name: credenciais
                  mountPath:   # TODO: /etc/secrets
                  readOnly: true
              # TODO: envFrom com um item secretRef (name: db-credentials)
          volumes:
            - name: credenciais
              # TODO: secret com secretName: db-credentials
      `,
      dica: [
        'Releia o exemplo da lição "ConfigMaps vs Secrets": ele usa envFrom e o volume secret.',
        'O tipo do volume é secret (não secretRef): secret:\n  secretName: db-credentials',
      ],
      solucao: `apiVersion: v1
kind: Pod
metadata:
  name: app-com-secret
spec:
  containers:
    - name: app
      image: nginx:1.25
      resources:
        limits:
          cpu: 200m
          memory: 128Mi
      volumeMounts:
        - name: credenciais
          mountPath: /etc/secrets
          readOnly: true
      envFrom:
        - secretRef:
            name: db-credentials
  volumes:
    - name: credenciais
      secret:
        secretName: db-credentials`,
      testes: [
        teste({ descricao: 'O Pod app-com-secret existe', dica: 'Preencha os TODO: um volume sem tipo impede o apply.' },
          { tipo: 'recurso-existe', kind: 'Pod', nome: 'app-com-secret' }),
        teste({ descricao: 'O container tem resource limits definidos', dica: 'Em resources.limits: cpu: 200m e memory: 128Mi.' },
          { tipo: 'resource-limits', pod: 'app-com-secret', container: 'app' }),
        teste({ descricao: 'O volume do Secret está montado no container', dica: 'Volume credenciais com secret.secretName: db-credentials, montado em /etc/secrets.' },
          { tipo: 'volume-montado', pod: 'app-com-secret', container: 'app', mountPath: '/etc/secrets' },
          { tipo: 'campo', kind: 'Pod', nome: 'app-com-secret', caminho: 'spec.volumes[name=credenciais].secret.secretName', valor: 'db-credentials' }),
      ],
    }),

    licao('secrets-vault-external', 'Integração com Vault e External Secrets', 'dificil', `
      <p>Em produção, guardar senhas só no etcd (e escrever o YAML do Secret no Git) não basta. Ferramentas externas resolvem:</p>
      <dl>
        <dt><b>Sealed Secrets</b></dt><dd>Você tranca o Secret no seu computador com uma chave pública; só o controlador do cluster
          tem a chave que abre. O arquivo trancado pode ir para o Git sem medo.</dd>
        <dt><b>External Secrets Operator</b></dt><dd>Busca os segredos num cofre externo (AWS Secrets Manager, HashiCorp Vault, Azure
          Key Vault) e cria Secrets nativos a partir deles, com o recurso <code>ExternalSecret</code>.</dd>
        <dt><b>CSI Secret Store Driver</b></dt><dd>Monta os segredos do cofre externo direto como volume, sem criar um Secret no etcd.</dd>
      </dl>
      <p><b>Boas práticas</b>:</p>
      <ul>
        <li>Restrinja com RBAC quem pode ler Secrets em cada namespace.</li>
        <li>Ative a criptografia em repouso do etcd nos clusters de produção.</li>
        <li>Prefira montar como volume a usar variáveis (facilita a troca de senha e evita vazar em logs).</li>
        <li>Use <code>immutable: true</code> nos Secrets que não devem mudar.</li>
      </ul>`),
  ],
};
