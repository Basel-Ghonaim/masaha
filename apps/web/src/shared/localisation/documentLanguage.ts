import type { LanguageSource } from './localisation';

/**
 * The interim language source: `lang` on <html>, which the pre-paint script resolves from the stored
 * choice and the browser before the app loads. It only reads, so it competes with no writer. The
 * preferences store replaces it at bootstrap (docs/frontend/localisation.md#catalogues).
 */
export const documentLanguage: LanguageSource = {
  current: () => document.documentElement.lang,
  subscribe: (listener) => {
    const observer = new MutationObserver(listener);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    return () => {
      observer.disconnect();
    };
  },
};
