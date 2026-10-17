import { apiClient, setupApiClient } from '@shared/api';
import { AppError } from '@shared/errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAdapter } from '../../../test/fakeAdapter';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { sendMultipart } from './sendMultipart';

const PHOTO = new File(['the bytes of a photo'], 'desk.jpg', { type: 'image/jpeg' });
const ANSWERED = { id: 3, urls: { card: '/files/card.webp', page: '/files/page.webp' } };

/** What the transport hands the progress callback; `total` only once the size is known. */
type ProgressEvent = { loaded: number; total?: number; bytes: number; lengthComputable: boolean };

/** The app's one client, wired as bootstrap wires it, answering each request with `answer`. */
function serve(
  answer: (config: {
    onUploadProgress?: (event: ProgressEvent) => void;
  }) => FakeAnswer | Promise<FakeAnswer>,
) {
  const server = fakeAdapter(answer);
  apiClient.defaults.adapter = server.adapter;
  return server.requests;
}

/** The event a browser sends as the bytes travel. */
const progressOf = (loaded: number, total?: number) => ({
  loaded,
  total,
  bytes: loaded,
  lengthComputable: total !== undefined,
});

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  setupApiClient({ getAccessToken: () => 'token-1' });
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  vi.unstubAllGlobals();
});

describe('sendMultipart', () => {
  it('sends one part under its field name through the one client, and reports its progress', async () => {
    const onProgress = vi.fn();
    const requests = serve((config) => {
      config.onUploadProgress?.(progressOf(512, 2048));
      config.onUploadProgress?.(progressOf(2048));
      config.onUploadProgress?.(progressOf(2048, 2048));
      return { status: 200, data: { success: true, data: ANSWERED } };
    });

    await expect(
      sendMultipart({ url: '/admin/spaces/7/photos', fieldName: 'photo', file: PHOTO, onProgress }),
    ).resolves.toEqual(ANSWERED);

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ method: 'post', url: '/admin/spaces/7/photos' });
    const body = requests[0]?.data as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect([...body.keys()]).toEqual(['photo']);
    expect(body.get('photo')).toBeInstanceOf(File);
    // An event the browser cannot measure carries no total, so it says nothing of a percentage.
    expect(onProgress.mock.calls).toEqual([
      [512, 2048],
      [2048, 2048],
    ]);
  });

  it('rejects a refusal with the transport’s AppError', async () => {
    serve(() => ({
      status: 413,
      headers: { 'x-request-id': 'req-1' },
      data: {
        success: false,
        error: { message: 'Fake refusal', requestId: 'req-1', type: 'payload_too_large' },
      },
    }));

    const refusal = await sendMultipart({
      url: '/admin/spaces/7/photos',
      fieldName: 'photo',
      file: PHOTO,
    }).catch((error: unknown) => error);

    expect(refusal).toBeInstanceOf(AppError);
    expect(refusal).toMatchObject({ type: 'payload_too_large', status: 413, requestId: 'req-1' });
  });

  it('sends no progress callback when the caller wants none', async () => {
    const requests = serve(() => ({ status: 200, data: { success: true, data: ANSWERED } }));

    await expect(
      sendMultipart({ url: '/admin/spaces/7/photos', fieldName: 'photo', file: PHOTO }),
    ).resolves.toEqual(ANSWERED);
    expect(requests[0]?.onUploadProgress).toBeUndefined();
  });

  it('gives the upload its own, longer timeout than the client’s 15 s', async () => {
    const requests = serve(() => ({ status: 200, data: { success: true, data: ANSWERED } }));

    await sendMultipart({ url: '/admin/spaces/7/photos', fieldName: 'photo', file: PHOTO });

    expect(requests[0]?.timeout).toBe(120_000);
  });

  it('hands the caller’s signal to the request, so leaving can abort it', async () => {
    const leaving = new AbortController();
    const requests = serve(() => ({ status: 200, data: { success: true, data: ANSWERED } }));

    await sendMultipart({
      url: '/admin/spaces/7/photos',
      fieldName: 'photo',
      file: PHOTO,
      signal: leaving.signal,
    });

    expect(requests[0]?.signal).toBe(leaving.signal);
  });
});
