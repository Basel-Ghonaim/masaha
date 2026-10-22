import { describe, expect, it } from 'vitest';
import { localText } from './localText';

describe('localText', () => {
  it('the interface’s language when there is one, else the other, marked', () => {
    expect(localText('قاعة هادئة', 'A quiet hall', false)).toEqual({ text: 'قاعة هادئة' });
    expect(localText('قاعة هادئة', 'A quiet hall', true)).toEqual({ text: 'A quiet hall' });
    expect(localText(null, 'A quiet hall', false)).toEqual({
      text: 'A quiet hall',
      lang: 'en',
      dir: 'ltr',
    });
    expect(localText('قاعة هادئة', null, true)).toEqual({
      text: 'قاعة هادئة',
      lang: 'ar',
      dir: 'rtl',
    });
    expect(localText(null, null, true)).toBeNull();
    expect(localText('', '  ', false)).toBeNull();
  });
});
