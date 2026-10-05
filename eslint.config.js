import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { DASHBOARD_ONLY_CAPABILITIES } from './apps/web/scripts/dashboardOnly.ts';

// The module level map (docs/backend/conventions.md §7, the only level map; this mirrors it). It
// places the API's modules and the shared package's capabilities alike
// (docs/architecture/shared-package.md).
const MODULE_LEVELS = {
  L0: ['sessions', 'lookups', 'platform-settings', 'space-settings'],
  L1: ['users', 'spaces'],
  L2: ['space-links', 'customers', 'packages', 'announcements', 'favorites'],
  L3: ['auth', 'data-reports', 'visits', 'subscriptions'],
  L4: ['payments', 'occupancy'],
  L5: ['desk', 'directory', 'finance', 'overview', 'audit'],
};
const LEVELS = Object.keys(MODULE_LEVELS);
const API_MODULES = [...LEVELS, 'unplaced'];

/** The levels below `level`. */
const lowerThan = (level) => LEVELS.slice(0, LEVELS.indexOf(level));

/** One element per level: that level's folders under `root`. */
const levelElements = (root) =>
  LEVELS.map((level) => ({
    type: level,
    pattern: MODULE_LEVELS[level].map((name) => `${root}/${name}`),
  }));

/** The @masaha/shared paths open to the given levels: core and those levels' capabilities. */
const sharedPaths = (levels) => ['core', ...levels.flatMap((level) => MODULE_LEVELS[level])];

