import { describe, expect, it } from 'vitest';

import { settingsChange } from './settingsChange.ts';
import type { SettingsRow } from './space-settings.repository.ts';

/** The space's settings as they are stored. */
const CURRENT: SettingsRow = {
  autoCheckoutAtClosing: true,
  maxStayMinutes: 240,
  visitRounding: 'UP_AFTER_MINUTES',
  visitRoundingMinutes: 15,
  visitCapAtDayPrice: true,
  visitStudentPrices: true,
  receptionMayTypePrices: false,
  reminderTemplate: 'عليك {المبلغ}',
};

describe('settingsChange', () => {
  it('changes only the fields set to a new value, each with its value before and after', () => {
    expect(
      settingsChange(CURRENT, {
        autoCheckoutAtClosing: false,
        visitCapAtDayPrice: true,
        maxStayMinutes: null,
      }),
    ).toEqual({
      data: { autoCheckoutAtClosing: false, maxStayMinutes: null },
      before: { autoCheckoutAtClosing: true, maxStayMinutes: 240 },
      after: { autoCheckoutAtClosing: false, maxStayMinutes: null },
    });

    // The rounding pair, field by field: the rule kept, only its minutes change.
    expect(
      settingsChange(CURRENT, { visitRounding: 'UP_AFTER_MINUTES', visitRoundingMinutes: 20 }),
    ).toEqual({
      data: { visitRoundingMinutes: 20 },
      before: { visitRoundingMinutes: 15 },
      after: { visitRoundingMinutes: 20 },
    });
  });

  it('changes nothing for an empty edit or an edit of the same values', () => {
    expect(settingsChange(CURRENT, {})).toEqual({ data: {}, before: {}, after: {} });
    expect(
      settingsChange(CURRENT, {
        autoCheckoutAtClosing: true,
        reminderTemplate: 'عليك {المبلغ}',
        receptionMayTypePrices: false,
      }),
    ).toEqual({ data: {}, before: {}, after: {} });
  });
});
