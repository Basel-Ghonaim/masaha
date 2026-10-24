import { describe, expect, it } from 'vitest';

import { paymentsWindow } from './paymentsWindow.ts';

describe("the payments list's window", () => {
  it('today in Gaza when no range is given (23:30 UTC is the next Gaza day); a range from its first Gaza midnight to the midnight after its last day', () => {
    expect(paymentsWindow({}, new Date('2026-10-20T23:30:00Z'))).toEqual({
      from: new Date('2026-10-21T00:00:00+03:00'),
      to: new Date('2026-10-22T00:00:00+03:00'),
    });
    expect(
      paymentsWindow({ from: '2026-10-01', to: '2026-10-03' }, new Date('2026-10-20T10:00:00Z')),
    ).toEqual({
      from: new Date('2026-10-01T00:00:00+03:00'),
      to: new Date('2026-10-04T00:00:00+03:00'),
    });
  });
});
