import type { AnnouncementsSummary } from '@masaha/shared/announcements';
import { apiClient, setupApiClient } from '@shared/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { createAnnouncementsRepository } from './announcementsRepository';

const META = {
  currentPage: 2,
  limit: 20,
  totalRecords: 21,
  totalPages: 2,
  hasNextPage: false,
  hasPreviousPage: true,
};

/** The app's one client, wired as bootstrap wires it, answering every request with `answer`. */
function serve(answer: () => FakeAnswer) {
  const server = fakeAdapter(() => answer());
  apiClient.defaults.adapter = server.adapter;
  return server.requests;
}

const lineOf = ({ method, url }: { method?: string; url?: string }) =>
  `${String(method)} ${String(url)}`;

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  setupApiClient({ getAccessToken: () => 'token-1' });
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

describe('the announcements repository', () => {
  it('reads a page of one state, the query as its parameters', async () => {
    const requests = serve(() => ({
      status: 200,
      data: { success: true, data: [{ id: 5 }], meta: META },
    }));
    const query = { state: 'ENDED' as const, page: 2, limit: 20 };

    await expect(createAnnouncementsRepository().list(7, query)).resolves.toEqual({
      data: [{ id: 5 }],
      meta: META,
    });
    expect(requests.map(lineOf)).toEqual(['get /manage/spaces/7/announcements']);
    expect(requests[0]?.params).toEqual(query);
  });

  it('reads the summary', async () => {
    const summary: AnnouncementsSummary = {
      running: 2,
      upcoming: 1,
      ended: 9,
      closuresAwaitingExtension: 1,
    };
    const requests = serve(() => ({ status: 200, data: { success: true, data: summary } }));

    await expect(createAnnouncementsRepository().summary(7)).resolves.toEqual(summary);
    expect(requests.map(lineOf)).toEqual(['get /manage/spaces/7/announcements/summary']);
  });

  it('posts an announcement with its key', async () => {
    const requests = serve(() => ({ status: 201, data: { success: true, data: { id: 5 } } }));
    const body = { type: 'CLOSURE' as const, textAr: 'مغلق' };

    await expect(createAnnouncementsRepository().create(7, body, 'key-1')).resolves.toEqual({
      id: 5,
    });
    expect(requests.map(lineOf)).toEqual(['post /manage/spaces/7/announcements']);
    expect(JSON.parse(String(requests[0]?.data))).toEqual(body);
    expect(requests[0]?.headers.get('Idempotency-Key')).toBe('key-1');
  });

  it('edits with a PATCH of what changed, and no key', async () => {
    const requests = serve(() => ({ status: 200, data: { success: true, data: { id: 5 } } }));

    await createAnnouncementsRepository().edit(7, 5, { textEn: null, endsAt: null });
    expect(requests.map(lineOf)).toEqual(['patch /manage/spaces/7/announcements/5']);
    expect(JSON.parse(String(requests[0]?.data))).toEqual({ textEn: null, endsAt: null });
    expect(requests[0]?.headers.get('Idempotency-Key')).toBeUndefined();
  });

  it('rejects with the AppError the transport made', async () => {
    serve(() => ({
      status: 403,
      data: { success: false, error: { type: 'forbidden', message: 'No', requestId: 'req-1' } },
    }));

    await expect(createAnnouncementsRepository().summary(7)).rejects.toMatchObject({
      status: 403,
      type: 'forbidden',
    });
  });
});
