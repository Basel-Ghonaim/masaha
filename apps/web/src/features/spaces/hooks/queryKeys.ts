/** The capability's query keys, scoped as docs/frontend/architecture.md §7 says. */
export const spacesKeys = {
  /**
   * Until when the server refuses the admin's actions on spaces after a 429, in milliseconds since
   * the epoch, or `null`: the window the server holds, as its last answer gave it.
   */
  hold: ['admin', 'spaces', 'hold'] as const,
};
