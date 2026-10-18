// The requests of the managed packages endpoints (docs/api/api-contract.md §5, Packages (managed)).

/** How a package is billed: the whole price, or the rate per hour or per day. */
export const SUBSCRIPTION_BILLINGS = ['FIXED', 'PER_HOUR', 'PER_DAY'] as const;
