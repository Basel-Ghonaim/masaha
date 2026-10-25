import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { lockUsers, waitingOnLock } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { createArea, createPublicSpace, seedSettings } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// A signed-in user reports a listed space's wrong information (docs/api/api-contract.md › Data
// reports), at most 10 reports an hour.
const NOW = new Date('2026-10-25T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });

let areaId: number;
let spaceId: number;
let user: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: areaId } = await createArea());
  ({ id: spaceId } = await createPublicSpace(areaId, 'Focus Hub', { nameAr: 'فوكس هب' }));
  user = await signIn('USER', 'reporter@example.com');
});

function report(caller: { authorization: string } | null, body: object, slug = 'focus-hub') {
  const call = request(app).post(`/api/v1/spaces/${slug}/reports`);
  return (caller ? call.set('Authorization', caller.authorization) : call).send(body);
}

const storedReports = () => prisma.dataReport.findMany({ orderBy: { id: 'asc' } });

describe('POST /spaces/:slug/reports', () => {
  it('a signed-in user reports a listed space, 201 OPEN; anonymous is 401', async () => {
    const response = await report(user, { field: 'OTHER', message: ' أُغلق\r\nالطابق ' });

    expect(response.status).toBe(201);
    const [stored] = await storedReports();
    expect(dataOf(response)).toEqual({
      id: stored?.id,
      field: 'OTHER',
      message: 'أُغلق\nالطابق',
      createdAt: NOW.toISOString(),
      status: 'OPEN',
      decision: null,
      space: {
        id: spaceId,
        slug: 'focus-hub',
        nameEn: 'Focus Hub',
        nameAr: 'فوكس هب',
        listed: true,
      },
    });
    expect(stored).toMatchObject({ userId: user.id, spaceId, status: 'OPEN', resolvedAs: null });

    const anonymous = await report(null, { field: 'PRICES' });
    expect(anonymous.status).toBe(401);
    expect(await storedReports()).toHaveLength(1);
  });

  it('an unknown slug, a hidden or deleted space, an inactive area are not_found', async () => {
    await createPublicSpace(areaId, 'Hidden', { isHidden: true });
    await createPublicSpace(areaId, 'Deleted', { deletedAt: NOW });
    const { id: closedArea } = await createArea({ areaActive: false });
    await createPublicSpace(closedArea, 'Far Away');

    for (const slug of ['nowhere', 'hidden', 'deleted', 'far-away']) {
      const response = await report(user, { field: 'PRICES' }, slug);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    expect(await storedReports()).toEqual([]);
  });

  it('the same field while one is open answers it, 200, no new row; once decided a new one is 201', async () => {
    const first = await report(user, { field: 'HOURS' });
    expect(first.status).toBe(201);

    const again = await report(user, { field: 'HOURS', message: 'الجمعة مغلق' });
    expect(again.status).toBe(200);
    expect(dataOf(again)).toEqual(dataOf(first));
    expect(await storedReports()).toHaveLength(1);

    // Another field is a report of its own.
    expect((await report(user, { field: 'PRICES' })).status).toBe(201);

    const { id: adminId } = await signIn('ADMIN');
    await prisma.dataReport.updateMany({
      where: { field: 'HOURS' },
      data: { status: 'RESOLVED', resolvedAt: NOW, resolvedById: adminId, resolvedAs: 'ADMIN' },
    });
    const anew = await report(user, { field: 'HOURS' });
    expect(anew.status).toBe(201);
    expect((dataOf(anew) as { id: number }).id).not.toBe((dataOf(first) as { id: number }).id);
    expect(await storedReports()).toHaveLength(3);
  });

  it('two identical reports at once make one', async () => {
    let both: Promise<request.Response[]> | undefined;
    await prisma.$transaction(
      async (tx) => {
        // The user's row held, as another of their reports would hold it: both wait on it.
        await lockUsers(tx, user.id);
        both = Promise.all([
          report(user, { field: 'CONTACT' }),
          report(user, { field: 'CONTACT' }),
        ]);
        await waitingOnLock({ count: 2 });
      },
      { timeout: 10_000 },
    );
    if (!both) throw new Error('The requests never started');
    const answers = await both;

    expect(answers.map(({ status }) => status).sort()).toEqual([200, 201]);
    expect(dataOf(answers[0] as request.Response)).toEqual(dataOf(answers[1] as request.Response));
    expect(await storedReports()).toHaveLength(1);
  });

  it('the 11th report within the hour is 429 with Retry-After, repeats and invalid bodies counted; another user at the same address is not', async () => {
    expect((await report(user, { field: 'PRICES' })).status).toBe(201);
    for (let sent = 2; sent <= 9; sent += 1) {
      expect((await report(user, { field: 'PRICES' })).status).toBe(200);
    }
    expect((await report(user, { field: 'OTHER' })).status).toBe(422);

    const limited = await report(user, { field: 'HOURS' });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(await storedReports()).toHaveLength(1);

    const neighbour = await signIn('USER', 'neighbour@example.com');
    expect((await report(neighbour, { field: 'HOURS' })).status).toBe(201);
  });
});
