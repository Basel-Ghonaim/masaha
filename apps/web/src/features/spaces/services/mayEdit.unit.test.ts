import { describe, expect, it } from 'vitest';
import { mayEdit } from './mayEdit';

describe('mayEdit', () => {
  it('lets the admin edit an unverified space only, and the owner a verified one only', () => {
    expect(mayEdit('admin', false)).toBe(true);
    expect(mayEdit('admin', true)).toBe(false);
    expect(mayEdit('owner', true)).toBe(true);
    expect(mayEdit('owner', false)).toBe(false);
  });
});
