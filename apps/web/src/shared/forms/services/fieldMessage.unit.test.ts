import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { fieldMessage } from './fieldMessage';

const copy = CATALOGUES.en;

describe('fieldMessage', () => {
  it('says nothing for a field without an error', () => {
    expect(fieldMessage(copy, undefined)).toBeUndefined();
  });

  it("reads the catalogue's line for the code", () => {
    expect(fieldMessage(copy, { type: 'too_long' })).toBe(copy.validation.too_long);
  });

  it("prefers the form's own line for the code", () => {
    expect(fieldMessage(copy, { type: 'too_short' }, { too_short: 'Enter your name' })).toBe(
      'Enter your name',
    );
  });

  it("keeps the catalogue's line for a code the form has no line for", () => {
    expect(fieldMessage(copy, { type: 'required' }, { too_short: 'Enter your name' })).toBe(
      copy.validation.required,
    );
  });

  it('reads a type that is no field-error code as invalid_format', () => {
    expect(fieldMessage(copy, { type: 'pattern' })).toBe(copy.validation.invalid_format);
  });
});
