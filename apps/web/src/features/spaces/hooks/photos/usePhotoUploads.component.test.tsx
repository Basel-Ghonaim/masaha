import type { SpacePhoto } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeCanvas, fakeFile } from '../../../../test/fakeCanvas';
import { deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { usePhotosQuery } from './usePhotosQuery';
import { usePhotoUploads } from './usePhotoUploads';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const PHOTOS: SpacePhoto[] = [
  { id: 3, urls: { card: '/files/3-card.webp', page: '/files/3-page.webp' } },
  { id: 4, urls: { card: '/files/4-card.webp', page: '/files/4-page.webp' } },
];

const stored = (id: number): SpacePhoto => ({
  id,
  urls: { card: `/files/${String(id)}-card.webp`, page: `/files/${String(id)}-page.webp` },
});

/** The queue over space 7's gallery as it stands, with the editor's own uploading flag beside it. */
function renderUploads(
  photos: SpacePhoto[] = PHOTOS,
  answer: (request: Request) => FakeAnswer | Promise<FakeAnswer> = () => ok(stored(9)),
) {
  const requests = fakeTransport((request) =>
    request.method === 'get' ? ok(photos) : answer(request),
  );
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const uploading: boolean[] = [];
  const rendered = renderHook(
    () => {
      // The section reads the gallery and hands the queue what it holds, as it does.
      const query = usePhotosQuery('admin', 7);
      const photos = query.data ?? [];
      return {
        photos,
        uploads: usePhotoUploads('admin', 7, photos, (value) => uploading.push(value)),
      };
    },
    { wrapper },
  );
  return { ...rendered, requests, client, uploading };
}

/** The names of the uploads waiting, travelling or refused, and their states. */
const tilesOf = (result: { current: { uploads: ReturnType<typeof usePhotoUploads> } }) =>
  result.current.uploads.tiles.map((tile) => [tile.fileName, tile.state, tile.progress]);

/** Chooses files as the browser's picker would, and lets the queue start. */
async function choose(
  result: { current: { uploads: ReturnType<typeof usePhotoUploads> } },
  ...files: File[]
) {
  await act(async () => {
    result.current.uploads.choose(files);
    await Promise.resolve();
  });
}

beforeEach(() => {
  startPreferences('en');
  fakeCanvas({ width: 2000, height: 1500 });
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('usePhotoUploads', () => {
  it('uploads chosen files one at a time, in the order chosen, each with its own progress', async () => {
    const first = deferred<FakeAnswer>();
    const sent: string[] = [];
    let answered = 0;
    const { result, requests } = renderUploads(PHOTOS, (request) => {
      if (request.method !== 'post') return { status: 204 };
      const body = request.data as FormData;
      sent.push((body.get('photo') as File).name);
      answered += 1;
      request.onUploadProgress?.({
        loaded: 512,
        total: 1024,
        bytes: 512,
        lengthComputable: true,
      });
      return answered === 1 ? first.promise : ok(stored(10));
    });

    await choose(result, fakeFile('one.jpg', 'image/jpeg'), fakeFile('two.png', 'image/png'));

    // One at a time: the second waits while the first is half way through.
    expect(sent).toEqual(['one.jpg']);
    expect(tilesOf(result)).toEqual([
      ['one.jpg', 'uploading', 50],
      ['two.png', 'preparing', null],
    ]);

    await act(async () => {
      first.resolve(ok(stored(9)));
      await first.promise;
    });

    await waitFor(() => {
      expect(sent).toEqual(['one.jpg', 'two.jpg']);
    });
    // The second was chosen as a PNG and travels as the JPEG the browser re-encoded it to.
    expect(requests.filter(({ method }) => method === 'post')).toHaveLength(2);
    await waitFor(() => {
      expect(result.current.uploads.tiles).toEqual([]);
    });
    // Each 201 answer is the server's own row, kept in its own position: nothing went up quietly.
    await waitFor(() => {
      expect(result.current.photos.map(({ id }) => id)).toEqual([3, 4, 9, 10]);
    });
    expect(result.current.uploads.summary).toBeNull();
  });

  it('keeps a failed file on its own tile with a retry where one can work', async () => {
    let attempts = 0;
    const { result } = renderUploads(PHOTOS, (request) => {
      if (request.method !== 'post') return { status: 204 };
      attempts += 1;
      return attempts === 1 ? { failure: 'ERR_NETWORK' } : ok(stored(9));
    });

    await choose(result, fakeFile('desk.jpg', 'image/jpeg'));

    await waitFor(() => {
      expect(tilesOf(result)).toEqual([['desk.jpg', 'failed', null]]);
    });
    expect(result.current.uploads.tiles[0]?.retry).not.toBeNull();
    expect(result.current.uploads.tiles[0]?.refusal).toMatchObject({ type: 'network' });

    await act(async () => {
      result.current.uploads.tiles[0]?.retry?.run();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.uploads.tiles).toEqual([]);
    });
  });

  it('offers no retry after a refusal the server judged about these bytes, and drops the file instead', async () => {
    const { result } = renderUploads(PHOTOS, () => refused(413, { type: 'payload_too_large' }));

    await choose(result, fakeFile('huge.jpg', 'image/jpeg'));

    await waitFor(() => {
      expect(tilesOf(result)).toEqual([['huge.jpg', 'failed', null]]);
    });
    expect(result.current.uploads.tiles[0]?.retry).toBeNull();
    expect(result.current.uploads.tiles[0]?.drop).not.toBeNull();

    await act(async () => {
      result.current.uploads.tiles[0]?.drop.run();
      await Promise.resolve();
    });
    expect(result.current.uploads.tiles).toEqual([]);
  });

  it('refuses a file the browser cannot decode, and sends no request', async () => {
    vi.unstubAllGlobals();
    fakeCanvas({ decodes: false });
    const { result, requests } = renderUploads();

    await choose(result, fakeFile('IMG_0042.heic', 'image/heic'));

    await waitFor(() => {
      expect(tilesOf(result)).toEqual([['IMG_0042.heic', 'failed', null]]);
    });
    expect(result.current.uploads.tiles[0]?.unsupported).toBe(true);
    expect(result.current.uploads.tiles[0]?.refusal).toBeNull();
    // Nothing reached the network: a file the browser cannot read is refused where it was chosen.
    expect(requests.filter(({ method }) => method !== 'get')).toEqual([]);
  });

  it('uploads what fits and says how many of the selection went up', async () => {
    const full = Array.from({ length: 9 }, (_, index) => stored(index + 1));
    const { result, requests } = renderUploads(full);
    await waitFor(() => {
      expect(result.current.photos).toHaveLength(9);
    });

    await choose(
      result,
      fakeFile('one.jpg', 'image/jpeg'),
      fakeFile('two.jpg', 'image/jpeg'),
      fakeFile('three.jpg', 'image/jpeg'),
    );

    await waitFor(() => {
      expect(result.current.uploads.summary).toBe('Uploaded 1 of 3; the limit is 10 photos');
    });
    expect(requests.filter(({ method }) => method === 'post')).toHaveLength(1);
    expect(result.current.uploads.canAdd).toBe(false);
    expect(result.current.uploads.addReason).toBe('Up to 10 photos — remove one to add another');
  });

  it('counts what went up when the batch ends, and clears the line when the next choice starts', async () => {
    const full = Array.from({ length: 9 }, (_, index) => stored(index + 1));
    let refuse = true;
    const { result } = renderUploads(full, (request) =>
      request.method === 'get'
        ? ok(full)
        : refuse
          ? refused(500, { type: 'server' })
          : ok(stored(10)),
    );
    await waitFor(() => {
      expect(result.current.photos).toHaveLength(9);
    });

    // Only the first of the two fits, and it fails: nothing went up, whatever was predicted.
    await choose(result, fakeFile('one.jpg', 'image/jpeg'), fakeFile('two.jpg', 'image/jpeg'));
    await waitFor(() => {
      expect(result.current.uploads.summary).toBe('Uploaded 0 of 2; the limit is 10 photos');
    });

    refuse = false;
    await act(async () => {
      result.current.uploads.tiles[0]?.drop.run();
      await Promise.resolve();
    });
    await choose(result, fakeFile('three.jpg', 'image/jpeg'));

    expect(result.current.uploads.summary).toBeNull();
  });

  it('stops the queue when the section is left: nothing new is sent and the file in flight is aborted', async () => {
    const first = deferred<FakeAnswer>();
    const { result, requests, unmount } = renderUploads(PHOTOS, (request) =>
      request.method === 'get' ? ok(PHOTOS) : first.promise,
    );

    await choose(
      result,
      fakeFile('one.jpg', 'image/jpeg'),
      fakeFile('two.jpg', 'image/jpeg'),
      fakeFile('three.jpg', 'image/jpeg'),
    );
    const posts = () => requests.filter(({ method }) => method === 'post');
    expect(posts()).toHaveLength(1);

    unmount();
    await act(async () => {
      first.resolve(ok(stored(9)));
      await first.promise;
      await Promise.resolve();
    });

    expect(posts()[0]?.signal?.aborted).toBe(true);
    expect(posts()).toHaveLength(1);
  });

  it('tells the editor while a file is being prepared or sent, and once the queue has ended', async () => {
    const waiting = deferred<FakeAnswer>();
    const { result, uploading } = renderUploads(PHOTOS, (request) =>
      request.method === 'get' ? ok(PHOTOS) : waiting.promise,
    );

    await choose(result, fakeFile('desk.jpg', 'image/jpeg'));

    expect(uploading.at(-1)).toBe(true);

    await act(async () => {
      waiting.resolve(ok(stored(9)));
      await waiting.promise;
    });
    await waitFor(() => {
      expect(result.current.uploads.tiles).toEqual([]);
    });
    expect(uploading.at(-1)).toBe(false);
  });

  it('keeps a file the browser cannot decode away from the rest of the queue', async () => {
    const { result } = renderUploads(PHOTOS, (request) =>
      request.method === 'get' ? ok(PHOTOS) : ok(stored(9)),
    );
    let decodeable = false;
    vi.spyOn(globalThis, 'createImageBitmap').mockImplementation((...args: unknown[]) => {
      const name = (args[0] as File).name;
      // The first file cannot be decoded; the second can, and goes up.
      if (name === 'bad.heic' && !decodeable) {
        decodeable = true;
        return Promise.reject(new Error('The browser cannot decode this file.'));
      }
      return Promise.resolve({ width: 100, height: 100, close: () => undefined });
    });

    await choose(result, fakeFile('bad.heic', 'image/heic'), fakeFile('good.jpg', 'image/jpeg'));

    await waitFor(() => {
      expect(result.current.uploads.tiles.map(({ fileName }) => fileName)).toEqual(['bad.heic']);
    });
  });
});
