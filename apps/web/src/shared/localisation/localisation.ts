import { useSyncExternalStore } from 'react';

/**
 * Where the active language comes from: its value now, and a way to hear it change. The composition
 * root chooses the source, so the preferences store can replace the interim one without touching
 * this mechanism (docs/frontend/localisation.md#catalogues).
 */
export type LanguageSource = {
  current: () => string;
  subscribe: (listener: () => void) => () => void;
};

type Localisation = {
  /** One catalogue per language, keyed by its code. Having a catalogue is what registers a language. */
  catalogues: Readonly<Record<string, object>>;
  language: LanguageSource;
};

/**
 * The language a reader gets when the source names none that is registered, as the pre-paint script
 * falls back to it; a test holds the two equal.
 */
export const FALLBACK_LANGUAGE = 'ar';

// Handed in by the composition root and never imported: content travels into the platform, so this
// knows a catalogue only as an object keyed by language.
let localisation: Localisation | undefined;

/** Registers the catalogues and the language source. Runs once, at bootstrap, before any read. */
export function setupLocalisation(next: Localisation): void {
  if (!Object.hasOwn(next.catalogues, FALLBACK_LANGUAGE)) {
    throw new Error(`The fallback language "${FALLBACK_LANGUAGE}" has no catalogue.`);
  }
  localisation = next;
}

function registered(): Localisation {
  if (!localisation) {
    throw new Error('setupLocalisation must run before the language or a catalogue is read.');
  }
  return localisation;
}

/** The active language: the source's, when a catalogue is registered for it, else the fallback. */
export function currentLanguage(): string {
  const { catalogues, language } = registered();
  const candidate = language.current();
  return Object.hasOwn(catalogues, candidate) ? candidate : FALLBACK_LANGUAGE;
}

function activeCatalogue(): object {
  const { catalogues } = registered();
  const language = currentLanguage();
  const catalogue = catalogues[language];
  if (!catalogue) {
    throw new Error(`The language "${language}" has no catalogue.`);
  }
  return catalogue;
}

function subscribe(listener: () => void): () => void {
  return registered().language.subscribe(listener);
}

// Both readers return the catalogue untyped: its shape belongs to the content (shared/copy), which
// types what it registered.

/**
 * The active language's catalogue, for code that is not a component. Read it when the words are
 * needed, never while a module loads, or it holds one language's words for the life of the page.
 */
export function currentCatalogue(): object {
  return activeCatalogue();
}

/** The active language's catalogue; the component renders again when the language changes. */
export function useCatalogue(): object {
  return useSyncExternalStore(subscribe, activeCatalogue);
}

/** The active language; the component renders again when it changes. */
export function useLanguage(): string {
  return useSyncExternalStore(subscribe, currentLanguage);
}
