import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '../core/index.ts';
import { newSpaceDefaultsSchema, updateSpaceSettingsSchema } from './requests.ts';

/** The field errors a settings patch fails with, or null when it passes. */
function errorsOf(body: object) {
  const result = updateSpaceSettingsSchema.safeParse(body);
  return result.success ? null : toFieldErrors(result.error.issues, body);
}

describe('updateSpaceSettingsSchema', () => {
  it('takes a stay limit of whole hours from 1 to 23, or null to remove it', () => {
    expect(errorsOf({ maxStayMinutes: 60 })).toBeNull();
    expect(errorsOf({ maxStayMinutes: 1_380 })).toBeNull();
    expect(errorsOf({ maxStayMinutes: null })).toBeNull();

    expect(errorsOf({ maxStayMinutes: 0 })).toEqual({ maxStayMinutes: ['out_of_range'] });
    expect(errorsOf({ maxStayMinutes: 59 })).toEqual({ maxStayMinutes: ['out_of_range'] });
    expect(errorsOf({ maxStayMinutes: 1_440 })).toEqual({ maxStayMinutes: ['out_of_range'] });
    expect(errorsOf({ maxStayMinutes: 90 })).toEqual({ maxStayMinutes: ['out_of_range'] });
    expect(errorsOf({ maxStayMinutes: 60.5 })).toEqual({ maxStayMinutes: ['invalid_format'] });
  });

  it('takes the rounding rule and its minutes together: 1 to 59 for "up after N minutes", none for the others', () => {
    expect(errorsOf({ visitRounding: 'UP_AFTER_MINUTES', visitRoundingMinutes: 15 })).toBeNull();
    expect(errorsOf({ visitRounding: 'PER_MINUTE', visitRoundingMinutes: null })).toBeNull();
    expect(errorsOf({ visitRounding: 'NEAREST_HALF_HOUR', visitRoundingMinutes: null })).toBeNull();

    expect(errorsOf({ visitRounding: 'UP_AFTER_MINUTES', visitRoundingMinutes: 0 })).toEqual({
      visitRoundingMinutes: ['out_of_range'],
    });
    expect(errorsOf({ visitRounding: 'UP_AFTER_MINUTES', visitRoundingMinutes: 60 })).toEqual({
      visitRoundingMinutes: ['out_of_range'],
    });
    expect(errorsOf({ visitRounding: 'UP_AFTER_MINUTES', visitRoundingMinutes: null })).toEqual({
      visitRoundingMinutes: ['required'],
    });
    expect(errorsOf({ visitRounding: 'PER_MINUTE', visitRoundingMinutes: 15 })).toEqual({
      visitRoundingMinutes: ['invalid_format'],
    });
    expect(errorsOf({ visitRoundingMinutes: 15 })).toEqual({ visitRounding: ['required'] });
    expect(errorsOf({ visitRounding: 'UP_AFTER_MINUTES' })).toEqual({
      visitRoundingMinutes: ['required'],
    });
    expect(errorsOf({ visitRounding: 'ROUND', visitRoundingMinutes: null })).toEqual({
      visitRounding: ['invalid_choice'],
    });
  });

  it('keeps what a patch leaves out, and refuses null for a switch', () => {
    expect(updateSpaceSettingsSchema.parse({})).toEqual({});
    for (const field of [
      'autoCheckoutAtClosing',
      'visitCapAtDayPrice',
      'visitStudentPrices',
      'receptionMayTypePrices',
    ]) {
      expect(errorsOf({ [field]: null })).toEqual({ [field]: ['invalid_format'] });
    }
  });
});

describe('newSpaceDefaultsSchema', () => {
  const DEFAULTS = {
    autoCheckoutAtClosing: true,
    visitRounding: 'UP_AFTER_MINUTES',
    visitRoundingMinutes: 15,
    visitCapAtDayPrice: true,
  };
  const defaultsErrors = (body: object) => {
    const result = newSpaceDefaultsSchema.safeParse(body);
    return result.success ? null : toFieldErrors(result.error.issues, body);
  };

  it('takes the four defaults whole, the minutes set exactly for "up after N minutes"', () => {
    expect(defaultsErrors(DEFAULTS)).toBeNull();
    expect(
      defaultsErrors({ ...DEFAULTS, visitRounding: 'PER_MINUTE', visitRoundingMinutes: null }),
    ).toBeNull();

    expect(defaultsErrors({ ...DEFAULTS, visitRoundingMinutes: null })).toEqual({
      visitRoundingMinutes: ['required'],
    });
    expect(defaultsErrors({ ...DEFAULTS, visitRounding: 'NEAREST_HALF_HOUR' })).toEqual({
      visitRoundingMinutes: ['invalid_format'],
    });
    expect(defaultsErrors({ ...DEFAULTS, visitRoundingMinutes: 60 })).toEqual({
      visitRoundingMinutes: ['out_of_range'],
    });
    const withoutCap = {
      autoCheckoutAtClosing: true,
      visitRounding: 'UP_AFTER_MINUTES',
      visitRoundingMinutes: 15,
    };
    expect(defaultsErrors(withoutCap)).toEqual({ visitCapAtDayPrice: ['required'] });
  });
});
