import { afterEach, describe, expect, it, vi } from 'vitest';
import { blockLocalStorage, stubLocalStorage } from '../../test/fakeStorage';
import { storage } from './storage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the storage layer', () => {
  it('reads the value stored at a key, and nothing for a key with none', () => {
    stubLocalStorage(new Map([['masaha.theme', 'dark']]));

    expect(storage.read('masaha.theme')).toBe('dark');
    expect(storage.read('masaha.language')).toBeNull();
  });

  it('writes a value as the plain string at its key', () => {
    const items = stubLocalStorage();

    storage.write('masaha.lastSpace.4', '7');

    expect([...items]).toEqual([['masaha.lastSpace.4', '7']]);
  });

  it('removes a key', () => {
    const items = stubLocalStorage(
      new Map([
        ['masaha.theme', 'dark'],
        ['masaha.language', 'en'],
      ]),
    );

    storage.remove('masaha.theme');

    expect([...items]).toEqual([['masaha.language', 'en']]);
  });

  it('reads nothing, and writes and removes harmlessly, when the browser blocks storage', () => {
    blockLocalStorage();

    expect(storage.read('masaha.theme')).toBeNull();
    expect(() => {
      storage.write('masaha.theme', 'dark');
      storage.remove('masaha.theme');
    }).not.toThrow();
  });

  it('writes harmlessly when storage is full', () => {
    const items = stubLocalStorage();
    vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });

    expect(() => {
      storage.write('masaha.theme', 'dark');
    }).not.toThrow();
    expect(items.size).toBe(0);
  });
});
