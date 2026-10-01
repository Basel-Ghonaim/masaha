import { z } from 'zod';

// User text is NFC-normalised, and bidirectional control characters are refused: they can reorder
// what a reader sees (docs/backend/conventions.md §3).
const BIDI_CONTROLS = /[؜‎‏‪-‮⁦-⁩]/u;

/** One line of user text, normalised and trimmed, within `min`–`max` characters. */
export function textSchema(min: number, max: number) {
  return z
    .string()
    .normalize('NFC')
    .trim()
    .min(min)
    .max(max)
    .refine((text) => !BIDI_CONTROLS.test(text), { params: { code: 'invalid_format' } });
}
