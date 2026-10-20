import type { CreatePackageRequest, SpacePackage } from '@masaha/shared/packages';
import { apiClient, setupApiClient } from '@shared/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { bodyOf } from '../../../test/fakeTransport';
import { createPackagesRepository } from './packagesRepository';

const TEN_DAYS: SpacePackage = {
  id: 3,
  name: '10 أيام',
  validityDays: 30,
  totalDays: 10,
  daysPerWeek: null,
  hoursPerDay: null,
  totalHours: null,
  billing: 'FIXED',
  priceAgorot: 15000,
  audience: 'GENERAL',
  shiftId: null,
  isActive: true,
};

const TERMS: CreatePackageRequest = {
  name: '10 أيام',
  validityDays: 30,
  totalDays: 10,
  billing: 'FIXED',
  priceAgorot: 15000,
  audience: 'GENERAL',
};

/** The app's one client, wired as bootstrap wires it, answering every request with `answer`. */
function serve(answer: FakeAnswer) {
  const server = fakeAdapter(() => answer);
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

describe('the packages repository', () => {
  it('lists, adds and edits a space’s packages on the managed routes', async () => {
    const repository = createPackagesRepository();
    const requests = serve({ status: 200, data: { success: true, data: [TEN_DAYS] } });
    await expect(repository.list(7)).resolves.toEqual([TEN_DAYS]);

    const sent = serve({ status: 201, data: { success: true, data: TEN_DAYS } });
    await expect(repository.create(7, TERMS)).resolves.toEqual(TEN_DAYS);
    await repository.update(7, 3, { isActive: false });

    expect(
      [...requests, ...sent].map(({ method, url }) => `${String(method)} ${String(url)}`),
    ).toEqual([
      'get /manage/spaces/7/packages',
      'post /manage/spaces/7/packages',
      'patch /manage/spaces/7/packages/3',
    ]);
    expect(bodyOf(sent[0])).toEqual(TERMS);
    expect(bodyOf(sent[1])).toEqual({ isActive: false });
  });
});
