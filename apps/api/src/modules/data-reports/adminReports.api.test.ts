import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { adminRequest, auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace } from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma, type Tx } from '../../db/index.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

// The admin reads every report, with who reported it, and decides an unverified space's
// (docs/api/api-contract.md › Data reports).
const NOW = new Date('2026-10-25T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

let verifiedId: number;
let unverifiedId: number;
let owner: { id: number; authorization: string };
let admin: { id: number; authorization: string };
let reporterId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: verifiedId } = await createSpace());
  owner = await signInOwnerOf(verifiedId);
  ({ id: unverifiedId } = await createSpace('quiet-corner'));
  await prisma.space.update({
    where: { id: unverifiedId },
    data: { nameEn: 'Quiet Corner', nameAr: null },
  });
  admin = await signIn('ADMIN');
  ({ id: reporterId } = await prisma.user.create({
    data: { email: 'rima.reporter@example.com', name: 'Rima Haddad', passwordHash: 'x' },
  }));
});

function report(data: Partial<Prisma.DataReportUncheckedCreateInput> = {}) {
  return prisma.dataReport.create({
    data: {
      spaceId: unverifiedId,
      userId: reporterId,
      field: 'PRICES',
      createdAt: minutesAgo(10),
      ...data,
    },
  });
}

const ids = (response: request.Response) =>
  (dataOf(response) as { id: number }[]).map(({ id }) => id);
const decide = (reportId: number, body: object) =>
  adminRequest(app, admin, 'patch', `/data-reports/${String(reportId)}`, body);
