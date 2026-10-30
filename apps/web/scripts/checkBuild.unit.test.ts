import { describe, expect, it } from 'vitest';
import {
  dashboardCycleProblems,
  dashboardProblems,
  findForbidden,
  firstDownload,
  firstDownloadCss,
  libraryProblems,
  showcaseOnly,
  sitePageProblems,
  stringsIn,
  type ManifestChunk,
} from './checkBuild';

const ARABIC = 'الأيقونات والانعكاس';

// Writes every non-ASCII character as an escape, the way a minifier may.
const escapeAs = (text: string, form: 'plain' | 'braced') =>
  Array.from(text, (character) => {
    const code = character.codePointAt(0) ?? 0;
    if (code < 128) {
      return character;
    }
    const hex = code.toString(16);
    return form === 'plain' ? `\\u${hex.padStart(4, '0')}` : `\\u{${hex}}`;
  }).join('');

describe('stringsIn', () => {
  it('collects every string, however deeply nested', () => {
    expect(stringsIn({ a: 'one', b: { c: ['two', { d: 'three' }] }, e: 4, f: null })).toEqual([
      'one',
      'two',
      'three',
    ]);
  });
});

describe('showcaseOnly', () => {
  const catalogueSource = "export const TERMS = { owner: 'صاحب المساحة', expired: 'Expired' };";

  it('drops a fixture string the catalogues also write, whole or inside a longer line', () => {
    expect(showcaseOnly(['Expired', 'المساحة', 'Preview theme', ARABIC], catalogueSource)).toEqual([
      'Preview theme',
      ARABIC,
    ]);
  });
});

describe('findForbidden', () => {
  const forbidden = ['__showcase', 'Preview theme', ARABIC];

  it('finds a forbidden string written as is', () => {
    expect(findForbidden('path:"/__showcase",label:"Preview theme"', forbidden)).toEqual([
      '__showcase',
      'Preview theme',
    ]);
  });

  it.each(['plain', 'braced'] as const)('finds Arabic text written as %s escapes', (form) => {
    expect(findForbidden(`title:"${escapeAs(ARABIC, form)}"`, forbidden)).toEqual([ARABIC]);
  });

  it('finds nothing in a build file without the showcase', () => {
    expect(findForbidden('function App(){return null}', forbidden)).toEqual([]);
  });
});

describe('firstDownload', () => {
  it('holds each entry and its static imports, deeply, but no dynamic import', () => {
    const manifest: Record<string, ManifestChunk> = {
      'index.html': { isEntry: true, imports: ['_react.js', '_copy.js'] },
      '_react.js': { imports: ['_runtime.js'] },
      '_copy.js': { imports: ['_react.js'] },
      '_runtime.js': {},
      'src/pages/site/shell/SiteLayout.tsx': { imports: ['_react.js'] },
    };

    expect(firstDownload(manifest).sort()).toEqual([
      '_copy.js',
      '_react.js',
      '_runtime.js',
      'index.html',
    ]);
  });
});

describe('firstDownloadCss', () => {
  it("holds the stylesheets of the entry and its static imports, never a lazy chunk's", () => {
    const manifest: Record<string, ManifestChunk> = {
      'index.html': { isEntry: true, imports: ['_react.js'], css: ['assets/index.css'] },
      '_react.js': { css: ['assets/react.css'] },
      'src/shared/map/components/LeafletPointPicker.tsx': {
        src: 'src/shared/map/components/LeafletPointPicker.tsx',
        imports: ['_react.js'],
        css: ['assets/LeafletPointPicker.css'],
      },
    };

    expect(firstDownloadCss(manifest).sort()).toEqual(['assets/index.css', 'assets/react.css']);
  });
});

describe('dashboardProblems', () => {
  const site: Record<string, ManifestChunk> = {
    'index.html': { isEntry: true, imports: ['_react.js'] },
    '_react.js': {},
    '_dashboard.js': { name: 'dashboard', imports: ['_react.js', 'index.html'] },
    'src/pages/dashboard/shell/SpaceLayout.tsx': {
      src: 'src/pages/dashboard/shell/SpaceLayout.tsx',
    },
  };

  it('finds nothing when only lazy imports reach the dashboard', () => {
    expect(dashboardProblems(site)).toEqual([]);
  });

  it('names the dashboard chunk when the first download imports it', () => {
    const manifest = { ...site, '_react.js': { imports: ['_dashboard.js'] } };

    expect(dashboardProblems(manifest)).toEqual([
      "_dashboard.js is dashboard code in the site's first download.",
    ]);
  });

  it('names the chunk of what only the dashboard imports when the first download imports it', () => {
    const manifest = {
      ...site,
      '_shared.js': { name: 'dashboard-shared', imports: ['_react.js'] },
      '_react.js': { imports: ['_shared.js'] },
    };

    expect(dashboardProblems(manifest)).toEqual([
      "_shared.js is dashboard code in the site's first download.",
    ]);
  });

  it('names a chunk made from a dashboard module when the first download imports it', () => {
    const manifest = {
      ...site,
      'index.html': {
        isEntry: true,
        imports: ['_react.js', 'src/pages/dashboard/shell/SpaceLayout.tsx'],
      },
    };

    expect(dashboardProblems(manifest)).toEqual([
      "src/pages/dashboard/shell/SpaceLayout.tsx is dashboard code in the site's first download.",
    ]);
  });

  it('fails when the build has no dashboard chunk to hold the site against', () => {
    const manifest = Object.fromEntries(
      Object.entries(site).filter(([, chunk]) => chunk.name !== 'dashboard'),
    );

    expect(dashboardProblems(manifest)).toEqual([
      `No "dashboard" chunk in the build: the dashboard's code is not split from the site's.`,
    ]);
  });
});

