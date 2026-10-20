// The ledger's balance of one item (docs/architecture/data-model.md › Derived values): pure, so
// every read that answers it answers the same.

/** What is still owed on an item: its due less what was paid; `null` while it has no due. */
export function balanceOf(dueAgorot: number | null, paidAgorot: number): number | null {
  return dueAgorot === null ? null : dueAgorot - paidAgorot;
}
