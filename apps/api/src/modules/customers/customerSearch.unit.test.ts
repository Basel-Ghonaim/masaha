import { describe, expect, it } from 'vitest';

import { searchTermsOf } from './customerSearch.ts';

describe('searchTermsOf', () => {
  it('a whole number in any form searches that phone, in its stored form', () => {
    expect(searchTermsOf('0599000205')).toEqual({ phone: '+970599000205' });
    expect(searchTermsOf('0521234567')).toEqual({ phone: '+972521234567' });
    expect(searchTermsOf('00970599000205')).toEqual({ phone: '+970599000205' });
    expect(searchTermsOf('059-900-0205')).toEqual({ phone: '+970599000205' });
    expect(searchTermsOf('+972 52 123 4567')).toEqual({ phone: '+972521234567' });
  });

  it("digits only, two or more, once a phone's separators are removed, search the phone's end", () => {
    expect(searchTermsOf('05 99')).toEqual({ phoneDigits: '0599' });
    expect(searchTermsOf('+970 599')).toEqual({ phoneDigits: '970599' });
    expect(searchTermsOf('059-900')).toEqual({ phoneDigits: '059900' });
    expect(searchTermsOf('(059) 9.00')).toEqual({ phoneDigits: '059900' });
    expect(searchTermsOf('12')).toEqual({ phoneDigits: '12' });
  });

  it('anything else searches the name: one digit, a letter among digits, a name', () => {
    expect(searchTermsOf('5')).toEqual({ name: '5' });
    expect(searchTermsOf('سارة 1')).toEqual({ name: 'سارة 1' });
    expect(searchTermsOf('059/900')).toEqual({ name: '059/900' });
    expect(searchTermsOf('Sara')).toEqual({ name: 'Sara' });
  });
});
