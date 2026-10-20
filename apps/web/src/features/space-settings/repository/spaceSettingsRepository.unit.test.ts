import type { SpaceSettings } from '@masaha/shared/space-settings';
import { apiClient, setupApiClient } from '@shared/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { bodyOf } from '../../../test/fakeTransport';
import { createSpaceSettingsRepository } from './spaceSettingsRepository';

const SETTINGS: SpaceSettings = {
  autoCheckoutAtClosing: true,
  maxStayMinutes: null,
  visitRounding: 'UP_AFTER_MINUTES',
  visitRoundingMinutes: 10,
  visitCapAtDayPrice: true,
  visitStudentPrices: false,
  receptionMayTypePrices: false,
  reminderTemplate: null,
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

describe('the space settings repository', () => {
  it('reads and edits a space’s settings on the managed route', async () => {
    const repository = createSpaceSettingsRepository();
    const requests = serve({ status: 200, data: { success: true, data: SETTINGS } });

    await expect(repository.get(7)).resolves.toEqual(SETTINGS);
    await repository.update(7, { receptionMayTypePrices: true });

    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'get /manage/spaces/7/settings',
      'patch /manage/spaces/7/settings',
    ]);
    expect(bodyOf(requests[1])).toEqual({ receptionMayTypePrices: true });
  });
});
