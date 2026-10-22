import { idempotencyKeySchema } from '@masaha/shared/core';
import { describe, expect, it } from 'vitest';

import { derivedKey } from './idempotencyKey.ts';

const KEY = '0f8b7c2e-4a51-4c7e-9a3b-2d1e6f5a4b3c';

describe('derivedKey', () => {
  it('a derived key is a UUID, the same for the same key and index, different for another index or key', () => {
    const first = derivedKey(KEY, 0);
    expect(idempotencyKeySchema.safeParse(first).success).toBe(true);
    expect(derivedKey(KEY, 0)).toBe(first);
    expect(derivedKey(KEY, 1)).not.toBe(first);
    expect(derivedKey('5c2a1d9e-7b3f-4e8a-8c6d-1f2e3a4b5c6d', 0)).not.toBe(first);
    expect(first).not.toBe(KEY);
  });
});
