import { randomUUID } from 'node:crypto';

import type { OwnerOverview } from '@masaha/shared/overview';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../test/admin.ts';
import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
  createVisit,
  stay,
} from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { seedSettings, setWeek, signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

// The owner's overview (docs/features/overview.md; the owner's OV1–OV3): a work queue of counts,
// each equal to the list it links to, and no amount anywhere; on Wednesday 2026-10-21 at 10:00 in
// Gaza.

const NOW = new Date('2026-10-21T10:00:00+03:00');
const app = createTestApp({ clock: () => NOW });
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);
const day = (date: string) => new Date(`${date}T00:00:00Z`);

let spaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let unrelatedOwner: { id: number; authorization: string };
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: spaceId } = await createSpace());
  // A space's settings row, as every space created through the API has (Finance › debts reads it).
  await prisma.spaceSettings.create({
    data: {
      spaceId,
      autoCheckoutAtClosing: true,
      visitRounding: 'UP_AFTER_MINUTES',
      visitRoundingMinutes: 15,
      visitCapAtDayPrice: true,
    },
  });
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  await prisma.spaceManager.create({ data: { spaceId, userId: reception.id, role: 'RECEPTION' } });
  stranger = await signIn('USER', 'stranger@example.com');
  const { id: otherSpaceId } = await createSpace('other-space');
  unrelatedOwner = await signInOwnerOf(otherSpaceId);
  admin = await signIn('ADMIN');
});

const spacePath = (path: string) => `/api/v1/manage/spaces/${String(spaceId)}${path}`;

function read(caller: { authorization: string }) {
  return request(app).get(spacePath('/overview')).set('Authorization', caller.authorization);
}

async function overviewOf(caller: { authorization: string }): Promise<OwnerOverview> {
  const response = await read(caller);
  expect(response.status).toBe(200);
  return dataOf(response) as OwnerOverview;
}

/** A list's total, as the owner reads it. */
async function totalOf(path: string): Promise<number> {
  const response = await request(app)
    .get(spacePath(path))
    .set('Authorization', owner.authorization);
  expect(response.status).toBe(200);
  return (response.body as { meta: { totalRecords: number } }).meta.totalRecords;
}

/** A payment on one item of the space, recorded by the owner. */
function pay(item: { visitId: number } | { subscriptionId: number }, amountAgorot: number) {
  return prisma.payment.create({
    data: {
      spaceId,
      ...item,
      idempotencyKey: randomUUID(),
      recordedById: owner.id,
      method: 'CASH',
      amountAgorot,
    },
  });
}

function report(data: Partial<Prisma.DataReportUncheckedCreateInput> = {}) {
  return prisma.dataReport.create({
    data: { spaceId, userId: stranger.id, field: 'PRICES', createdAt: daysAgo(1), ...data },
  });
}

function announcement(data: Partial<Prisma.AnnouncementUncheckedCreateInput>) {
  return prisma.announcement.create({
    data: {
      spaceId,
      type: 'GENERAL',
      textAr: 'إعلان',
      startsAt: daysAgo(1),
      idempotencyKey: randomUUID(),
      ...data,
    },
  });
}

/** A customer of the space with one subscription from 2026-09-25 to `endsOn`, paid in full. */
async function endingOn(name: string, endsOn: string) {
  const customer = await createCustomer(spaceId, { name });
  const subscription = await createSubscription(customer, {
    name: `${name}'s month`,
    startsOn: day('2026-09-25'),
    endsOn: day(endsOn),
  });
  await pay({ subscriptionId: subscription.id }, subscription.priceAgorot);
  return { customer, subscription };
}

/**
 * The space's work queue: the hours stale for 81 days and the amenities never saved; two open
 * reports and a resolved one; three uncollected visits, two unpriced visits (one of them
 * uncollected), a settled one; Sara and Rami (archived) owe, Omar paid; a closure awaiting its
 * extension and one extended; two announcements running.
 */