describe('libraryProblems', () => {
  const site: Record<string, ManifestChunk> = {
    'index.html': { isEntry: true, imports: ['_react.js'] },
    '_react.js': {},
    '_table.js': { name: 'data-table', imports: ['_react.js'] },
    '_dashboard.js': { name: 'dashboard', imports: ['_react.js', '_table.js'] },
  };

  it('finds nothing when only lazy imports reach a library', () => {
    expect(libraryProblems(site, ['data-table'])).toEqual([]);
  });

  it("names a library's chunk when the first download imports it", () => {
    const manifest = { ...site, '_react.js': { imports: ['_table.js'] } };

    expect(libraryProblems(manifest, ['data-table'])).toEqual([
      "_table.js is data-table's chunk in the site's first download.",
    ]);
  });

  it('fails when the build has no chunk for a library, so the check never holds nothing', () => {
    expect(libraryProblems(site, ['data-table', 'leaflet'])).toEqual([
      'No "leaflet" chunk in the build: its library is not split from the rest.',
    ]);
  });
});

describe('sitePageProblems', () => {
  const site: Record<string, ManifestChunk> = {
    'index.html': { isEntry: true, imports: ['_react.js'] },
    '_react.js': {},
    '_table.js': { name: 'data-table', imports: ['_react.js'] },
    '_calendar.js': { name: 'calendar', imports: ['_react.js'] },
    '_reports.js': { imports: ['_react.js'] },
    'src/pages/site/public/space/SpacePage.tsx': {
      src: 'src/pages/site/public/space/SpacePage.tsx',
      isDynamicEntry: true,
      imports: ['_react.js', '_reports.js'],
      dynamicImports: ['_table.js'],
    },
    'src/pages/dashboard/space/reports/DataReportsPage.tsx': {
      src: 'src/pages/dashboard/space/reports/DataReportsPage.tsx',
      isDynamicEntry: true,
      imports: ['_react.js', '_table.js', '_calendar.js'],
    },
  };

  it("finds nothing when a site page reaches a library only lazily, and the dashboard's do", () => {
    expect(sitePageProblems(site, ['data-table', 'calendar'])).toEqual([]);
  });

  it("names a site page that reaches a library's chunk through its static imports", () => {
    const manifest = { ...site, '_reports.js': { imports: ['_react.js', '_table.js'] } };

    expect(sitePageProblems(manifest, ['data-table', 'calendar'])).toEqual([
      "src/pages/site/public/space/SpacePage.tsx reaches data-table's chunk (_table.js).",
    ]);
  });

  it('names each library a site page reaches, deeply', () => {
    const manifest = {
      ...site,
      '_reports.js': { imports: ['_react.js', '_table.js'] },
      '_react.js': { imports: ['_calendar.js'] },
    };

    expect(sitePageProblems(manifest, ['data-table', 'calendar']).sort()).toEqual([
      "src/pages/site/public/space/SpacePage.tsx reaches calendar's chunk (_calendar.js).",
      "src/pages/site/public/space/SpacePage.tsx reaches data-table's chunk (_table.js).",
    ]);
  });
});

describe('dashboardCycleProblems', () => {
  const build: Record<string, ManifestChunk> = {
    'index.html': { isEntry: true, imports: ['_react.js'] },
    '_react.js': {},
    '_dashboard-shared.js': { name: 'dashboard-shared', imports: ['_react.js'] },
    '_dashboard.js': {
      name: 'dashboard',
      imports: ['_react.js', '_dashboard-shared.js', 'index.html'],
    },
    'src/pages/dashboard/shell/SpaceLayout.tsx': {
      src: 'src/pages/dashboard/shell/SpaceLayout.tsx',
      isDynamicEntry: true,
      imports: ['_react.js', '_dashboard.js'],
    },
  };

  it('finds nothing when what the dashboard imports never imports it back', () => {
    expect(dashboardCycleProblems(build)).toEqual([]);
  });

  it('refuses a chunk the dashboard imports that imports it back', () => {
    const manifest = {
      ...build,
      '_dashboard.js': {
        name: 'dashboard',
        imports: ['_react.js', 'src/pages/dashboard/shell/SpaceLayout.tsx'],
      },
    };

    expect(dashboardCycleProblems(manifest)).toEqual([
      'src/pages/dashboard/shell/SpaceLayout.tsx imports the dashboard chunk (_dashboard.js), which imports it.',
    ]);
  });

  it('refuses a cycle closed deeper down', () => {
    const manifest = {
      ...build,
      '_dashboard-shared.js': { name: 'dashboard-shared', imports: ['_react.js'] },
      '_react.js': { imports: ['_dashboard.js'] },
    };

    expect(dashboardCycleProblems(manifest)).toEqual([
      '_react.js imports the dashboard chunk (_dashboard.js), which imports it.',
    ]);
  });
});
