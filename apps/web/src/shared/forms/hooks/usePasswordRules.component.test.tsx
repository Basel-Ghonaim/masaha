import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../test/startPreferences';
import { usePasswordRules } from './usePasswordRules';

function viewOf(value: string, invalid = false) {
  return renderHook(() => usePasswordRules(value, invalid)).result.current;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePasswordRules', () => {
  it('says what the password needs before anything is typed', () => {
    startPreferences('en');

    expect(viewOf('')).toEqual({
      state: 'needs',
      line: 'At least 8 characters, with a letter and a number',
    });
  });

  it.each([
    ['gaza', 'Still needs 4 more characters and a number'],
    ['gaza202', 'Still needs 1 more character'],
    ['2026', 'Still needs 4 more characters and a letter'],
    ['gazagaza', 'Still needs a number'],
    ['20262026', 'Still needs a letter'],
    ['!', 'Still needs 7 more characters, a letter, and a number'],
  ])('says only what %s still lacks', (value, line) => {
    startPreferences('en');

    expect(viewOf(value)).toEqual({ state: 'missing', line });
  });

  it('says the password is fine once it meets the policy, in any script', () => {
    startPreferences('en');

    expect(viewOf('gaza2026')).toEqual({ state: 'met', line: 'The password is fine' });
    expect(viewOf('غزة٢٠٢٦مساحة')).toMatchObject({ state: 'met' });
  });

  it('says only «Too long — shorten it» past 72 bytes, as failed', () => {
    startPreferences('en');

    expect(viewOf(`${'ب'.repeat(36)}1`)).toEqual({
      state: 'failed',
      line: 'Too long — shorten it',
    });
  });

  it('shows what is missing as failed once the form was sent with it', () => {
    startPreferences('en');

    expect(viewOf('gazagaza', true)).toEqual({ state: 'failed', line: 'Still needs a number' });
    expect(viewOf('', true)).toMatchObject({ state: 'failed' });
  });

  it('words it in Arabic, the parts joined as Arabic joins them', () => {
    startPreferences('ar');

    expect(viewOf('').line).toBe('8 أحرف على الأقل، فيها حرف ورقم');
    expect(viewOf('gaza').line).toBe('ينقصها: 4 أحرف أخرى ورقم');
    expect(viewOf('gaza20').line).toBe('ينقصها: حرفان آخران');
    expect(viewOf('gazagaz').line).toBe('ينقصها: حرف واحد آخر ورقم');
    expect(viewOf('gaza2026').line).toBe('كلمة المرور مناسبة');
  });
});
