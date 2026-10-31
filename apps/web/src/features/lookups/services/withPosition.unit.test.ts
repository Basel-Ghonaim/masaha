import { toFieldErrors } from '@masaha/shared/core';
import { updateAreaSchema } from '@masaha/shared/lookups';
import { describe, expect, it } from 'vitest';
import { offersPosition, withPosition } from './withPosition';

const schema = withPosition(updateAreaSchema, 11);

/** The field-error codes of `input`, as a form reads them. */
function codesOf(input: Record<string, unknown>) {
  const result = schema.safeParse(input);
  return result.success ? null : toFieldErrors(result.error.issues, input);
}

describe('withPosition', () => {
  it('keeps the request as the contract’s schema makes it, with the position beside it', () => {
    expect(schema.safeParse({ nameAr: ' الرمال ', nameEn: 'Al-Rimal', position: 3 })).toEqual({
      success: true,
      data: { nameAr: 'الرمال', nameEn: 'Al-Rimal', position: 3 },
    });
    expect(schema.safeParse({ nameAr: 'الرمال', nameEn: 'Al-Rimal' })).toEqual({
      success: true,
      data: { nameAr: 'الرمال', nameEn: 'Al-Rimal' },
    });
  });

  it('refuses a position blank, not a number, or outside 1 to the count, on its field', () => {
    expect(codesOf({ nameAr: 'الرمال', position: null })).toEqual({ position: ['required'] });
    expect(codesOf({ nameAr: 'الرمال', position: 'top' })).toEqual({
      position: ['invalid_format'],
    });
    expect(codesOf({ nameAr: 'الرمال', position: 0 })).toEqual({ position: ['out_of_range'] });
    expect(codesOf({ nameAr: 'الرمال', position: 12 })).toEqual({ position: ['out_of_range'] });
    expect(codesOf({ nameAr: 'الرمال', position: 11 })).toBeNull();
  });

  it('keeps the names’ own codes beside the position’s', () => {
    expect(codesOf({ nameAr: '', position: 12 })).toEqual({
      nameAr: ['too_short'],
      position: ['out_of_range'],
    });
  });
});

describe('offersPosition', () => {
  it('offers a position past ten rows only', () => {
    expect(offersPosition(10)).toBe(false);
    expect(offersPosition(11)).toBe(true);
  });
});
