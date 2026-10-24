import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../../test/admin.ts';
import { createCustomer, createSpace, createSubscription } from '../../../../test/factories.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../../test/spaces.ts';
import { prisma } from '../../../db/index.ts';

const NOW = new Date('2026-10-24T10:00:00+03:00');
const app = createTestApp({ clock: () => NOW });
const DAY = 86_400_000;
const days = (n: number) => new Date(NOW.getTime() + n * DAY);

let spaceId: number;
let otherSpaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  stranger = await signIn('USER', 'stranger@example.com');
  admin = await signIn('ADMIN');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
});

const pathOf = (suffix = '') => `/api/v1/manage/spaces/${String(spaceId)}/announcements${suffix}`;

const list = (caller: { authorization: string }, query = '') =>
  request(app).get(pathOf(query)).set('Authorization', caller.authorization);

const summary = (caller: { authorization: string }) =>
  request(app).get(pathOf('/summary')).set('Authorization', caller.authorization);

/** An announcement of the space, inserted directly, with the fields under test overridden. */
function insert(data: object = {}) {
  return prisma.announcement.create({
    data: {
      spaceId,
      type: 'GENERAL',
      textAr: 'إعلان',
      startsAt: days(-1),
      idempotencyKey: randomUUID(),
      ...data,
    },
  });
}

const idsOf = (response: request.Response) =>
  (dataOf(response) as { id: number }[]).map(({ id }) => id);

describe('the managed list', () => {
  it('the list pages one state: running and upcoming by start, ended by end latest first; the total right', async () => {
    const startsAt = days(-2);
    // Running: two at one start, ordered by id, and one started earlier.
    const runningB = await insert({ startsAt });
    const runningC = await insert({ startsAt, endsAt: days(1) });
    const runningA = await insert({ startsAt: days(-3) });
    // Upcoming, inserted out of order.
    const later = await insert({ startsAt: days(5) });
    const sooner = await insert({ startsAt: days(2) });
    // Ended: by end, latest first, the reverse of their starts, so an order by start fails.
    const endedFirst = await insert({ startsAt: days(-10), endsAt: days(-1) });
    const endedLast = await insert({ startsAt: days(-0.75), endsAt: days(-0.5) });
    // Never listed: deleted, and another space's.
    await insert({ deletedAt: days(-0.1) });
    await insert({ spaceId: otherSpaceId });

    const running = await list(reception);
    expect(running.status).toBe(200);
    expect(idsOf(running)).toEqual([runningA.id, runningB.id, runningC.id]);
    expect((running.body as { meta: unknown }).meta).toMatchObject({ totalRecords: 3 });

    const firstPage = await list(owner, '?state=RUNNING&limit=2');
    expect(idsOf(firstPage)).toEqual([runningA.id, runningB.id]);
    expect((firstPage.body as { meta: unknown }).meta).toMatchObject({
      currentPage: 1,
      totalPages: 2,
      totalRecords: 3,
      hasNextPage: true,
    });
    expect(idsOf(await list(owner, '?state=RUNNING&limit=2&page=2'))).toEqual([runningC.id]);

    expect(idsOf(await list(owner, '?state=UPCOMING'))).toEqual([sooner.id, later.id]);
    const ended = await list(owner, '?state=ENDED');
    expect(idsOf(ended)).toEqual([endedLast.id, endedFirst.id]);
    expect(dataOf(ended)).toEqual([
      {
        id: endedLast.id,
        type: 'GENERAL',
        textAr: 'إعلان',
        textEn: null,
        startsAt: days(-0.75).toISOString(),
        endsAt: days(-0.5).toISOString(),
        state: 'ENDED',
      },
      expect.objectContaining({ id: endedFirst.id, state: 'ENDED' }) as unknown,
    ]);

    const invalid = await list(owner, '?state=DELETED');
    expect(invalid.status).toBe(422);
    expect(errorOf(invalid).errors).toEqual({ state: ['invalid_choice'] });
  });

  it('a closure carries extension null, or its days, how many moved and who applied it; other types carry none', async () => {
    const extended = await insert({ type: 'CLOSURE', startsAt: days(-3), endsAt: days(-1) });
    const awaiting = await insert({ type: 'CLOSURE', startsAt: days(-2) });
    const outage = await insert({ type: 'OUTAGE', startsAt: days(-2) });

    // An extension of three days, applied by the owner to two subscriptions (as PR 4's will be).
    const customer = await createCustomer(spaceId);
    const subscriptions = [
      await createSubscription(customer),
      await createSubscription(customer, { name: 'أسبوعي' }),
    ];
    const extension = await prisma.closureExtension.create({
      data: {
        announcementId: extended.id,
        days: 3,
        appliedById: owner.id,
        createdAt: days(-0.5),
      },
    });
    await prisma.subscriptionExtension.createMany({
      data: subscriptions.map(({ id }) => ({
        closureExtensionId: extension.id,
        subscriptionId: id,
      })),
    });

    const running = dataOf(await list(owner)) as { id: number; extension?: unknown }[];
    expect(running.map(({ id, extension: applied }) => ({ id, applied }))).toEqual([
      { id: awaiting.id, applied: null },
      { id: outage.id, applied: undefined },
    ]);
    expect('extension' in (running[1] ?? {})).toBe(false);

    expect(dataOf(await list(reception, '?state=ENDED'))).toEqual([
      expect.objectContaining({
        id: extended.id,
        extension: {
          days: 3,
          subscriptions: 2,
          appliedAt: days(-0.5).toISOString(),
          appliedBy: { id: owner.id, name: 'Ahmad' },
        },
      }) as unknown,
    ]);
  });
});

describe('the summary', () => {
  it('the summary counts running, upcoming and ended, and the started closures with no extension', async () => {
    const extended = await insert({ type: 'CLOSURE', startsAt: days(-3), endsAt: days(-1) });
    await prisma.closureExtension.create({
      data: { announcementId: extended.id, days: 2, appliedById: owner.id },
    });
    // Awaiting: a running closure, and an ended one, each started within 30 days.
    await insert({ type: 'CLOSURE', startsAt: days(-2) });
    await insert({ type: 'CLOSURE', startsAt: days(-5), endsAt: days(-4) });
    // Not awaiting: an upcoming closure, one started 31 days ago, a deleted one, an outage.
    await insert({ type: 'CLOSURE', startsAt: days(1) });
    await insert({ type: 'CLOSURE', startsAt: days(-31), endsAt: days(-30) });
    await insert({ type: 'CLOSURE', startsAt: days(-1), deletedAt: days(-0.5) });
    await insert({ type: 'OUTAGE', startsAt: days(-1) });
    await insert({ type: 'CLOSURE', spaceId: otherSpaceId });

    const response = await summary(reception);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual({
      running: 2,
      upcoming: 1,
      ended: 3,
      closuresAwaitingExtension: 2,
    });
  });
});

describe("the list's routes", () => {
  it('reception reads the list and the summary; a stranger and the admin not_found', async () => {
    expect((await list(reception)).status).toBe(200);
    expect((await summary(reception)).status).toBe(200);
    for (const caller of [stranger, admin]) {
      for (const response of [await list(caller), await summary(caller)]) {
        expect(response.status).toBe(404);
        expect(errorOf(response).type).toBe('not_found');
      }
    }
  });
});
