import { apiClient, setupApiClient } from '@shared/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { createFinanceRepository } from './financeRepository';

/** The app's one client, wired as bootstrap wires it, answering every request with `answer`. */
function serve(answer: () => FakeAnswer) {
  const server = fakeAdapter(() => answer());
  apiClient.defaults.adapter = server.adapter;
  return server.requests;
}

const originalAdapter = apiClient.defaults.adapter;
const META = {
  currentPage: 1,
  limit: 20,
  totalRecords: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

beforeEach(() => {
  setupApiClient({ getAccessToken: () => 'token-1' });
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

describe('the finance repository', () => {
  it('reads a month’s income, and the current one with no month', async () => {
    const requests = serve(() => ({ status: 200, data: { success: true, data: { month: 'x' } } }));
    const repository = createFinanceRepository();

    await expect(repository.income(7, '2026-08')).resolves.toEqual({ month: 'x' });
    await repository.income(7);
    expect(requests[0]?.url).toBe('/manage/spaces/7/finance/income');
    expect(requests[0]?.params).toEqual({ month: '2026-08' });
    expect(requests[1]?.params).toBeUndefined();
  });

  it('reads a page of debts and of payers, their query as parameters, with their meta', async () => {
    const requests = serve(() => ({ status: 200, data: { success: true, data: [], meta: META } }));
    const repository = createFinanceRepository();

    await expect(repository.debts(7, { state: 'CREDIT', page: 2, limit: 20 })).resolves.toEqual({
      data: [],
      meta: META,
    });
    await repository.payers(7, { month: '2026-09', page: 1, limit: 5 });
    expect(requests[0]?.url).toBe('/manage/spaces/7/finance/debts');
    expect(requests[0]?.params).toEqual({ state: 'CREDIT', page: 2, limit: 20 });
    expect(requests[1]?.url).toBe('/manage/spaces/7/finance/payers');
    expect(requests[1]?.params).toEqual({ month: '2026-09', page: 1, limit: 5 });
  });

  it('reads the occupancy, and rejects a refusal as an AppError', async () => {
    const requests = serve(() => ({
      status: 403,
      data: { success: false, error: { type: 'forbidden', message: 'No', requestId: 'r' } },
    }));

    await expect(createFinanceRepository().occupancy(7)).rejects.toMatchObject({
      type: 'forbidden',
      status: 403,
    });
    expect(requests[0]?.url).toBe('/manage/spaces/7/finance/occupancy');
  });
});
