/** The capability's keys, scoped as docs/frontend/architecture.md §7 says: under the space's. */
export const occupancyKeys = {
  /** The space's capacity, private to its staff. */
  capacity: (spaceId: number) => ['space', spaceId, 'occupancy', 'capacity'] as const,
};
