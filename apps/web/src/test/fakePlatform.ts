import type { Platform } from '@shared/preferences';

type Browser = {
  /** What storage holds when the page loads. */
  stored?: Record<string, string>;
  /** `lang` on <html>, as the pre-paint script left it. */
  lang?: string;
  prefersDark?: boolean;
  /** Every storage access throws, as when the browser blocks storage. */
  storageThrows?: boolean;
};

/** A stand-in browser for the preferences store, for the unit lane, which runs in Node. */
export function fakePlatform({
  stored = {},
  lang = '',
  prefersDark = false,
  storageThrows = false,
}: Browser = {}) {
  const storage = new Map(Object.entries(stored));
  const root: Platform['root'] = { lang, dir: '', dataset: {} };
  const deviceListeners = new Set<() => void>();
  const storageListeners = new Set<(event: { key: string | null }) => void>();
  const device = { dark: prefersDark };
  const reach = () => {
    if (storageThrows) {
      throw new Error('SecurityError');
    }
    return storage;
  };

  const platform: Platform = {
    storage: {
      getItem: (key) => reach().get(key) ?? null,
      setItem: (key, value) => {
        reach().set(key, value);
      },
      removeItem: (key) => {
        reach().delete(key);
      },
    },
    root,
    prefersDark: {
      get matches() {
        return device.dark;
      },
      addEventListener: (_, listener) => {
        deviceListeners.add(listener);
      },
      removeEventListener: (_, listener) => {
        deviceListeners.delete(listener);
      },
    },
    events: {
      addEventListener: (_, listener) => {
        storageListeners.add(listener);
      },
      removeEventListener: (_, listener) => {
        storageListeners.delete(listener);
      },
    },
  };

  return {
    platform,
    root,
    /** How many listeners the store has left on the device and on storage events. */
    listeners: () => deviceListeners.size + storageListeners.size,
    /** What storage holds now. */
    stored: () => Object.fromEntries(storage),
    /** The device switches its colour scheme. */
    setDeviceDark: (dark: boolean) => {
      device.dark = dark;
      deviceListeners.forEach((listener) => {
        listener();
      });
    },
    /** Another tab sets a key, removes it (`null`), or clears storage (key `null`); this tab hears it. */
    otherTabWrites: (key: string | null, value: string | null) => {
      if (key === null) {
        storage.clear();
      } else if (value === null) {
        storage.delete(key);
      } else {
        storage.set(key, value);
      }
      storageListeners.forEach((listener) => {
        listener({ key });
      });
    },
  };
}
