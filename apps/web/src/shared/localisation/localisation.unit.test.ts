import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LanguageSource } from './localisation';

type Words = { greeting: string };

const CATALOGUES: Record<string, Words> = {
  ar: { greeting: 'مرحبًا' },
  en: { greeting: 'Hello' },
};

/** A source that names whatever language the test sets. */
function sourceNaming(initial: string) {
  let language = initial;
  const source: LanguageSource = {
    current: () => language,
    subscribe: () => () => undefined,
  };
  return {
    source,
    set: (next: string) => {
      language = next;
    },
  };
}

// The registration is module state, so each case starts from a fresh import.
beforeEach(() => {
  vi.resetModules();
});

const mechanism = () => import('./localisation');

describe('the localisation mechanism', () => {
  it('refuses a read before the catalogues are registered', async () => {
    const { currentCatalogue, currentLanguage } = await mechanism();

    expect(() => currentCatalogue()).toThrow(/setupLocalisation must run/);
    expect(() => currentLanguage()).toThrow(/setupLocalisation must run/);
  });

  it('refuses a set of catalogues without the fallback language', async () => {
    const { setupLocalisation } = await mechanism();

    expect(() => {
      setupLocalisation({
        catalogues: { en: { greeting: 'Hello' } },
        language: sourceNaming('en').source,
      });
    }).toThrow(/"ar" has no catalogue/);
  });

  it("gives the source's language and its catalogue, read again at each call", async () => {
    const { currentCatalogue, currentLanguage, setupLocalisation } = await mechanism();
    const language = sourceNaming('en');
    setupLocalisation({ catalogues: CATALOGUES, language: language.source });

    expect(currentLanguage()).toBe('en');
    expect((currentCatalogue() as Words).greeting).toBe('Hello');

    language.set('ar');

    expect(currentLanguage()).toBe('ar');
    expect((currentCatalogue() as Words).greeting).toBe('مرحبًا');
  });

  it.each(['fr', 'EN', 'en-GB', ''])(
    'falls back to Arabic when the source names "%s", which has no catalogue',
    async (named) => {
      const { currentCatalogue, currentLanguage, setupLocalisation } = await mechanism();
      setupLocalisation({ catalogues: CATALOGUES, language: sourceNaming(named).source });

      expect(currentLanguage()).toBe('ar');
      expect((currentCatalogue() as Words).greeting).toBe('مرحبًا');
    },
  );
});
