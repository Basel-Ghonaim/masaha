/** The capability's query keys, scoped as docs/frontend/architecture.md §7 says. */
export const spaceLinksKeys = {
  /** The signed-in user's own spaces. */
  mySpaces: ['me', 'spaces'] as const,
};
