/** The one property of a `storage` event the store reads: which key changed (`null` when cleared). */
export type StorageChange = Pick<StorageEvent, 'key'>;

/**
 * What the preferences store reads and writes in the browser, besides the choices, which persist
 * through shared/storage. The store owns these dependencies, so it takes them in one place;
 * production passes `browserPlatform()`.
 */
export type Platform = {
  /** The element that carries `lang`, `dir` and `data-theme`: `<html>`. */
  root: { lang: string; dir: string; dataset: Record<string, string | undefined> };
  /** The device's `(prefers-color-scheme: dark)` query. */
  prefersDark: {
    readonly matches: boolean;
    addEventListener: (type: 'change', listener: () => void) => void;
    removeEventListener: (type: 'change', listener: () => void) => void;
  };
  /** Where another tab's writes to storage are heard. */
  events: {
    addEventListener: (type: 'storage', listener: (event: StorageChange) => void) => void;
    removeEventListener: (type: 'storage', listener: (event: StorageChange) => void) => void;
  };
};

/** The real browser: `<html>`, the colour-scheme query and the window. */
export function browserPlatform(): Platform {
  return {
    root: document.documentElement,
    prefersDark: window.matchMedia('(prefers-color-scheme: dark)'),
    events: window,
  };
}
