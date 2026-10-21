import { describe, expect, it } from 'vitest';
import { spaceNameOf } from './spaceName';

describe('spaceNameOf', () => {
  it('names the space in English in the English interface', () => {
    expect(spaceNameOf({ nameEn: 'Palm Hub', nameAr: 'بالم' }, true)).toEqual({ text: 'Palm Hub' });
  });

  it('names it in Arabic in the Arabic interface', () => {
    expect(spaceNameOf({ nameEn: 'Palm Hub', nameAr: 'بالم' }, false)).toEqual({ text: 'بالم' });
  });

  it('shows an English-only name in the Arabic interface, marked as English', () => {
    expect(spaceNameOf({ nameEn: 'Palm Hub', nameAr: null }, false)).toEqual({
      text: 'Palm Hub',
      lang: 'en',
      dir: 'ltr',
    });
  });
});
