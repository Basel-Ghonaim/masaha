// The boundary between the site and the dashboard (ADR 0011, docs/frontend/architecture.md §3), in
// the one list the lint rule (eslint.config.js), the build's dashboard chunk (vite.config.ts) and
// check:build read.

/** The capabilities only the dashboard imports: the site never pulls them in. */
export const DASHBOARD_ONLY_CAPABILITIES: readonly string[] = [
  'spaces',
  'space-settings',
  'customers',
  'subscriptions',
  'packages',
  'visits',
  'payments',
  'desk',
  'finance',
  'overview',
  'staff',
  'owners',
  'audit',
  'space-links',
];

/** The name of the chunk that holds the dashboard's code, loaded only when the dashboard opens. */
export const DASHBOARD_CHUNK = 'dashboard';

// The dashboard group's route definitions: the app's route table reads them in the site's first
// download, so they hold paths, guards and lazy imports, and nothing the pages draw.
const ROUTE_DEFINITIONS = ['index.ts', 'routes.tsx', 'navigation.ts', 'placeOf.ts'];

/**
 * Whether a module, by its id (a path, absolute or from apps/web, with either slash), is dashboard
 * code: a file of the dashboard group other than its route definitions, or of a dashboard-only
 * capability.
 */
export function isDashboardModule(id: string): boolean {
  const path = id.replaceAll('\\', '/');
  const page = /(?:^|\/)src\/pages\/dashboard\/([^?]+)/.exec(path);
  if (page) {
    return !ROUTE_DEFINITIONS.includes(page[1] ?? '');
  }
  const feature = /(?:^|\/)src\/features\/([^/]+)\//.exec(path);
  return feature !== null && DASHBOARD_ONLY_CAPABILITIES.includes(feature[1] ?? '');
}
