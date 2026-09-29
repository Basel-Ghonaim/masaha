import { beforeEach, describe, expect, it } from 'vitest';

import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
  createUser,
  stay,
} from '../../test/factories.ts';
import { resetDatabase } from '../../test/reset-database.ts';
import { prisma } from './prisma.ts';

// Subscriptions and packages: the four scenarios of docs/architecture/data-model.md › Subscription
// scenarios, each stored without a special case, and the rules the database enforces on them.

beforeEach(async () => {
  await resetDatabase(prisma);
});

const day = (date: string) => new Date(date);

/** The statement at any time: the days attended and the hours present, from the check-ins. */
async function statement(subscriptionId: number) {
  const checkIns = await prisma.checkIn.findMany({ where: { subscriptionId } });
  const days = new Set(checkIns.map(({ checkedInAt }) => checkedInAt.toISOString().slice(0, 10)));
  const minutes = checkIns.reduce(
    (sum, { checkedInAt, checkedOutAt }) =>
      sum + ((checkedOutAt ?? checkedInAt).getTime() - checkedInAt.getTime()) / 60_000,
    0,
  );
  return { days: days.size, hours: minutes / 60 };
}

describe('the subscription scenarios', () => {
  it('1. an exam student: three weeks, billed by the hour, with a statement', async () => {
    const space = await createSpace();
    const subscription = await createSubscription(await createCustomer(space.id), {
      name: 'امتحانات',
      startsOn: day('2026-10-03'),
      endsOn: day('2026-10-23'),
      billing: 'PER_HOUR',
      priceAgorot: 500,
      audience: 'STUDENT',
    });
    await createCheckIn(subscription, stay('2026-10-03', '09:00', '13:00'));
    await createCheckIn(subscription, stay('2026-10-04', '10:00', '15:00'));
    await createCheckIn(subscription, stay('2026-10-06', '16:00', '19:00'));

    expect(subscription).toMatchObject({
      billing: 'PER_HOUR',
      totalDays: null,
      totalHours: null,
      daysPerWeek: null,
    });
    // Three weeks, both ends included.
    expect(subscription).toMatchObject({
      startsOn: day('2026-10-03'),
      endsOn: day('2026-10-23'),
    });
    expect(await statement(subscription.id)).toEqual({ days: 3, hours: 12 });
  });

  it('2. a split week: six days over two weeks, three a week, at a fixed price', async () => {
    const space = await createSpace();
    const subscription = await createSubscription(await createCustomer(space.id), {
      name: 'أسبوعان',
      startsOn: day('2026-10-03'),
      endsOn: day('2026-10-16'),
      totalDays: 6,
      daysPerWeek: 3,
      billing: 'FIXED',
      priceAgorot: 15_000,
    });

    expect(subscription).toMatchObject({ totalDays: 6, daysPerWeek: 3, totalHours: null });
  });

  it('3. every other day: a month, three days a week, at a price agreed at the desk', async () => {
    const space = await createSpace();
    const staff = await createUser();
    const subscription = await createSubscription(await createCustomer(space.id), {
      name: 'يوم بعد يوم',
      startsOn: day('2026-10-01'),
      endsOn: day('2026-10-31'),
      daysPerWeek: 3,
      billing: 'FIXED',
      priceAgorot: 20_000,
      priceSetById: staff.id,
    });

    expect(subscription).toMatchObject({
      packageId: null,
      totalDays: null,
      daysPerWeek: 3,
      priceSetById: staff.id,
    });
  });

  it('4. an hours pack: 20 hours at a fixed price, with no end date', async () => {
    const space = await createSpace();
    const subscription = await createSubscription(await createCustomer(space.id), {
      name: '20 ساعة',
      totalHours: 20,
      billing: 'FIXED',
      priceAgorot: 10_000,
    });
    await createCheckIn(subscription, stay('2026-10-01', '08:00', '16:00'));
    await createCheckIn(subscription, stay('2026-10-05', '08:00', '16:00'));

    expect(subscription).toMatchObject({ startsOn: null, endsOn: null, totalHours: 20 });
    // Four hours left: ending soon (20 % of the total).
    expect(await statement(subscription.id)).toEqual({ days: 2, hours: 16 });
  });
});

