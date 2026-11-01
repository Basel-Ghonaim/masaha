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

/** A module's importers, static and lazy, by its id, as the bundler knows them; null if unknown. */
export type ModuleGraph = (
  id: string,
) => { importers: readonly string[]; dynamicImporters: readonly string[] } | null;

/** The name of the chunk that holds what only the dashboard imports, besides its own code. */
export const DASHBOARD_SHARED_CHUNK = 'dashboard-shared';

/**
 * Whether a module, not dashboard code itself, is imported by the dashboard alone (finding 27): each
 * chain of its static importers ends in dashboard code, and none of them is loaded lazily, an entry
 * or unknown. Such a module has no other place: left to the bundler, it lands in a lazy dashboard
 * page's chunk, which then imports the dashboard's chunk and is imported by it. `known` keeps each
 * answer by id, so a build asks each module once.
 */
export function isDashboardShared(
  id: string,
  graph: ModuleGraph,
  known: Map<string, boolean>,
): boolean {
  const answer =
    known.get(id) ?? (!isDashboardModule(id) && importedByDashboardAlone(id, graph, known));
  known.set(id, answer);
  return answer;
}

/** Whether every chain of `id`'s static importers ends in dashboard code, none of them lazy. */
function importedByDashboardAlone(
  id: string,
  graph: ModuleGraph,
  known: Map<string, boolean>,
): boolean {
  const seen = new Set<string>();
  const pending = [id];
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    if (seen.has(next) || isDashboardModule(next) || known.get(next) === true) {
      continue;
    }
    seen.add(next);
    const info = graph(next);
    if (
      known.get(next) === false ||
      info === null ||
      info.importers.length === 0 ||
      info.dynamicImporters.length > 0
    ) {
      return false;
    }
    pending.push(...info.importers);
  }
  return true;
}
