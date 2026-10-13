import { describe, expect, it } from 'vitest';

import { checkKey, StorageError } from './storage.ts';

describe('checkKey', () => {
  it('takes segments of letters, digits, _ and -, the last with one extension', () => {
    expect(checkKey('spaces/k3J9_x-Q/card.webp')).toEqual(['spaces', 'k3J9_x-Q', 'card.webp']);
    expect(checkKey('photo.webp')).toEqual(['photo.webp']);
  });

  it.each([
    ['a parent segment', 'spaces/../card.webp'],
    ['a current segment', 'spaces/./card.webp'],
    ['an absolute path', '/spaces/card.webp'],
    ['a backslash', 'spaces\\card.webp'],
    ['an empty segment', 'spaces//card.webp'],
    ['no extension', 'spaces/card'],
    ['two extensions', 'spaces/card.tar.gz'],
    ['an extension before the last segment', 'spaces.d/card.webp'],
    ['a drive', 'C:/card.webp'],
  ])('refuses %s', (_case, key) => {
    expect(() => checkKey(key)).toThrow(StorageError);
  });

  it('refuses a key over 200 characters', () => {
    expect(() => checkKey(`${'a'.repeat(195)}.webp`)).not.toThrow();
    expect(() => checkKey(`${'a'.repeat(196)}.webp`)).toThrow(StorageError);
  });
});
