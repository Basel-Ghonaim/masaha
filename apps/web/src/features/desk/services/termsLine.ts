import type { DeskSubscription } from '@masaha/shared/subscriptions';

type Counted = (values: { count: number }) => string;

/**
 * A subscription's terms as its card says them in one line, in this order: its days in all, its
 * days a week, its hours a day, its hours in all, and «للطلاب» when it is for students; «بدون شروط
 * إضافية» when it has none of them. The terms are the server's, as copied or typed when it was made,
 * or a package's, which a subscription would copy.
 */
export function termsLine(
  {
    totalDays,
    daysPerWeek,
    hoursPerDay,
    totalHours,
    audience,
  }: Pick<
    DeskSubscription,
    'totalDays' | 'daysPerWeek' | 'hoursPerDay' | 'totalHours' | 'audience'
  >,
  words: {
    totalDays: Counted;
    daysPerWeek: Counted;
    hoursPerDay: Counted;
    totalHours: Counted;
    student: string;
    none: string;
  },
): string {
  const parts = [
    totalDays === null ? null : words.totalDays({ count: totalDays }),
    daysPerWeek === null ? null : words.daysPerWeek({ count: daysPerWeek }),
    hoursPerDay === null ? null : words.hoursPerDay({ count: hoursPerDay }),
    totalHours === null ? null : words.totalHours({ count: totalHours }),
    audience === 'STUDENT' ? words.student : null,
  ].filter((part) => part !== null);
  return parts.length === 0 ? words.none : parts.join(' · ');
}
