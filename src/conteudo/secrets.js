// Módulo avançado: Secrets e Segurança.
// Lições sobre Secrets, comparação com ConfigMaps e integração com ferramentas externas.
// Exercícios com validação via recurso-existe, secret-contem, resource-limits e volume-montado.

export const secrets = {
  id: 'secrets',
  titulo: 'Secrets e Segurança',
  descricao: 'Gerenciamento de dados sensíveis com Secrets, boas práticas e integrações externas.',
  icone: '🔐',
  itens: [
    {
      id: 'secrets-conceito',
      tipo: 'licao',
      titulo: 'Secrets no Kubernetes',
      dificuldade: 'facil',
      xp: 5,
      resumo: `<p><b>Secrets</b> armazenam dados sensíveis como senhas, tokens e certificados. Eles funcionam como ConfigMaps, mas com tratamento especial:</p>
        <ul>
          <li>Os valores são codificados em <b>base64</b> no YAML (não é criptografia!).</li>
          <li>O campo <code>stringData</code> aceita texto puro e o Kubernetes converte para base64 automaticamente.</li>
          <li>Secrets podem ser montados como volumes ou injetados como variáveis de ambiente.</li>
        </ul>
        <p>Tipos comuns de Secret:</p>
        <dl>
          <dt><code>Opaque</code></dt><dd>Tipo genérico para pares chave-valor arbitrários.</dd>
          <dt><code>kubernetes.io/dockerconfigjson</code></dt><dd>Credenciais para puxar imagens de registries privados.</dd>
          <dt><code>kubernetes.io/tls</code></dt><dd>Certificado TLS e chave privada para Ingress e Services.</dd>
        </dl>
        <p>Secrets podem ser marcados como <b>imutáveis</b> (<code>immutable: true</code>), o que melhora performance e previne alterações acidentais.</p>`,
    },
    {
      id: 'secrets-vs-configmaps',
      tipo: 'licao',
      titulo: 'ConfigMaps vs Secrets',
      dificuldade: 'medio',
      xp: 5,
      resumo: `<p>A escolha entre ConfigMap e Secret depende da natureza do dado:</p>
        <table>
          <thead><tr><th>Aspecto</th><th>ConfigMap</th><th>Secret</th></tr></thead>
          <tbody>
            <tr><td>Uso</td><td>Configurações não sensíveis</td><td>Dados sensíveis (senhas, tokens)</td></tr>
            <tr><td>Armazenamento</td><td>Texto puro</td><td>Base64 (etcd pode criptografar em repouso)</td></tr>
            <tr><td>RBAC</td><td>Permissões padrão</td><td>Pode ter políticas de acesso restritas</td></tr>
            <tr><td>Audit</td><td>Não auditado por padrão</td><td>Pode ser auditado via audit policy</td></tr>
          </tbody>
        </table>
        <p><b>Montagem como volume vs env vars</b>:</p>
        <ul>
          <li><b>Volume</b>: o arquivo é atualizado automaticamente quando o Secret muda (se não for imutável). Ideal para certificados e configs que mudam.</li>
          <li><b>Env vars</b>: mais simples, mas o Pod precisa reiniciar para pegar mudanças. Use <code>envFrom</code> para injetar todas as chaves de uma vez.</li>
          <li><b>subPath</b>: monta apenas uma chave específica do Secret como arquivo, útil quando o container espera um caminho exato.</li>
        </ul>`,
    },
    {
      id: 'secrets-vault-external',
      tipo: 'licao',
      titulo: 'Integração com Vault e External Secrets',
      dificuldade: 'dificil',
      xp: 5,
      resumo: `<p>Em produção, armazenar Secrets diretamente no etcd pode não atender requisitos de segurança. Ferramentas externas resolvem isso:</p>
        <dl>
          <dt><b>Sealed Secrets</b></dt><dd>Você criptografa o Secret localmente com uma chave pública. Só o controller no cluster pode descriptografar. O arquivo criptografado pode ir para o Git com segurança.</dd>
          <dt><b>External Secrets Operator</b></dt><dd>Sincroniza segredos de provedores externos (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault) para Secrets nativos do Kubernetes via CRDs <code>ExternalSecret</code>.</dd>
          <dt><b>CSI Secret Store Driver</b></dt><dd>Monta segredos de provedores externos diretamente como volumes, sem criar objetos Secret no etcd. Mais seguro porque o dado sensível nunca toca o etcd.</dd>
        </dl>
        <p><b>Boas práticas</b>:</p>
        <ul>
          <li>Nunca coloque Secrets em variáveis de ambiente de containers que logam tudo.</li>
          <li>Use RBAC para restringir quem pode ler Secrets em cada namespace.</li>
          <li>Ative criptografia em repouso no etcd para clusters de produção.</li>
          <li>Prefira montar como volume em vez de env vars para facilitar rotação.</li>
          <li>Use <code>immutable: true</code> para Secrets que não devem mudar.</li>
        </ul>`,
    },
    {
      id: 'secrets-opaque-credenciais',
      tipo: 'exercicio',
      titulo: 'Secret Opaque com credenciais',
      dificuldade: 'facil',
      xp: 10,
      resumo: `<p>Crie um <b>Secret</b> do tipo Opaque chamado <code>db-credentials</code> com as credenciais de acesso ao banco de dados.</p>
        <ul>
          <li><code>username</code>: <code>admin</code></li>
          <li><code>password</code>: <code>s3cret0!</code></li>
        </ul>
        <p>Use o campo <code>stringData</code> para informar os valores em texto puro (o Kubernetes converte para base64).</p>`,
      solucao: `apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  username: admin
  password: s3cret0!`,
      testes: [
        {
          descricao: 'O Secret db-credentials existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Secret', nome: 'db-credentials' }],
        },
        {
          descricao: 'O Secret contém a chave username',
          regras: [{ tipo: 'secret-contem', nome: 'db-credentials', chave: 'username', valor: 'admin' }],
        },
        {
          descricao: 'O Secret contém a chave password',
          regras: [{ tipo: 'secret-contem', nome: 'db-credentials', chave: 'password', valor: 's3cret0!' }],
        },
      ],
    },
    {
      id: 'secrets-pod-volume',
      tipo: 'exercicio',
      titulo: 'Pod com Secret montado',
      dificuldade: 'medio',
      xp: 15,
      resumo: `<p>Crie um <b>Pod</b> chamado <code>app-com-secret</code> que monte o Secret <code>db-credentials</code> como volume e também use <code>envFrom</code>.</p>
        <ul>
          <li>Imagem: <code>nginx:1.25</code></li>
          <li>Monte o Secret como volume no caminho <code>/etc/secrets</code></li>
          <li>Defina limits de CPU (<code>200m</code>) e memória (<code>128Mi</code>)</li>
        </ul>`,
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
        {
          descricao: 'O Pod app-com-secret existe',
          regras: [{ tipo: 'recurso-existe', kind: 'Pod', nome: 'app-com-secret' }],
        },
        {
          descricao: 'O container tem resource limits definidos',
          regras: [{ tipo: 'resource-limits', pod: 'app-com-secret', container: 'app' }],
        },
        {
          descricao: 'O volume do Secret está montado no container',
          regras: [{ tipo: 'volume-montado', pod: 'app-com-secret', container: 'app', mountPath: '/etc/secrets' }],
        },
      ],
    },
  ],
};