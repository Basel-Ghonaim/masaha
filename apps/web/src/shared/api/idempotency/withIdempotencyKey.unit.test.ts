import { describe, expect, it } from 'vitest';
import { withIdempotencyKey } from './withIdempotencyKey';

describe('withIdempotencyKey', () => {
  it('puts the key in the Idempotency-Key header', () => {
    expect(withIdempotencyKey('key-1')).toEqual({ headers: { 'Idempotency-Key': 'key-1' } });
  });
});
