import { describe, expect, it } from 'vitest';

import { announcementState } from './announcementState.ts';

const NOW = new Date('2026-10-24T10:00:00+03:00');
const at = (time: string) => new Date(`2026-10-24T${time}:00+03:00`);

describe('announcementState', () => {
  it('upcoming before its start, running from its start, ended from its end; no end runs', () => {
    expect(announcementState({ startsAt: at('10:01'), endsAt: null }, NOW)).toBe('UPCOMING');
    expect(announcementState({ startsAt: at('10:00'), endsAt: at('12:00') }, NOW)).toBe('RUNNING');
    expect(announcementState({ startsAt: at('08:00'), endsAt: at('10:01') }, NOW)).toBe('RUNNING');
    expect(announcementState({ startsAt: at('08:00'), endsAt: at('10:00') }, NOW)).toBe('ENDED');
    expect(announcementState({ startsAt: at('08:00'), endsAt: null }, NOW)).toBe('RUNNING');
  });
});
