import { describe, expect, it } from 'vitest';

import { proposedStart } from './renewal.ts';

const TODAY = '2026-10-21';

describe('proposedStart', () => {
  it("a running renewed one → the day after its end, an upcoming one's too", () => {
    expect(proposedStart({ status: 'ACTIVE', endsOn: '2026-10-30' }, TODAY)).toBe('2026-10-31');
    expect(proposedStart({ status: 'ENDING_SOON', endsOn: '2026-10-21' }, TODAY)).toBe(
      '2026-10-22',
    );
    expect(proposedStart({ status: 'UPCOMING', endsOn: '2026-12-31' }, TODAY)).toBe('2027-01-01');
  });

  it('expired or ended → today; no end → today; nothing renewed → today', () => {
    expect(proposedStart({ status: 'EXPIRED', endsOn: '2026-10-20' }, TODAY)).toBe(TODAY);
    // Ended early today: its end is today, but it is expired.
    expect(proposedStart({ status: 'EXPIRED', endsOn: TODAY }, TODAY)).toBe(TODAY);
    // A total used up before its end.
    expect(proposedStart({ status: 'EXPIRED', endsOn: '2026-11-30' }, TODAY)).toBe(TODAY);
    expect(proposedStart({ status: 'ACTIVE', endsOn: null }, TODAY)).toBe(TODAY);
    expect(proposedStart(null, TODAY)).toBe(TODAY);
  });
});
