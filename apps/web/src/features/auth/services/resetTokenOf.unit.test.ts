import { describe, expect, it } from 'vitest';
import { resetTokenOf } from './resetTokenOf';

describe('resetTokenOf', () => {
  it('reads the token from the link’s fragment', () => {
    expect(resetTokenOf('#token=abc-123_XYZ')).toBe('abc-123_XYZ');
  });

  it('keeps an empty token as the link’s, for the check to refuse', () => {
    expect(resetTokenOf('#token=')).toBe('');
  });

  it.each(['', '#', '#contact', '#next=token'])('reads no token from %j', (hash) => {
    expect(resetTokenOf(hash)).toBeNull();
  });
});
