/** The capability's query keys, scoped as docs/frontend/architecture.md §7 says. */
export const lookupsKeys = {
  /** The admin's governorates with their areas, hidden ones included: never the public's list. */
  governorates: ['admin', 'lookups', 'governorates'] as const,
  /** The admin's amenities, retired ones included: never the public's list. */
  amenities: ['admin', 'lookups', 'amenities'] as const,
};
