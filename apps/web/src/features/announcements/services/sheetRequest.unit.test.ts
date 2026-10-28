import type { Announcement } from '@masaha/shared/announcements';
import { describe, expect, it } from 'vitest';
import type { SheetValues } from '../types/SheetValues';
import { createRequestOf, editRequestOf, instantOf, minuteOf, valuesOf } from './sheetRequest';

const VALUES: SheetValues = {
  type: 'CLOSURE',
  textAr: 'مغلق للصيانة',
  textEn: '',
  startMode: 'at',
  startDate: '2026-07-01',
  startsAt: '08:00',
  endMode: 'at',
  endDate: '2026-07-01',
  endsAt: '18:00',
};

const LOADED: Announcement = {
  id: 5,
  type: 'CLOSURE',
  textAr: 'مغلق للصيانة',
  textEn: 'Closed for maintenance',
  startsAt: '2026-07-01T05:00:00.000Z',
  endsAt: '2026-07-01T15:00:00.000Z',
  state: 'UPCOMING',
};

describe('minuteOf', () => {
  it('reads a time of the day, and nothing else', () => {
    expect(minuteOf('08:30')).toBe(510);
    expect(minuteOf('00:00')).toBe(0);
    expect(minuteOf('23:59')).toBe(1439);
    expect(minuteOf('24:00')).toBeUndefined();
    expect(minuteOf('8:30')).toBeUndefined();
    expect(minuteOf('')).toBeUndefined();
  });
});

describe('instantOf', () => {
  it('sends 08:00 on Gaza’s clock as its instant, in summer and in winter, whatever the browser’s zone', () => {
    // Gaza is UTC+3 in summer and UTC+2 in winter; the lane runs in New York.
    expect(instantOf('2026-07-01', '08:00')).toBe('2026-07-01T05:00:00.000Z');
    expect(instantOf('2026-12-01', '08:00')).toBe('2026-12-01T06:00:00.000Z');
  });

  it('sends a date or a time it cannot read as typed, for the contract to refuse', () => {
    expect(instantOf('2026-07-01', '')).toBe('2026-07-01T');
    expect(instantOf('', '08:00')).toBe('T08:00');
  });
});

describe('createRequestOf', () => {
  it('sends the period’s instants on Gaza’s clock, and leaves a blank English text out', () => {
    expect(createRequestOf(VALUES)).toEqual({
      type: 'CLOSURE',
      textAr: 'مغلق للصيانة',
      startsAt: '2026-07-01T05:00:00.000Z',
      endsAt: '2026-07-01T15:00:00.000Z',
    });
  });

  it('sends no start for «Now» and no end for «No end»', () => {
    expect(
      createRequestOf({ ...VALUES, textEn: 'Closed', startMode: 'now', endMode: 'none' }),
    ).toEqual({ type: 'CLOSURE', textAr: 'مغلق للصيانة', textEn: 'Closed' });
  });
});

describe('editRequestOf', () => {
  it('sends nothing when nothing changed', () => {
    expect(editRequestOf({ ...VALUES, textEn: 'Closed for maintenance' }, LOADED)).toEqual({});
  });

  it('sends only what changed, an instant compared as an instant', () => {
    expect(
      editRequestOf(
        { ...VALUES, textEn: 'Closed for maintenance', textAr: 'مغلق اليوم', endsAt: '20:00' },
        { ...LOADED, startsAt: '2026-07-01T08:00:00+03:00' },
      ),
    ).toEqual({ textAr: 'مغلق اليوم', endsAt: '2026-07-01T17:00:00.000Z' });
  });

  // The server keeps «now» with its seconds; the sheet shows a start and an end to their minute.
  const SECONDS: Announcement = {
    ...LOADED,
    startsAt: '2026-07-01T05:00:42.123Z',
    endsAt: '2026-07-01T15:00:07.900Z',
  };

  it('sends nothing for a start and an end the user did not move, though loaded with their seconds', () => {
    expect(editRequestOf({ ...VALUES, textEn: 'Closed for maintenance' }, SECONDS)).toEqual({});
    expect(editRequestOf({ ...VALUES, textEn: 'Back at six' }, SECONDS)).toEqual({
      textEn: 'Back at six',
    });
  });

  it('sends a start or an end moved by one minute, on the minute typed', () => {
    const same = { ...VALUES, textEn: 'Closed for maintenance' };
    expect(editRequestOf({ ...same, startsAt: '08:01' }, SECONDS)).toEqual({
      startsAt: '2026-07-01T05:01:00.000Z',
    });
    expect(editRequestOf({ ...same, endsAt: '17:59' }, SECONDS)).toEqual({
      endsAt: '2026-07-01T14:59:00.000Z',
    });
  });

  it('clears the English text with `textEn: null`, and removes the end with `endsAt: null`', () => {
    expect(editRequestOf({ ...VALUES, endMode: 'none' }, LOADED)).toEqual({
      textEn: null,
      endsAt: null,
    });
  });
});

describe('valuesOf', () => {
  it('opens a new announcement now, ending today at 18:00, or at the next hour from 17:00', () => {
    // 10:15 in Gaza (summer).
    expect(valuesOf(null, new Date('2026-07-01T07:15:00.000Z'), 'CLOSURE')).toEqual({
      type: 'CLOSURE',
      textAr: '',
      textEn: '',
      startMode: 'now',
      startDate: '2026-07-01',
      startsAt: '10:15',
      endMode: 'at',
      endDate: '2026-07-01',
      endsAt: '18:00',
    });
    // 17:20 in Gaza: 18:00; 23:30: midnight, the next day.
    expect(valuesOf(null, new Date('2026-07-01T14:20:00.000Z')).endsAt).toBe('18:00');
    expect(valuesOf(null, new Date('2026-07-01T20:30:00.000Z'))).toMatchObject({
      endDate: '2026-07-02',
      endsAt: '00:00',
    });
  });

  it('reads an announcement on Gaza’s clock, «No end» when it has none', () => {
    expect(valuesOf({ ...LOADED, endsAt: null }, new Date('2026-06-30T07:00:00.000Z'))).toEqual({
      type: 'CLOSURE',
      textAr: 'مغلق للصيانة',
      textEn: 'Closed for maintenance',
      startMode: 'at',
      startDate: '2026-07-01',
      startsAt: '08:00',
      endMode: 'none',
      endDate: '2026-06-30',
      endsAt: '18:00',
    });
  });
});
