import { describe, expect, it } from 'vitest';
import { retryAfterSeconds } from './retryAfter';

describe('retryAfterSeconds', () => {
  it('reads delta-seconds, around spaces', () => {
    expect(retryAfterSeconds('120')).toBe(120);
    expect(retryAfterSeconds(' 0 ')).toBe(0);
  });

  it('ignores an empty value', () => {
    expect(retryAfterSeconds('')).toBeUndefined();
    expect(retryAfterSeconds('   ')).toBeUndefined();
  });

  it('ignores a negative value', () => {
    expect(retryAfterSeconds('-5')).toBeUndefined();
  });

  it('ignores an HTTP date', () => {
    expect(retryAfterSeconds('Wed, 21 Oct 2026 07:28:00 GMT')).toBeUndefined();
  });

  it('ignores a missing header', () => {
    expect(retryAfterSeconds(undefined)).toBeUndefined();
  });
});
