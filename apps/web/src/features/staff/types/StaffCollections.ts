/**
 * What each person collected this month, which the page composes from another capability (D5.6):
 * the amount in agorot, `null` when it could not be read; and the ledger of their collections.
 */
export type StaffCollections = {
  of: (userId: number) => number | null;
  link: (userId: number) => string;
};
