/**
 * Every key the app keeps in the browser's storage, in one place: what a device holds is read here.
 * A key's name never changes once shipped, or every user loses what it held (their language, their
 * theme). The pre-paint script in index.html reads the language and the theme by these names.
 */
export const STORAGE_KEYS = {
  language: 'masaha.language',
  theme: 'masaha.theme',
  /** One key per user, so two accounts on one device never land on each other's space. */
  lastSpace: (userId: number) => `masaha.lastSpace.${String(userId)}` as const,
  /**
   * A guest's held favourite or report, for 15 minutes, so a password recovery's new tab can run it
   * after its sign-in (finding 168; shared/routing's guest/heldIntent.ts).
   */
  heldIntent: 'masaha.heldIntent',
  /**
   * When a password reset was completed in this browser, for 10 minutes: the sign-in after it may run
   * the held intent (shared/routing's guest/heldIntent.ts).
   */
  recoveredAt: 'masaha.recoveredAt',
} as const;

type Keys = typeof STORAGE_KEYS;

/** A key `STORAGE_KEYS` declares; the storage layer takes no other. */
export type StorageKey = {
  [Name in keyof Keys]: Keys[Name] extends (...args: never[]) => infer Key ? Key : Keys[Name];
}[keyof Keys];
