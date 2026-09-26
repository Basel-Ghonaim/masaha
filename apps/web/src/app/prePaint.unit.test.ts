import { describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';

type Browser = {
  stored?: Record<string, string>;
  storageThrows?: boolean;
  prefersDark?: boolean;
  languages?: string[];
};

const script = /<script>([\s\S]*?)<\/script>/.exec(indexHtml)?.[1];

/** Runs the inline pre-paint script exactly as index.html ships it, against a stand-in browser. */
function prePaint({
  stored = {},
  storageThrows = false,
  prefersDark = false,
  languages = [],
}: Browser) {
  if (!script) {
    throw new Error('index.html has no inline pre-paint script');
  }
  const root = { dataset: {} as Record<string, string>, lang: '', dir: '' };
  const window = {
    localStorage: {
      getItem: (key: string) => {
        if (storageThrows) {
          throw new Error('SecurityError');
        }
        return stored[key] ?? null;
      },
    },
    matchMedia: (query: string) => ({
      matches: prefersDark && query === '(prefers-color-scheme: dark)',
    }),
    navigator: { languages },
  };
  // The script is plain JavaScript inside index.html, so it is evaluated rather than imported.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const run = new Function('window', 'document', script) as (w: unknown, d: unknown) => void;
  run(window, { documentElement: root });
  return { theme: root.dataset.theme, lang: root.lang, dir: root.dir };
}

describe('pre-paint theme', () => {
  it.each([
    { stored: 'dark', prefersDark: false, theme: 'dark' },
    { stored: 'light', prefersDark: true, theme: 'light' },
  ])(
    'applies a stored $stored theme over the system preference',
    ({ stored, prefersDark, theme }) => {
      expect(prePaint({ stored: { 'masaha.theme': stored }, prefersDark }).theme).toBe(theme);
    },
  );

  it.each([
    { prefersDark: true, theme: 'dark' },
    { prefersDark: false, theme: 'light' },
  ])('follows the system preference when none is stored: $theme', ({ prefersDark, theme }) => {
    expect(prePaint({ prefersDark }).theme).toBe(theme);
  });

  it('ignores a stored theme it does not recognise', () => {
    expect(prePaint({ stored: { 'masaha.theme': 'sepia' }, prefersDark: true }).theme).toBe('dark');
  });
});

describe('pre-paint language and direction', () => {
  it.each([
    { name: 'a stored language wins', stored: 'en', languages: ['ar-EG'], lang: 'en', dir: 'ltr' },
    {
      name: 'a regional tag matches its base',
      stored: '',
      languages: ['ar-EG'],
      lang: 'ar',
      dir: 'rtl',
    },
    {
      name: 'the first registered language wins',
      stored: '',
      languages: ['fr', 'en-US', 'ar'],
      lang: 'en',
      dir: 'ltr',
    },
    {
      name: 'no registered language falls back to Arabic',
      stored: '',
      languages: ['fr', 'de'],
      lang: 'ar',
      dir: 'rtl',
    },
    {
      name: 'no browser language falls back to Arabic',
      stored: '',
      languages: [],
      lang: 'ar',
      dir: 'rtl',
    },
    {
      name: 'an unknown stored language is ignored',
      stored: 'fr',
      languages: ['en-GB'],
      lang: 'en',
      dir: 'ltr',
    },
  ])('$name', ({ stored, languages, lang, dir }) => {
    const result = prePaint({ stored: stored ? { 'masaha.language': stored } : {}, languages });
    expect({ lang: result.lang, dir: result.dir }).toEqual({ lang, dir });
  });
});

describe('pre-paint storage', () => {
  it('falls through to the browser when storage cannot be read', () => {
    expect(prePaint({ storageThrows: true, prefersDark: true, languages: ['en-US'] })).toEqual({
      theme: 'dark',
      lang: 'en',
      dir: 'ltr',
    });
  });
});
