import { loginSchema, registerSchema } from '@masaha/shared/auth';
import { FIELD_ERROR_CODES } from '@masaha/shared/core';
import { createSpaceSchema } from '@masaha/shared/spaces';
import type { FieldErrors, FieldValues, ResolverOptions } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { schemaResolver, type FormSchema } from './schemaResolver';

const OPTIONS: ResolverOptions<FieldValues> = { fields: {}, shouldUseNativeValidation: false };

async function resolve(schema: FormSchema<unknown>, values: FieldValues) {
  return schemaResolver(schema)(values, undefined, OPTIONS);
}

/** Each field's error type: the code the form shows a line for. */
function typesOf(errors: FieldErrors): Record<string, unknown> {
  return Object.fromEntries(Object.entries(errors).map(([field, error]) => [field, error?.type]));
}

describe('schemaResolver over the shared schemas', () => {
  it('names an empty sign-in with the codes the server sends for it', async () => {
    const { errors } = await resolve(loginSchema, { email: '', password: '' });

    expect(typesOf(errors)).toEqual({ email: 'invalid_format', password: 'too_short' });
  });

  it.each([
    ['an empty name', { name: '' }, 'name', 'too_short'],
    ['a missing name', { name: undefined }, 'name', 'required'],
    ['a malformed email', { email: 'sara@' }, 'email', 'invalid_format'],
    ['a password under 8 characters', { password: 'gaza1' }, 'password', 'too_short'],
    ['a password without a digit', { password: 'gazagaza' }, 'password', 'invalid_format'],
    ['a password over 72 bytes', { password: `${'ب'.repeat(36)}1` }, 'password', 'too_long'],
    ['a language with no catalogue', { language: 'fr' }, 'language', 'invalid_choice'],
  ])('names %s at registration with its field-error code', async (_case, change, field, code) => {
    const values = { name: 'Sara', email: 'sara@example.com', password: 'gaza2026', ...change };

    const { errors } = await resolve(registerSchema, values);

    expect(typesOf(errors)).toEqual({ [field]: code });
  });

  it("yields only the contract's field-error codes, never Zod's own", async () => {
    const { errors } = await resolve(registerSchema, {
      name: 3,
      email: '',
      password: 'abc',
      language: 'fr',
    });

    const types = Object.values(typesOf(errors));
    expect(types).toEqual(['invalid_format', 'invalid_format', 'too_short', 'invalid_choice']);
    for (const type of types) {
      expect(FIELD_ERROR_CODES).toContain(type);
    }
  });

  it('fails the whole form with a root error for an issue about the values as a whole', async () => {
    const wholeObject = loginSchema.refine(() => false);

    const result = await resolve(wholeObject, { email: 'sara@example.com', password: 'x' });

    expect(result).toEqual({
      values: {},
      errors: { root: { schema: { type: 'invalid_format' } } },
    });
  });

  it('gives the form the parsed values when they pass', async () => {
    const result = await resolve(loginSchema, { email: '  Sara@Example.COM ', password: 'x' });

    expect(result).toEqual({ values: { email: 'sara@example.com', password: 'x' }, errors: {} });
  });
});

describe('schemaResolver with a preparation of the values', () => {
  // A space's profile as its form holds it: every field as text, the pin's coordinates included.
  const PROFILE = {
    nameEn: 'Focus Hub',
    nameAr: '',
    areaId: 11,
    addressAr: 'شارع النصر',
    location: '',
  };
  // Blank text is no value, and the coordinates' text is read as a point.
  const prepare = (values: FieldValues) => {
    const input = Object.fromEntries(
      Object.entries(values).filter(
        ([, value]) => typeof value !== 'string' || value.trim() !== '',
      ),
    );
    if (typeof input.location === 'string') {
      const [lat, lng] = input.location.split(',').map(Number);
      input.location = { lat, lng };
    }
    return input;
  };

  it('reads each code from the prepared input, not from the fields', async () => {
    const { errors } = await schemaResolver(createSpaceSchema, prepare)(
      PROFILE,
      undefined,
      OPTIONS,
    );

    // Unprepared, the blank Arabic name would be too short and the blank pin malformed.
    expect(typesOf(errors)).toEqual({ location: 'required' });
  });

  it('gives the form the parsed values of the prepared input', async () => {
    const result = await schemaResolver(createSpaceSchema, prepare)(
      { ...PROFILE, location: '31.52, 34.45' },
      undefined,
      OPTIONS,
    );

    expect(result).toEqual({
      values: {
        nameEn: 'Focus Hub',
        areaId: 11,
        addressAr: 'شارع النصر',
        location: { lat: 31.52, lng: 34.45 },
      },
      errors: {},
    });
  });
});