const lockSpace = (spaceId: number) => (tx: Tx) =>
  tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR UPDATE`;

describe("the admin's reports", () => {
  it('the admin lists every report with the reporter’s and decider’s names, the space and whether it is verified; filtered by status, field and space; a deleted space’s left out; a non-admin 403', async () => {
    const open = await report({ field: 'HOURS', createdAt: minutesAgo(30) });
    const decided = await report({
      spaceId: verifiedId,
      field: 'CONTACT',
      createdAt: minutesAgo(20),
      status: 'RESOLVED',
      resolvedAt: minutesAgo(5),
      resolvedById: owner.id,
      resolvedAs: 'OWNER',
    });
    const { id: goneId } = await createSpace('gone');
    await report({ spaceId: goneId, createdAt: minutesAgo(1) });
    await prisma.space.update({ where: { id: goneId }, data: { deletedAt: NOW } });

    const all = await adminRequest(app, admin, 'get', '/data-reports');
    expect(all.status).toBe(200);
    expect(dataOf(all)).toEqual([
      {
        id: decided.id,
        field: 'CONTACT',
        message: null,
        createdAt: minutesAgo(20).toISOString(),
        status: 'RESOLVED',
        decision: {
          status: 'RESOLVED',
          at: minutesAgo(5).toISOString(),
          note: null,
          repliedBy: 'SPACE',
        },
        space: {
          id: verifiedId,
          slug: 'focus-hub',
          nameEn: 'Focus Hub',
          nameAr: 'فوكس هاب',
          verified: true,
        },
        reporter: { id: reporterId, name: 'Rima Haddad' },
        decidedBy: { id: owner.id, name: 'Ahmad' },
      },
      {
        id: open.id,
        field: 'HOURS',
        message: null,
        createdAt: minutesAgo(30).toISOString(),
        status: 'OPEN',
        decision: null,
        space: {
          id: unverifiedId,
          slug: 'quiet-corner',
          nameEn: 'Quiet Corner',
          nameAr: null,
          verified: false,
        },
        reporter: { id: reporterId, name: 'Rima Haddad' },
        decidedBy: null,
      },
    ]);
    expect((all.body as { meta: object }).meta).toMatchObject({ totalRecords: 2 });

    const path = (query: string) => adminRequest(app, admin, 'get', `/data-reports${query}`);
    expect(ids(await path('?status=OPEN'))).toEqual([open.id]);
    expect(ids(await path('?status=DECIDED'))).toEqual([decided.id]);
    expect(ids(await path('?field=HOURS'))).toEqual([open.id]);
    expect(ids(await path(`?spaceId=${String(verifiedId)}`))).toEqual([decided.id]);
    expect(ids(await path(`?spaceId=${String(goneId)}`))).toEqual([]);
    expect((await path('?field=PHOTOS')).status).toBe(422);

    for (const caller of ['guest', 'USER', 'OWNER'] as const) {
      const refused = await adminRequest(app, caller, 'get', '/data-reports');
      expect(refused.status).toBe(caller === 'guest' ? 401 : 403);
    }
    const ownerRefused = await adminRequest(app, owner, 'get', '/data-reports');
    expect(ownerRefused.status).toBe(403);
  });

  it("the admin decides an unverified space's report; a verified space's is 403", async () => {
    const mine = await report();
    const owners = await report({ spaceId: verifiedId });

    const decided = await decide(mine.id, { status: 'DISMISSED', note: 'الأسعار صحيحة' });
    expect(decided.status).toBe(200);
    expect(dataOf(decided)).toMatchObject({
      id: mine.id,
      status: 'DISMISSED',
      decision: {
        status: 'DISMISSED',
        at: NOW.toISOString(),
        note: 'الأسعار صحيحة',
        repliedBy: 'MASAHA',
      },
      space: { id: unverifiedId, verified: false },
      reporter: { id: reporterId, name: 'Rima Haddad' },
      decidedBy: { id: admin.id, name: 'Sara' },
    });
    expect(await prisma.dataReport.findUniqueOrThrow({ where: { id: mine.id } })).toMatchObject({
      resolvedAs: 'ADMIN',
      resolvedById: admin.id,
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'dataReport.dismissed',
        entityType: 'dataReport',
        entityId: mine.id,
        spaceId: unverifiedId,
        before: null,
        after: { note: 'الأسعار صحيحة' },
      },
    ]);

    const refused = await decide(owners.id, { status: 'RESOLVED' });
    expect(refused.status).toBe(403);
    expect(errorOf(refused).type).toBe('forbidden');
    expect((await decide(999_999, { status: 'RESOLVED' })).status).toBe(404);
    expect(await auditEntries()).toHaveLength(1);
  });

  it("an owner linked while the admin's decision waits makes it 403", async () => {
    const { id } = await report();
    const { id: newOwnerId } = await signIn('OWNER', 'new-owner@example.com');

    const response = await whileHeld(
      lockSpace(unverifiedId),
      () => decide(id, { status: 'RESOLVED' }),
      (tx) =>
        tx.spaceManager.create({
          data: { spaceId: unverifiedId, userId: newOwnerId, role: 'OWNER' },
        }),
    );

    expect(response.status).toBe(403);
    expect(await prisma.dataReport.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: 'OPEN',
    });
  });

  it('the owner and the admin at once: the second sees a decided report', async () => {
    const { id } = await report({ spaceId: verifiedId });

    // The owner's decision commits while the admin's waits; the test then unlinks the owner, so
    // the admin may decide the space, and must find the report decided.
    const response = await whileHeld(
      lockSpace(verifiedId),
      () => decide(id, { status: 'DISMISSED', note: 'صحيح' }),
      async (tx) => {
        await tx.dataReport.update({
          where: { id },
          data: {
            status: 'RESOLVED',
            resolvedAt: minutesAgo(1),
            resolvedById: owner.id,
            resolvedAs: 'OWNER',
          },
        });
        await tx.spaceManager.update({
          where: { spaceId_userId: { spaceId: verifiedId, userId: owner.id } },
          data: { deactivatedAt: NOW },
        });
      },
    );

    expect(response.status).toBe(409);
    expect(errorOf(response)).toMatchObject({ type: 'conflict', code: 'REPORT_ALREADY_DECIDED' });
    expect(await prisma.dataReport.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: 'RESOLVED',
      resolvedAs: 'OWNER',
    });
  });
});
