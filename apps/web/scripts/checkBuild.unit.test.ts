import { describe, expect, it } from 'vitest';
import { findForbidden, showcaseOnly, stringsIn } from './checkBuild';

const ARABIC = 'الأيقونات والانعكاس';

// Writes every non-ASCII character as an escape, the way a minifier may.
const escapeAs = (text: string, form: 'plain' | 'braced') =>
  Array.from(text, (character) => {
    const code = character.codePointAt(0) ?? 0;
    if (code < 128) {
      return character;
    }
    const hex = code.toString(16);
    return form === 'plain' ? `\\u${hex.padStart(4, '0')}` : `\\u{${hex}}`;
  }).join('');

describe('stringsIn', () => {
  it('collects every string, however deeply nested', () => {
    expect(stringsIn({ a: 'one', b: { c: ['two', { d: 'three' }] }, e: 4, f: null })).toEqual([
      'one',
      'two',
      'three',
    ]);
  });
});

describe('showcaseOnly', () => {
  const catalogueSource = "export const TERMS = { owner: 'صاحب المساحة', expired: 'Expired' };";

  it('drops a fixture string the catalogues also write, whole or inside a longer line', () => {
    expect(showcaseOnly(['Expired', 'المساحة', 'Preview theme', ARABIC], catalogueSource)).toEqual([
      'Preview theme',
      ARABIC,
    ]);
  });
});

describe('findForbidden', () => {
  const forbidden = ['__showcase', 'Preview theme', ARABIC];

  it('finds a forbidden string written as is', () => {
    expect(findForbidden('path:"/__showcase",label:"Preview theme"', forbidden)).toEqual([
      '__showcase',
      'Preview theme',
    ]);
  });

  it.each(['plain', 'braced'] as const)('finds Arabic text written as %s escapes', (form) => {
    expect(findForbidden(`title:"${escapeAs(ARABIC, form)}"`, forbidden)).toEqual([ARABIC]);
  });

  it('finds nothing in a build file without the showcase', () => {
    expect(findForbidden('function App(){return null}', forbidden)).toEqual([]);
  });
});
