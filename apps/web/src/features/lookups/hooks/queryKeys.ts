/** The capability's query keys, scoped as docs/frontend/architecture.md §7 says. */
export const lookupsKeys = {
  /** The admin's governorates with their areas, hidden ones included: never the public's list. */
  governorates: ['admin', 'lookups', 'governorates'] as const,
  /** The admin's amenities, retired ones included: never the public's list. */
  amenities: ['admin', 'lookups', 'amenities'] as const,
  /** The public catalogue: what a form or a filter may offer, active rows only. */
  catalogue: ['public', 'lookups', 'catalogue'] as const,
};