// The API's elements. The first pattern that matches a file decides its type.
const API_BOUNDARY_SETTINGS = {
  // Absolute, so imports resolve whatever directory ESLint runs from (the level rule's unit test runs
  // it from apps/api); an import that does not resolve is allowed by default.
  'import/resolver': { typescript: { project: `${import.meta.dirname}/apps/api/tsconfig.json` } },
  // The element patterns are relative to the repository, whatever directory ESLint runs from.
  'boundaries/root-path': import.meta.dirname,
  'boundaries/dependency-nodes': ['import', 'export', 'dynamic-import'],
  // @masaha/shared is a package wherever it resolves (its source, its dist or nowhere), so its rules
  // below match it by name and path.
  'boundaries/flag-as-external': { customSourcePatterns: ['@masaha/shared', '@masaha/shared/**'] },
  'boundaries/elements': [
    ...levelElements('apps/api/src/modules'),
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
    // @masaha/shared is a package, so its imports are checked only when every origin is.
    checkAllOrigins: true,
    message:
      '{{ from.type }} → {{ to.type }} ({{ to.internalPath }}) is not allowed. A module imports only lower levels, through their index.ts (docs/backend/conventions.md §7); shared/, db and config import no module, and only the root imports the root.',
    policies: [
      // No one reaches a module, except as allowed below.
      { disallow: { to: { element: { type: API_MODULES } } } },
      ...[...LEVELS.slice(1), 'root'].map((from) => ({
        from: { element: { type: from } },
        allow: {
          to: {
            element: {
              type: from === 'root' ? LEVELS : lowerThan(from),
              fileInternalPath: 'index.ts',
            },
          },
        },
      })),
      // No one reaches @masaha/shared, except as allowed below: a module imports core and the
      // capabilities at its own level or lower; the platform, db and config import core only; the
      // root (the seed and test/ included) imports any. A path past a capability is none of these,
      // so it is refused too.
      {
        disallow: { to: { module: { source: '@masaha/shared' } } },
        message:
          '{{ from.type }} → {{ dependency.source }} is not allowed. A module imports @masaha/shared/core and the capabilities at its own level or lower; shared/, db and config import core only (docs/backend/conventions.md §7).',
      },
      ...[...LEVELS, 'root'].map((from) => ({
        from: { element: { type: from } },
        allow: {
          to: {
            module: {
              source: '@masaha/shared',
              internalPath: sharedPaths(from === 'root' ? LEVELS : [...lowerThan(from), from]),
            },
          },
        },
      })),
      {
        from: { element: { type: ['platform', 'infrastructure'] } },
        allow: { to: { module: { source: '@masaha/shared', internalPath: sharedPaths([]) } } },
      },
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

// The shared package's elements (docs/architecture/shared-package.md): core, the capabilities the
// level map places, and a folder it does not, refused everywhere until it is placed.
const SHARED_BOUNDARY_SETTINGS = {
  'import/resolver': {
    typescript: { project: `${import.meta.dirname}/packages/shared/tsconfig.json` },
  },
  'boundaries/root-path': import.meta.dirname,
  'boundaries/dependency-nodes': ['import', 'export', 'dynamic-import'],
  // @masaha/shared is a package wherever it resolves (its source, its dist or nowhere), so its rules
  // below match it by name and path.
  'boundaries/flag-as-external': { customSourcePatterns: ['@masaha/shared', '@masaha/shared/**'] },
  'boundaries/elements': [
    { type: 'core', pattern: 'packages/shared/src/core' },
    ...levelElements('packages/shared/src'),
    { type: 'unplaced', pattern: 'packages/shared/src/*' },
    { type: 'unplaced', pattern: 'packages/shared/src' },
  ],
};

/** The shared package's dependency policies. The last matching policy decides. */
function sharedDependencies({ guardPackages }) {
  return {
    default: 'allow',
    // Packages, its own name included, are checked only when every origin is.
    checkAllOrigins: true,
    message:
      '{{ from.type }} → {{ to.type }} ({{ to.internalPath }}) is not allowed. Core imports no capability, and a capability imports core and lower levels only, through their index.ts (docs/architecture/shared-package.md, R3).',
    policies: [
      { disallow: { to: { element: { type: ['core', ...LEVELS, 'unplaced'] } } } },
      ...LEVELS.map((from) => ({
        from: { element: { type: from } },
        allow: {
          to: { element: { type: ['core', ...lowerThan(from)], fileInternalPath: 'index.ts' } },
        },
      })),
      // Core imports no package but zod: no Node module either, since the web runs it too.
      ...(guardPackages
        ? [
            {
              from: { element: { type: 'core' } },
              disallow: { to: { module: { origin: ['external', 'core'] } } },
              message:
                'core → {{ dependency.source }} is not allowed. Core imports nothing but zod (docs/architecture/shared-package.md, R3).',
            },
            { from: { element: { type: 'core' } }, allow: { to: { module: { source: 'zod' } } } },
          ]
        : []),
      // The package never imports itself by name, which would reach past the rule (and its dist).
      {
        disallow: { to: { module: { source: '@masaha/shared' } } },
        message:
          '{{ from.type }} → {{ dependency.source }} is not allowed. The package imports its own files by relative path, through their index.ts (docs/architecture/shared-package.md, R3).',
      },
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
      // Absolute, with the element patterns relative to the repository, so the rule holds whatever
      // directory ESLint runs from.
      'import/resolver': {
        typescript: { project: `${import.meta.dirname}/apps/web/tsconfig.app.json` },
      },
      'boundaries/root-path': import.meta.dirname,
      // Re-exports and lazy imports count as dependencies, so a barrel cannot route around the rule.
      'boundaries/dependency-nodes': ['import', 'export', 'dynamic-import'],
      'boundaries/elements': [
        { type: 'app', pattern: 'apps/web/src/app' },
        // The page group and the capability are captured, for the dashboard-only rule below.
        { type: 'page', pattern: 'apps/web/src/pages/*', capture: ['group'] },
        { type: 'feature', pattern: 'apps/web/src/features/*', capture: ['capability'] },
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
            // The dashboard-only rule (ADR 0011, docs/frontend/architecture.md §3): the site never
            // imports a capability only the dashboard uses, so it never pulls dashboard code in.
            // check:build proves the same of the build.
            {
              from: { element: { type: 'page', captured: { group: 'site' } } },
              disallow: {
                to: {
                  element: {
                    type: 'feature',
                    captured: { capability: [...DASHBOARD_ONLY_CAPABILITIES] },
                  },
                },
              },
              message:
                'site → {{ to.captured.capability }} is not allowed. The site never imports a dashboard-only capability (docs/frontend/architecture.md §3, apps/web/scripts/dashboardOnly.ts).',
            },
          ],
        },
      ],
    },
  },
  {
    // The API's module levels (docs/backend/conventions.md §7), from MODULE_LEVELS above.
    // A module imports only modules at lower levels, and only through their index.ts: never one at
    // its own level, a higher one, or a file past another module's index.ts. Its own files are
    // internal, which the rule does not check. The platform (shared/) and the infrastructure (db,
    // config) know no module (R6). Nothing but the root imports the root (app.ts, server.ts, the
    // seed and test/), which would reach every module through it; tests are exempt below. Of
    // @masaha/shared, a module imports core and the capabilities at its own level or lower.
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
    // The shared package's levels (docs/architecture/shared-package.md, R3), read from the same level
    // map: core imports no capability and no package but zod, and a capability imports core and the
    // capabilities at lower levels only, through their index.ts. A folder's own files are internal,
    // which the rule does not check.
    files: ['packages/shared/src/**/*.ts'],
    plugins: { boundaries },
    settings: SHARED_BOUNDARY_SETTINGS,
    rules: { 'boundaries/dependencies': ['error', sharedDependencies({ guardPackages: true })] },
  },
  {
    // Tests import their runner: core's tests may import packages.
    files: ['packages/shared/src/**/*.test.ts'],
    rules: { 'boundaries/dependencies': ['error', sharedDependencies({ guardPackages: false })] },
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
  {
    // Axios is imported only inside shared/api, the one transport (docs/frontend/architecture.md §1).
    // Everything else uses what @shared/api exports. shared/errors may import Axios's types, to
    // recognise its errors (next block); src/test/fakeAdapter.ts is the tests' fake transport. This
    // is the typescript-eslint rule, not the core one: a second block of the core rule would replace
    // the design-system block's options for the files both match.
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: [
      'apps/web/src/shared/api/**',
      'apps/web/src/shared/errors/**',
      'apps/web/src/test/fakeAdapter.ts',
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['axios', 'axios/*'],
              message: 'Only shared/api imports axios. Use what @shared/api exports.',
            },
          ],
        },
      ],
    },
  },
  {
    // shared/errors names Axios's error type, and nothing more, so it never holds the transport.
    files: ['apps/web/src/shared/errors/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['axios', 'axios/*'],
              allowTypeImports: true,
              message:
                'shared/errors imports only Axios’s types (import type). The transport is shared/api.',
            },
          ],
        },
      ],
    },
  },
  {
    // The import rules see only import declarations; a lazy import() or a require() of Axios is held
    // to the same boundary, shared/errors included, since neither can be type-only.
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/shared/api/**', 'apps/web/src/test/fakeAdapter.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        // `axios`, or a path inside it (`axios/…`); a selector's regex cannot hold a slash.
        ...[
          "ImportExpression[source.value='axios']",
          'ImportExpression[source.value=/^axios[^a-z-]/]',
          "CallExpression[callee.name='require'][arguments.0.value='axios']",
          "CallExpression[callee.name='require'][arguments.0.value=/^axios[^a-z-]/]",
        ].map((selector) => ({
          selector,
          message: 'Only shared/api imports axios. Use what @shared/api exports.',
        })),
      ],
    },
  },
]);
