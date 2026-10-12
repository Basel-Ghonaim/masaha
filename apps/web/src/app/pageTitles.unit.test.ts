import { dashboardRoutes } from '@pages/dashboard';
import { siteRoutes } from '@pages/site';
import { CATALOGUES, type Language } from '@shared/copy';
import { DASHBOARD_PATHS, type TitledHandle } from '@shared/routing';
import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';

/** Every route that shows a page: those with no routes below them. */
function pagesOf(routes: RouteObject[]): RouteObject[] {
  return routes.flatMap((route) => (route.children ? pagesOf(route.children) : [route]));
}

/** `/dashboard` only redirects: it shows nothing of its own to title. */
const pages = pagesOf([...siteRoutes, ...dashboardRoutes]).filter(
  ({ path }) => path !== DASHBOARD_PATHS.home,
);

const name = ({ path, index }: RouteObject) => (index ? '(index)' : (path ?? '(no path)'));

describe('the pages’ titles', () => {
  it('cover the pages of the site and the dashboard', () => {
    // A guard against a walk that finds nothing, which would let every check below pass.
    expect(pages.length).toBeGreaterThan(20);
  });

  it.each(Object.keys(CATALOGUES) as Language[])(
    'give every page of the site and the dashboard a title in %s',
    (language) => {
      const untitled = pages
        .filter((page) => {
          const handle = page.handle as Partial<TitledHandle> | undefined;
          return !handle?.title?.(CATALOGUES[language]);
        })
        .map(name);

      expect(untitled).toEqual([]);
    },
  );
});
