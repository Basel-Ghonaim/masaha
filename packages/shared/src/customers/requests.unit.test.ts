import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { createCustomerSchema, updateCustomerSchema } from './requests.ts';

/** The field errors a create request fails with, or null when it passes. */
function errorsOf(body: object) {
  const result = createCustomerSchema.safeParse(body);
  return result.success ? null : toFieldErrors(result.error.issues, body);
}

/** The field errors an edit request fails with, or null when it passes. */
function errorsOfEdit(body: object) {
  const result = updateCustomerSchema.safeParse(body);
  return result.success ? null : toFieldErrors(result.error.issues, body);
}

describe('createCustomerSchema', () => {
  it('takes a name of 1–60 characters, trimmed, with or without a phone, normalised', () => {
    expect(createCustomerSchema.parse({ name: '  سارة  ' })).toEqual({ name: 'سارة' });
    expect(createCustomerSchema.parse({ name: 'Sara', phone: '059-900 0123' })).toEqual({
      name: 'Sara',
      phone: '+970599000123',
    });
    expect(errorsOf({ name: 'a'.repeat(60) })).toBeNull();
    expect(errorsOf({ name: 'a'.repeat(61) })).toEqual({ name: ['too_long'] });
    expect(errorsOf({ name: '   ' })).toEqual({ name: ['too_short'] });
    expect(errorsOf({})).toEqual({ name: ['required'] });
  });

  it('refuses a phone that is not a Palestinian or Israeli number, and a null one', () => {
    expect(errorsOf({ name: 'Sara', phone: '12345' })).toEqual({ phone: ['invalid_format'] });
    expect(errorsOf({ name: 'Sara', phone: null })).not.toBeNull();
  });
});

describe('updateCustomerSchema', () => {
  it('takes the name, the phone, both or neither; null clears the phone, never the name', () => {
    expect(updateCustomerSchema.parse({})).toEqual({});
    expect(updateCustomerSchema.parse({ phone: null })).toEqual({ phone: null });
    expect(updateCustomerSchema.parse({ name: ' Omar ', phone: '0599000123' })).toEqual({
      name: 'Omar',
      phone: '+970599000123',
    });
    expect(errorsOfEdit({ name: null })).not.toBeNull();
    expect(errorsOfEdit({ phone: 'abc' })).toEqual({ phone: ['invalid_format'] });
  });
});
