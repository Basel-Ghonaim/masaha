import type { SpaceSettings } from '@masaha/shared/space-settings';

import type { SettingsRow } from './space-settings.repository.ts';

/** A space's settings row, as the contract's `SpaceSettings` shows it. */
export function toSpaceSettings(row: SettingsRow): SpaceSettings {
  return {
    autoCheckoutAtClosing: row.autoCheckoutAtClosing,
    maxStayMinutes: row.maxStayMinutes,
    visitRounding: row.visitRounding,
    visitRoundingMinutes: row.visitRoundingMinutes,
    visitCapAtDayPrice: row.visitCapAtDayPrice,
    visitStudentPrices: row.visitStudentPrices,
    receptionMayTypePrices: row.receptionMayTypePrices,
    reminderTemplate: row.reminderTemplate,
  };
}
