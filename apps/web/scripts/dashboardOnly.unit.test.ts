import { describe, expect, it } from 'vitest';
import { isDashboardModule } from './dashboardOnly';

describe('isDashboardModule', () => {
  it.each([
    String.raw`C:\repo\apps\web\src\pages\dashboard\shell\SpaceLayout.tsx`,
    '/repo/apps/web/src/pages/dashboard/PlaceholderPage.tsx',
    'src/pages/dashboard/shell/SpaceLayout.tsx',
    '/repo/apps/web/src/features/space-links/components/SpaceSwitcher.tsx',
    '/repo/apps/web/src/features/payments/index.ts',
  ])('counts %s as dashboard code', (id) => {
    expect(isDashboardModule(id)).toBe(true);
  });

  it.each([
    '/repo/apps/web/src/pages/dashboard/index.ts',
    '/repo/apps/web/src/pages/dashboard/routes.tsx',
    '/repo/apps/web/src/pages/dashboard/navigation.ts',
    '/repo/apps/web/src/pages/dashboard/placeOf.ts',
    '/repo/apps/web/src/features/users/components/AccountMenu.tsx',
    '/repo/apps/web/src/pages/site/shell/SiteLayout.tsx',
    '/repo/node_modules/react/index.js',
  ])('leaves %s to the site: route definitions, shared capabilities, the rest', (id) => {
    expect(isDashboardModule(id)).toBe(false);
  });
});
