import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['**/dist/', '**/coverage/']),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Plain JS config files sit outside every tsconfig, so they get syntax-only linting.
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
  },
  {
    // The four zones of apps/web and their one-way dependency rule (docs/frontend/architecture.md §1).
    // Another zone is entered only through its index.ts barrel. Sibling imports (feature → feature,
    // page group → page group) are refused because no policy allows them.
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      // Resolves the @app, @pages, @features and @shared aliases, so aliased imports are checked too.
      'import/resolver': { typescript: { project: 'apps/web/tsconfig.app.json' } },
      // Re-exports and lazy imports count as dependencies, so a barrel cannot route around the rule.
      'boundaries/dependency-nodes': ['import', 'export', 'dynamic-import'],
      'boundaries/elements': [
        { type: 'app', pattern: 'apps/web/src/app' },
        { type: 'page', pattern: 'apps/web/src/pages/*' },
        { type: 'feature', pattern: 'apps/web/src/features/*' },
        { type: 'shared', pattern: 'apps/web/src/shared/*' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            '{{ from.type }} → {{ to.type }} ({{ to.internalPath }}) is not allowed. Zones depend one way (app → pages → features → shared), never on a sibling, and only through an index.ts barrel.',
          policies: [
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: { type: ['page', 'feature', 'shared'], fileInternalPath: 'index.ts' },
                },
              },
            },
            {
              from: { element: { type: 'page' } },
              allow: {
                to: { element: { type: ['feature', 'shared'], fileInternalPath: 'index.ts' } },
              },
            },
            {
              from: { element: { type: ['feature', 'shared'] } },
              allow: { to: { element: { type: 'shared', fileInternalPath: 'index.ts' } } },
            },
          ],
        },
      ],
    },
  },
]);
