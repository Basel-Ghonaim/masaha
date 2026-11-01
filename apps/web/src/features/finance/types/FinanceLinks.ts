/**
 * Where finance leads: every link the page passes, since a feature knows no routes
 * (docs/frontend/architecture.md §3).
 */
export type FinanceLinks = {
  /** A customer's file, where «استلام {المبلغ}» is (DI15). */
  customer: (customerId: number) => string;
  /** The desk's uncollected visits. */
  uncollected: string;
  /** The payments ledger over a range of Gaza dates (EC16: `from`, `to`). */
  ledger: (range: { from: string; to: string }) => string;
};
