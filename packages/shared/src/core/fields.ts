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
