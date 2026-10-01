import { beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../prisma.ts';
import { DEMO_OWNER_EMAIL, DEMO_RECEPTION_EMAIL, DEMO_SPACE_SLUG, seedDemo } from './demo.ts';
import { seed } from './seed.ts';

const DEMO = {
  password: 'demo-pass-1',
  nodeEnv: 'development',
  now: new Date('2026-10-14T09:00:00Z'),
};

beforeEach(async () => {
  await resetDatabase(prisma);
  await seed(prisma, {
    admin: { email: 'admin@example.com', password: 'change-me-1', name: 'Admin' },
    contact: {},
  });
});

async function demoSpace() {
  return prisma.space.findUniqueOrThrow({
    where: { slug: DEMO_SPACE_SLUG },
    include: { managers: { include: { user: true } } },
  });
}

describe('seedDemo', () => {
  it('creates a verified space with an owner and a reception account', async () => {
    await expect(seedDemo(prisma, DEMO)).resolves.toBe(true);

    const space = await demoSpace();
    const links = space.managers.map(({ role, user }) => [role, user.email, user.role]);
    expect(links).toEqual(
      expect.arrayContaining([
        ['OWNER', DEMO_OWNER_EMAIL, 'OWNER'],
        ['RECEPTION', DEMO_RECEPTION_EMAIL, 'USER'],
      ]),
    );
    expect(await prisma.package.count({ where: { spaceId: space.id } })).toBe(5);
  });

  it('has a capacity, and no override', async () => {
    await seedDemo(prisma, DEMO);

    const { occupancy } = await prisma.space.findUniqueOrThrow({
      where: { slug: DEMO_SPACE_SLUG },
      include: { occupancy: true },
    });
    expect(occupancy).toMatchObject({ capacity: 40, stateOverride: null });
  });

  it('copies its settings from the seeded new-space defaults', async () => {
    await seedDemo(prisma, DEMO);

    const { settings } = await prisma.space.findUniqueOrThrow({
      where: { slug: DEMO_SPACE_SLUG },
      include: { settings: true },
    });
    const { value } = await prisma.setting.findUniqueOrThrow({
      where: { key: 'newSpaceDefaults' },
    });
    expect(settings).toMatchObject(value as object);
  });

  it("copies the admin's edited defaults, not the seed's", async () => {
    await prisma.setting.update({
      where: { key: 'newSpaceDefaults' },
      data: {
        value: {
          autoCheckoutAtClosing: false,
          visitRounding: 'PER_MINUTE',
          visitRoundingMinutes: null,
          visitCapAtDayPrice: false,
        },
      },
    });

    await seedDemo(prisma, DEMO);

    const { settings } = await prisma.space.findUniqueOrThrow({
      where: { slug: DEMO_SPACE_SLUG },
      include: { settings: true },
    });
    expect(settings).toMatchObject({
      autoCheckoutAtClosing: false,
      visitRounding: 'PER_MINUTE',
      visitRoundingMinutes: null,
      visitCapAtDayPrice: false,
    });
  });

  it('holds the four subscription scenarios', async () => {
    await seedDemo(prisma, DEMO);

    const subscriptions = await prisma.subscription.findMany({ orderBy: { id: 'asc' } });
    expect(
      subscriptions.map(({ billing, totalDays, daysPerWeek, totalHours, endsOn }) => ({
        billing,
        totalDays,
        daysPerWeek,
        totalHours,
        hasEnd: endsOn !== null,
      })),
    ).toEqual([
      { billing: 'PER_HOUR', totalDays: null, daysPerWeek: null, totalHours: null, hasEnd: true },
      { billing: 'FIXED', totalDays: 6, daysPerWeek: 3, totalHours: null, hasEnd: true },
      { billing: 'FIXED', totalDays: null, daysPerWeek: 3, totalHours: null, hasEnd: true },
      { billing: 'FIXED', totalDays: null, daysPerWeek: null, totalHours: 20, hasEnd: false },
    ]);
  });

  it('has people present, an uncollected visit, a voided payment and a credit', async () => {
    await seedDemo(prisma, DEMO);

    expect(await prisma.visit.count({ where: { checkedOutAt: null } })).toBe(1);
    expect(await prisma.checkIn.count({ where: { checkedOutAt: null } })).toBe(1);
    expect(
      await prisma.visit.count({ where: { checkoutMethod: 'AUTO', payments: { none: {} } } }),
    ).toBe(1);
    expect(await prisma.payment.count({ where: { voidedAt: { not: null } } })).toBe(1);

    // The exam student's closed hours at the hour rate, against what was paid.
    const exam = await prisma.subscription.findFirstOrThrow({
      where: { billing: 'PER_HOUR' },
      include: { checkIns: { where: { checkedOutAt: { not: null } } }, payments: true },
    });
    const hours = exam.checkIns.reduce(
      (sum, { checkedInAt, checkedOutAt }) =>
        sum + ((checkedOutAt ?? checkedInAt).getTime() - checkedInAt.getTime()) / 3_600_000,
      0,
    );
    const paid = exam.payments.reduce((sum, { amountAgorot }) => sum + amountAgorot, 0);
    expect(paid).toBeGreaterThan(hours * exam.priceAgorot);
  });

  it('changes nothing when run again', async () => {
    await seedDemo(prisma, DEMO);
    const before = await Promise.all([prisma.visit.count(), prisma.payment.count()]);

    await expect(seedDemo(prisma, DEMO)).resolves.toBe(false);

    expect(await Promise.all([prisma.visit.count(), prisma.payment.count()])).toEqual(before);
  });

  it('never runs in production', async () => {
    await expect(seedDemo(prisma, { ...DEMO, nodeEnv: 'production' })).rejects.toThrow(
      /production/,
    );
    expect(await prisma.space.count()).toBe(0);
  });
});
