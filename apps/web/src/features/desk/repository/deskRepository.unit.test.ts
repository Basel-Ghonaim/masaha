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
