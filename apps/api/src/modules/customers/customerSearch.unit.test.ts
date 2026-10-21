import { describe, expect, it } from 'vitest';

import { searchTermsOf } from './customerSearch.ts';

describe('searchTermsOf', () => {
  it('digits only, two or more, once spaces and a plus are removed, search the phone', () => {
    expect(searchTermsOf('05 99')).toEqual({ phoneDigits: '0599' });
    expect(searchTermsOf('+970 599')).toEqual({ phoneDigits: '970599' });
    expect(searchTermsOf('12')).toEqual({ phoneDigits: '12' });
  });

  it('anything else searches the name: one digit, a letter among digits, a name', () => {
    expect(searchTermsOf('5')).toEqual({ name: '5' });
    expect(searchTermsOf('سارة 1')).toEqual({ name: 'سارة 1' });
    expect(searchTermsOf('059-900')).toEqual({ name: '059-900' });
    expect(searchTermsOf('Sara')).toEqual({ name: 'Sara' });
  });
});
