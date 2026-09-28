import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['**/dist/', '**/coverage/', 'apps/api/src/generated/']),
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
    // page group → page group) are refused because no policy allows them. The design-system layer
    // is the shared module that imports nothing outside itself (docs/frontend/design-system/
    // foundation.md §3), so no policy lets it import anything; its imports of its own files are
    // internal, which the rule does not check.
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
        // Before shared, whose pattern also matches it: the first matching element wins.
        { type: 'design-system', pattern: 'apps/web/src/shared/design-system' },
        { type: 'shared', pattern: 'apps/web/src/shared/*' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            '{{ from.type }} → {{ to.type }} ({{ to.internalPath }}) is not allowed. Zones depend one way (app → pages → features → shared), never on a sibling, and only through an index.ts barrel. The design system imports nothing outside itself.',
          policies: [
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    type: ['page', 'feature', 'shared', 'design-system'],
                    fileInternalPath: 'index.ts',
                  },
                },
              },
            },
            {
              from: { element: { type: 'page' } },
              allow: {
                to: {
                  element: {
                    type: ['feature', 'shared', 'design-system'],
                    fileInternalPath: 'index.ts',
                  },
                },
              },
            },
            {
              from: { element: { type: ['feature', 'shared'] } },
              allow: {
                to: {
                  element: { type: ['shared', 'design-system'], fileInternalPath: 'index.ts' },
                },
              },
            },
          ],
        },
      ],
    },
  },
  {
    // Radix primitives, the icon library, variant utilities, the toast library and every other
    // third-party UI library the layer wraps are imported only inside the design-system layer
    // (docs/frontend/design-system/foundation.md §3). Everything else uses what the layer exports.
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/shared/design-system/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'radix-ui',
                '@radix-ui/*',
                'lucide-react',
                'class-variance-authority',
                'sonner',
                'cmdk',
                'react-day-picker',
                'react-day-picker/*',
              ],
              message:
                'Only the design-system layer imports this package. Use what @shared/design-system exports.',
            },
          ],
        },
      ],
    },
  },
]);
