/** One of the sheet's choices, worded in one line (DK-007): a package, a published price, or custom. */
export type PackageChoice = {
  /** `pkg-{id}`, `price-{period}-{audience}-{shiftId}`, or `custom`. */
  value: string;
  title: string;
  /** Its price, with its unit when it is billed from attendance; none for custom. */
  amount: string | null;
  terms: string;
};
