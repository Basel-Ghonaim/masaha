import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace } from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma, type Tx } from '../../db/index.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

// The owner reads and decides the space's reports, never seeing who reported them
// (docs/api/api-contract.md › Data reports).
const NOW = new Date('2026-10-25T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

let spaceId: number;
let otherSpaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let unrelatedOwner: { id: number; authorization: string };
let admin: { id: number; authorization: string };
let reporterId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  await prisma.spaceManager.create({ data: { spaceId, userId: reception.id, role: 'RECEPTION' } });
  stranger = await signIn('USER', 'stranger@example.com');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  unrelatedOwner = await signInOwnerOf(otherSpaceId);
  admin = await signIn('ADMIN');
  ({ id: reporterId } = await prisma.user.create({
    data: { email: 'rima.reporter@example.com', name: 'Rima Haddad', passwordHash: 'x' },
  }));
});

function report(data: Partial<Prisma.DataReportUncheckedCreateInput> = {}) {
  return prisma.dataReport.create({
    data: { spaceId, userId: reporterId, field: 'PRICES', createdAt: minutesAgo(10), ...data },
  });
}

const reportsPath = (space = spaceId) => `/api/v1/manage/spaces/${String(space)}/data-reports`;

function list(caller: { authorization: string }, query = '') {
  return request(app).get(`${reportsPath()}${query}`).set('Authorization', caller.authorization);
}

function decide(caller: { authorization: string }, reportId: number, body: object) {
  return request(app)
    .patch(`${reportsPath()}/${String(reportId)}`)
    .set('Authorization', caller.authorization)
    .send(body);
}

const ids = (response: request.Response) =>
  (dataOf(response) as { id: number }[]).map(({ id }) => id);
