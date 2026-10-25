import { describe, expect, it } from 'vitest';

import { decisionOf } from './decision.ts';

const OPEN = { status: 'OPEN', resolutionNote: null, resolvedById: null } as const;
const RESOLVED = { status: 'RESOLVED', resolutionNote: 'عُدّل', resolvedById: 7 } as const;
const RESOLVED_BARE = { status: 'RESOLVED', resolutionNote: null, resolvedById: 7 } as const;

describe('decisionOf', () => {
  it('an open report is decided; the same status, note and decider is as-is; anything else conflicts', () => {
    expect(decisionOf(OPEN, { status: 'RESOLVED' }, 7)).toBe('decide');
    expect(decisionOf(OPEN, { status: 'DISMISSED', note: 'صحيح' }, 7)).toBe('decide');

    expect(decisionOf(RESOLVED, { status: 'RESOLVED', note: 'عُدّل' }, 7)).toBe('as-is');
    expect(decisionOf(RESOLVED_BARE, { status: 'RESOLVED' }, 7)).toBe('as-is');

    expect(decisionOf(RESOLVED, { status: 'DISMISSED', note: 'عُدّل' }, 7)).toBe('conflict');
    expect(decisionOf(RESOLVED, { status: 'RESOLVED', note: 'غير ذلك' }, 7)).toBe('conflict');
    expect(decisionOf(RESOLVED, { status: 'RESOLVED' }, 7)).toBe('conflict');
    expect(decisionOf(RESOLVED_BARE, { status: 'RESOLVED', note: 'عُدّل' }, 7)).toBe('conflict');
    expect(decisionOf(RESOLVED, { status: 'RESOLVED', note: 'عُدّل' }, 8)).toBe('conflict');
  });
});
