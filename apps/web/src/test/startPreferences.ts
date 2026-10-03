import { CATALOGUES, type Language } from '@shared/copy';
import { setupLocalisation } from '@shared/localisation';
import { preferencesLanguage, setupPreferences } from '@shared/preferences';
import { vi } from 'vitest';

/**
 * Starts the preferences and the copy on jsdom's page, as the app's bootstrap does, for a device
 * that prefers the light scheme and a page the pre-paint script left in `language`. It stubs
 * `matchMedia`, which jsdom lacks; the test file restores it with `vi.unstubAllGlobals()`.
 */
export function startPreferences(language: Language): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  window.localStorage.clear();
  document.documentElement.lang = language;
  setupPreferences();
  setupLocalisation({ catalogues: CATALOGUES, language: preferencesLanguage });
}
