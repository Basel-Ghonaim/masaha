import { describe, expect, it } from 'vitest';
import { returnUrlOf, safeReturnUrl, signInPath } from './returnUrl';

describe('signInPath', () => {
  it('carries the whole requested page, query and fragment included, in `next`', () => {
    const path = signInPath({ pathname: '/me/favorites', search: '?page=2', hash: '#top' });

    expect(path).toBe('/login?next=%2Fme%2Ffavorites%3Fpage%3D2%23top');
  });
});

describe('safeReturnUrl', () => {
  it('returns the page carried in `next`', () => {
    expect(safeReturnUrl('?next=%2Fme%2Ffavorites%3Fpage%3D2%23top')).toBe(
      '/me/favorites?page=2#top',
    );
  });

  it('returns `/` when there is no `next`', () => {
    expect(safeReturnUrl('')).toBe('/');
  });

  it.each([
    ['a full URL', 'https://evil.example/me'],
    ['a protocol-relative URL', '//evil.example/me'],
    ['a backslash after the slash', '/\\evil.example/me'],
    ['a tab hidden between the slashes', '/\t/evil.example/me'],
    ['a relative path', 'me/favorites'],
    ['a script URL', 'javascript:alert(1)'],
    ['a dot segment before the slashes', '/.//evil.example'],
    ['a parent segment before the slashes', '/..//evil.example'],
    ['an encoded dot segment before the slashes', '/%2E//evil.example'],
  ])('returns `/` for %s', (_, target) => {
    expect(safeReturnUrl(`?${new URLSearchParams({ next: target }).toString()}`)).toBe('/');
  });
});

describe('returnUrlOf', () => {
  it('returns nothing when `next` is missing or would leave the site, and keeps an explicit `/`', () => {
    expect(returnUrlOf('')).toBeUndefined();
    expect(returnUrlOf('?next=%2F%2Fevil.example')).toBeUndefined();
    expect(returnUrlOf('?next=%2F')).toBe('/');
  });
});
