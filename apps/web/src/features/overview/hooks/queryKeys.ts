/** The capability's keys, scoped as docs/frontend/architecture.md §7 says. */
export const overviewKeys = {
  /** The owner's overview of the space. */
  owner: (spaceId: number) => ['space', spaceId, 'overview'] as const,
  /** The admin's overview of the platform. */
  admin: () => ['admin', 'overview'] as const,
};
