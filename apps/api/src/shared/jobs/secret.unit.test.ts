import { describe, expect, it } from 'vitest';

import { matchesSecret } from './secret.ts';

const SECRET = 'a-jobs-secret-of-at-least-32-characters';

describe('matchesSecret', () => {
  it('matches only "Bearer <secret>"', () => {
    expect(matchesSecret(`Bearer ${SECRET}`, SECRET)).toBe(true);

    expect(matchesSecret(undefined, SECRET)).toBe(false);
    expect(matchesSecret('', SECRET)).toBe(false);
    expect(matchesSecret(SECRET, SECRET)).toBe(false);
    expect(matchesSecret(`Basic ${SECRET}`, SECRET)).toBe(false);
    expect(matchesSecret(`Bearer ${SECRET.slice(0, -1)}`, SECRET)).toBe(false);
    expect(matchesSecret(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(matchesSecret(`Bearer x${SECRET}`, SECRET)).toBe(false);
  });
});
