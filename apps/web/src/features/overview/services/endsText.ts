import { daysFrom, gazaClockOf } from '@masaha/shared/core';
import type { Catalogue } from '@shared/copy';

/**
 * When a subscription ends, as the overview says it, from the Gaza day of `at`: «ينتهي اليوم»,
 * «ينتهي غدًا», else «ينتهي بعد {n} يوم» counted; an end already passed reads as today.
 */
export function endsText(
  endsOn: string,
  at: string,
  words: Catalogue['overview']['owner']['ending'],
): string {
  const days = daysFrom(gazaClockOf(new Date(at)).date, endsOn);
  if (days <= 0) return words.today;
  if (days === 1) return words.tomorrow;
  return words.inDays({ count: days });
}
