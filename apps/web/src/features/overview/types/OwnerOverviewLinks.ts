import type { FactGroup } from '@masaha/shared/spaces';

/**
 * Where the owner's overview leads: every link the page passes, since a feature knows no routes
 * (docs/frontend/architecture.md §3).
 */
export type OwnerOverviewLinks = {
  /** Where a fact group is edited: the prices on Packages & prices, the others on the profile. */
  group: (group: FactGroup) => string;
  /** The space's data reports, the open ones. */
  reports: string;
  /** The desk's uncollected visits. */
  desk: string;
  /** The desk's visits with no price. */
  deskUnpriced: string;
  /** Finance › Debts. */
  debts: string;
  /** The announcements page, where a closure's subscriptions are extended. */
  announcements: string;
  /** The settings' attendance card, where the capacity is set. */
  capacity: string;
  /** The desk, who is here. */
  presentNow: string;
  /** The customers whose subscription is ending soon. */
  endingAll: string;
  /** A customer's file. */
  customer: (customerId: number) => string;
};
