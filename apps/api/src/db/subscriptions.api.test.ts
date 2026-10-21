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

/** One row of `subscription_usage`, as the database answers it. */
interface Usage {
  subscription_id: number;
  customer_id: number;
  usage_based: boolean;
  days_used: number;
  days_this_week: number;
  minutes_used: number;
  minutes_today: number;
  due_agorot: number;
}

/** The function's rows for a space (one customer's, when given), on Wednesday 2026-10-21. */
function usage(spaceId: number, customerId: number | null = null) {
  return prisma.$queryRaw<Usage[]>`
    SELECT * FROM subscription_usage(${spaceId}, ${customerId}::integer, '2026-10-21'::date,
                                     '2026-10-17'::date)
    ORDER BY subscription_id`;
}

/** A stay with its seconds, at Gaza's summer offset. */
const at = (instant: string) => new Date(`${instant}+03:00`);

describe('subscription_usage', () => {
  it('counts the days with a check-in, open or closed, once each, by Gaza date', async () => {
    const space = await createSpace();
    const subscription = await createSubscription(await createCustomer(space.id));
    // Two stays on one Gaza day.
    await createCheckIn(subscription, stay('2026-10-19', '09:00', '11:00'));
    await createCheckIn(subscription, stay('2026-10-19', '14:00', '15:00'));
    // 23:30 UTC on the 19th is 02:30 on the 20th in Gaza: a day of its own.
    await createCheckIn(subscription, {
      checkedInAt: new Date('2026-10-19T23:30:00Z'),
      checkedOutAt: new Date('2026-10-20T00:00:00Z'),
      checkoutMethod: 'MANUAL',
    });
    // Still open today: its day counts.
    await createCheckIn(subscription, { checkedInAt: at('2026-10-21T09:00:00') });

    expect(await usage(space.id)).toMatchObject([
      { subscription_id: subscription.id, days_used: 3, days_this_week: 3 },
    ]);
  });

  it("counts closed stays' whole minutes, today's, and this week's days from the dates given", async () => {
    const space = await createSpace();
    const subscription = await createSubscription(await createCustomer(space.id));
    // The Friday before the week (from Saturday 2026-10-17): its day and minutes count in all only.
    await createCheckIn(subscription, stay('2026-10-16', '10:00', '12:00'));
    // 90 minutes and 40 seconds: 90 whole minutes.
    await createCheckIn(subscription, {
      checkedInAt: at('2026-10-18T10:00:00'),
      checkedOutAt: at('2026-10-18T11:30:40'),
      checkoutMethod: 'MANUAL',
    });
    await createCheckIn(subscription, stay('2026-10-21', '08:00', '09:15'));
    // Open: its day is today's, but none of its minutes count.
    await createCheckIn(subscription, { checkedInAt: at('2026-10-21T10:00:00') });

    expect(await usage(space.id)).toMatchObject([
      {
        subscription_id: subscription.id,
        days_used: 3,
        days_this_week: 2,
        minutes_used: 120 + 90 + 75,
        minutes_today: 75,
      },
    ]);
  });

  it('the due: a fixed price; the days × the day rate; the minutes × the hour rate ÷ 60, half up', async () => {
    const space = await createSpace();
    const customer = await createCustomer(space.id);
    const fixed = await createSubscription(customer, { billing: 'FIXED', priceAgorot: 30_000 });
    await createCheckIn(fixed, stay('2026-10-18', '08:00', '16:00'));
    const perDay = await createSubscription(customer, { billing: 'PER_DAY', priceAgorot: 2_500 });
    await createCheckIn(perDay, stay('2026-10-18', '08:00', '09:00'));
    await createCheckIn(perDay, stay('2026-10-19', '08:00', '09:00'));
    // 90 minutes at 3.33 ₪ an hour: 499.5 agorot, rounded half up.
    const perHour = await createSubscription(customer, { billing: 'PER_HOUR', priceAgorot: 333 });
    await createCheckIn(perHour, stay('2026-10-20', '08:00', '09:30'));
    const unused = await createSubscription(customer, { billing: 'PER_HOUR', priceAgorot: 500 });

    expect(await usage(space.id)).toEqual([
      expect.objectContaining({
        subscription_id: fixed.id,
        usage_based: false,
        due_agorot: 30_000,
      }),
      expect.objectContaining({ subscription_id: perDay.id, usage_based: true, due_agorot: 5_000 }),
      expect.objectContaining({ subscription_id: perHour.id, usage_based: true, due_agorot: 500 }),
      expect.objectContaining({ subscription_id: unused.id, days_used: 0, due_agorot: 0 }),
    ]);
  });

  it("answers one customer's subscriptions only, when named, and another space's never", async () => {
    const space = await createSpace();
    const sara = await createCustomer(space.id, { name: 'Sara' });
    const omar = await createCustomer(space.id, { name: 'Omar' });
    const saras = await createSubscription(sara);
    const omars = await createSubscription(omar);
    const other = await createSpace('other-space');
    await createSubscription(await createCustomer(other.id));

    expect((await usage(space.id)).map(({ subscription_id }) => subscription_id)).toEqual([
      saras.id,
      omars.id,
    ]);
    expect(await usage(space.id, omar.id)).toMatchObject([
      { subscription_id: omars.id, customer_id: omar.id },
    ]);
  });
});
