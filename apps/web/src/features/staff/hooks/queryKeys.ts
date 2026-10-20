/** The capability's keys, scoped as docs/frontend/architecture.md §7 says: under the space's. */
export const staffKeys = {
  /** Every reception link of one space, deactivated ones included. */
  list: (spaceId: number) => ['space', spaceId, 'staff'] as const,
};
