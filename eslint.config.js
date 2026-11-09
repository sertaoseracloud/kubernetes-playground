// Regras do linter: as recomendadas do ESLint, mais algumas que pegam erros
// comuns. Rode `npm run lint` (o CI roda antes dos testes).
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Código novo em TypeScript (plano de migração, seção 6): o que é proibido vira erro.
const PROIBIDO_NA_INTERFACE = [
  { selector: "AssignmentExpression[left.property.name='innerHTML']", message: 'Sem innerHTML: o JSX escapa o texto sozinho (ADR 0002, regra 2).' },
  { selector: "CallExpression[callee.property.name='insertAdjacentHTML']", message: 'Sem insertAdjacentHTML (ADR 0002, regra 2).' },
  { selector: "CallExpression[callee.object.name='document'][callee.property.name=/^(querySelector|querySelectorAll|getElementById|getElementsByClassName)$/]", message: 'Componentes não consultam o DOM: use props, estado ou um hook adaptador.' },
];

export default [
  { ignores: ['dist/', '.astro/', 'node_modules/', 'public/', '.vitest/', 'coverage/', 'playwright-report/', 'test-results/'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      // __CHAVE_CERTIFICADO__, __SEMENTE_ED25519__ e __CHAVE_PUBLICA_ED25519__ são injetadas no build (astro.config.mjs).
      globals: { ...globals.browser, __CHAVE_CERTIFICADO__: 'readonly', __SEMENTE_ED25519__: 'readonly', __CHAVE_PUBLICA_ED25519__: 'readonly', __VERSAO__: 'readonly', __HOMOLOGACAO__: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      // ignoreReadBeforeAssign: o main.js declara a tela antes do motor, que já a lê no construtor.
      'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
      'no-implicit-globals': 'error',
    },
  },
  // TypeScript: estrito e com tipos (os arquivos estão no tsconfig.tipos.json).
  ...tseslint.configs.strictTypeChecked.map((c) => ({ ...c, files: ['**/*.ts', '**/*.tsx'] })),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { parserOptions: { project: './tsconfig.tipos.json', tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description' }],
      complexity: ['error', 15],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'no-restricted-syntax': ['error', ...PROIBIDO_NA_INTERFACE],
    },
  },
  {
    // Os .d.ts descrevem módulos em JS; os testes montam árvores grandes de JSX.
    files: ['**/*.d.ts', 'tests/**/*.ts', 'tests/**/*.tsx'],
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    files: ['src/k8s/worker.js'],
    languageOptions: { globals: { ...globals.worker } },
  },
  {
    files: ['tests/**', 'scripts/**', '*.config.js', '*.config.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
];