import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import express, { type RequestHandler } from 'express';

import { AppError } from '../errors/index.ts';
import { checkKey, StorageError, type Storage } from './storage.ts';

/** How long a browser keeps a file: a key is never reused, so its URL never changes. */
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * The storage on the local disk, for development and the tests (conventions §12). It serves its own
 * files through `files`, which the composition root mounts at `urlBase`, so a URL is root-relative
 * and reaches the API through the web's proxy, at one origin (ADR 0014). A file's type is the one
 * its key's extension names. Never used online: production refuses it.
 */
export function createLocalStorage({ root, urlBase }: { root: string; urlBase: string }): Storage {
  const base = path.resolve(root);
  const serve = express.static(base, {
    dotfiles: 'deny',
    fallthrough: false,
    immutable: true,
    index: false,
    maxAge: ONE_YEAR_MS,
    redirect: false,
  });
  // A file it does not hold, or a path it refuses, is not found, as an unknown route is.
  const files: RequestHandler = (req, res, next) => {
    serve(req, res, (error?: unknown) => {
      const status = (error as { status?: unknown } | undefined)?.status;
      next(typeof status === 'number' && status < 500 ? AppError.notFound() : error);
    });
  };

  function pathOf(key: string): string {
    const full = path.resolve(base, ...checkKey(key));
    if (!full.startsWith(base + path.sep)) throw new StorageError('Invalid storage key');
    return full;
  }

  return {
    async put(key, { bytes }) {
      const full = pathOf(key);
      try {
        await mkdir(path.dirname(full), { recursive: true });
        await writeFile(full, bytes, { flag: 'wx' });
      } catch (error) {
        throw new StorageError(`Cannot store ${key}`, { cause: error });
      }
    },

    async remove(key) {
      const full = pathOf(key);
      try {
        await rm(full, { force: true });
      } catch (error) {
        throw new StorageError(`Cannot remove ${key}`, { cause: error });
      }
    },

    url(key) {
      checkKey(key);
      return `${urlBase}/${key}`;
    },

    files,
  };
}
