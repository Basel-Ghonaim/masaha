/** The one property of a `storage` event the store reads: which key changed (`null` when cleared). */
export type StorageChange = Pick<StorageEvent, 'key'>;

/**
 * What the preferences store reads and writes in the browser. The store owns these dependencies,
 * so it takes them in one place; production passes `browserPlatform()`.
 */
export type Platform = {
  /** Where the choices persist. Any access may throw, when the browser blocks storage. */
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  /** The element that carries `lang`, `dir` and `data-theme`: `<html>`. */
  root: { lang: string; dir: string; dataset: Record<string, string | undefined> };
  /** The device's `(prefers-color-scheme: dark)` query. */
  prefersDark: {
    readonly matches: boolean;
    addEventListener: (type: 'change', listener: () => void) => void;
    removeEventListener: (type: 'change', listener: () => void) => void;
  };
  /** Where another tab's storage writes are heard. */
  events: {
    addEventListener: (type: 'storage', listener: (event: StorageChange) => void) => void;
    removeEventListener: (type: 'storage', listener: (event: StorageChange) => void) => void;
  };
};

/** The real browser: `localStorage`, `<html>`, the colour-scheme query and the window. */
export function browserPlatform(): Platform {
  return {
    // Reaching window.localStorage itself throws when storage is blocked, so it is reached on each
    // call, where the store catches it, rather than once here.
    storage: {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => {
        window.localStorage.setItem(key, value);
      },
      removeItem: (key) => {
        window.localStorage.removeItem(key);
      },
    },
    root: document.documentElement,
    prefersDark: window.matchMedia('(prefers-color-scheme: dark)'),
    events: window,
  };
}
