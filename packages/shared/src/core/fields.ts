import { z } from 'zod';

// User text is NFC-normalised, and two kinds of characters are refused (docs/backend/conventions.md
// §3): bidirectional controls, which can reorder what a reader sees, and control characters, line
// breaks included, which would let one line of text become several. Unicode's line and paragraph
// separators (U+2028, U+2029) break a line too, though they are not control characters.
const BIDI_CONTROLS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/u;
const CONTROL_CHARACTERS = /[\p{Cc}\u2028\u2029]/u;

/** One line of user text, normalised and trimmed, within `min`–`max` characters. */
export function textSchema(min: number, max: number) {
  return z
    .string()
    .normalize('NFC')
    .trim()
    .min(min)
    .max(max)
    .refine((text) => !BIDI_CONTROLS.test(text) && !CONTROL_CHARACTERS.test(text), {
      params: { code: 'invalid_format' },
    });
}

/** Stored lowercased, so one address is one account. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

// A paragraph may break lines, and nothing else: a line feed is kept (a carriage return before it is
// dropped, so every device's breaks are one), and every other control character and separator is
// refused, as in one line of text.
const PARAGRAPH_CONTROL_CHARACTERS = /(?!\n)[\p{Cc}\u2028\u2029]/u;

/**
 * Text of several lines, normalised and trimmed, within `min`–`max` characters: the rules of
 * `textSchema`, except that line breaks are allowed (as `\n`).
 */
export function paragraphSchema(min: number, max: number) {
  return z
    .string()
    .overwrite((text) => text.replace(/\r\n/g, '\n'))
    .normalize('NFC')
    .trim()
    .min(min)
    .max(max)
    .refine((text) => !BIDI_CONTROLS.test(text) && !PARAGRAPH_CONTROL_CHARACTERS.test(text), {
      params: { code: 'invalid_format' },
    });
}

/** Whether `value` is a calendar date written `YYYY-MM-DD` that exists (no 30 February). */
function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** A Gaza calendar date, `YYYY-MM-DD`, that exists; anything else is `invalid_format`. */
export const dateSchema = z.string().refine(isCalendarDate, { params: { code: 'invalid_format' } });
