import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const API_MODULES = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'unplaced'];

// The API's elements. The first pattern that matches a file decides its type.
const API_BOUNDARY_SETTINGS = {
  // Absolute, so imports resolve whatever directory ESLint runs from (the level rule's unit test runs
  // it from apps/api); an import that does not resolve is allowed by default.
  'import/resolver': { typescript: { project: `${import.meta.dirname}/apps/api/tsconfig.json` } },
  // The element patterns are relative to the repository, whatever directory ESLint runs from.
  'boundaries/root-path': import.meta.dirname,
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
    // A module folder missing from the level map, or a file placed directly in modules/: refused
    // everywhere until it is placed.
    { type: 'unplaced', pattern: 'apps/api/src/modules/*' },
    { type: 'unplaced', pattern: 'apps/api/src/modules' },
    { type: 'platform', pattern: 'apps/api/src/shared/*' },
    { type: 'platform', pattern: 'apps/api/src/shared' },
    // The seed creates accounts through users, so it is assembled like the root.
    { type: 'root', pattern: ['apps/api/src/db/seed', 'apps/api/test'] },
    { type: 'infrastructure', pattern: 'apps/api/src/{db,config}' },
    { type: 'generated', pattern: 'apps/api/src/generated' },
    // Last, so it takes only what no element above did: app.ts, server.ts and their tests.
    { type: 'root', pattern: 'apps/api/src' },
  ],
};

/** The API's dependency policies. The last matching policy decides. */
function apiDependencies({ guardRoot }) {
  return {
    default: 'allow',
    message:
      '{{ from.type }} → {{ to.type }} ({{ to.internalPath }}) is not allowed. A module imports only lower levels, through their index.ts (docs/backend/conventions.md §7); shared/, db and config import no module, and only the root imports the root.',
    policies: [
      // No one reaches a module, except as allowed below.
      { disallow: { to: { element: { type: API_MODULES } } } },
      ...[
        ['L1', ['L0']],
        ['L2', ['L0', 'L1']],
        ['L3', ['L0', 'L1', 'L2']],
        ['L4', ['L0', 'L1', 'L2', 'L3']],
        ['L5', ['L0', 'L1', 'L2', 'L3', 'L4']],
        ['root', ['L0', 'L1', 'L2', 'L3', 'L4', 'L5']],
      ].map(([from, lower]) => ({
        from: { element: { type: from } },
        allow: { to: { element: { type: lower, fileInternalPath: 'index.ts' } } },
      })),
      // Modules and the platform reach db and config through their index.ts only.
      {
        from: { element: { type: [...API_MODULES, 'platform'] } },
        disallow: {
          to: { element: { type: 'infrastructure', fileInternalPath: '!index.ts' } },
        },
      },
      ...(guardRoot
        ? [
            {
              from: {
                element: { type: [...API_MODULES, 'platform', 'infrastructure', 'generated'] },
              },
              disallow: { to: { element: { type: 'root' } } },
            },
          ]
        : []),
    ],
  };
}

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
    // internal, which the rule does not check. The platform (shared/) and the infrastructure (db,
    // config) know no module (R6). Nothing but the root imports the root (app.ts, server.ts, the
    // seed and test/), which would reach every module through it; tests are exempt below.
    files: ['apps/api/src/**/*.ts', 'apps/api/test/**/*.ts'],
    plugins: { boundaries },
    settings: API_BOUNDARY_SETTINGS,
    rules: { 'boundaries/dependencies': ['error', apiDependencies({ guardRoot: true })] },
  },
  {
    // Tests may compose the application they test: the root is open to them.
    files: ['apps/api/**/*.test.ts'],
    rules: { 'boundaries/dependencies': ['error', apiDependencies({ guardRoot: false })] },
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
