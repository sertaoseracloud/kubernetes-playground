// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { aplicarYaml, obterEstado, resetarEstado, simularApply, avaliarIsolado } from '../src/k8s/simulador.js';
import { interpretar } from '../src/k8s/comandos.js';
import { lerEstado } from '../src/progresso.js';

const pod = (nome) => `apiVersion: v1\nkind: Pod\nmetadata:\n  name: ${nome}\nspec:\n  containers:\n    - name: app\n      image: nginx\n`;
beforeEach(() => { localStorage.clear(); resetarEstado(); });

describe('ações de arquivo nunca ignoram argumentos', () => {
  const arquivos = { 'manifest.yaml': pod('principal'), 'base/pod.yaml': pod('base'), 'README.md': '# notas' };
  it.each(['apply', 'create', 'diff', 'delete'])('%s rejeita caminho ausente, opções e arquivo inexistente', (comando) => {
    for (const args of ['-f', '-f nada.yaml', '--filename=', '-f manifest.yaml --dry-run=client', '-f manifest.yaml --prune', '--filename-extra=manifest.yaml', '-f -x']) {
      const r = interpretar(`kubectl ${comando} ${args}`, obterEstado(), arquivos);
      expect(r.acao).toBeUndefined();
      expect(r.linhas[0].classe).toBe('erro');
    }
  });
  it('seleciona arquivo, diretório e todos sem incluir anotações', () => {
    expect(Object.keys(interpretar('kubectl apply -f manifest.yaml', {}, arquivos).arquivos)).toEqual(['manifest.yaml']);
    expect(Object.keys(interpretar('kubectl diff --filename=base/', {}, arquivos).arquivos)).toEqual(['base/pod.yaml']);
    expect(Object.keys(interpretar('kubectl delete -f .', {}, arquivos).arquivos)).toEqual(['manifest.yaml', 'base/pod.yaml']);
  });
});

describe('cluster transacional e diagnóstico por arquivo', () => {
  it('falha no segundo documento não aplica o primeiro nem altera persistência', () => {
    aplicarYaml(pod('preservado'), 'teste');
    const antes = obterEstado();
    const r = aplicarYaml({ 'novo.yaml': pod('novo'), 'ruim.yaml': 'kind: Pod\nmetadata:\n  name: ruim\n' }, 'teste');
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain('ruim.yaml');
    expect(obterEstado()).toEqual(antes);
    expect(lerEstado('teste')).toEqual(antes);
  });
  it('erro de sintaxe mantém a linha original do segundo arquivo', () => {
    const arquivos = { 'primeiro.yaml': pod('primeiro'), 'base/quebrado.yaml': 'apiVersion: v1\nmetadata: [\n' };
    for (const r of [aplicarYaml(arquivos), simularApply(arquivos)]) {
      expect(r.ok).toBe(false);
      expect(r.mensagem).toContain('base/quebrado.yaml');
      expect(r.mensagem).toMatch(/\(3:1\)/);
    }
  });
  it('Diff concorda com Apply, preservando os recursos não selecionados', () => {
    aplicarYaml(pod('preservado'));
    const diff = simularApply({ 'novo.yaml': pod('novo') });
    expect(diff.diff.criar).toMatchObject([{ kind: 'Pod', nome: 'novo' }]);
    expect(diff.recursos).toMatchObject([{ kind: 'Pod', nome: 'novo' }]);
    expect(obterEstado().pods.map((p) => p.nome)).toEqual(['preservado']);
    aplicarYaml({ 'novo.yaml': pod('novo') });
    expect(obterEstado().pods.map((p) => p.nome)).toEqual(['preservado', 'novo']);
    expect(simularApply(pod('novo')).diff.criar).toEqual([]);
  });
  it('avaliação usa existentes sem tocar no cluster, inclusive ao lançar erro', () => {
    aplicarYaml(pod('aluno'), 'teste');
    const antes = obterEstado();
    expect(avaliarIsolado(() => obterEstado().pods[0].nome, pod('existente'))).toBe('existente');
    expect(() => avaliarIsolado(() => { throw new Error('teste'); })).toThrow('teste');
    expect(obterEstado()).toEqual(antes);
    expect(lerEstado('teste')).toEqual(antes);
  });
});
