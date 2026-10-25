/** The capability's keys, scoped as docs/frontend/architecture.md §7 says: under the space's. */
export const deskKeys = {
  /** Everything the desk reads of one space. */
  all: (spaceId: number) => ['space', spaceId, 'desk'] as const,
  /** The rounding, the cap and the rates a visit would copy now, for the caller. */
  terms: (spaceId: number) => ['space', spaceId, 'desk', 'terms'] as const,
  /** One open visit with what it costs now. */
  quote: (spaceId: number, visitId: number) =>
    ['space', spaceId, 'desk', 'quote', visitId] as const,
  /** A page of the visits closed with something left to collect. */
  uncollected: (spaceId: number, page: number) =>
    ['space', spaceId, 'desk', 'uncollected', page] as const,
};
