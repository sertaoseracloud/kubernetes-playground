// Glossário (📚 Palavras técnicas): cada termo com definição e analogia, achado no texto do
// desafio com acentos e sem confundir palavras parecidas.
import { describe, it, expect } from 'vitest';
import { GLOSSARIO, termosDoTexto, MAX_TERMOS } from '../src/conteudo/glossario.js';
import { itens } from '../src/conteudo/trilha.js';

const texto = (html) => String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

describe('glossário', () => {
  it('cada termo tem id único, definição e analogia', () => {
    expect(new Set(GLOSSARIO.map((t) => t.id)).size).toBe(GLOSSARIO.length);
    for (const t of GLOSSARIO) {
      expect(t.definicao.length, t.id).toBeGreaterThan(20);
      expect(t.analogia.length, t.id).toBeGreaterThan(10);
      expect(t.padroes.length, t.id).toBeGreaterThan(0);
    }
  });

  it('acha termos com acento e na ordem em que aparecem', () => {
    const ids = termosDoTexto('Crie um Pod com uma variável de ambiente, rótulos e um Service na frente.').map((t) => t.id);
    expect(ids).toEqual(['pod', 'variavel-ambiente', 'label', 'service']);
  });

  it('não confunde palavras parecidas', () => {
    expect(termosDoTexto('ele pode ouvir o podcast do serviço')).toEqual([]);
    expect(termosDoTexto('rode kubectl get pods').map((t) => t.id)).toEqual(['kubectl', 'pod']);
  });

  it('com mais termos que o limite, ficam os do nível do módulo', () => {
    const frase = 'Pod, Service, Deployment, ConfigMap, Secret, label, namespace e a ServiceAccount com IRSA no EKS';
    const ids = termosDoTexto(frase, { modulo: 'aws' }).map((t) => t.id);
    expect(ids).toHaveLength(MAX_TERMOS);
    expect(ids).toEqual(expect.arrayContaining(['irsa', 'eks']));
  });

  it(`todo exercício e toda lição têm pelo menos um termo explicado (no máximo ${MAX_TERMOS})`, () => {
    const semTermos = itens.filter((i) => termosDoTexto(texto(`${i.titulo} ${i.resumo} ${i.dica ?? ''}`), { modulo: i.modulo }).length === 0);
    expect(semTermos.map((i) => i.id)).toEqual([]);
    for (const i of itens) expect(termosDoTexto(texto(i.resumo)).length).toBeLessThanOrEqual(MAX_TERMOS);
  });
});
