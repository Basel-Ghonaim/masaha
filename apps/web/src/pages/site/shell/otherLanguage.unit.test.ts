import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { otherLanguage } from './otherLanguage';

describe('otherLanguage', () => {
  it('has exactly two languages to switch between', () => {
    expect(Object.keys(CATALOGUES)).toHaveLength(2);
  });

  it('offers English from Arabic, and Arabic from English', () => {
    expect(otherLanguage('ar')).toBe('en');
    expect(otherLanguage('en')).toBe('ar');
  });
});
