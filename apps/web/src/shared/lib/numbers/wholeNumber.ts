import { toWesternDigits } from './westernDigits';

/**
 * A whole number as typed, for a form's schema to read: blank is none (`undefined`); digits, Western
 * or Arabic-Indic, the number; anything else the text itself, which the schema refuses as a wrong
 * type, so its field says so.
 */
export function wholeNumberOf(text: string): number | string | undefined {
  const typed = toWesternDigits(text.trim());
  if (typed === '') return undefined;
  return /^\d+$/.test(typed) ? Number(typed) : text;
}
