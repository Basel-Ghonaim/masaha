import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../../test/admin.ts';
import { createCustomer, createSpace, createSubscription } from '../../../../test/factories.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../../test/spaces.ts';
import { prisma } from '../../../db/index.ts';

// A closure's extension of the subscriptions it covered (docs/api/api-contract.md › Announcements
// (managed)): the preview of the days and how many it covered. Gaza is UTC+2 in November.
const NOW = new Date('2026-11-10T10:00:00+02:00');
const app = createTestApp({ clock: () => NOW });

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

const pathOf = (announcementId: number, space = spaceId) =>
  `/api/v1/manage/spaces/${String(space)}/announcements/${String(announcementId)}/extend-subscriptions`;

const preview = (caller: { authorization: string }, announcementId: number) =>
  request(app).get(pathOf(announcementId)).set('Authorization', caller.authorization);

/** A closure of the space, from Sunday 08:00 and running (no end) unless overridden. */
function closure(data: object = {}) {
  return prisma.announcement.create({
    data: {
      spaceId,
      type: 'CLOSURE',
      textAr: 'مغلق',
      startsAt: new Date('2026-11-08T08:00:00+02:00'),
      idempotencyKey: randomUUID(),
      ...data,
    },
  });
}

const day = (date: string) => new Date(date);

/**
 * The space's subscriptions around a closure covering 2026-11-08 to 2026-11-10: five covered and
 * five not, each named by why.
 */
async function subscriptionsAround() {
  const customer = await createCustomer(spaceId);
  const terms = (startsOn: string | null, endsOn: string | null) => ({
    startsOn: startsOn === null ? null : day(startsOn),
    endsOn: endsOn === null ? null : day(endsOn),
  });
  const covered = {
    through: await createSubscription(customer, terms('2026-11-01', '2026-11-30')),
    endsDuring: await createSubscription(customer, terms('2026-10-15', '2026-11-09')),
    endsOnFirstDay: await createSubscription(customer, terms('2026-10-10', '2026-11-08')),
    startsOnLastDay: await createSubscription(customer, terms('2026-11-10', '2026-12-10')),
    noStart: await createSubscription(customer, terms(null, '2026-11-20')),
  };
  const other = await createCustomer(otherSpaceId);
  const notCovered = {
    startsAfter: await createSubscription(customer, terms('2026-11-11', '2026-12-11')),
    endedBefore: await createSubscription(customer, terms('2026-10-01', '2026-11-07')),
    endedEarly: await createSubscription(customer, {
      ...terms('2026-11-01', '2026-11-30'),
      endedAt: new Date('2026-11-09T12:00:00+02:00'),
      endedById: owner.id,
    }),
    noEnd: await createSubscription(customer, terms('2026-11-01', null)),
    otherSpace: await createSubscription(other, terms('2026-11-01', '2026-11-30')),
  };
  return { covered, notCovered };
}

const ends = () =>
  prisma.subscription.findMany({ select: { id: true, endsOn: true }, orderBy: { id: 'asc' } });

describe('the preview', () => {
  it('the preview answers the covered days, the proposal and how many it covered, writing nothing', async () => {
    const { id } = await closure();
    await subscriptionsAround();
    const before = await ends();

    for (const caller of [owner, reception]) {
      const response = await preview(caller, id);
      expect(response.status).toBe(200);
      expect(dataOf(response)).toEqual({
        firstDay: '2026-11-08',
        lastDay: '2026-11-10',
        proposedDays: 3,
        subscriptions: 5,
        applied: null,
      });
    }

    // Ended at Tuesday's midnight: Sunday and Monday; the one starting Tuesday is not covered.
    const ended = await closure({ endsAt: new Date('2026-11-10T00:00:00+02:00') });
    expect(dataOf(await preview(owner, ended.id))).toMatchObject({
      lastDay: '2026-11-09',
      proposedDays: 2,
      subscriptions: 4,
    });

    expect(await ends()).toEqual(before);
    expect(await prisma.closureExtension.count()).toBe(0);
    expect(await auditEntries()).toEqual([]);
  });

  it("an upcoming closure is ANNOUNCEMENT_NOT_STARTED; an announcement of another type, a deleted one, another space's, not_found", async () => {
    const upcoming = await closure({ startsAt: new Date('2026-11-11T08:00:00+02:00') });
    const response = await preview(owner, upcoming.id);
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('ANNOUNCEMENT_NOT_STARTED');

    const outage = await closure({ type: 'OUTAGE' });
    const deleted = await closure({ deletedAt: new Date('2026-11-09T08:00:00+02:00') });
    const elsewhere = await closure({ spaceId: otherSpaceId });
    for (const id of [outage.id, deleted.id, elsewhere.id, 999_999]) {
      const missing = await preview(owner, id);
      expect(missing.status).toBe(404);
      expect(errorOf(missing).type).toBe('not_found');
    }

    // A stranger and the admin are not the space's staff.
    const { id } = await closure();
    for (const caller of [stranger, admin]) {
      expect((await preview(caller, id)).status).toBe(404);
    }
  });

  it('an applied extension is answered by the preview instead of a proposal', async () => {
    const { id } = await closure();
    const { covered } = await subscriptionsAround();
    const appliedAt = new Date('2026-11-09T09:00:00+02:00');
    await prisma.closureExtension.create({
      data: {
        announcementId: id,
        days: 4,
        appliedById: owner.id,
        idempotencyKey: randomUUID(),
        createdAt: appliedAt,
        subscriptions: {
          create: [{ subscriptionId: covered.through.id }, { subscriptionId: covered.noStart.id }],
        },
      },
    });
    const { name } = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });

    const response = await preview(reception, id);

    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual({
      firstDay: '2026-11-08',
      lastDay: '2026-11-10',
      proposedDays: 3,
      subscriptions: 2,
      applied: {
        days: 4,
        subscriptions: 2,
        appliedAt: appliedAt.toISOString(),
        appliedBy: { id: owner.id, name },
      },
    });
  });
});
