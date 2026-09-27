import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { toValidationError } from './validate.ts';

function errorFor(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  if (result.success) throw new Error('expected the input to fail');
  return toValidationError(result.error.issues, input);
}

function fieldErrorsFor(schema: z.ZodType, input: unknown) {
  const error = errorFor(schema, input);
  expect(error.type).toBe('validation');
  return error.errors;
}

describe('toValidationError', () => {
  it.each([
    ['a missing value', z.object({ name: z.string() }), {}, 'required'],
    ['a value of the wrong type', z.object({ name: z.string() }), { name: 3 }, 'invalid_format'],
    ['a string too short', z.object({ name: z.string().min(2) }), { name: 'a' }, 'too_short'],
    ['a string too long', z.object({ name: z.string().max(2) }), { name: 'abc' }, 'too_long'],
    [
      'an array too short',
      z.object({ tags: z.array(z.string()).min(1) }),
      { tags: [] },
      'too_short',
    ],
    [
      'an array too long',
      z.object({ tags: z.array(z.string()).max(1) }),
      { tags: ['a', 'b'] },
      'too_long',
    ],
    ['a number too small', z.object({ age: z.number().min(1) }), { age: 0 }, 'out_of_range'],
    ['a number too big', z.object({ age: z.number().max(1) }), { age: 2 }, 'out_of_range'],
    ['a number off its step', z.object({ n: z.number().multipleOf(5) }), { n: 3 }, 'out_of_range'],
    [
      'a date too early',
      z.object({ at: z.date().min(new Date(1)) }),
      { at: new Date(0) },
      'out_of_range',
    ],
    ['a malformed format', z.object({ email: z.email() }), { email: 'x' }, 'invalid_format'],
    [
      'a value outside an enum',
      z.object({ kind: z.enum(['a', 'b']) }),
      { kind: 'c' },
      'invalid_choice',
    ],
    [
      'a value outside a literal',
      z.object({ kind: z.literal('a') }),
      { kind: 'b' },
      'invalid_choice',
    ],
    [
      'a failed union',
      z.object({ u: z.union([z.string(), z.number()]) }),
      { u: true },
      'invalid_format',
    ],
    [
      'a refinement naming its code',
      z.object({ phone: z.string().refine(() => false, { params: { code: 'not_unique' } }) }),
      { phone: '0590000000' },
      'not_unique',
    ],
    [
      'a refinement without a known code',
      z.object({ phone: z.string().refine(() => false, { params: { code: 'nope' } }) }),
      { phone: '0590000000' },
      'invalid_format',
    ],
  ])('maps %s', (_case, schema, input, code) => {
    const field = Object.keys((schema as z.ZodObject).shape)[0] ?? '';

    expect(fieldErrorsFor(schema, input)).toEqual({ [field]: [code] });
  });

  it('keys nested fields by their dotted path', () => {
    const schema = z.object({ items: z.array(z.object({ qty: z.int() })) });

    expect(fieldErrorsFor(schema, { items: [{ qty: 1 }, { qty: 'a' }] })).toEqual({
      'items.1.qty': ['invalid_format'],
    });
  });

  it('collects every failing field, and each code once per field', () => {
    const schema = z.object({
      name: z
        .string()
        .min(2)
        .regex(/^[a-z]+$/)
        .regex(/^[a-y]+$/),
      age: z.number(),
    });

    expect(fieldErrorsFor(schema, { name: 'Z' })).toEqual({
      name: ['too_short', 'invalid_format'],
      age: ['required'],
    });
  });

  it('reports unknown keys of a strict object under each key', () => {
    const schema = z.strictObject({ name: z.string() });

    expect(fieldErrorsFor(schema, { name: 'a', role: 'ADMIN' })).toEqual({
      role: ['invalid_format'],
    });
  });

  it.each([
    ['no input', undefined],
    ['input that is not an object', 'text'],
  ])('treats %s as a malformed request', (_case, input) => {
    const error = errorFor(z.object({ name: z.string() }), input);

    expect(error.type).toBe('bad_request');
    expect(error.errors).toBeUndefined();
  });
});
