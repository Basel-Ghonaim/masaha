import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../test/admin.ts';
import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
} from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

// The owner's audit log of the space (docs/api/api-contract.md › Audit log): every entry of the
// space, newest first, the admin shown as Masaha. Entries are inserted directly, so the reader is
// proven apart from the writers. Gaza is UTC+2 in November; the last 30 days start at 2026-10-12.
const NOW = new Date('2026-11-10T10:00:00+02:00');
const app = createTestApp({ clock: () => NOW });
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000);

let spaceId: number;
let otherSpaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let otherOwner: { id: number; authorization: string };
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  await prisma.user.update({ where: { id: reception.id }, data: { name: 'Hala' } });
  await prisma.spaceManager.create({ data: { spaceId, userId: reception.id, role: 'RECEPTION' } });
  stranger = await signIn('USER', 'stranger@example.com');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  otherOwner = await signInOwnerOf(otherSpaceId);
  admin = await signIn('ADMIN');
  await prisma.user.update({ where: { id: admin.id }, data: { name: 'Rami Masaha' } });
});

/** An entry of the space by the owner, an hour ago, unless overridden. */
function entry(data: Partial<Prisma.AuditLogUncheckedCreateInput> = {}) {
  return prisma.auditLog.create({
    data: {
      actorId: owner.id,
      action: 'customer.edited',
      entityType: 'customer',
      entityId: 1,
      spaceId,
      createdAt: hoursAgo(1),
      ...data,
    },
  });
}