async function seedQueue() {
  await prisma.space.update({
    where: { id: spaceId },
    data: {
      profileUpdatedAt: new Date('2026-10-20T09:00:00+03:00'),
      hoursUpdatedAt: new Date('2026-08-01T09:00:00+03:00'),
      pricesUpdatedAt: new Date('2026-10-01T09:00:00+03:00'),
      contactsUpdatedAt: new Date('2026-10-01T09:00:00+03:00'),
    },
  });

  await report();
  await report({ field: 'HOURS' });
  await report({
    status: 'RESOLVED',
    resolvedAt: NOW,
    resolvedById: owner.id,
    resolvedAs: 'OWNER',
  });

  const closed = (from: string, to: string) => stay('2026-10-20', from, to);
  await createVisit(spaceId, {
    ...closed('09:00', '12:00'),
    checkoutMethod: 'AUTO',
    chargeAgorot: 2_000,
  });
  await createVisit(spaceId, { ...closed('10:00', '13:00'), checkoutMethod: 'AUTO' });
  await createVisit(spaceId, { ...closed('11:00', '14:00'), chargeAgorot: 1_500 });
  await createVisit(spaceId, closed('12:00', '15:00'));
  const settled = await createVisit(spaceId, { ...closed('13:00', '16:00'), chargeAgorot: 1_000 });
  await pay({ visitId: settled.id }, 1_000);

  await createSubscription(await createCustomer(spaceId, { name: 'Sara' }), {
    priceAgorot: 30_000,
  });
  const rami = await createCustomer(spaceId, { name: 'Rami', archivedAt: daysAgo(2) });
  await createSubscription(rami, { priceAgorot: 20_000 });
  const omars = await createSubscription(await createCustomer(spaceId, { name: 'Omar' }), {
    priceAgorot: 10_000,
  });
  await pay({ subscriptionId: omars.id }, 10_000);

  await announcement({ type: 'CLOSURE', startsAt: daysAgo(3), endsAt: daysAgo(1) });
  const extended = await announcement({
    type: 'CLOSURE',
    startsAt: daysAgo(5),
    endsAt: daysAgo(4),
  });
  await prisma.closureExtension.create({
    data: {
      announcementId: extended.id,
      days: 1,
      appliedById: owner.id,
      idempotencyKey: randomUUID(),
    },
  });
  await announcement({ type: 'OFFER', startsAt: daysAgo(1) });
  await announcement({ type: 'GENERAL', startsAt: daysAgo(2) });
}

