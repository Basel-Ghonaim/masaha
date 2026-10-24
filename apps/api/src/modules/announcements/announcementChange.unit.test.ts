import { describe, expect, it } from 'vitest';

import { announcementChange } from './announcementChange.ts';

const CURRENT = {
  type: 'CLOSURE' as const,
  textAr: 'مغلق',
  textEn: 'Closed',
  startsAt: new Date('2026-10-24T08:00:00+03:00'),
  endsAt: new Date('2026-10-25T08:00:00+03:00'),
};

describe('announcementChange', () => {
  it('only fields set to a new value; an instant sent with another offset is the same', () => {
    expect(
      announcementChange(CURRENT, {
        type: 'CLOSURE',
        textAr: 'مغلق للصيانة',
        startsAt: '2026-10-24T05:00:00Z',
        endsAt: '2026-10-26T08:00:00+03:00',
      }),
    ).toEqual({
      data: { textAr: 'مغلق للصيانة', endsAt: new Date('2026-10-26T05:00:00Z') },
      before: { textAr: 'مغلق', endsAt: '2026-10-25T05:00:00.000Z' },
      after: { textAr: 'مغلق للصيانة', endsAt: '2026-10-26T05:00:00.000Z' },
    });
    expect(
      announcementChange(CURRENT, {
        type: 'CLOSURE',
        textAr: 'مغلق',
        textEn: 'Closed',
        startsAt: '2026-10-24T08:00:00+03:00',
        endsAt: '2026-10-25T08:00:00+03:00',
      }),
    ).toEqual({ data: {}, before: {}, after: {} });
  });

  it('null clears textEn and the end', () => {
    expect(announcementChange(CURRENT, { textEn: null, endsAt: null })).toEqual({
      data: { textEn: null, endsAt: null },
      before: { textEn: 'Closed', endsAt: '2026-10-25T05:00:00.000Z' },
      after: { textEn: null, endsAt: null },
    });
    expect(announcementChange({ ...CURRENT, endsAt: null }, { endsAt: null }).data).toEqual({});
  });
});
