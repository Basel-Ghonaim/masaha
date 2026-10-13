import { describe, expect, it } from 'vitest';

import { verifyPassword } from './password.ts';

// Below what one bcrypt comparison at cost 12 takes on any machine, far above an early return.
const ONE_COMPARISON_MS = 40;

describe('verifyPassword', () => {
  it('spends a comparison without a hash, so an unknown email answers as late as a wrong password', async () => {
    const started = performance.now();

    const matched = await verifyPassword('gaza2026', null);

    expect(matched).toBe(false);
    expect(performance.now() - started).toBeGreaterThanOrEqual(ONE_COMPARISON_MS);
  });
});
