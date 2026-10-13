import type { RequestHandler } from 'express';

// The storage port (docs/backend/conventions.md §12): bytes by key, and the URL a browser fetches
// them from. It knows no domain: a consumer names its keys, checks its own content, and decides
// what its files are. Locally the files live on disk; online in Cloudinary, as a plain store.

/** A store refused or failed. Its message never holds a secret. */
export class StorageError extends Error {
  override name = 'StorageError';
}

/**
 * What is stored under a key: its bytes and their media type, which must agree with the key's
 * extension: a store serves a file by the type its extension names.
 */
export interface StoredFile {
  bytes: Buffer;
  contentType: string;
}

export interface Storage {
  /** Stores a new file under `key`; a key is never reused, so nothing is overwritten. */
  put(key: string, file: StoredFile): Promise<void>;
  /** Deletes the file under `key`; one already absent is no error. */
  remove(key: string): Promise<void>;
  /** Where a browser fetches the file: absolute online, root-relative locally. */
  url(key: string): string;
  /** The local adapter's handler for its own files, mounted only where the port has one. */
  files?: RequestHandler;
}

const KEY_MAX_LENGTH = 200;
const SEGMENT = /^[A-Za-z0-9_-]+$/;
const LAST_SEGMENT = /^[A-Za-z0-9_-]+\.[a-z0-9]+$/;

/**
 * A key's segments, once it is checked: `/`-separated segments of letters, digits, `_` and `-`, the
 * last with one extension, which names its type. So no key can leave a store's root (`..`, an
 * absolute path, a drive) or mean two things to two stores.
 */
export function checkKey(key: string): string[] {
  const segments = key.split('/');
  const last = segments.at(-1) ?? '';
  const valid =
    key.length <= KEY_MAX_LENGTH &&
    LAST_SEGMENT.test(last) &&
    segments.slice(0, -1).every((segment) => SEGMENT.test(segment));
  if (!valid) throw new StorageError('Invalid storage key');
  return segments;
}
