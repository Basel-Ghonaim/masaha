import type { StorageKey } from './keys';

/**
 * The browser's `localStorage`, reached on each call and only inside the guard: when the browser
 * blocks site data, reaching the property itself throws, and so does any call on it.
 */
function guarded<T>(access: (local: Storage) => T, fallback: T): T {
  try {
    return access(globalThis.localStorage);
  } catch {
    return fallback;
  }
}

/**
 * The one way to the browser's storage. Values are plain strings, and each owner checks what it
 * reads, since anything may have written it. Storage that is blocked or full stores nothing and
 * reads nothing, and the page keeps working: a choice holds until it is left.
 */
export const storage = {
  /** The value stored at `key`, or `null` when there is none or storage cannot be read. */
  read: (key: StorageKey): string | null => guarded((local) => local.getItem(key), null),
  /** Stores `value` at `key`; does nothing when storage cannot be written. */
  write: (key: StorageKey, value: string): void => {
    guarded((local) => {
      local.setItem(key, value);
    }, undefined);
  },
  /** Removes `key`; does nothing when storage cannot be written. */
  remove: (key: StorageKey): void => {
    guarded((local) => {
      local.removeItem(key);
    }, undefined);
  },
};
