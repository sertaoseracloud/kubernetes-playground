// Modo de homologação: o build com HOMOLOGACAO=1 guarda o progresso em outro lugar,
// aponta os certificados para /homologacao/ e não é indexado; sem a variável, tudo como hoje.
import { describe, it, expect } from 'vitest';
import { configurarAmbiente, HOMOLOGACAO, PREFIXO_ARMAZENAMENTO, SITE_ATUAL } from '../src/ambiente.js';

describe('ambiente', () => {
  it('fora da homologação, tudo como hoje', () => {
    expect(configurarAmbiente(false)).toEqual({
      homologacao: false,
      prefixo: 'kubernetes-playground:',
      site: 'https://sertaoseracloud.github.io/kubernetes-playground/',
    });
  });

  it('na homologação, outro armazenamento e outro endereço', () => {
    expect(configurarAmbiente(true)).toEqual({
      homologacao: true,
      prefixo: 'kubernetes-playground-homologacao:',
      site: 'https://sertaoseracloud.github.io/kubernetes-playground/homologacao/',
    });
  });

  it('nos testes, o modo é o normal', () => {
    expect(HOMOLOGACAO).toBe(false);
    expect(PREFIXO_ARMAZENAMENTO).toBe('kubernetes-playground:');
    expect(SITE_ATUAL).toBe('https://sertaoseracloud.github.io/kubernetes-playground/');
  });
});