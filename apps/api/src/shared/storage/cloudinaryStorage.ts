import { createHash } from 'node:crypto';

import { checkKey, StorageError, type Storage } from './storage.ts';

/** Cloudinary's account, from `CLOUDINARY_URL`, and the folder of this environment. */
export interface CloudinarySettings {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  /** Every file of this environment lives under it, so two environments share one account apart. */
  folder: string;
}

/** Long enough for a few megabytes from Gaza's connections, short of the function's own limit. */
const TIMEOUT_MS = 8_000;

/**
 * Cloudinary's request signature: the parameters sorted by name, as `name=value` joined by `&`,
 * then the secret, hashed with SHA-1 (Cloudinary's "Generating authentication signatures").
 */
export function signCloudinary(params: Record<string, string>, apiSecret: string): string {
  const signed = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name] ?? ''}`)
    .join('&');
  return createHash('sha1').update(`${signed}${apiSecret}`).digest('hex');
}

/**
 * The storage online (conventions §12): Cloudinary's free plan as a plain store. A file is uploaded
 * as it is and delivered as it was uploaded, with no transformation, so no credit is spent on one
 * and a move to another store is a new adapter, not new data. Its REST API is called with `fetch`
 * and a signed request. Images only: another type is refused before anything is sent.
 */
export function createCloudinaryStorage({
  cloudName,
  apiKey,
  apiSecret,
  folder,
}: CloudinarySettings): Storage {
  const api = `https://api.cloudinary.com/v1_1/${cloudName}`;

  /** Cloudinary's name for a file: the key under the folder, without its extension. */
  function publicIdOf(key: string): string {
    checkKey(key);
    return `${folder}/${key.slice(0, key.lastIndexOf('.'))}`;
  }

  /** Sends a signed request to `path`; the answer's JSON, or a `StorageError`. */
  async function call(
    path: string,
    params: Record<string, string>,
    file?: Blob,
  ): Promise<Record<string, unknown>> {
    const body = new FormData();
    if (file) body.append('file', file);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signed = { ...params, timestamp };
    for (const [name, value] of Object.entries(signed)) body.append(name, value);
    body.append('api_key', apiKey);
    body.append('signature', signCloudinary(signed, apiSecret));

    let response: Response;
    try {
      response = await fetch(`${api}${path}`, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new StorageError(`Cloudinary ${path} could not be reached`, { cause: error });
    }
    const answer = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new StorageError(`Cloudinary ${path} answered ${String(response.status)}`);
    }
    return answer;
  }

  return {
    async put(key, { bytes, contentType }) {
      if (!contentType.startsWith('image/')) {
        throw new StorageError(`Cloudinary stores images only, not ${contentType}`);
      }
      const file = new Blob([new Uint8Array(bytes)], { type: contentType });
      const publicId = publicIdOf(key);
      await call(
        '/image/upload',
        {
          public_id: publicId,
          // An account with dynamic folders files an asset by this, not by its public id's path.
          asset_folder: publicId.slice(0, publicId.lastIndexOf('/')),
          // Cloudinary overwrites by default; a key is never written twice.
          overwrite: 'false',
        },
        file,
      );
    },

    async remove(key) {
      // `not found` counts as removed; `invalidate` makes the CDN forget it too.
      await call('/image/destroy', { public_id: publicIdOf(key), invalidate: 'true' });
    },

    url(key) {
      const extension = key.slice(key.lastIndexOf('.'));
      return `https://res.cloudinary.com/${cloudName}/image/upload/${publicIdOf(key)}${extension}`;
    },
  };
}
