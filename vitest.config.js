import { defineConfig } from 'vitest/config';
import { chavePublicaDe } from './src/ed25519.js';
import { pluginHistorico, versaoDoPacote } from './scripts/plugin-historico.mjs';

// Chaves fictícias para os testes dos certificados (as de verdade só existem no build; veja vite.config.js).
const SEMENTE_TESTES = '0101010101010101010101010101010101010101010101010101010101010101';

export default defineConfig({
  plugins: [pluginHistorico()],
  define: {
    __CHAVE_CERTIFICADO__: JSON.stringify('chave-dos-testes'),
    __SEMENTE_ED25519__: JSON.stringify(SEMENTE_TESTES),
    __CHAVE_PUBLICA_ED25519__: JSON.stringify(chavePublicaDe(SEMENTE_TESTES)),
    __VERSAO__: JSON.stringify(versaoDoPacote()),
    __HOMOLOGACAO__: 'false',
  },
  test: {
    testTimeout: 60000,
    hookTimeout: 120000,
    exclude: ['**/node_modules/**', 'tests/e2e/**'], // os E2E rodam no Playwright
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/conteudo/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
      // Com as rotas reais (Astro), a cobertura medida em 2026-10-21 é 80/73/82/82 (antes, 75/67/78/78
      // em 2026-10-19). Os limites sobem com folga de um ponto, como no DivergeTerraform. Só podem subir.
      thresholds: { statements: 79, branches: 72, functions: 81, lines: 81 },
    },
  },
});