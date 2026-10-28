import type { PublicAnnouncement } from '../types/PublicAnnouncement';
import { describe, expect, it } from 'vitest';
import { runningClosure } from './runningClosure';

const NOW = new Date('2026-10-28T10:00:00.000Z');

function item(change: Partial<PublicAnnouncement> = {}): PublicAnnouncement {
  return {
    id: 1,
    type: 'CLOSURE',
    textAr: 'مغلق للصيانة',
    textEn: null,
    startsAt: '2026-10-28T06:00:00.000Z',
    endsAt: null,
    ...change,
  };
}

describe('runningClosure', () => {
  it('finds a closure that has started and has no end, or ends after now', () => {
    expect(runningClosure([item()], NOW)?.id).toBe(1);
    expect(runningClosure([item({ endsAt: '2026-10-28T10:00:01.000Z' })], NOW)?.id).toBe(1);
  });

  it('finds one that started exactly now', () => {
    expect(runningClosure([item({ startsAt: NOW.toISOString() })], NOW)?.id).toBe(1);
  });

  it('passes over an upcoming closure and the announcements of other types', () => {
    expect(
      runningClosure(
        [
          item({ id: 2, startsAt: '2026-10-29T06:00:00.000Z' }),
          item({ id: 3, type: 'OUTAGE' }),
          item({ id: 4, type: 'GENERAL' }),
        ],
        NOW,
      ),
    ).toBeNull();
  });

  it('passes over a closure ending at now', () => {
    expect(runningClosure([item({ endsAt: NOW.toISOString() })], NOW)).toBeNull();
  });

  it('finds none in no announcements, and the first running one among several', () => {
    expect(runningClosure([], NOW)).toBeNull();
    expect(
      runningClosure([item({ id: 5, type: 'OFFER' }), item({ id: 6 }), item({ id: 7 })], NOW)?.id,
    ).toBe(6);
  });
});
