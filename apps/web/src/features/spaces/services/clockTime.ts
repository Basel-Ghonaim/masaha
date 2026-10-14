import { DAY_MINUTES } from '@masaha/shared/spaces';

// A time of day as a field holds it: 24-hour, Western digits, typed as text, so 24:00 can end a day.

const ARABIC_INDIC_ZERO = 0x0660;

/** Reads Arabic-Indic digits (٠–٩) as Western ones. */
function westernDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (digit) =>
    String((digit.codePointAt(0) ?? ARABIC_INDIC_ZERO) - ARABIC_INDIC_ZERO),
  );
}

/** A minute of the day as `HH:MM`: `510` → `08:30`, the day's end `1440` → `24:00`. */
export function clockOf(minute: number): string {
  const hours = Math.floor(minute / 60);
  return `${String(hours).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

/**
 * The minute of the day a field's text names: `8`, `08`, `830`, `0830`, `8:30` or `08:30`, in Western
 * or Arabic-Indic digits; `24:00` only as a day's `end`. A blank is no value (`undefined`); a text it
 * cannot read is handed back as typed, so the contract's schema refuses it as `invalid_format`.
 */
export function minuteOf(text: string, { end }: { end: boolean }): number | string | undefined {
  const typed = westernDigits(text.trim());
  if (typed === '') return undefined;
  const parts = /^(\d{1,2})(?::(\d{2}))?$/.exec(typed) ?? /^(\d{1,2})(\d{2})$/.exec(typed);
  if (parts === null) return text;
  const hours = Number(parts[1]);
  const minutes = Number(parts[2] ?? '0');
  if (end && hours === 24 && minutes === 0) return DAY_MINUTES;
  if (hours > 23 || minutes > 59) return text;
  return hours * 60 + minutes;
}

/** What a time field holds once it is left: a time it can read as `HH:MM`, else the text as typed. */
export function settledClock(text: string, { end }: { end: boolean }): string {
  const minute = minuteOf(text, { end });
  return typeof minute === 'number' ? clockOf(minute) : text;
}
