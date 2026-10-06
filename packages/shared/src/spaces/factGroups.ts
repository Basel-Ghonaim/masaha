/**
 * A space's fact groups, each with its own freshness date (docs/architecture/data-model.md ›
 * Conventions, Freshness), in the order the edit screen shows them.
 */
export const FACT_GROUPS = ['profile', 'hours', 'prices', 'amenities', 'contacts'] as const;

export type FactGroup = (typeof FACT_GROUPS)[number];
