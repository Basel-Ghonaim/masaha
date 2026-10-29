import { describe, expect, it } from 'vitest';
import { textOf } from './textOf';

describe('textOf', () => {
  it('says the text in the interface’s language', () => {
    expect(textOf({ textAr: 'مغلق اليوم', textEn: 'Closed today' }, 'ar')).toEqual({
      text: 'مغلق اليوم',
    });
    expect(textOf({ textAr: 'مغلق اليوم', textEn: 'Closed today' }, 'en')).toEqual({
      text: 'Closed today',
    });
  });

  it('falls back to the Arabic in English, marked as Arabic', () => {
    expect(textOf({ textAr: 'مغلق اليوم', textEn: null }, 'en')).toEqual({
      text: 'مغلق اليوم',
      lang: 'ar',
      dir: 'rtl',
    });
  });
});
