import { CATALOGUES, type Language } from '@shared/copy';
import { THEMES } from '@shared/design-system';
import { directionOf } from '@shared/localisation';
import { describe, expect, it, vi } from 'vitest';
import { fakePlatform } from '../../test/fakePlatform';
import {
  getPreferences,
  PREFERENCE_KEYS,
  preferencesLanguage,
  setLanguage,
  setTheme,
  setupPreferences,
  THEME_CHOICES,
} from './preferences';

const LANGUAGES = Object.keys(CATALOGUES) as Language[];

/** Starts the store on a stand-in browser, as bootstrap starts it on the real one. */
function start(browser: Parameters<typeof fakePlatform>[0] = {}) {
  const fake = fakePlatform(browser);
  setupPreferences(fake.platform);
  return fake;
}

describe('the preferences at start', () => {
  it.each([
    { prefersDark: true, theme: 'dark' },
    { prefersDark: false, theme: 'light' },
  ])('follow the device when no theme is stored: $theme', ({ prefersDark, theme }) => {
    start({ prefersDark });

    expect(getPreferences()).toMatchObject({ themeChoice: 'system', theme });
  });

  it.each(THEMES)('take a stored %s theme as the choice, over the device', (theme) => {
    start({ stored: { [PREFERENCE_KEYS.theme]: theme }, prefersDark: theme === 'light' });

    expect(getPreferences()).toMatchObject({ themeChoice: theme, theme });
  });

  it('ignore a stored theme the design system does not define', () => {
    start({ stored: { [PREFERENCE_KEYS.theme]: 'sepia' }, prefersDark: true });

    expect(getPreferences()).toMatchObject({ themeChoice: 'system', theme: 'dark' });
  });

  it.each(LANGUAGES)('take the language %s that the pre-paint script left on <html>', (lang) => {
    start({ lang });

    expect(getPreferences().language).toBe(lang);
  });

  it.each(['fr', '', 'EN'])('fall back to Arabic when <html> names "%s"', (lang) => {
    start({ lang });

    expect(getPreferences().language).toBe('ar');
  });

  it('paint <html> and store nothing', () => {
    const fake = start({ lang: 'en', prefersDark: true });

    expect(fake.root).toMatchObject({ lang: 'en', dir: 'ltr', dataset: { theme: 'dark' } });
    expect(fake.stored()).toEqual({});
  });

  it('cannot be read before setup', async () => {
    vi.resetModules();
    const fresh = await import('./preferences');

    expect(() => fresh.getPreferences()).toThrow(/setupPreferences must run/);
  });
});

describe('the theme choices', () => {
  it('are every theme the design system defines, and the device', () => {
    expect(THEME_CHOICES).toEqual([...THEMES, 'system']);
  });

  it.each(THEMES)('store %s as a plain string and paint it', (theme) => {
    const fake = start({ prefersDark: theme === 'light' });

    setTheme(theme);

    expect(fake.stored()).toEqual({ [PREFERENCE_KEYS.theme]: theme });
    expect(getPreferences()).toMatchObject({ themeChoice: theme, theme });
    expect(fake.root.dataset.theme).toBe(theme);
  });

  it('remove the stored theme for the device, and show the device theme', () => {
    const fake = start({ stored: { [PREFERENCE_KEYS.theme]: 'light' }, prefersDark: true });

    setTheme('system');

    expect(fake.stored()).toEqual({});
    expect(getPreferences()).toMatchObject({ themeChoice: 'system', theme: 'dark' });
    expect(fake.root.dataset.theme).toBe('dark');
  });

  it('follow the device live while it is the choice', () => {
    const fake = start({ prefersDark: false });

    fake.setDeviceDark(true);

    expect(getPreferences().theme).toBe('dark');
    expect(fake.root.dataset.theme).toBe('dark');

    fake.setDeviceDark(false);

    expect(fake.root.dataset.theme).toBe('light');
  });

  it('stop following the device once a theme is chosen, as the top-bar toggle chooses one', () => {
    // The toggle sets the opposite of the theme shown: here the device shows dark.
    const fake = start({ prefersDark: true });

    setTheme('light');
    fake.setDeviceDark(false);
    fake.setDeviceDark(true);

    expect(fake.stored()).toEqual({ [PREFERENCE_KEYS.theme]: 'light' });
    expect(getPreferences()).toMatchObject({ themeChoice: 'light', theme: 'light' });
    expect(fake.root.dataset.theme).toBe('light');
  });
});

