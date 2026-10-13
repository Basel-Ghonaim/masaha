import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCloudinaryStorage, signCloudinary } from './cloudinaryStorage.ts';
import { StorageError } from './storage.ts';

const settings = {
  cloudName: 'demo-cloud',
  apiKey: '123456789012345',
  apiSecret: 'a-test-api-secret',
  folder: 'masaha/test',
};

const file = { bytes: Buffer.from('RIFF....WEBP'), contentType: 'image/webp' };

/** The requests Cloudinary is sent, each answered by `answer`. */
function stubFetch(answer: () => Response | Promise<Response>) {
  const calls: { url: string; body: FormData; signal: AbortSignal | undefined }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit) => {
      calls.push({
        url,
        body: init.body as FormData,
        signal: init.signal ?? undefined,
      });
      return Promise.resolve(answer());
    }),
  );
  return calls;
}

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-13T09:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('signCloudinary', () => {
  it('signs the sorted parameters with the secret, as Cloudinary documents it', () => {
    // Cloudinary's own example (Upload API, "Generating authentication signatures").
    expect(
      signCloudinary(
        {
          timestamp: '1315060510',
          public_id: 'sample_image',
          eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
        },
        'abcd',
      ),
    ).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });
});

describe('the Cloudinary storage', () => {
  it('uploads an image signed, new, under its environment’s folder, never sending the secret', async () => {
    const calls = stubFetch(() => json(200, { public_id: 'masaha/test/spaces/abc/card' }));
    const storage = createCloudinaryStorage(settings);

    await storage.put('spaces/abc/card.webp', file);

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
    const fields = Object.fromEntries(
      [...(call?.body.entries() ?? [])].filter(([name]) => name !== 'file'),
    );
    // Never over a file already stored, and in its key's folder whatever the account's folder mode.
    const signed = {
      public_id: 'masaha/test/spaces/abc/card',
      asset_folder: 'masaha/test/spaces/abc',
      overwrite: 'false',
      timestamp: '1791882000',
    };
    expect(fields).toEqual({
      ...signed,
      api_key: '123456789012345',
      signature: signCloudinary(signed, 'a-test-api-secret'),
    });
    const sent = call?.body.get('file') as Blob;
    expect(sent.type).toBe('image/webp');
    expect(Buffer.from(await sent.arrayBuffer())).toEqual(file.bytes);
    expect(call?.signal).toBeDefined();
    expect(JSON.stringify(fields)).not.toContain('a-test-api-secret');
  });

  it('refuses a file that is not an image before sending anything', async () => {
    const calls = stubFetch(() => json(200, {}));
    const storage = createCloudinaryStorage(settings);

    await expect(
      storage.put('exports/report.csv', { bytes: Buffer.from('a,b'), contentType: 'text/csv' }),
    ).rejects.toThrow(StorageError);
    expect(calls).toHaveLength(0);
  });

  it('fails when Cloudinary refuses the upload, or cannot be reached', async () => {
    stubFetch(() => json(401, { error: { message: 'Invalid Signature' } }));
    await expect(createCloudinaryStorage(settings).put('a/b.webp', file)).rejects.toThrow(
      StorageError,
    );

    stubFetch(() => Promise.reject(new TypeError('fetch failed')));
    await expect(createCloudinaryStorage(settings).put('a/b.webp', file)).rejects.toThrow(
      StorageError,
    );
  });

  it('removes an image signed, asking the CDN to forget it, and a missing one is no error', async () => {
    const calls = stubFetch(() => json(200, { result: 'ok' }));
    const storage = createCloudinaryStorage(settings);

    await storage.remove('spaces/abc/card.webp');

    expect(calls[0]?.url).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/destroy');
    expect(Object.fromEntries(calls[0]?.body.entries() ?? [])).toEqual({
      public_id: 'masaha/test/spaces/abc/card',
      invalidate: 'true',
      timestamp: '1791882000',
      api_key: '123456789012345',
      signature: signCloudinary(
        { public_id: 'masaha/test/spaces/abc/card', invalidate: 'true', timestamp: '1791882000' },
        'a-test-api-secret',
      ),
    });

    stubFetch(() => json(200, { result: 'not found' }));
    await expect(createCloudinaryStorage(settings).remove('a/b.webp')).resolves.toBeUndefined();

    stubFetch(() => json(500, { error: { message: 'Server error' } }));
    await expect(createCloudinaryStorage(settings).remove('a/b.webp')).rejects.toThrow(
      StorageError,
    );
  });

  it('delivers a file as it was uploaded, its URL ending in the key’s own extension', () => {
    const storage = createCloudinaryStorage(settings);

    expect(storage.url('spaces/abc/card.webp')).toBe(
      'https://res.cloudinary.com/demo-cloud/image/upload/masaha/test/spaces/abc/card.webp',
    );
    expect(storage.url('spaces/abc/card.png')).toBe(
      'https://res.cloudinary.com/demo-cloud/image/upload/masaha/test/spaces/abc/card.png',
    );
  });
});
