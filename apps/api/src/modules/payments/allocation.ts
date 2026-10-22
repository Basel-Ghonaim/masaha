// The allocation of one amount over a customer's items (docs/architecture/data-model.md › A renewal
// with a debt; ADR 0010): pure, so the rule is one and its branches are unit-tested.

/** How many items one amount pays at most: the 49 oldest debts and the new subscription. */
export const ALLOCATION_MAX_ITEMS = 50;

/** An item a payment settles: a visit or a subscription. */
export type AllocationItem = { visitId: number } | { subscriptionId: number };

/**
 * Spreads `amount` over the debts, oldest first as given, each at most its balance, then gives the
 * rest to `last` (the new subscription), which takes it whole; only the first 49 debts are paid. A
 * part of nothing is left out, so the parts are the payments to record, in order.
 */
export function allocate(
  amount: number,
  debts: readonly { item: AllocationItem; balanceAgorot: number }[],
  last: AllocationItem,
): { parts: { item: AllocationItem; amountAgorot: number }[] } {
  const parts: { item: AllocationItem; amountAgorot: number }[] = [];
  let rest = amount;
  for (const { item, balanceAgorot } of debts.slice(0, ALLOCATION_MAX_ITEMS - 1)) {
    const part = Math.min(rest, balanceAgorot);
    if (part > 0) parts.push({ item, amountAgorot: part });
    rest -= part;
  }
  if (rest > 0) parts.push({ item: last, amountAgorot: rest });
  return { parts };
}
