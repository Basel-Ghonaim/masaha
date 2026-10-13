import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { LOCAL_FILES_URL } from '../src/app.ts';
import { createLocalStorage, StorageError, type Storage } from '../src/shared/storage/index.ts';

// The storage the API tests pass through the port (testing §3, rule 3): the local disk, in a
// folder of the test's own, so a test reads what was stored and what was left.

export interface TestStorage {
  storage: Storage;
  /** Every file stored, as its key, sorted. */
  files(): Promise<string[]>;
  /** Deletes the folder. */
  cleanup(): Promise<void>;
}

/** A local storage in a new temporary folder. */
export async function createTestStorage(): Promise<TestStorage> {
  const root = await mkdtemp(path.join(tmpdir(), 'masaha-photos-'));
  return {
    storage: createLocalStorage({ root, urlBase: LOCAL_FILES_URL }),
    async files() {
      const entries = await readdir(root, { recursive: true, withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) =>
          path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'),
        )
        .sort();
    },
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

/** `storage`, except that storing a key `failPut` matches, or removing one `failRemove` matches, fails. */
export function failingStorage(
  storage: Storage,
  { failPut, failRemove }: { failPut?: RegExp; failRemove?: RegExp },
): Storage {
  return {
    ...storage,
    put: (key, file) =>
      failPut?.test(key)
        ? Promise.reject(new StorageError('The store is down'))
        : storage.put(key, file),
    remove: (key) =>
      failRemove?.test(key)
        ? Promise.reject(new StorageError('The store is down'))
        : storage.remove(key),
  };
}
