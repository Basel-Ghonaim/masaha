export type Direction = 'ltr' | 'rtl';

// Named apart from the catalogues: the direction is stamped before the first word is read.
const RIGHT_TO_LEFT_LANGUAGES: readonly string[] = ['ar'];

/** The direction a language reads in. It follows the language and is never chosen on its own. */
export function directionOf(language: string): Direction {
  return RIGHT_TO_LEFT_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
}
