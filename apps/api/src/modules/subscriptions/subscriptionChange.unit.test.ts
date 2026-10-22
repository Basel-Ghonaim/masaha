import { describe, expect, it } from 'vitest';

import { subscriptionChange } from './subscriptionChange.ts';

const CURRENT = {
  name: 'شهري',
  startsOn: '2026-10-01',
  endsOn: '2026-10-30',
  totalDays: null,
  daysPerWeek: 5,
  hoursPerDay: null,
  totalHours: null,
};

describe('subscriptionChange', () => {
  it('only the fields set to a new value; null clears', () => {
    expect(
      subscriptionChange(CURRENT, {
        name: 'شهري',
        startsOn: '2026-10-01',
        endsOn: '2026-11-05',
        daysPerWeek: null,
        totalHours: 40,
      }),
    ).toEqual({
      data: { endsOn: '2026-11-05', daysPerWeek: null, totalHours: 40 },
      before: { endsOn: '2026-10-30', daysPerWeek: 5, totalHours: null },
      after: { endsOn: '2026-11-05', daysPerWeek: null, totalHours: 40 },
    });
  });

  it('the name is corrected like any field; the same values change nothing', () => {
    expect(subscriptionChange(CURRENT, { name: 'شهري — مسائي' })).toEqual({
      data: { name: 'شهري — مسائي' },
      before: { name: 'شهري' },
      after: { name: 'شهري — مسائي' },
    });
    expect(subscriptionChange(CURRENT, { ...CURRENT })).toEqual({
      data: {},
      before: {},
      after: {},
    });
    expect(subscriptionChange(CURRENT, {})).toEqual({ data: {}, before: {}, after: {} });
  });
});