function log(caller: { authorization: string }, query = '', space = spaceId) {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(space)}/audit-log${query}`)
    .set('Authorization', caller.authorization);
}

interface Row {
  id: number;
  at: string;
  action: string;
  actor: { kind: string; id?: number; name?: string };
  target: {
    type: string;
    id: number | null;
    name: string | null;
    nameAr: string | null;
    deleted: boolean;
  };
  before: unknown;
  after: unknown;
}

const rowsOf = (response: request.Response) => dataOf(response) as Row[];
const idsOf = (response: request.Response) => rowsOf(response).map(({ id }) => id);
const metaOf = (response: request.Response) =>
  (response.body as { meta: { totalRecords: number; totalPages: number; actors: unknown[] } }).meta;

describe("the owner's log", () => {
  it("the owner reads every entry of the space, newest first, paged, with before and after as stored: the staff's, the system's and the admin's; another space's never", async () => {
    const staff = await entry({ actorId: reception.id, createdAt: hoursAgo(3) });
    // The same time: the higher id first.
    const sameTime = await entry({ createdAt: hoursAgo(3) });
    const system = await entry({
      actorId: null,
      action: 'visit.autoCheckedOut',
      entityType: 'visit',
      createdAt: hoursAgo(2),
    });
    const hidden = await entry({
      actorId: admin.id,
      action: 'space.hidden',
      entityType: 'space',
      entityId: spaceId,
      before: { isHidden: false },
      after: { isHidden: true, note: { ar: 'مؤقتًا' } },
    });
    await entry({ actorId: otherOwner.id, spaceId: otherSpaceId, action: 'payment.recorded' });
    await entry({ actorId: admin.id, spaceId: null, action: 'user.created', entityType: 'user' });

    const first = await log(owner, '?limit=2');

    expect(first.status).toBe(200);
    expect(idsOf(first)).toEqual([hidden.id, system.id]);
    expect(metaOf(first)).toMatchObject({ totalRecords: 4, totalPages: 2 });
    expect(rowsOf(first)[0]).toMatchObject({
      at: hoursAgo(1).toISOString(),
      action: 'space.hidden',
      before: { isHidden: false },
      after: { isHidden: true, note: { ar: 'مؤقتًا' } },
    });
    expect(rowsOf(first)[1]).toMatchObject({ before: null, after: null });
    expect(idsOf(await log(owner, '?limit=2&page=2'))).toEqual([sameTime.id, staff.id]);
  });

  it("the admin's actor is MASAHA with no id or name; a staff member's is named, also once their link ended; the system's is SYSTEM", async () => {
    const byAdmin = await entry({ actorId: admin.id, createdAt: hoursAgo(1) });
    const byStaff = await entry({ actorId: reception.id, createdAt: hoursAgo(2) });
    const bySystem = await entry({ actorId: null, createdAt: hoursAgo(3) });
    const byOwner = await entry({ createdAt: hoursAgo(4) });
    await prisma.spaceManager.update({
      where: { spaceId_userId: { spaceId, userId: reception.id } },
      data: { deactivatedAt: hoursAgo(1) },
    });

    const response = await log(owner);

    const actors = new Map(rowsOf(response).map(({ id, actor }) => [id, actor]));
    expect(actors.get(byAdmin.id)).toEqual({ kind: 'MASAHA' });
    expect(actors.get(byStaff.id)).toEqual({ kind: 'PERSON', id: reception.id, name: 'Hala' });
    expect(actors.get(bySystem.id)).toEqual({ kind: 'SYSTEM' });
    expect(actors.get(byOwner.id)).toEqual({ kind: 'PERSON', id: owner.id, name: 'Ahmad' });
    const body = JSON.stringify(response.body);
    expect(body).not.toContain('Rami Masaha');
    expect(body).not.toContain(`"id":${String(admin.id)},"name"`);
  });

  it('each target has its type, id and current name: a customer, a subscription, a visit by its visitor or its customer, a check-in, a space; a deleted announcement is marked; a payment has none', async () => {
    const customer = await createCustomer(spaceId, { name: 'أحمد سالم' });
    const subscription = await createSubscription(customer, { name: 'شهري مسائي' });
    const walkIn = await prisma.visit.create({
      data: { spaceId, idempotencyKey: randomUUID(), visitorName: 'ليلى' },
    });
    const asCustomer = await prisma.visit.create({
      data: { spaceId, idempotencyKey: randomUUID(), customerId: customer.id },
    });
    const checkIn = await createCheckIn(subscription);
    const announcement = await prisma.announcement.create({
      data: {
        spaceId,
        type: 'GENERAL',
        textAr: 'إعلان',
        startsAt: hoursAgo(5),
        idempotencyKey: randomUUID(),
        deletedAt: hoursAgo(1),
      },
    });
    // Renamed since: the log shows the current name.
    await prisma.customer.update({
      where: { id: customer.id },
      data: { name: 'أحمد سالم الجديد' },
    });
    const targets = [
      ['customer', customer.id],
      ['subscription', subscription.id],
      ['visit', walkIn.id],
      ['visit', asCustomer.id],
      ['checkIn', checkIn.id],
      ['space', spaceId],
      ['announcement', announcement.id],
      // The owner's user id: a payment's target is never read from another table.
      ['payment', owner.id],
    ] as const;
    for (const [index, [entityType, entityId]] of targets.entries()) {
      await entry({ entityType, entityId, createdAt: hoursAgo(index + 1) });
    }

    const response = await log(owner);

    expect(rowsOf(response).map(({ target }) => target)).toEqual([
      { type: 'customer', id: customer.id, name: 'أحمد سالم الجديد', nameAr: null, deleted: false },
      {
        type: 'subscription',
        id: subscription.id,
        name: 'شهري مسائي',
        nameAr: null,
        deleted: false,
      },
      { type: 'visit', id: walkIn.id, name: 'ليلى', nameAr: null, deleted: false },
      { type: 'visit', id: asCustomer.id, name: 'أحمد سالم الجديد', nameAr: null, deleted: false },
      { type: 'checkIn', id: checkIn.id, name: 'أحمد سالم الجديد', nameAr: null, deleted: false },
      { type: 'space', id: spaceId, name: 'Focus Hub', nameAr: 'فوكس هاب', deleted: false },
      { type: 'announcement', id: announcement.id, name: null, nameAr: null, deleted: true },
      { type: 'payment', id: owner.id, name: null, nameAr: null, deleted: false },
    ]);
  });

  it('the last 30 days by default, from the Gaza midnight 29 days back; ALL reaches an older entry', async () => {
    const first = await entry({ createdAt: new Date('2026-10-12T00:00:00+03:00') });
    const older = await entry({ createdAt: new Date('2026-10-11T23:59:59.999+03:00') });

    expect(idsOf(await log(owner))).toEqual([first.id]);
    expect(idsOf(await log(owner, '?period=LAST_30_DAYS'))).toEqual([first.id]);
    expect(idsOf(await log(owner, '?period=ALL'))).toEqual([first.id, older.id]);
  });

  it("q finds the entries whose target's name holds it (أحمد for احمد); actor (a person, MASAHA, SYSTEM) and actions narrow; each before the page is cut, the total right", async () => {
    const ahmad = await createCustomer(spaceId, { name: 'أحمد سالم' });
    const sara = await createCustomer(spaceId, { name: 'Sara Haddad' });
    const latest = await entry({ entityId: ahmad.id, createdAt: hoursAgo(1) });
    await entry({ entityId: sara.id, createdAt: hoursAgo(2) });
    const second = await entry({
      actorId: reception.id,
      action: 'customer.created',
      entityId: ahmad.id,
      createdAt: hoursAgo(3),
    });
    const byAdmin = await entry({
      actorId: admin.id,
      action: 'space.hidden',
      entityType: 'space',
      entityId: spaceId,
      createdAt: hoursAgo(4),
    });
    const bySystem = await entry({
      actorId: null,
      action: 'customer.archived',
      entityId: sara.id,
      createdAt: hoursAgo(5),
    });

    const found = await log(owner, `?q=${encodeURIComponent('احمد')}&limit=1`);
    expect(idsOf(found)).toEqual([latest.id]);
    expect(metaOf(found)).toMatchObject({ totalRecords: 2, totalPages: 2 });
    expect(idsOf(await log(owner, '?q=haddad'))).toHaveLength(2);
    expect(idsOf(await log(owner, `?q=${encodeURIComponent('فوكس')}`))).toEqual([byAdmin.id]);

    const byReception = await log(owner, `?actor=${String(reception.id)}&limit=1`);
    expect(idsOf(byReception)).toEqual([second.id]);
    expect(metaOf(byReception).totalRecords).toBe(1);
    expect(idsOf(await log(owner, '?actor=MASAHA'))).toEqual([byAdmin.id]);
    expect(idsOf(await log(owner, '?actor=SYSTEM'))).toEqual([bySystem.id]);

    const created = await log(owner, '?actions=customer.created,customer.archived&limit=1');
    expect(idsOf(created)).toEqual([second.id]);
    expect(metaOf(created).totalRecords).toBe(2);
    const narrowed = await log(
      owner,
      `?q=${encodeURIComponent('احمد')}&actions=customer.edited&actor=${String(owner.id)}`,
    );
    expect(idsOf(narrowed)).toEqual([latest.id]);
  });

  it("actor=<the admin's id> finds nothing; actor=MASAHA finds the admin's", async () => {
    const byAdmin = await entry({ actorId: admin.id });
    await entry({ createdAt: hoursAgo(2) });

    const byId = await log(owner, `?actor=${String(admin.id)}`);
    expect(byId.status).toBe(200);
    expect(idsOf(byId)).toEqual([]);
    expect(metaOf(byId).totalRecords).toBe(0);
    expect(idsOf(await log(owner, '?actor=MASAHA'))).toEqual([byAdmin.id]);
  });

  it("meta.actors lists the period's actors once each, MASAHA and SYSTEM included", async () => {
    const secondAdmin = await signIn('ADMIN', 'second-admin@example.com');
    await entry({ createdAt: hoursAgo(1) });
    await entry({ createdAt: hoursAgo(2) });
    await entry({ actorId: reception.id, createdAt: hoursAgo(3) });
    await entry({ actorId: admin.id, createdAt: hoursAgo(4) });
    await entry({ actorId: secondAdmin.id, createdAt: hoursAgo(5) });
    await entry({ actorId: null, createdAt: hoursAgo(6) });
    await entry({ actorId: null, createdAt: hoursAgo(7) });
    // Before the period, and another space's: not this period's actors.
    await entry({ actorId: stranger.id, createdAt: new Date('2026-10-01T10:00:00+03:00') });
    await entry({ actorId: otherOwner.id, spaceId: otherSpaceId });

    const expected = [
      { kind: 'PERSON', id: owner.id, name: 'Ahmad' },
      { kind: 'PERSON', id: reception.id, name: 'Hala' },
      { kind: 'MASAHA' },
      { kind: 'SYSTEM' },
    ];
    expect(metaOf(await log(owner)).actors).toEqual(expected);
    // Every filter but the actor's: the list stays whole while one actor is chosen.
    expect(metaOf(await log(owner, '?actor=SYSTEM')).actors).toEqual(expected);
  });

  it("reception is 403 before the query is read; a stranger, another space's owner and the admin not_found", async () => {
    await entry();

    const refused = await log(reception, '?period=LAST_7_DAYS');
    expect(refused.status).toBe(403);
    expect(errorOf(refused).type).toBe('forbidden');
    for (const caller of [stranger, otherOwner, admin]) {
      const missing = await log(caller);
      expect(missing.status).toBe(404);
      expect(errorOf(missing).type).toBe('not_found');
    }
  });

  it('an unknown period or action, a q of 81, an actor of another kind: 422 on its field', async () => {
    const cases = [
      ['?period=LAST_7_DAYS', { period: ['invalid_choice'] }],
      ['?actions=payment.stolen', { actions: ['invalid_choice'] }],
      [`?q=${'x'.repeat(81)}`, { q: ['too_long'] }],
      ['?actor=ADMIN', { actor: ['invalid_format'] }],
    ] as const;
    for (const [query, errors] of cases) {
      const response = await log(owner, query);
      expect(response.status).toBe(422);
      expect(errorOf(response).errors).toEqual(errors);
    }
  });
});
