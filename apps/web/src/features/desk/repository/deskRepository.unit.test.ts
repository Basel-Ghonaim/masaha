import type { DeskVisit } from '@masaha/shared/visits';
import { apiClient, setupApiClient } from '@shared/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { bodyOf } from '../../../test/fakeTransport';
import { createDeskRepository } from './deskRepository';

const VISIT: DeskVisit = {
  id: 12,
  visitorName: 'Omar',
  customer: null,
  audience: 'GENERAL',
  shiftId: null,
  hourRateAgorot: 500,
  dayRateAgorot: 2500,
  checkedInAt: '2026-07-01T07:00:00.000Z',
  checkedOutAt: null,
  checkoutMethod: null,
  charge: null,
  writeOff: null,
};

/** The app's one client, wired as bootstrap wires it, answering every request with `answer`. */
function serve(answer: (url: string | undefined) => FakeAnswer) {
  const server = fakeAdapter((config) => answer(config.url));
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

describe('the desk repository', () => {
  it('sends each call’s method, path and body', async () => {
    const repository = createDeskRepository();
    const requests = serve(() => ({ status: 200, data: { success: true, data: VISIT } }));

    await repository.terms(7);
    await repository.checkInVisit(7, { visitorName: 'Omar', audience: 'GENERAL' }, 'key-1');
    await repository.quote(7, 12);
    await repository.checkOutVisit(
      7,
      12,
      { checkedOutAt: '2026-07-01T09:00:00.000Z', payment: null, phone: '+970599000301' },
      'key-2',
    );

    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'get /manage/spaces/7/visit-terms',
      'post /manage/spaces/7/visits',
      'get /manage/spaces/7/visits/12',
      'post /manage/spaces/7/visits/12/check-out',
    ]);
    expect(bodyOf(requests[1])).toEqual({ visitorName: 'Omar', audience: 'GENERAL' });
    expect(bodyOf(requests[3])).toEqual({
      checkedOutAt: '2026-07-01T09:00:00.000Z',
      payment: null,
      phone: '+970599000301',
    });
  });

  it('a check-in and a check-out carry the key they are given', async () => {
    const repository = createDeskRepository();
    const requests = serve(() => ({ status: 201, data: { success: true, data: VISIT } }));

    await repository.checkInVisit(7, { visitorName: 'Omar', audience: 'GENERAL' }, 'key-1');
    await repository.checkOutVisit(7, 12, {}, 'key-2');

    expect(requests.map(({ headers }) => headers.get('Idempotency-Key'))).toEqual([
      'key-1',
      'key-2',
    ]);
  });

  it('reads the uncollected visits’ page, and sends a payment, a debt, a write-off and its undo', async () => {
    const repository = createDeskRepository();
    const requests = serve((url) =>
      url === '/manage/spaces/7/uncollected-visits'
        ? {
            status: 200,
            data: {
              success: true,
              data: [{ visit: VISIT, paidAgorot: 0, balanceAgorot: 2500 }],
              meta: { currentPage: 2, pageSize: 20, totalRecords: 21, totalPages: 2 },
            },
          }
        : { status: 200, data: { success: true, data: VISIT } },
    );

    await expect(repository.uncollected(7, 2)).resolves.toEqual({
      data: [{ visit: VISIT, paidAgorot: 0, balanceAgorot: 2500 }],
      meta: { currentPage: 2, pageSize: 20, totalRecords: 21, totalPages: 2 },
    });
    await repository.receivePayment(
      7,
      { visitId: 12, amountAgorot: 1000, method: 'CASH', phone: '+970599000303' },
      'key-3',
    );
    await repository.leaveToCustomer(7, 12, { phone: '+970599000303', customerName: 'Omar' });
    await repository.writeOff(7, 12, { reason: 'Left the country' });
    await repository.undoWriteOff(7, 12);

    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'get /manage/spaces/7/uncollected-visits',
      'post /manage/spaces/7/payments',
      'put /manage/spaces/7/visits/12/customer',
      'post /manage/spaces/7/visits/12/write-off',
      'delete /manage/spaces/7/visits/12/write-off',
    ]);
    expect(requests[0]?.params).toEqual({ page: 2 });
    expect(bodyOf(requests[1])).toEqual({
      visitId: 12,
      amountAgorot: 1000,
      method: 'CASH',
      phone: '+970599000303',
    });
    expect(bodyOf(requests[2])).toEqual({ phone: '+970599000303', customerName: 'Omar' });
    expect(bodyOf(requests[3])).toEqual({ reason: 'Left the country' });
    // A payment carries its key; «تسجيل دين», the write-off and its undo carry none (S3).
    expect(requests.map(({ headers }) => headers.get('Idempotency-Key'))).toEqual([
      undefined,
      'key-3',
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('reads the unpriced visits’ page, and prices a visit with no key', async () => {
    const repository = createDeskRepository();
    const requests = serve((url) =>
      url === '/manage/spaces/7/unpriced-visits'
        ? {
            status: 200,
            data: {
              success: true,
              data: [VISIT],
              meta: {
                currentPage: 1,
                limit: 20,
                totalPages: 1,
                totalRecords: 1,
                hasNextPage: false,
                hasPreviousPage: false,
              },
            },
          }
        : { status: 200, data: { success: true, data: VISIT } },
    );

    await expect(repository.unpriced(7, 1)).resolves.toMatchObject({ data: [VISIT] });
    await repository.price(7, 12, { amountAgorot: 3000, reason: 'A long stay' });

    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'get /manage/spaces/7/unpriced-visits',
      'put /manage/spaces/7/visits/12/charge',
    ]);
    expect(requests[0]?.params).toEqual({ page: 1 });
    expect(bodyOf(requests[1])).toEqual({ amountAgorot: 3000, reason: 'A long stay' });
    expect(requests[1]?.headers.get('Idempotency-Key')).toBeUndefined();
  });

  it('hands back a check-in’s warnings, and none without them', async () => {
    const repository = createDeskRepository();
    let warned = true;
    serve(() => ({
      status: 201,
      data: warned
        ? { success: true, data: VISIT, meta: { warnings: ['SPACE_FULL'] } }
        : { success: true, data: VISIT },
    }));

    await expect(
      repository.checkInVisit(7, { visitorName: 'Omar', audience: 'GENERAL' }, 'key-1'),
    ).resolves.toEqual({ data: VISIT, meta: { warnings: ['SPACE_FULL'] } });
    warned = false;
    await expect(
      repository.checkInVisit(7, { visitorName: 'Omar', audience: 'GENERAL' }, 'key-1'),
    ).resolves.toEqual({ data: VISIT, meta: undefined });
  });
});
