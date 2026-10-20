/** The capability's keys, scoped as docs/frontend/architecture.md §7 says: under the space's. */
export const packagesKeys = {
  /** Every package of one space, retired ones included, in order. */
  list: (spaceId: number) => ['space', spaceId, 'packages'] as const,
  /** Every write on one row of the list, its switch or its shift, while it waits. */
  rowWrite: (spaceId: number) => ['space', spaceId, 'packages', 'row'] as const,
};