const lockSpace = (tx: Tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR UPDATE`;

describe("the owner's reports", () => {
  it("the owner lists the space's reports, newest first, filtered; the reporter is nowhere in the answer", async () => {
    const hours = await report({ field: 'HOURS', createdAt: minutesAgo(30) });
    const other = await report({
      field: 'OTHER',
      message: 'الطابق مغلق',
      createdAt: minutesAgo(20),
    });
    const decided = await report({
      field: 'CONTACT',
      createdAt: minutesAgo(5),
      status: 'RESOLVED',
      resolvedAt: minutesAgo(1),
      resolvedById: owner.id,
      resolvedAs: 'OWNER',
      resolutionNote: 'حُدّث الرقم',
    });
    await report({ spaceId: otherSpaceId });

    const all = await list(owner);
    expect(all.status).toBe(200);
    expect(ids(all)).toEqual([decided.id, other.id, hours.id]);
    expect(dataOf(all)).toEqual([
      {
        id: decided.id,
        field: 'CONTACT',
        message: null,
        createdAt: minutesAgo(5).toISOString(),
        status: 'RESOLVED',
        decision: {
          status: 'RESOLVED',
          at: minutesAgo(1).toISOString(),
          note: 'حُدّث الرقم',
          repliedBy: 'SPACE',
        },
      },
      {
        id: other.id,
        field: 'OTHER',
        message: 'الطابق مغلق',
        createdAt: minutesAgo(20).toISOString(),
        status: 'OPEN',
        decision: null,
      },
      {
        id: hours.id,
        field: 'HOURS',
        message: null,
        createdAt: minutesAgo(30).toISOString(),
        status: 'OPEN',
        decision: null,
      },
    ]);
    const body = JSON.stringify(all.body);
    for (const trace of ['userId', 'reporter', 'Rima', 'rima.reporter']) {
      expect(body).not.toContain(trace);
    }
    // Its id as a value of any key.
    expect(body).not.toMatch(new RegExp(`:${String(reporterId)}[,}]`));

    expect(ids(await list(owner, '?status=OPEN'))).toEqual([other.id, hours.id]);
    expect(ids(await list(owner, '?status=DECIDED'))).toEqual([decided.id]);
    expect(ids(await list(owner, '?field=HOURS'))).toEqual([hours.id]);
    const second = await list(owner, '?page=2&limit=2');
    expect(ids(second)).toEqual([hours.id]);
    expect((second.body as { meta: object }).meta).toMatchObject({ totalRecords: 3 });
  });

  it('reception is 403 before the query is read; a stranger, another space’s owner and the admin not_found', async () => {
    await report();
    const refused = await list(reception, '?status=NOT_A_STATUS');
    expect(refused.status).toBe(403);
    expect(errorOf(refused).type).toBe('forbidden');

    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await list(caller);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    expect((await list(owner, '?status=NOT_A_STATUS')).status).toBe(422);
  });

  it('the owner resolves with or without a reply, and dismisses with one; audited dataReport.resolved, dataReport.dismissed; a dismissal without a reply is 422', async () => {
    const bare = await report({ field: 'HOURS' });
    const replied = await report({ field: 'PRICES' });
    const dismissed = await report({ field: 'LOCATION' });

    const plain = await decide(owner, bare.id, { status: 'RESOLVED' });
    expect(plain.status).toBe(200);
    expect(dataOf(plain)).toEqual({
      id: bare.id,
      field: 'HOURS',
      message: null,
      createdAt: minutesAgo(10).toISOString(),
      status: 'RESOLVED',
      decision: { status: 'RESOLVED', at: NOW.toISOString(), note: null, repliedBy: 'SPACE' },
    });
    expect(
      dataOf(await decide(owner, replied.id, { status: 'RESOLVED', note: ' عُدّلت ' })),
    ).toMatchObject({ decision: { note: 'عُدّلت' } });

    const noReply = await decide(owner, dismissed.id, { status: 'DISMISSED' });
    expect(noReply.status).toBe(422);
    expect(errorOf(noReply).errors).toEqual({ note: ['required'] });
    expect(
      (await decide(owner, dismissed.id, { status: 'DISMISSED', note: 'الموقع صحيح' })).status,
    ).toBe(200);

    expect(
      await prisma.dataReport.findUniqueOrThrow({ where: { id: dismissed.id } }),
    ).toMatchObject({
      status: 'DISMISSED',
      resolvedById: owner.id,
      resolvedAs: 'OWNER',
      resolvedAt: NOW,
      resolutionNote: 'الموقع صحيح',
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: owner.id,
        action: 'dataReport.resolved',
        entityType: 'dataReport',
        entityId: bare.id,
        spaceId,
        before: null,
        after: { note: null },
      },
      {
        actorId: owner.id,
        action: 'dataReport.resolved',
        entityType: 'dataReport',
        entityId: replied.id,
        spaceId,
        before: null,
        after: { note: 'عُدّلت' },
      },
      {
        actorId: owner.id,
        action: 'dataReport.dismissed',
        entityType: 'dataReport',
        entityId: dismissed.id,
        spaceId,
        before: null,
        after: { note: 'الموقع صحيح' },
      },
    ]);
  });

  it('a decided report is REPORT_ALREADY_DECIDED; the same decision again answers it, writing nothing', async () => {
    const { id } = await report();
    const first = await decide(owner, id, { status: 'RESOLVED', note: 'عُدّلت' });
    expect(first.status).toBe(200);
    const stored = await prisma.dataReport.findUniqueOrThrow({ where: { id } });

    const again = await decide(owner, id, { status: 'RESOLVED', note: 'عُدّلت' });
    expect(again.status).toBe(200);
    expect(dataOf(again)).toEqual(dataOf(first));

    for (const body of [
      { status: 'DISMISSED', note: 'عُدّلت' },
      { status: 'RESOLVED' },
      { status: 'RESOLVED', note: 'غير ذلك' },
    ]) {
      const refused = await decide(owner, id, body);
      expect(refused.status).toBe(409);
      expect(errorOf(refused)).toMatchObject({ type: 'conflict', code: 'REPORT_ALREADY_DECIDED' });
    }
    expect(await prisma.dataReport.findUniqueOrThrow({ where: { id } })).toEqual(stored);
    expect(await auditEntries()).toHaveLength(1);
  });

  it("another space's report through this space's path is not_found", async () => {
    const { id } = await report({ spaceId: otherSpaceId });
    const response = await decide(owner, id, { status: 'RESOLVED' });
    expect(response.status).toBe(404);
    expect((await decide(owner, 999_999, { status: 'RESOLVED' })).status).toBe(404);
    expect(await prisma.dataReport.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: 'OPEN',
    });
  });

  it("reception's PATCH is 403 before the body is read", async () => {
    const { id } = await report();
    const response = await decide(reception, id, { status: 'NOT_A_DECISION' });
    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    expect((await decide(reception, id, { status: 'RESOLVED' })).status).toBe(403);
    expect(await auditEntries()).toEqual([]);
  });

  it('an owner unlinked while the decision waits is refused 403', async () => {
    const { id } = await report();
    const response = await whileHeld(
      lockSpace,
      () => decide(owner, id, { status: 'RESOLVED' }),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: owner.id } },
          data: { deactivatedAt: NOW },
        }),
    );

    expect(response.status).toBe(403);
    expect(await prisma.dataReport.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: 'OPEN',
    });
    expect(await auditEntries()).toEqual([]);
  });
});
