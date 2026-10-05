/** The auth capability's query keys, scoped as docs/frontend/architecture.md §7 says. */
export const authKeys = {
  /** Where this browser's password recovery stands, as the server holds it. */
  recovery: ['public', 'recovery'] as const,
};
