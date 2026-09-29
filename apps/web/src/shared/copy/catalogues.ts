import { currentCatalogue, useCatalogue } from '@shared/localisation';
import { ARABIC } from './arabic';
import { ENGLISH } from './english';
import type { Catalogue } from './shape';

/**
 * One catalogue per language a reader can be given, keyed by its code. The pre-paint script in
 * index.html lists the same languages, and a test holds the two equal.
 */
export const CATALOGUES = { ar: ARABIC, en: ENGLISH } satisfies Record<string, Catalogue>;

export type Language = keyof typeof CATALOGUES;

// The mechanism returns whichever catalogue the composition root registered, which is CATALOGUES.

/** The active language's words; the component renders again when the language changes. */
export function useCopy(): Catalogue {
  return useCatalogue() as Catalogue;
}

/** The active language's words, for code that is not a component; read them when they are needed. */
export function currentCopy(): Catalogue {
  return currentCatalogue() as Catalogue;
}
