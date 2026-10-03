import { CATALOGUES, type Language } from '@shared/copy';

const LANGUAGES = Object.keys(CATALOGUES) as Language[];

/**
 * The language the toggle offers: the one not shown. A toggle switches between exactly two
 * languages; a third needs a real switcher, and this function's unit test fails until it has one.
 */
export function otherLanguage(language: Language): Language {
  return LANGUAGES.find((candidate) => candidate !== language) ?? language;
}
