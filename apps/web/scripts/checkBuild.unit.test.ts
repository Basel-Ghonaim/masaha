import { describe, expect, it } from 'vitest';
import {
  dashboardProblems,
  findForbidden,
  firstDownload,
  showcaseOnly,
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
