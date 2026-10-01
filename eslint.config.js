import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['**/dist/', '**/coverage/', 'apps/api/src/generated/']),
  // The Claude Design sync (.design-sync/NOTES.md): its inputs are checked by the sync's own
  // render check and grading, and the other three are its gitignored build output.
  globalIgnores(['.design-sync/', '.ds-sync/', '.ds-pkg/', 'ds-bundle/']),
  // The design archive (docs/design/README.md): a frozen prototype with vendored code, never linted.
  globalIgnores(['docs/design/']),
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
    // The API's module levels (docs/backend/conventions.md §7, the only level map; this mirrors it).
    // A module imports only modules at lower levels, and only through their index.ts: never one at
    // its own level, a higher one, or a file past another module's index.ts. Its own files are
    // internal, which the rule does not check. The composition root, the database code and the
    // tests reach a module through its index.ts too, and the platform (shared/) knows no module
    // (R6). Everything else is left to the other rules.
    files: ['apps/api/src/**/*.ts', 'apps/api/test/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: 'apps/api/tsconfig.json' } },
      'boundaries/dependency-nodes': ['import', 'export', 'dynamic-import'],
      'boundaries/elements': [
        {
          type: 'L0',
          pattern: 'apps/api/src/modules/{sessions,lookups,platform-settings,space-settings}',
        },
        { type: 'L1', pattern: 'apps/api/src/modules/{users,spaces}' },
        {
          type: 'L2',
          pattern: 'apps/api/src/modules/{space-links,customers,packages,announcements,favorites}',
        },
        { type: 'L3', pattern: 'apps/api/src/modules/{auth,data-reports,visits,subscriptions}' },
        { type: 'L4', pattern: 'apps/api/src/modules/{payments,occupancy}' },
        { type: 'L5', pattern: 'apps/api/src/modules/{desk,directory,finance,overview,audit}' },
        // A module folder missing from the level map: refused everywhere until it is placed.
        { type: 'unplaced', pattern: 'apps/api/src/modules/*' },
        { type: 'platform', pattern: 'apps/api/src/shared/*' },
        { type: 'assembly', pattern: ['apps/api/src/{db,config}', 'apps/api/test'] },
        // Last, so it takes only what no element above did: app.ts, server.ts and their tests.
        { type: 'assembly', pattern: 'apps/api/src' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          message:
            '{{ from.type }} → {{ to.type }} ({{ to.internalPath }}) is not allowed. A module imports only lower levels, through their index.ts (docs/backend/conventions.md §7); shared/ imports no module.',
          // The last matching policy decides.
          policies: [
            {
              from: {
                element: {
                  type: ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'unplaced', 'platform', 'assembly'],
                },
              },
              disallow: {
                to: { element: { type: ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'unplaced'] } },
              },
            },
            ...[
              ['L1', ['L0']],
              ['L2', ['L0', 'L1']],
              ['L3', ['L0', 'L1', 'L2']],
              ['L4', ['L0', 'L1', 'L2', 'L3']],
              ['L5', ['L0', 'L1', 'L2', 'L3', 'L4']],
              ['assembly', ['L0', 'L1', 'L2', 'L3', 'L4', 'L5']],
            ].map(([from, lower]) => ({
              from: { element: { type: from } },
              allow: { to: { element: { type: lower, fileInternalPath: 'index.ts' } } },
            })),
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
                '@tanstack/react-table',
                '@tanstack/table-core',
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
