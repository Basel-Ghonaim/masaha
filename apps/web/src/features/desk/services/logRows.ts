import type { DeskCheckIn } from '@masaha/shared/subscriptions';
import type { DeskVisit } from '@masaha/shared/visits';
import type { LogEntry } from '../types/LogEntry';

/**
 * A day's log (K8, S6): the day's visits and its subscribers' check-ins, each read whole, merged in one
 * list, the latest check-in first; two that came in at once, the later id first, a check-in before a
 * visit of the same id.
 */
export function logRows(visits: DeskVisit[], checkIns: DeskCheckIn[]): LogEntry[] {
  const rows: { id: number; entry: LogEntry }[] = [
    ...visits.map((visit) => ({
      id: visit.id,
      entry: {
        key: `visit-${String(visit.id)}`,
        kind: 'VISIT' as const,
        name: visit.customer?.name ?? visit.visitorName ?? '',
        customerId: visit.customer?.id ?? null,
        subscription: null,
        student: visit.audience === 'STUDENT',
        checkedInAt: visit.checkedInAt,
        checkedOutAt: visit.checkedOutAt,
        checkoutMethod: visit.checkoutMethod,
        writtenOff: visit.writeOff !== null,
      },
    })),
    ...checkIns.map((checkIn) => ({
      id: checkIn.id,
      entry: {
        key: `check-in-${String(checkIn.id)}`,
        kind: 'CHECK_IN' as const,
        name: checkIn.customer.name,
        customerId: checkIn.customer.id,
        subscription: checkIn.subscription.name,
        student: false,
        checkedInAt: checkIn.checkedInAt,
        checkedOutAt: checkIn.checkedOutAt,
        checkoutMethod: checkIn.checkoutMethod,
        writtenOff: false,
      },
    })),
  ];
  return rows
    .sort(
      (a, b) =>
        Date.parse(b.entry.checkedInAt) - Date.parse(a.entry.checkedInAt) ||
        b.id - a.id ||
        (a.entry.kind === b.entry.kind ? 0 : a.entry.kind === 'CHECK_IN' ? -1 : 1),
    )
    .map((row) => row.entry);
}
