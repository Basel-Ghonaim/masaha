import { vi } from 'vitest';

/**
 * Stands in for the browser's `localStorage`, which the unit lane's Node has none of, as
 * `fakeAdapter` stands in for the transport: items held in a Map, which the test can read. Undo it
 * with `vi.unstubAllGlobals()`.
 */
export function stubLocalStorage(): Map<string, string> {
  const items = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  });
  return items;
}

/** A `localStorage` the browser blocks: every access throws a `SecurityError`. */
export function blockLocalStorage(): void {
  const blocked = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  };
  vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
}
