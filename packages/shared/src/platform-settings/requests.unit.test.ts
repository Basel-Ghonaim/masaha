import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { platformContactSchema, stalenessSchema } from './requests.ts';

/** The field errors a body fails `schema` with, or null when it passes. */
function errorsOf(schema: typeof stalenessSchema | typeof platformContactSchema, body: object) {
  const result = schema.safeParse(body);
  return result.success ? null : toFieldErrors(result.error.issues, body);
}

describe('stalenessSchema', () => {
  it('takes each threshold as whole days from 1 to 365, both required', () => {
    expect(errorsOf(stalenessSchema, { stalenessDays: 1, priceStalenessDays: 365 })).toBeNull();
    expect(errorsOf(stalenessSchema, { stalenessDays: 60, priceStalenessDays: 30 })).toBeNull();

    expect(errorsOf(stalenessSchema, { stalenessDays: 0, priceStalenessDays: 366 })).toEqual({
      stalenessDays: ['out_of_range'],
      priceStalenessDays: ['out_of_range'],
    });
    expect(errorsOf(stalenessSchema, { stalenessDays: 6000, priceStalenessDays: 30 })).toEqual({
      stalenessDays: ['out_of_range'],
    });
    expect(errorsOf(stalenessSchema, { stalenessDays: 1.5, priceStalenessDays: 30 })).toEqual({
      stalenessDays: ['invalid_format'],
    });
    expect(errorsOf(stalenessSchema, { stalenessDays: 60 })).toEqual({
      priceStalenessDays: ['required'],
    });
  });
});

describe('platformContactSchema', () => {
  it('lowercases the email and normalises the WhatsApp number (a Jawwal number to +970); null clears either', () => {
    expect(
      platformContactSchema.parse({ email: ' Hello@Masaha.PS ', whatsapp: '059-123 4567' }),
    ).toEqual({ email: 'hello@masaha.ps', whatsapp: '+970591234567' });
    expect(platformContactSchema.parse({ email: null, whatsapp: null })).toEqual({
      email: null,
      whatsapp: null,
    });
  });

  it('refuses an email without @, a number of another country, and a key left out', () => {
    expect(errorsOf(platformContactSchema, { email: 'masaha.ps', whatsapp: null })).toEqual({
      email: ['invalid_format'],
    });
    expect(errorsOf(platformContactSchema, { email: null, whatsapp: '+201001234567' })).toEqual({
      whatsapp: ['invalid_format'],
    });
    expect(errorsOf(platformContactSchema, { email: null })).toEqual({ whatsapp: ['required'] });
  });
});