describe("the owner's overview", () => {
  it('the owner reads the work queue: groups missing and stale with their days, open reports, uncollected and unpriced visits, closures awaiting, capacity unset, customers owing', async () => {
    await seedQueue();

    expect((await overviewOf(owner)).attention).toEqual({
      groups: { missing: ['amenities'], stale: [{ group: 'hours', days: 81 }] },
      openReports: 2,
      uncollectedVisits: 3,
      unpricedVisits: 2,
      closuresAwaitingExtension: 1,
      capacitySet: false,
      customersOwing: 2,
    });
  });

  it('each count equals the list it links to', async () => {
    await seedQueue();
    await endingOn('Huda', '2026-10-23');
    await endingOn('Lina', '2026-10-25');
    // Each kept off its list: an open visit, a deleted announcement still running, and Bilal, whose
    // ending subscription is not his current one.
    await createVisit(spaceId);
    await announcement({ type: 'EVENT', deletedAt: NOW });
    const bilal = await endingOn('Bilal', '2026-10-24');
    await createSubscription(bilal.customer, {
      startsOn: day('2026-10-15'),
      endsOn: day('2026-12-15'),
    });

    const overview = await overviewOf(owner);
    expect(await totalOf('/uncollected-visits')).toBe(overview.attention.uncollectedVisits);
    expect(await totalOf('/unpriced-visits')).toBe(overview.attention.unpricedVisits);
    expect(await totalOf('/data-reports?status=OPEN')).toBe(overview.attention.openReports);
    expect(await totalOf('/announcements?state=RUNNING')).toBe(overview.announcements.running);
    expect(await totalOf('/customers?status=ENDING_SOON')).toBe(overview.endingSoon.total);
    // Finance › debts' total of who owes, an archived debtor included.
    const debts = await request(app)
      .get(spacePath('/finance/debts'))
      .set('Authorization', owner.authorization);
    expect(debts.status).toBe(200);
    expect(
      (debts.body as { meta: { totals: { owed: { customers: number } } } }).meta.totals.owed
        .customers,
    ).toBe(overview.attention.customersOwing);
  });

  it('no amount anywhere: the body holds no Agorot key', async () => {
    await seedQueue();

    const response = await read(owner);
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toMatch(/agorot/i);
  });

  it('present now: visits, members, capacity and the live status; full at capacity', async () => {
    await setWeek(
      spaceId,
      Array.from({ length: 7 }, () => [8 * 60, 18 * 60] as [number, number]),
    );
    await prisma.spaceOccupancy.create({ data: { spaceId, capacity: 2 } });
    await createVisit(spaceId);
    await createCheckIn(await createSubscription(await createCustomer(spaceId)));
    await createVisit(spaceId, stay('2026-10-21', '08:00', '09:00'));

    const full = await overviewOf(owner);
    expect(full.presentNow).toEqual({
      visits: 1,
      members: 1,
      total: 2,
      capacity: 2,
      status: 'FULL',
    });
    expect(full.attention.capacitySet).toBe(true);

    // The owner's override in force is what the public sees.
    await prisma.spaceOccupancy.update({
      where: { spaceId },
      data: {
        stateOverride: 'AVAILABLE',
        stateOverrideUntil: new Date(NOW.getTime() + 60 * 60_000),
        stateOverrideById: owner.id,
      },
    });
    expect((await overviewOf(owner)).presentNow.status).toBe('AVAILABLE');
  });

  it('the ending-soon first five and the running announcements’ types', async () => {
    // Made out of their end dates' order, so only a sort puts them right.
    const sami = await endingOn('Sami', '2026-10-23');
    const nour = await endingOn('Nour', '2026-10-26');
    const huda = await endingOn('Huda', '2026-10-22');
    const lina = await endingOn('Lina', '2026-10-25');
    const omar = await endingOn('Omar', '2026-10-24');
    await endingOn('Yara', '2026-10-27');
    await announcement({ type: 'OFFER', startsAt: daysAgo(1) });
    await announcement({
      type: 'CLOSURE',
      startsAt: daysAgo(1),
      endsAt: new Date(NOW.getTime() + DAY),
    });
    await announcement({ type: 'OFFER', startsAt: daysAgo(2) });
    await announcement({ type: 'EVENT', startsAt: new Date(NOW.getTime() + DAY) });

    const overview = await overviewOf(owner);
    const first = (
      { customer, subscription }: Awaited<ReturnType<typeof endingOn>>,
      endsOn: string,
    ) => ({
      customer: { id: customer.id, name: customer.name },
      subscription: { id: subscription.id, name: subscription.name, endsOn },
    });
    expect(overview.endingSoon).toEqual({
      total: 6,
      first: [
        first(huda, '2026-10-22'),
        first(sami, '2026-10-23'),
        first(omar, '2026-10-24'),
        first(lina, '2026-10-25'),
        first(nour, '2026-10-26'),
      ],
    });
    expect(overview.announcements).toEqual({ running: 3, types: ['CLOSURE', 'OFFER'] });
    expect(overview.at).toBe(NOW.toISOString());
  });

  it('reception is 403; a stranger, another space’s owner and the admin not_found', async () => {
    expect((await read(owner)).status).toBe(200);

    const refused = await read(reception);
    expect(refused.status).toBe(403);
    expect(errorOf(refused).type).toBe('forbidden');

    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await read(caller);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
  });
});
