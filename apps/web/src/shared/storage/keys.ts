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
} as const;

type Keys = typeof STORAGE_KEYS;

/** A key `STORAGE_KEYS` declares; the storage layer takes no other. */
export type StorageKey = {
  [Name in keyof Keys]: Keys[Name] extends (...args: never[]) => infer Key ? Key : Keys[Name];
}[keyof Keys];
