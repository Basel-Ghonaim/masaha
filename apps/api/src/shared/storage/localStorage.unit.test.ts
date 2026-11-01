import { mkdtemp, readFile, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createLocalStorage } from './localStorage.ts';
import { StorageError } from './storage.ts';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'masaha-local-storage-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const file = { bytes: Buffer.from('RIFF....WEBP'), contentType: 'image/webp' };

describe('the local storage', () => {
  it('writes a file under its root, at its key', async () => {
    const storage = createLocalStorage({ root, urlBase: '/api/v1/files' });

    await storage.put('spaces/abc/card.webp', file);

    expect(await readFile(path.join(root, 'spaces', 'abc', 'card.webp'))).toEqual(file.bytes);
  });

  it('never overwrites a file: a key is never reused', async () => {
    const storage = createLocalStorage({ root, urlBase: '/api/v1/files' });
    await storage.put('spaces/abc/card.webp', file);

    await expect(
      storage.put('spaces/abc/card.webp', { ...file, bytes: Buffer.from('other') }),
    ).rejects.toThrow(StorageError);
    expect(await readFile(path.join(root, 'spaces', 'abc', 'card.webp'))).toEqual(file.bytes);
  });

  it('removes a file, and removing it again is no error', async () => {
    const storage = createLocalStorage({ root, urlBase: '/api/v1/files' });
    await storage.put('spaces/abc/card.webp', file);

    await storage.remove('spaces/abc/card.webp');
    await storage.remove('spaces/abc/card.webp');

    await expect(stat(path.join(root, 'spaces', 'abc', 'card.webp'))).rejects.toThrow();
  });

  it('refuses a key that would leave its root, before touching the disk', async () => {
    const storage = createLocalStorage({ root, urlBase: '/api/v1/files' });

    await expect(storage.put('../outside.webp', file)).rejects.toThrow(StorageError);
    await expect(storage.remove('../outside.webp')).rejects.toThrow(StorageError);
    await expect(stat(path.join(root, '..', 'outside.webp'))).rejects.toThrow();
  });

  it('gives a key the root-relative URL its handler serves it at', () => {
    const storage = createLocalStorage({ root, urlBase: '/api/v1/files' });

    expect(storage.url('spaces/abc/card.webp')).toBe('/api/v1/files/spaces/abc/card.webp');
  });

  it('lists its files under a prefix with their dates, and none under a prefix it never wrote', async () => {
    const storage = createLocalStorage({ root, urlBase: '/api/v1/files' });
    await storage.put('spaces/abc/card.webp', file);
    await storage.put('spaces/abc/page.webp', file);
    await storage.put('spaces/def/card.webp', file);
    await storage.put('avatars/xyz/card.webp', file);
    const old = new Date('2026-10-01T09:00:00.000Z');
    await utimes(path.join(root, 'spaces', 'def', 'card.webp'), old, old);

    const listed = [];
    for await (const entry of storage.list('spaces/')) listed.push(entry);

    expect(listed.sort((a, b) => a.key.localeCompare(b.key))).toEqual([
      { key: 'spaces/abc/card.webp', createdAt: expect.any(Date) as Date },
      { key: 'spaces/abc/page.webp', createdAt: expect.any(Date) as Date },
      { key: 'spaces/def/card.webp', createdAt: old },
    ]);
    const none = [];
    for await (const entry of storage.list('logos/')) none.push(entry);
    expect(none).toEqual([]);
  });
});
