import { describe, expect, it } from 'vitest';

import { autoCheckoutDue, type AutoCheckoutInput } from './autoCheckout.ts';

/** A time on Sunday 2026-10-18 in Gaza, UTC+3 until 2026-10-24. */
const sunday = (time: string) => new Date(`2026-10-18T${time}+03:00`);

/** Sunday 08:00–18:00, Monday closed, Tuesday 00:00–24:00, the rest 09:00–17:00. */
const WEEK: AutoCheckoutInput['week'] = [
  { opensMinute: 8 * 60, closesMinute: 18 * 60 },
  null,
  { opensMinute: 0, closesMinute: 24 * 60 },
  ...Array.from({ length: 4 }, () => ({ opensMinute: 9 * 60, closesMinute: 17 * 60 })),
];

const due = (input: Partial<AutoCheckoutInput> & Pick<AutoCheckoutInput, 'checkedInAt'>) =>
  autoCheckoutDue({ week: WEEK, autoCheckoutAtClosing: true, maxStayMinutes: null, ...input });

describe('autoCheckoutDue', () => {
  it("is due at the day's closing", () => {
    expect(due({ checkedInAt: sunday('10:20:00') })).toEqual(sunday('18:00:00'));
    // Before opening, it is still that day's closing.
    expect(due({ checkedInAt: sunday('07:30:00') })).toEqual(sunday('18:00:00'));
  });

  it('is due at 23:59 without any hours', () => {
    expect(due({ checkedInAt: sunday('10:20:00'), week: null })).toEqual(sunday('23:59:00'));
  });

  it('is due at 23:59 on a closed day or after closing', () => {
    // Monday is closed.
    expect(due({ checkedInAt: new Date('2026-10-19T10:00:00+03:00') })).toEqual(
      new Date('2026-10-19T23:59:00+03:00'),
    );
    expect(due({ checkedInAt: sunday('18:00:00') })).toEqual(sunday('23:59:00'));
    expect(due({ checkedInAt: sunday('20:15:00') })).toEqual(sunday('23:59:00'));
  });

  it('is never due when the closing check-out is off and there is no stay limit', () => {
    expect(due({ checkedInAt: sunday('10:20:00'), autoCheckoutAtClosing: false })).toBeNull();
    expect(
      due({ checkedInAt: sunday('10:20:00'), autoCheckoutAtClosing: false, week: null }),
    ).toBeNull();
  });

  it('is due at the stay limit when it ends sooner, and at closing when closing comes first', () => {
    expect(due({ checkedInAt: sunday('10:20:00'), maxStayMinutes: 90 })).toEqual(
      sunday('11:50:00'),
    );
    expect(due({ checkedInAt: sunday('17:00:00'), maxStayMinutes: 90 })).toEqual(
      sunday('18:00:00'),
    );
    expect(
      due({ checkedInAt: sunday('10:20:00'), maxStayMinutes: 600, autoCheckoutAtClosing: false }),
    ).toEqual(sunday('20:20:00'));
  });

  it('a day open 00:00–24:00 ends at 23:59', () => {
    expect(due({ checkedInAt: new Date('2026-10-20T15:00:00+03:00') })).toEqual(
      new Date('2026-10-20T23:59:00+03:00'),
    );
  });

  it('on a daylight-saving day, 23:59 is read on the new offset', () => {
    // Saturday 2026-10-24: at 02:00 Gaza's clock goes back from +03:00 to +02:00.
    expect(due({ checkedInAt: new Date('2026-10-24T01:00:00+03:00'), week: null })).toEqual(
      new Date('2026-10-24T23:59:00+02:00'),
    );
  });

  it('is never due before the check-in', () => {
    expect(due({ checkedInAt: sunday('23:59:30') })).toEqual(sunday('23:59:30'));
    expect(due({ checkedInAt: sunday('10:20:00'), maxStayMinutes: 0 })).toEqual(sunday('10:20:00'));
  });
});
