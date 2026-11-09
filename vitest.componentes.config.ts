// npm run test:componentes: testes de componente num Chromium de verdade (Vitest no modo
// navegador, com o provedor do Playwright). Foco, teclado e layout se comportam como no site.
// No CI, roda no job e2e (que já instala o Chromium). Localmente, a máquina pode não aguentar:
// deixe para o CI.
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import base from './vitest.config.js';

export default defineConfig({
  define: base.define ?? {},
  oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
  optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'react-aria-components', 'vitest-browser-react', 'axe-core'] },
  test: {
    include: ['tests/componentes/**/*.test.tsx'],
    testTimeout: 30000,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    coverage: {
      provider: 'v8',
      include: ['src/exercicio/**/*.{ts,tsx}', 'src/react/**/*.tsx'],
      reporter: ['text-summary', 'json-summary'],
    },
  },
});
