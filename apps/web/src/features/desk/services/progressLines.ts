import type { SubscriptionState } from '@masaha/shared/subscriptions';

type Counted = (values: { used: string; total: string }) => string;
type Dated = (values: { date: string }) => string;

/** Whole minutes as «2:30», hours and minutes. */
const hoursOf = (minutes: number) =>
  `${String(Math.floor(minutes / 60))}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * A subscription's progress as the desk and the file say it, in this order: each limit it has — its
 * days in all, this week's days, today's hours, its hours in all — with what was used of it; how a
 * usage-based one is billed; then its end: when it ended, when it starts, until when it is valid, or
 * that it has no end. The counts are the server's (`progress`); `format` says amounts and dates.
 */
export function progressLines(
  { progress, ...subscription }: SubscriptionState,
  words: {
    days: Counted;
    week: Counted;
    today: Counted;
    hours: Counted;
    billed: (values: { rate: string; unit: string }) => string;
    units: { PER_HOUR: string; PER_DAY: string };
    validUntil: Dated;
    endedOn: Dated;
    startsOn: Dated;
    noEnd: string;
  },
  format: { price: (agorot: number) => string; day: (date: string) => string },
): string[] {
  const lines: string[] = [];
  const { totalDays, daysPerWeek, hoursPerDay, totalHours, billing, endsOn, startsOn } =
    subscription;
  if (totalDays !== null) {
    lines.push(words.days({ used: String(progress.daysUsed), total: String(totalDays) }));
  }
  if (daysPerWeek !== null) {
    lines.push(words.week({ used: String(progress.daysThisWeek), total: String(daysPerWeek) }));
  }
  if (hoursPerDay !== null) {
    lines.push(words.today({ used: hoursOf(progress.minutesToday), total: String(hoursPerDay) }));
  }
  if (totalHours !== null) {
    lines.push(words.hours({ used: hoursOf(progress.minutesUsed), total: String(totalHours) }));
  }
  if (billing !== 'FIXED') {
    lines.push(
      words.billed({ rate: format.price(subscription.priceAgorot), unit: words.units[billing] }),
    );
  }
  if (subscription.status === 'EXPIRED' && endsOn !== null) {
    lines.push(words.endedOn({ date: format.day(endsOn) }));
  } else if (subscription.status === 'UPCOMING' && startsOn !== null) {
    lines.push(words.startsOn({ date: format.day(startsOn) }));
  } else if (endsOn !== null) {
    lines.push(words.validUntil({ date: format.day(endsOn) }));
  } else {
    lines.push(words.noEnd);
  }
  return lines;
}
