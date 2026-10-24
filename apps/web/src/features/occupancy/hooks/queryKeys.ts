/** The capability's keys, scoped as docs/frontend/architecture.md §7 says: under the space's. */
export const occupancyKeys = {
  /** The space's capacity, private to its staff. */
  capacity: (spaceId: number) => ['space', spaceId, 'occupancy', 'capacity'] as const,
  /** The space's state now, as its staff see it: polled while the desk is visible. */
  now: (spaceId: number) => ['space', spaceId, 'occupancy', 'now'] as const,
  /** The override's writes, set or cleared, while they wait. */
  override: (spaceId: number) => ['space', spaceId, 'occupancy', 'override'] as const,
};
