import { CATALOGUES, type Language } from '@shared/copy';
import { THEMES, type Theme } from '@shared/design-system';
import { directionOf, FALLBACK_LANGUAGE, type LanguageSource } from '@shared/localisation';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { browserPlatform, type Platform, type StorageChange } from './platform';

/**
 * Where the choices persist, each as a plain string. The pre-paint script in index.html reads the
 * same keys before the bundle loads, and a test holds the two to the same keys and values
 * (docs/frontend/localisation.md#mechanism).
 */
export const PREFERENCE_KEYS = { language: 'masaha.language', theme: 'masaha.theme' } as const;

/** Every theme the design system defines, and `system`: follow the device, live, storing nothing. */
export const THEME_CHOICES = [...THEMES, 'system'] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number];

export type Preferences = {
  language: Language;
  /** What the user chose. */
  themeChoice: ThemeChoice;
  /** The theme shown: the choice, or the device's while the choice is `system`. */
  theme: Theme;
};

type Setup = { store: StoreApi<Preferences>; platform: Platform; stop: () => void };

let setup: Setup | undefined;

function active(): Setup {
  if (!setup) {
    throw new Error('setupPreferences must run before a preference is read or set.');
  }
  return setup;
}

function isLanguage(value: string | null): value is Language {
  return value !== null && Object.hasOwn(CATALOGUES, value);
}

function isTheme(value: string | null): value is Theme {
  return THEMES.some((theme) => theme === value);
}

/** A stored value, or null when there is none or storage cannot be read. */
function stored({ storage }: Platform, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** Persists a choice. Blocked storage loses it on reload, but the page still applies it now. */
function persist(write: () => void): void {
  try {
    write();
  } catch {
    // Nothing to do: the choice holds for this page.
  }
}

function storedThemeChoice(platform: Platform): ThemeChoice {
  const theme = stored(platform, PREFERENCE_KEYS.theme);
  return isTheme(theme) ? theme : 'system';
}

function themeState(platform: Platform, themeChoice: ThemeChoice): Omit<Preferences, 'language'> {
  const device = platform.prefersDark.matches ? 'dark' : 'light';
  return { themeChoice, theme: themeChoice === 'system' ? device : themeChoice };
}

function paint({ root }: Platform, { language, theme }: Preferences): void {
  root.lang = language;
  root.dir = directionOf(language);
  root.dataset.theme = theme;
}

/**
 * Starts the store at bootstrap, from what the pre-paint script resolved: the language on <html>,
 * and the stored theme, else the device's. It writes nothing to storage, so a language taken from
 * the browser is never stored as a choice. A second call replaces the first and stops its listeners.
 */
export function setupPreferences(platform: Platform = browserPlatform()): void {
  setup?.stop();

  const language = platform.root.lang;
  const store = createStore<Preferences>()(() => ({
    // The fallback is typed as a Language, so removing its catalogue fails the typecheck here.
    language: isLanguage(language) ? language : FALLBACK_LANGUAGE,
    ...themeState(platform, storedThemeChoice(platform)),
  }));

  paint(platform, store.getState());
  const stopPainting = store.subscribe((preferences) => {
    paint(platform, preferences);
  });

  // While the choice is `system`, the theme follows the device as it changes.
  const onDeviceChange = () => {
    const { themeChoice } = store.getState();
    if (themeChoice === 'system') {
      store.setState(themeState(platform, themeChoice));
    }
  };

  // Another tab changed a choice. Its value is read back from storage (a cleared key reports null)
  // and applied here without being written again.
  const onStorage = ({ key }: StorageChange) => {
    if (key === null || key === PREFERENCE_KEYS.language) {
      const language = stored(platform, PREFERENCE_KEYS.language);
      if (isLanguage(language)) {
        store.setState({ language });
      }
    }
    if (key === null || key === PREFERENCE_KEYS.theme) {
      store.setState(themeState(platform, storedThemeChoice(platform)));
    }
  };

  platform.prefersDark.addEventListener('change', onDeviceChange);
  platform.events.addEventListener('storage', onStorage);

  setup = {
    store,
    platform,
    stop: () => {
      stopPainting();
      platform.prefersDark.removeEventListener('change', onDeviceChange);
      platform.events.removeEventListener('storage', onStorage);
    },
  };
}

/** The preferences now, for code that is not a component. */
export function getPreferences(): Preferences {
  return active().store.getState();
}

/** A selected preference; the component renders again only when that value changes. */
export function usePreferences<T>(select: (preferences: Preferences) => T): T {
  return useStore(active().store, select);
}

/** Stores the language and applies it, with its direction. */
export function setLanguage(language: Language): void {
  const { store, platform } = active();
  persist(() => {
    platform.storage.setItem(PREFERENCE_KEYS.language, language);
  });
  store.setState({ language });
}

/** Stores a theme and applies it; `system` removes the stored theme and follows the device. */
export function setTheme(themeChoice: ThemeChoice): void {
  const { store, platform } = active();
  persist(() => {
    if (themeChoice === 'system') {
      platform.storage.removeItem(PREFERENCE_KEYS.theme);
    } else {
      platform.storage.setItem(PREFERENCE_KEYS.theme, themeChoice);
    }
  });
  store.setState(themeState(platform, themeChoice));
}

/**
 * The localisation mechanism's language source, handed in at bootstrap. It reports only a change
 * of language, so a theme change renders no copy again.
 */
export const preferencesLanguage: LanguageSource = {
  current: () => getPreferences().language,
  subscribe: (listener) =>
    active().store.subscribe((next, previous) => {
      if (next.language !== previous.language) {
        listener();
      }
    }),
};
