import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, signIn } from '../../../test/admin.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { createArea, createPublicSpace, seedSettings } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

// The signed-in user's own reports, with the replies (docs/api/api-contract.md › Data reports).
const NOW = new Date('2026-10-25T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });
const MINUTE = 60_000;
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * MINUTE);

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

function mine(caller: { authorization: string } | null, query = '') {
  const call = request(app).get(`/api/v1/me/reports${query}`);
  return caller ? call.set('Authorization', caller.authorization) : call;
}

function report(data: Partial<Prisma.DataReportUncheckedCreateInput> & { createdAt: Date }) {
  return prisma.dataReport.create({ data: { spaceId, userId: user.id, field: 'PRICES', ...data } });
}

const ids = (response: request.Response) =>
  (dataOf(response) as { id: number }[]).map(({ id }) => id);

describe('GET /me/reports', () => {
  it("the caller's reports, newest first, paged, filtered open or decided; another user's never", async () => {
    const { id: adminId } = await signIn('ADMIN');
    const oldest = await report({ field: 'HOURS', createdAt: minutesAgo(30) });
    const decided = await report({
      field: 'CONTACT',
      createdAt: minutesAgo(20),
      status: 'RESOLVED',
      resolvedAt: minutesAgo(5),
      resolvedById: adminId,
      resolvedAs: 'ADMIN',
    });
    const newest = await report({ field: 'PRICES', createdAt: minutesAgo(10) });
    const other = await signIn('USER', 'other@example.com');
    await report({ userId: other.id, createdAt: minutesAgo(1) });

    const all = await mine(user);
    expect(all.status).toBe(200);
    expect(ids(all)).toEqual([newest.id, decided.id, oldest.id]);
    expect((all.body as { meta: object }).meta).toMatchObject({
      currentPage: 1,
      limit: 20,
      totalRecords: 3,
    });

    expect(ids(await mine(user, '?status=OPEN'))).toEqual([newest.id, oldest.id]);
    expect(ids(await mine(user, '?status=DECIDED'))).toEqual([decided.id]);
    const second = await mine(user, '?page=2&limit=2');
    expect(ids(second)).toEqual([oldest.id]);
    expect((second.body as { meta: object }).meta).toMatchObject({
      currentPage: 2,
      limit: 2,
      totalRecords: 3,
    });

    expect((await mine(null)).status).toBe(401);
    expect((await mine(user, '?status=RESOLVED')).status).toBe(422);
  });

  it('a decided report carries its status, reply and repliedBy: SPACE when the owner decided, MASAHA when the admin did, even after the space gained an owner', async () => {
    const { id: adminId } = await signIn('ADMIN');
    const { id: ownerId } = await signIn('OWNER');
    const { id: otherSpaceId } = await createPublicSpace(areaId, 'Sky Desk');
    await report({
      field: 'HOURS',
      createdAt: minutesAgo(20),
      status: 'DISMISSED',
      resolvedAt: minutesAgo(15),
      resolvedById: adminId,
      resolvedAs: 'ADMIN',
      resolutionNote: 'الساعات صحيحة',
    });
    await report({
      spaceId: otherSpaceId,
      createdAt: minutesAgo(10),
      status: 'RESOLVED',
      resolvedAt: minutesAgo(5),
      resolvedById: ownerId,
      resolvedAs: 'OWNER',
    });
    await prisma.spaceManager.create({
      data: { spaceId: otherSpaceId, userId: ownerId, role: 'OWNER' },
    });
    // The admin's space has an owner now: the admin's reply stays Masaha's.
    await prisma.spaceManager.create({ data: { spaceId, userId: ownerId, role: 'OWNER' } });

    const response = await mine(user, '?status=DECIDED');
    expect(dataOf(response)).toMatchObject([
      {
        status: 'RESOLVED',
        decision: {
          status: 'RESOLVED',
          at: minutesAgo(5).toISOString(),
          note: null,
          repliedBy: 'SPACE',
        },
      },
      {
        status: 'DISMISSED',
        decision: {
          status: 'DISMISSED',
          at: minutesAgo(15).toISOString(),
          note: 'الساعات صحيحة',
          repliedBy: 'MASAHA',
        },
      },
    ]);
  });

  it('a space that left the directory (hidden, deleted, inactive area) is listed false, with its name', async () => {
    const hidden = await createPublicSpace(areaId, 'Hidden', { nameAr: 'مخفية' });
    const deleted = await createPublicSpace(areaId, 'Deleted');
    const { id: closedArea } = await createArea({ nameAr: 'الشجاعية', nameEn: 'Shujaiya' });
    const far = await createPublicSpace(closedArea, 'Far Away');
    let minutes = 40;
    for (const id of [spaceId, hidden.id, deleted.id, far.id]) {
      await report({ spaceId: id, createdAt: minutesAgo(minutes) });
      minutes -= 10;
    }
    await prisma.space.update({ where: { id: hidden.id }, data: { isHidden: true } });
    await prisma.space.update({ where: { id: deleted.id }, data: { deletedAt: NOW } });
    await prisma.area.update({ where: { id: closedArea }, data: { isActive: false } });

    const response = await mine(user);
    expect((dataOf(response) as { space: object }[]).map(({ space }) => space)).toEqual([
      { id: far.id, slug: 'far-away', nameEn: 'Far Away', nameAr: null, listed: false },
      { id: deleted.id, slug: 'deleted', nameEn: 'Deleted', nameAr: null, listed: false },
      { id: hidden.id, slug: 'hidden', nameEn: 'Hidden', nameAr: 'مخفية', listed: false },
      { id: spaceId, slug: 'focus-hub', nameEn: 'Focus Hub', nameAr: 'فوكس هب', listed: true },
    ]);
  });
});
