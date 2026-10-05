import { describe, expect, it } from 'vitest';
import { publicSpacePath } from './publicSpacePath';

describe('publicSpacePath', () => {
  it('puts the space’s slug, encoded, in its public page’s path', () => {
    expect(publicSpacePath('focus-hub')).toBe('/spaces/focus-hub');
    expect(publicSpacePath('a b/c')).toBe('/spaces/a%20b%2Fc');
  });
});
