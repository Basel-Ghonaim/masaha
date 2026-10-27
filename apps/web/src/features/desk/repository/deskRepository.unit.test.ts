import type { DeskVisit } from '@masaha/shared/visits';
import { apiClient, setupApiClient } from '@shared/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { customerRow, customersPage } from '../../../test/deskCustomer';
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

  it('searches the customers with the query it is given', async () => {
    const repository = createDeskRepository();
    const requests = serve(() => customersPage([customerRow()]));

    await expect(repository.customers(7, { q: 'Sara', page: 1, limit: 6 })).resolves.toMatchObject({
      data: [customerRow()],
      meta: { totalRecords: 1 },
    });
    expect(requests[0]?.method).toBe('get');
    expect(requests[0]?.url).toBe('/manage/spaces/7/customers');
    expect(requests[0]?.params).toEqual({ q: 'Sara', page: 1, limit: 6 });
  });

  it('checks a subscriber in with its key, out with none; reads the open check-ins and a file', async () => {
    const repository = createDeskRepository();
    const requests = serve(() => ({ status: 200, data: { success: true, data: [] } }));

    await repository.checkInSubscriber(7, { subscriptionId: 1 }, 'key-4');
    await repository.checkOutSubscriber(7, 3);
    await repository.openCheckIns(7);
    await repository.file(7, 4);

    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'post /manage/spaces/7/check-ins',
      'post /manage/spaces/7/check-ins/3/check-out',
      'get /manage/spaces/7/check-ins',
      'get /manage/spaces/7/customers/4',
    ]);
    expect(bodyOf(requests[0])).toEqual({ subscriptionId: 1 });
    expect(requests[2]?.params).toEqual({ open: true });
    // The check-in carries its key; the check-out is idempotent by design and carries none (S3).
    expect(requests.map(({ headers }) => headers.get('Idempotency-Key'))).toEqual([
      'key-4',
      undefined,
      undefined,
      undefined,
    ]);
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

  it('edits, archives and restores a customer, each with no key', async () => {
    const customer = { id: 4, name: 'Sara Khalid', phone: null, archivedAt: null };
    const requests = serve(() => ({ status: 200, data: { success: true, data: customer } }));
    const repository = createDeskRepository();

    await repository.editCustomer(7, 4, { phone: null });
    await repository.archiveCustomer(7, 4);
    await repository.restoreCustomer(7, 4);

    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'patch /manage/spaces/7/customers/4',
      'post /manage/spaces/7/customers/4/archive',
      'post /manage/spaces/7/customers/4/restore',
    ]);
    expect(bodyOf(requests[0])).toEqual({ phone: null });
    expect(requests.map(({ headers }) => headers.get('Idempotency-Key'))).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('reads a subscription’s statement, and ends it with no key', async () => {
    const requests = serve(() => ({ status: 200, data: { success: true, data: {} } }));
    const repository = createDeskRepository();

    await repository.statement(7, 3);
    await repository.endSubscription(7, 3);

    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'get /manage/spaces/7/subscriptions/3',
      'post /manage/spaces/7/subscriptions/3/end',
    ]);
    expect(requests[1]?.headers.get('Idempotency-Key')).toBeUndefined();
  });

  it('creates a customer and subscribes them, each with its own key, the warnings handed back', async () => {
    const requests = serve((url) =>
      url?.endsWith('/subscriptions') === true
        ? {
            status: 201,
            data: {
              success: true,
              data: { debtAgorot: 0 },
              meta: { warnings: ['CUSTOMER_HAS_DEBT'] },
            },
          }
        : { status: 201, data: { success: true, data: { id: 9 } } },
    );
    const repository = createDeskRepository();

    await expect(
      repository.createCustomer(7, { name: 'Sara Khalid', phone: '+970599000305' }, 'key-1'),
    ).resolves.toEqual({ id: 9 });
    await expect(repository.subscribe(7, 9, { packageId: 3 }, 'key-2')).resolves.toEqual({
      data: { debtAgorot: 0 },
      meta: { warnings: ['CUSTOMER_HAS_DEBT'] },
    });

    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'post /manage/spaces/7/customers',
      'post /manage/spaces/7/customers/9/subscriptions',
    ]);
    expect(bodyOf(requests[1])).toEqual({ packageId: 3 });
    expect(requests.map(({ headers }) => headers.get('Idempotency-Key'))).toEqual([
      'key-1',
      'key-2',
    ]);
  });

  it('voids a payment with its reason, and no key: a second void answers the first (S4)', async () => {
    const requests = serve(() => ({ status: 200, data: { success: true, data: { id: 31 } } }));
    const repository = createDeskRepository();

    await expect(repository.voidPayment(7, 31, { reason: 'Recorded twice' })).resolves.toEqual({
      id: 31,
    });

    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'post /manage/spaces/7/payments/31/void',
    ]);
    expect(bodyOf(requests[0])).toEqual({ reason: 'Recorded twice' });
    expect(requests[0]?.headers.get('Idempotency-Key')).toBeUndefined();
  });
});
