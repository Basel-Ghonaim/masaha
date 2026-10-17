/** The capability's query keys, scoped as docs/frontend/architecture.md §7 says. */
export const spacesKeys = {
  /**
   * Until when the server refuses the admin's actions on spaces after a 429, in milliseconds since
   * the epoch, or `null`: the window the server holds, as its last answer gave it.
   */
  hold: ['admin', 'spaces', 'hold'] as const,
  /** One space, whole, as the admin edits it. */
  space: (spaceId: number) => ['admin', 'spaces', 'space', spaceId] as const,
  /** One space's photos, in the gallery's order; photos are no fact group, so a key of their own. */
  photos: (spaceId: number) => ['admin', 'spaces', 'photos', spaceId] as const,
};
