import type { VISIT_ROUNDINGS } from './requests.ts';

// A space's settings (docs/api/api-contract.md §5, Settings (managed)).

/** A space's settings, as its owner sees them. */
export interface SpaceSettings {
  /** Open visits and check-ins are closed at closing time. */
  autoCheckoutAtClosing: boolean;
  /** Each stay is closed after this long, if earlier than closing; `null`: at closing only. */
  maxStayMinutes: number | null;
  /** VISIT_ROUNDINGS. */
  visitRounding: (typeof VISIT_ROUNDINGS)[number];
  /** The N of "up after N minutes"; set exactly for that rule. */
  visitRoundingMinutes: number | null;
  /** A visit's charge never exceeds the day price. */
  visitCapAtDayPrice: boolean;
  /** The desk may charge a visit at the student prices. */
  visitStudentPrices: boolean;
  /** Reception may type a price by hand; false for every new space. */
  receptionMayTypePrices: boolean;
  /** The WhatsApp debt reminder; `null`: the copy catalogue's default text. */
  reminderTemplate: string | null;
}
