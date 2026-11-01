import type { CustomerFile } from '@masaha/shared/desk';
import type { DeskVisit } from '@masaha/shared/visits';

/** One item a payment may pay: a visit or a subscription, with its money, the server's. */
export type OpenItem = {
  /** `visit-{id}` or `subscription-{id}`. */
  key: string;
  item: { visitId: number } | { subscriptionId: number };
  label: string;
  dueAgorot: number;
  paidAgorot: number;
  leftAgorot: number;
  /** A usage-based subscription: it takes more than it owes, as credit. */
  usage: boolean;
};

/**
 * The items of a customer's file a payment may pay, one at a time (DI-22): the unpaid visits, the
 * oldest closed first — an unpriced one left out, having nothing to pay yet — then the subscriptions
 * that still owe. A usage-based subscription that owes nothing is offered too when it is the one
 * `chosen` (from its card or its check-out), since it takes a payment ahead, as credit.
 */
export function openItems(
  file: CustomerFile,
  { visitLabel, chosen }: { visitLabel: (visit: DeskVisit) => string; chosen?: string },
): OpenItem[] {
  const closedAt = (visit: DeskVisit) => Date.parse(visit.checkedOutAt ?? visit.checkedInAt);
  const visits = file.unpaidVisits
    .filter(({ balanceAgorot }) => balanceAgorot !== null)
    .sort((a, b) => closedAt(a.visit) - closedAt(b.visit) || a.visit.id - b.visit.id)
    .map(({ visit, paidAgorot, balanceAgorot }) => ({
      key: `visit-${String(visit.id)}`,
      item: { visitId: visit.id },
      label: visitLabel(visit),
      dueAgorot: visit.charge?.amountAgorot ?? 0,
      paidAgorot,
      leftAgorot: balanceAgorot ?? 0,
      usage: false,
    }));
  const subscriptions = file.subscriptions
    .filter(
      (subscription) =>
        subscription.balanceAgorot > 0 ||
        (subscription.billing !== 'FIXED' && chosen === `subscription-${String(subscription.id)}`),
    )
    .map((subscription) => ({
      key: `subscription-${String(subscription.id)}`,
      item: { subscriptionId: subscription.id },
      label: subscription.name,
      dueAgorot: subscription.dueAgorot,
      paidAgorot: subscription.paidAgorot,
      leftAgorot: Math.max(0, subscription.balanceAgorot),
      usage: subscription.billing !== 'FIXED',
    }));
  return [...visits, ...subscriptions];
}

/**
 * The key of the customer's oldest owing item, by the server's rule (the subscribe's allocation,
 * finance's oldest item): the item made first across both kinds — a visit when it was checked in,
 * a subscription when it was made —, a visit before a subscription made at the same instant, then by
 * id; `null` when nothing owes. An unpriced visit owes nothing yet.
 */
export function oldestOwingKey(file: CustomerFile): string | null {
  const owing = [
    ...file.unpaidVisits
      .filter(({ balanceAgorot }) => balanceAgorot !== null && balanceAgorot > 0)
      .map(({ visit }) => ({
        key: `visit-${String(visit.id)}`,
        at: Date.parse(visit.checkedInAt),
        visitFirst: 0,
        id: visit.id,
      })),
    ...file.subscriptions
      .filter(({ balanceAgorot }) => balanceAgorot > 0)
      .map(({ id, createdAt }) => ({
        key: `subscription-${String(id)}`,
        at: Date.parse(createdAt),
        visitFirst: 1,
        id,
      })),
  ].sort((a, b) => a.at - b.at || a.visitFirst - b.visitFirst || a.id - b.id);
  return owing[0]?.key ?? null;
}
