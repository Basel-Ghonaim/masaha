import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { toFieldErrors } from './fieldErrors.ts';
import { phoneSchema } from './phone.ts';

const form = z.object({ phone: phoneSchema });

/** The number as it is stored, or the field errors it fails with. */
function stored(input: string) {
  const result = form.safeParse({ phone: input });
  return result.success ? result.data.phone : toFieldErrors(result.error.issues, { phone: input });
}

describe('phoneSchema', () => {
  it.each([
    ['+970599123456', '+970599123456'],
    ['00970599123456', '+970599123456'],
    ['00972599123456', '+970599123456'],
    ['0599123456', '+970599123456'],
    ['0569123456', '+970569123456'],
    ['+972521234567', '+972521234567'],
    ['00972521234567', '+972521234567'],
    ['022981234', '+97022981234'],
  ])('stores %s in its international form, %s', (input, phone) => {
    expect(stored(input)).toBe(phone);
  });

  it('gives a Palestinian mobile (059, 056) +970, whatever prefix it came with', () => {
    expect(stored('+972599123456')).toBe('+970599123456');
    expect(stored('00972569123456')).toBe('+970569123456');
  });

  it('gives another local mobile +972, and a local landline +970', () => {
    expect(stored('0521234567')).toBe('+972521234567');
    expect(stored('082821234')).toBe('+97082821234');
  });

  it.each([
    ['spaces', '+970 59 912 3456', '+970599123456'],
    ['dashes', '059-912-3456', '+970599123456'],
    ['dots', '059.912.3456', '+970599123456'],
    ['parentheses', '(08) 282 1234', '+97082821234'],
  ])('strips the %s people type', (_kind, input, phone) => {
    expect(stored(input)).toBe(phone);
  });

  it('drops the (0) written after the country code', () => {
    expect(stored('+970 (0)59 912 3456')).toBe('+970599123456');
  });

  it.each([
    ['Arabic-Indic', '٠٥٩٩١٢٣٤٥٦', '+970599123456'],
    ['Eastern', '۰۵۹۹۱۲۳۴۵۶', '+970599123456'],
    ['Arabic-Indic, after +970,', '+٩٧٠ ٥ ٩ ٩١٢ ٣٤٥٦', '+970599123456'],
    ['Arabic-Indic, after 00972,', '٠٠٩٧٢٥٢١٢٣٤٥٦٧', '+972521234567'],
    ['Arabic-Indic and Western', '٠٥٩-٩١٢ 3456', '+970599123456'],
    ['Eastern, a landline’s,', '(۰۸) ۲ ۸ ۲ ۱۲۳۴', '+97082821234'],
  ])('reads %s digits as Western ones: %s', (_digits, input, phone) => {
    expect(stored(input)).toBe(phone);
  });

  it.each([
    ['another country', '+12025550100'],
    ['a number too short', '05991234'],
    ['a number too long', '05991234567'],
    ['a mobile prefix at the length of a landline', '051234567'],
    ['another separator', '059_912_3456'],
    ['letters', '059 912 3456 ext 2'],
    ['too few Arabic-Indic digits', '١٢٣'],
    ['another country in Arabic-Indic digits', '+١٢٠٢٥٥٥٠١٠٠'],
    ['nothing', ''],
    ['a foreign number with spaces', '+1 202 555 0100'],
    ['letters only', 'abc'],
  ])('refuses %s', (_case, input) => {
    expect(stored(input)).toEqual({ phone: ['invalid_format'] });
  });
});