describe('a subscription', () => {
  it('can be made from a package of its own space, copying its terms', async () => {
    const space = await createSpace();
    const monthly = await prisma.package.create({
      data: {
        spaceId: space.id,
        name: 'شهري',
        validityDays: 30,
        billing: 'FIXED',
        priceAgorot: 30_000,
      },
    });

    await expect(
      createSubscription(await createCustomer(space.id), {
        packageId: monthly.id,
        startsOn: day('2026-10-01'),
        endsOn: day('2026-10-30'),
      }),
    ).resolves.toMatchObject({ packageId: monthly.id });
  });

  it('belongs with its customer, package and shift to one space', async () => {
    const space = await createSpace();
    const other = await createSpace('branch-hub');
    const customer = await createCustomer(space.id);
    const otherPackage = await prisma.package.create({
      data: { spaceId: other.id, name: 'شهري', validityDays: 30, billing: 'FIXED', priceAgorot: 1 },
    });
    const otherShift = await prisma.spaceShift.create({
      data: { spaceId: other.id, nameAr: 'صباحي', startsMinute: 480, endsMinute: 960 },
    });

    await expect(createSubscription({ ...customer, spaceId: other.id })).rejects.toMatchObject({
      code: 'P2003',
    });
    await expect(
      createSubscription(customer, { packageId: otherPackage.id }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(createSubscription(customer, { shiftId: otherShift.id })).rejects.toMatchObject({
      code: 'P2003',
    });
  });

  it('never ends before it starts', async () => {
    const space = await createSpace();

    await expect(
      createSubscription(await createCustomer(space.id), {
        startsOn: day('2026-10-01'),
        endsOn: day('2026-09-30'),
      }),
    ).rejects.toThrow(/subscriptions_dates_check/);
  });

  it('has positive limits, at most seven days a week and 24 hours a day', async () => {
    const space = await createSpace();
    const customer = await createCustomer(space.id);

    for (const limit of [
      { totalDays: 0 },
      { daysPerWeek: 8 },
      { hoursPerDay: 25 },
      { totalHours: 0 },
    ]) {
      await expect(createSubscription(customer, limit)).rejects.toThrow(
        /subscriptions_limits_check/,
      );
    }
    await expect(createSubscription(customer, { priceAgorot: -1 })).rejects.toThrow(
      /subscriptions_price_check/,
    );
  });

  it('is ended early by someone, recorded with when', async () => {
    const space = await createSpace();
    const staff = await createUser();
    const subscription = await createSubscription(await createCustomer(space.id), {
      startsOn: day('2026-10-01'),
      endsOn: day('2026-10-31'),
    });

    await expect(
      prisma.subscription.update({ where: { id: subscription.id }, data: { endedAt: new Date() } }),
    ).rejects.toThrow(/subscriptions_ended_check/);
    await expect(
      prisma.subscription.update({
        where: { id: subscription.id },
        data: { endsOn: day('2026-10-12'), endedAt: new Date(), endedById: staff.id },
      }),
    ).resolves.toMatchObject({ endedById: staff.id });
  });
});

describe('a package', () => {
  const create = (spaceId: number, data: Record<string, unknown> = {}) =>
    prisma.package.create({
      data: {
        spaceId,
        name: 'شهري',
        validityDays: 30,
        billing: 'FIXED',
        priceAgorot: 30_000,
        ...data,
      },
    });

  it('has a unique name in its space and a positive validity', async () => {
    const space = await createSpace();
    await create(space.id);

    await expect(create(space.id)).rejects.toMatchObject({ code: 'P2002' });
    await expect(create(space.id, { name: 'أسبوعي', validityDays: 0 })).rejects.toThrow(
      /packages_validity_days_check/,
    );
    await expect(create(space.id, { name: 'أسبوعي', daysPerWeek: 0 })).rejects.toThrow(
      /packages_limits_check/,
    );
  });
});