describe('the language', () => {
  it.each(LANGUAGES)('stores %s as a plain string and paints it with its direction', (language) => {
    const fake = start({ lang: language === 'ar' ? 'en' : 'ar' });

    setLanguage(language);

    expect(fake.stored()).toEqual({ [PREFERENCE_KEYS.language]: language });
    expect(getPreferences().language).toBe(language);
    expect(fake.root).toMatchObject({ lang: language, dir: directionOf(language) });
  });
});

describe('another tab', () => {
  it('changes the language here', () => {
    const fake = start({ lang: 'ar' });

    fake.otherTabWrites(PREFERENCE_KEYS.language, 'en');

    expect(getPreferences().language).toBe('en');
    expect(fake.root).toMatchObject({ lang: 'en', dir: 'ltr' });
  });

  it('changes the theme here', () => {
    const fake = start({ prefersDark: false });

    fake.otherTabWrites(PREFERENCE_KEYS.theme, 'dark');

    expect(getPreferences()).toMatchObject({ themeChoice: 'dark', theme: 'dark' });
    expect(fake.root.dataset.theme).toBe('dark');
  });

  it('chooses the device here by removing the theme', () => {
    const fake = start({ stored: { [PREFERENCE_KEYS.theme]: 'light' }, prefersDark: true });

    fake.otherTabWrites(PREFERENCE_KEYS.theme, null);

    expect(getPreferences()).toMatchObject({ themeChoice: 'system', theme: 'dark' });
  });

  it('clearing storage follows the device and keeps the language', () => {
    const fake = start({ lang: 'en', stored: { [PREFERENCE_KEYS.theme]: 'dark' } });

    fake.otherTabWrites(null, null);

    expect(getPreferences()).toMatchObject({
      language: 'en',
      themeChoice: 'system',
      theme: 'light',
    });
  });

  it.each([
    { key: PREFERENCE_KEYS.language, value: 'fr' },
    { key: 'another.key', value: 'dark' },
  ])('changes nothing here for $key = $value', ({ key, value }) => {
    const fake = start({ lang: 'en', stored: { [PREFERENCE_KEYS.theme]: 'light' } });

    fake.otherTabWrites(key, value);

    expect(getPreferences()).toEqual({ language: 'en', themeChoice: 'light', theme: 'light' });
    expect(fake.root).toMatchObject({ lang: 'en', dataset: { theme: 'light' } });
  });

  it('reads a theme it does not define as none stored, as a reload would', () => {
    const fake = start({ stored: { [PREFERENCE_KEYS.theme]: 'light' }, prefersDark: true });

    fake.otherTabWrites(PREFERENCE_KEYS.theme, 'sepia');

    expect(getPreferences()).toMatchObject({ themeChoice: 'system', theme: 'dark' });
  });

  it('is not written back', () => {
    const fake = start({ lang: 'ar' });

    fake.otherTabWrites(PREFERENCE_KEYS.language, 'en');
    fake.otherTabWrites(PREFERENCE_KEYS.theme, 'dark');

    expect(fake.stored()).toEqual({
      [PREFERENCE_KEYS.language]: 'en',
      [PREFERENCE_KEYS.theme]: 'dark',
    });
  });
});

describe('blocked storage', () => {
  it('still applies each choice to the page', () => {
    const fake = start({ lang: 'ar', storageThrows: true, prefersDark: true });

    expect(getPreferences()).toMatchObject({ themeChoice: 'system', theme: 'dark' });

    setLanguage('en');
    setTheme('light');

    expect(getPreferences()).toMatchObject({
      language: 'en',
      themeChoice: 'light',
      theme: 'light',
    });
    expect(fake.root).toMatchObject({ lang: 'en', dir: 'ltr', dataset: { theme: 'light' } });
  });
});

describe('the language source', () => {
  it('gives the language and reports a change of language only', () => {
    start({ lang: 'ar' });
    const heard: string[] = [];
    const stop = preferencesLanguage.subscribe(() => {
      heard.push(preferencesLanguage.current());
    });

    setTheme('dark');
    setLanguage('en');
    setTheme('light');
    stop();
    setLanguage('ar');

    expect(heard).toEqual(['en']);
  });
});

describe('a second setup', () => {
  it('stops the first one listening and painting', () => {
    const first = start({ lang: 'ar', prefersDark: false });
    expect(first.listeners()).toBe(2);

    start({ lang: 'ar', prefersDark: false });
    setTheme('dark');

    expect(first.listeners()).toBe(0);
    expect(first.root.dataset.theme).toBe('light');
  });
});
