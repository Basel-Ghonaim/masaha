/** The auth capability's query keys, scoped as docs/frontend/architecture.md §7 says. */
export const authKeys = {
  /** Where this browser's password recovery stands, as the server holds it. */
  recovery: ['public', 'recovery'] as const,
  /**
   * The mutations a guest's sign-in sends: signing in, registering, Google, and a reset link asked
   * for or asked again. Each is keyed under it, so `useSignInBusy` counts them as one.
   */
  signingIn: ['auth', 'signingIn'] as const,
};
