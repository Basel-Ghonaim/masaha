import { hkdfSync } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { successorKeyOf, successorOf } from './tokens.ts';

const SECRET = 'a-test-secret-of-at-least-32-characters';

describe('sessions: the successor key', () => {
  it('the successor key is derived from the secret and its label', () => {
    const key = successorKeyOf(SECRET);

    expect(key).toEqual(
      Buffer.from(hkdfSync('sha256', SECRET, '', 'masaha refresh successor', 32)),
    );
    expect(key).not.toEqual(Buffer.from(hkdfSync('sha256', SECRET, '', '', 32)));
    expect(successorKeyOf(`${SECRET}!`)).not.toEqual(key);
  });

  it("names one successor per token, under the key's own secret", () => {
    const key = successorKeyOf(SECRET);

    expect(successorOf('token', key)).toBe(successorOf('token', key));
    expect(successorOf('token', key)).not.toBe(successorOf('other', key));
    expect(successorOf('token', successorKeyOf(`${SECRET}!`))).not.toBe(successorOf('token', key));
    expect(successorOf('token', key)).toMatch(/^[\w-]{43}$/);
  });
});
