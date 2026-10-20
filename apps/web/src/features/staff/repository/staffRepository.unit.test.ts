import type { StaffMember } from '@masaha/shared/space-links';
import { apiClient, setupApiClient } from '@shared/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { bodyOf } from '../../../test/fakeTransport';
import { createStaffRepository } from './staffRepository';

const RIMA: StaffMember = {
  userId: 15,
  name: 'Rima',
  email: 'rima@example.com',
  isActive: true,
  temporaryPassword: null,
};

/** The app's one client, wired as bootstrap wires it, answering every request with `answer`. */
function serve(answer: FakeAnswer) {
  const server = fakeAdapter(() => answer);
  apiClient.defaults.adapter = server.adapter;
  return server.requests;
}

const originalAdapter = apiClient.defaults.adapter;
const routes = (requests: ReturnType<typeof serve>) =>
  requests.map(({ method, url }) => `${String(method)} ${String(url)}`);

beforeEach(() => {
  setupApiClient({ getAccessToken: () => 'token-1' });
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

describe('the staff repository', () => {
  it('lists, adds, sets active and re-issues on the managed staff routes', async () => {
    const repository = createStaffRepository();
    const listed = serve({ status: 200, data: { success: true, data: [RIMA] } });
    await expect(repository.list(7)).resolves.toEqual([RIMA]);
    const added = serve({
      status: 201,
      data: { success: true, data: { userId: 15, temporaryPassword: 'Tmp-1' } },
    });
    await repository.add(7, { name: 'Rima', email: 'rima@example.com' });
    const set = serve({ status: 200, data: { success: true, data: RIMA } });
    await repository.setActive(7, 15, { isActive: false });
    const issued = serve({
      status: 200,
      data: { success: true, data: { temporaryPassword: 'x' } },
    });
    await repository.reissue(7, 15);

    expect(routes([...listed, ...added, ...set, ...issued])).toEqual([
      'get /manage/spaces/7/staff',
      'post /manage/spaces/7/staff',
      'patch /manage/spaces/7/staff/15',
      'post /manage/spaces/7/staff/15/temporary-password',
    ]);
    expect(bodyOf(added[0])).toEqual({ name: 'Rima', email: 'rima@example.com' });
    expect(bodyOf(set[0])).toEqual({ isActive: false });
  });

  it('records a handover at a space on the managed staff route', async () => {
    const repository = createStaffRepository();
    const requests = serve({ status: 204 });

    await repository.handOver(7, 15, { channel: 'IN_PERSON' });

    expect(routes(requests)).toEqual([
      'post /manage/spaces/7/staff/15/temporary-password/handover',
    ]);
    expect(bodyOf(requests[0])).toEqual({ channel: 'IN_PERSON' });
  });
});
