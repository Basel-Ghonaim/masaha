import { describe, expect, it } from 'vitest';
import { isDashboardModule, isDashboardShared, type ModuleGraph } from './dashboardOnly';

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

describe('isDashboardShared', () => {
  const PAGE = '/repo/apps/web/src/pages/dashboard/space/SettingsPage.tsx';
  const SITE = '/repo/apps/web/src/pages/site/public/space/SpacePage.tsx';
  const SCHEMA = '/repo/packages/shared/src/space-settings/settings.ts';
  const RULE = '/repo/packages/shared/src/space-settings/reminder.ts';
  const CORE = '/repo/packages/shared/src/core/index.ts';
  const PICKER = '/repo/apps/web/src/shared/map/components/LeafletPointPicker.tsx';
  const LEAFLET = '/repo/node_modules/react-leaflet/lib/index.js';

  // The graph by each module's static and dynamic importers.
  const graph = (importers: Record<string, string[]>, dynamic: Record<string, string[]> = {}) => {
    const of: ModuleGraph = (id) =>
      id in importers || id in dynamic
        ? { importers: importers[id] ?? [], dynamicImporters: dynamic[id] ?? [] }
        : null;
    return of;
  };

  it('takes a module only dashboard code imports, directly or through such modules', () => {
    const of = graph({ [SCHEMA]: [PAGE], [RULE]: [SCHEMA], [PAGE]: [] });
    const known = new Map<string, boolean>();

    expect(isDashboardShared(SCHEMA, of, known)).toBe(true);
    expect(isDashboardShared(RULE, of, known)).toBe(true);
  });

  it('leaves a module the site also imports, and what it imports', () => {
    const of = graph({ [SCHEMA]: [PAGE, SITE], [RULE]: [SCHEMA], [PAGE]: [], [SITE]: [] });

    expect(isDashboardShared(SCHEMA, of, new Map())).toBe(false);
    expect(isDashboardShared(RULE, of, new Map())).toBe(false);
  });

  it('leaves dashboard code itself to the dashboard chunk', () => {
    expect(isDashboardShared(PAGE, graph({ [PAGE]: [] }), new Map())).toBe(false);
  });

  it('leaves a module loaded lazily, and what only it imports, so it stays lazy', () => {
    const of = graph({ [PICKER]: [], [LEAFLET]: [PICKER] }, { [PICKER]: [PAGE] });

    expect(isDashboardShared(PICKER, of, new Map())).toBe(false);
    expect(isDashboardShared(LEAFLET, of, new Map())).toBe(false);
  });

  it('holds a cycle of such modules that only dashboard code enters', () => {
    const of = graph({ [SCHEMA]: [PAGE, RULE], [RULE]: [SCHEMA], [PAGE]: [] });

    expect(isDashboardShared(RULE, of, new Map())).toBe(true);
  });

  it('leaves a module with no importer, or none known', () => {
    expect(isDashboardShared(CORE, graph({ [CORE]: [] }), new Map())).toBe(false);
    expect(isDashboardShared(CORE, graph({}), new Map())).toBe(false);
  });
});
