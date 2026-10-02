import { z } from 'zod';

// User text is NFC-normalised, and two kinds of characters are refused (docs/backend/conventions.md
// §3): bidirectional controls, which can reorder what a reader sees, and control characters, line
// breaks included, which would let one line of text become several.
const BIDI_CONTROLS = /[؜‎‏‪-‮⁦-⁩]/u;
const CONTROL_CHARACTERS = /\p{Cc}/u;

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
