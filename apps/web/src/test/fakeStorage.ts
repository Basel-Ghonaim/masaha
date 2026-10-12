import { vi } from 'vitest';

/**
 * Stands in for the browser's `localStorage`, the global the storage layer reaches and the unit
 * lane's Node has none of, as `fakeAdapter` stands in for the transport: items held in a Map, which
 * the test can read. Undo it with `vi.unstubAllGlobals()`.
 */
export function stubLocalStorage(items = new Map<string, string>()): Map<string, string> {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
  });
  return items;
}

/**
 * A browser that blocks site data: reaching `localStorage` itself throws a `SecurityError`, as
 * Chrome's does. Undo it with `vi.unstubAllGlobals()`.
 */
export function blockLocalStorage(): void {
  // Stubbed first so that vi.unstubAllGlobals() restores the original, then turned into a getter,
  // which vi.stubGlobal cannot define.
  vi.stubGlobal('localStorage', undefined);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
}
