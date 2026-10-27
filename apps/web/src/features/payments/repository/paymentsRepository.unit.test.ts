import type { PaymentsMeta } from '@masaha/shared/payments';
import { apiClient, setupApiClient } from '@shared/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { createPaymentsRepository } from './paymentsRepository';

const META: PaymentsMeta = {
  currentPage: 2,
  limit: 20,
  totalRecords: 21,
  totalPages: 2,
  hasNextPage: false,
  hasPreviousPage: true,
  totals: {
    count: 20,
    receivedAgorot: 50000,
    byMethod: { CASH: 40000, TRANSFER: 10000 },
    voided: { count: 1, amountAgorot: 2500 },
  },
};

/** The app's one client, wired as bootstrap wires it, answering every request with `answer`. */
function serve(answer: () => FakeAnswer) {
  const server = fakeAdapter(() => answer());
  apiClient.defaults.adapter = server.adapter;
  return server.requests;
}

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  setupApiClient({ getAccessToken: () => 'token-1' });
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

describe('the payments repository', () => {
  it('reads a page and its totals, the query as its parameters', async () => {
    const requests = serve(() => ({
      status: 200,
      data: { success: true, data: [{ id: 31 }], meta: META },
    }));
    const query = {
      from: '2026-10-01',
      to: '2026-10-21',
      recordedById: 15,
      voided: 'EXCLUDE' as const,
      page: 2,
      limit: 20,
    };

    await expect(createPaymentsRepository().list(7, query)).resolves.toEqual({
      data: [{ id: 31 }],
      meta: META,
    });
    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'get /manage/spaces/7/payments',
    ]);
    expect(requests[0]?.params).toEqual(query);
  });

  it('rejects with the AppError the transport made', async () => {
    serve(() => ({
      status: 403,
      data: { success: false, error: { type: 'forbidden', message: 'No', requestId: 'req-1' } },
    }));

    await expect(
      createPaymentsRepository().list(7, { voided: 'EXCLUDE', page: 1, limit: 20 }),
    ).rejects.toMatchObject({ status: 403, type: 'forbidden' });
  });
});
