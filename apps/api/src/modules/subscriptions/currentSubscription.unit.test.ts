import { describe, expect, it } from 'vitest';

import { currentSubscription } from './currentSubscription.ts';

describe('currentSubscription', () => {
  it('a running one before an upcoming one before an expired one, whatever their ids', () => {
    const expired = { id: 9, status: 'EXPIRED', startsOn: '2026-10-01' } as const;
    const upcoming = { id: 8, status: 'UPCOMING', startsOn: '2026-11-01' } as const;
    const endingSoon = { id: 1, status: 'ENDING_SOON', startsOn: '2026-09-01' } as const;

    expect(currentSubscription([expired, upcoming, endingSoon])).toBe(endingSoon);
    expect(currentSubscription([expired, upcoming])).toBe(upcoming);
    expect(currentSubscription([expired])).toBe(expired);
  });

  it('among equals, the latest start (none last), then the highest id', () => {
    const older = { id: 5, status: 'ACTIVE', startsOn: '2026-09-01' } as const;
    const later = { id: 2, status: 'ACTIVE', startsOn: '2026-10-01' } as const;
    const undated = { id: 7, status: 'ACTIVE', startsOn: null } as const;
    const twin = { id: 3, status: 'ENDING_SOON', startsOn: '2026-10-01' } as const;

    expect(currentSubscription([older, undated, later])).toBe(later);
    expect(currentSubscription([older, undated])).toBe(older);
    expect(currentSubscription([later, twin])).toBe(twin);
  });

  it('none → null', () => {
    expect(currentSubscription([])).toBeNull();
  });
});
