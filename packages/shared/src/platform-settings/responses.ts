// The platform's settings, as the admin's cards and the public contact answer them
// (docs/api/api-contract.md › Platform settings).

/** After how many days a space's fact group is stale. */
export interface StalenessThresholds {
  /** Every fact group but the prices. */
  stalenessDays: number;
  priceStalenessDays: number;
}

/** The platform's contact; `null` while unset. */
export interface PlatformContact {
  email: string | null;
  /** E.164. */
  whatsapp: string | null;
}
