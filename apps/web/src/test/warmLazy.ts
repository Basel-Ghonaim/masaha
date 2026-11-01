import { matchRoutes, type RouteObject } from 'react-router';

// A lazy route's first import transforms its module graph, which on a busy machine can outlast a
// test's wait for what it draws (findings 55 and 87). A route test file pays it once, before its
// tests wait, by warming the modules its routes load lazily in a beforeAll with a long timeout;
// the module cache then answers each route's import at once. No test's timeout is raised.

/** Awaits each lazy module's loader once, in turn, failing as the first failing one does. */
export async function warm(...loaders: (() => Promise<unknown>)[]): Promise<void> {
  for (const load of loaders) {
    await load();
  }
}

/**
 * The lazy loaders of the routes `location` matches in `routes`, from the root down: for a file that
 * renders a route tree whose modules it may not import itself (app/ imports no page's file).
 */
export function routeLoaders(routes: RouteObject[], location: string): (() => Promise<unknown>)[] {
  return (matchRoutes(routes, location) ?? []).flatMap(({ route: { lazy } }) => {
    if (lazy === undefined) {
      return [];
    }
    if (typeof lazy === 'function') {
      return [() => lazy()];
    }
    const loads: (undefined | (() => Promise<unknown>))[] = Object.values(lazy);
    return loads.flatMap((load) => (load === undefined ? [] : [load]));
  });
}
