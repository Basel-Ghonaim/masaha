import { randomUUID } from 'node:crypto';

import type { Prisma, PrismaClient } from '../../generated/prisma/client.ts';
import { hashPassword } from '../../shared/auth/index.ts';

// Development-only demo data: one verified space with an owner and a reception account, its
// packages, the four subscription scenarios of docs/architecture/data-model.md, and some visits and
// payments, dated around `now` so the front desk looks live. It never runs in production.

export const DEMO_SPACE_SLUG = 'masaha-demo';
export const DEMO_OWNER_EMAIL = 'demo-owner@example.com';
export const DEMO_RECEPTION_EMAIL = 'demo-reception@example.com';

export interface DemoInput {
  /** The password of both demo accounts. */
  readonly password: string;
  /** process.env.NODE_ENV: the demo refuses to run in production. */
  readonly nodeEnv: string | undefined;
  readonly now?: Date;
}

/**
 * Creates the demo space and everything in it, once: returns false, changing nothing, when the
 * demo space exists. Needs the lookups (run `seed` first).
 */
export async function seedDemo(db: PrismaClient, input: DemoInput): Promise<boolean> {
  if (input.nodeEnv === 'production') {
    throw new Error('Refusing to seed demo data in production (NODE_ENV=production).');
  }
  if (await db.space.findUnique({ where: { slug: DEMO_SPACE_SLUG }, select: { id: true } })) {
    return false;
  }
  const area = await db.area.findFirst({ where: { nameEn: 'Al-Rimal' }, select: { id: true } });
  if (!area) throw new Error('Seed the lookups before the demo data (npm run db:seed).');

  const now = input.now ?? new Date();
  const at = gazaClock(now);
  const passwordHash = await hashPassword(input.password);

  await db.$transaction(async (tx) => {
    const owner = await tx.user.create({
      data: { email: DEMO_OWNER_EMAIL, name: 'أحمد الشوا', role: 'OWNER', passwordHash },
    });
    const reception = await tx.user.create({
      data: { email: DEMO_RECEPTION_EMAIL, name: 'ليلى النجار', passwordHash },
    });

    const space = await tx.space.create({
      data: {
        slug: DEMO_SPACE_SLUG,
        nameAr: 'مساحة تجريبية',
        nameEn: 'Demo Space',
        descriptionAr: 'مساحة عمل هادئة بإنترنت وكهرباء مستقرة.',
        addressAr: 'شارع الشهداء، قرب دوار أنصار',
        addressEn: 'Al-Shuhada Street, near Ansar Square',
        areaId: area.id,
        lat: 31.5205,
        lng: 34.4535,
        capacity: 40,
        managers: {
          create: [
            { userId: owner.id, role: 'OWNER' },
            { userId: reception.id, role: 'RECEPTION' },
          ],
        },
        // Saturday to Thursday 08:00–22:00; Friday closed (0 = Sunday … 6 = Saturday).
        hours: {
          create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) =>
            dayOfWeek === 5
              ? { dayOfWeek, isClosed: true }
              : { dayOfWeek, opensMinute: 480, closesMinute: 1320 },
          ),
        },
        contacts: { create: [{ type: 'WHATSAPP', value: '+970599000100' }] },
      },
    });
    const spaceId = space.id;

    const morning = await tx.spaceShift.create({
      data: { spaceId, nameAr: 'صباحي', nameEn: 'Morning', startsMinute: 480, endsMinute: 960 },
    });
    await tx.spaceShift.create({
      data: { spaceId, nameAr: 'مسائي', nameEn: 'Evening', startsMinute: 960, endsMinute: 1320 },
    });
    await tx.spacePrice.createMany({
      data: [
        { spaceId, period: 'HOUR', amountAgorot: 500 },
        { spaceId, period: 'DAY', amountAgorot: 2_500 },
        { spaceId, period: 'WEEK', amountAgorot: 12_000 },
        { spaceId, period: 'MONTH', amountAgorot: 35_000 },
        { spaceId, period: 'HOUR', audience: 'STUDENT', amountAgorot: 400 },
        { spaceId, period: 'DAY', audience: 'STUDENT', amountAgorot: 2_000 },
        { spaceId, period: 'MONTH', shiftId: morning.id, amountAgorot: 25_000 },
      ],
    });
    const amenities = await tx.amenity.findMany({
      where: { key: { in: ['internet', 'stable_power', 'hot_drinks', 'meeting_room'] } },
      select: { id: true },
    });
    await tx.spaceAmenity.createMany({
      data: amenities.map(({ id }) => ({ spaceId, amenityId: id })),
    });

    // The owner's private packages.
    const pkg = async (data: {
      name: string;
      validityDays: number;
      billing: 'FIXED' | 'PER_HOUR';
      priceAgorot: number;
      audience?: 'STUDENT';
      totalDays?: number;
      daysPerWeek?: number;
      shiftId?: number;
    }) => tx.package.create({ data: { spaceId, ...data } });
    await pkg({ name: 'شهري', validityDays: 30, billing: 'FIXED', priceAgorot: 35_000 });
    await pkg({ name: 'أسبوعي', validityDays: 7, billing: 'FIXED', priceAgorot: 12_000 });
    await pkg({
      name: 'شهري صباحي',
      validityDays: 30,
      billing: 'FIXED',
      priceAgorot: 25_000,
      shiftId: morning.id,
    });
    const exams = await pkg({
      name: 'امتحانات بالساعة',
      validityDays: 21,
      billing: 'PER_HOUR',
      priceAgorot: 400,
      audience: 'STUDENT',
    });
    const splitWeek = await pkg({
      name: 'أسبوعان، 6 أيام',
      validityDays: 14,
      totalDays: 6,
      daysPerWeek: 3,
      billing: 'FIXED',
      priceAgorot: 15_000,
    });

    const customer = (name: string, phone?: string) =>
      tx.customer.create({ data: { spaceId, name, phone } });
    const sara = await customer('سارة خالد', '+970599000201');
    const mohammed = await customer('محمد عوض', '+970599000202');
    const nour = await customer('نور حسن');
    const yousef = await customer('يوسف أبو علي', '+970569000204');
    const rami = await customer('رامي سالم', '+970599000205');

    // The four subscription scenarios.
    const examStudent = await tx.subscription.create({
      data: {
        spaceId,
        customerId: sara.id,
        packageId: exams.id,
        name: exams.name,
        startsOn: at.date(-6),
        endsOn: at.date(14),
        billing: 'PER_HOUR',
        priceAgorot: 400,
        audience: 'STUDENT',
      },
    });
    const split = await tx.subscription.create({
      data: {
        spaceId,
        customerId: mohammed.id,
        packageId: splitWeek.id,
        name: splitWeek.name,
        startsOn: at.date(-4),
        endsOn: at.date(9),
        totalDays: 6,
        daysPerWeek: 3,
        billing: 'FIXED',
        priceAgorot: 15_000,
      },
    });
    const everyOtherDay = await tx.subscription.create({
      data: {
        spaceId,
        customerId: nour.id,
        name: 'يوم بعد يوم',
        startsOn: at.date(-10),
        endsOn: at.date(20),
        daysPerWeek: 3,
        billing: 'FIXED',
        priceAgorot: 20_000,
        priceSetById: reception.id,
      },
    });
    const hoursPack = await tx.subscription.create({
      data: {
        spaceId,
        customerId: yousef.id,
        name: '20 ساعة',
        totalHours: 20,
        billing: 'FIXED',
        priceAgorot: 10_000,
        priceSetById: owner.id,
      },
    });

    const checkIns = (
      subscription: { id: number; customerId: number },
      stays: readonly [daysAgo: number, from: string, to: string][],
    ) =>
      tx.checkIn.createMany({
        data: stays.map(([daysAgo, from, to]) => ({
          spaceId,
          customerId: subscription.customerId,
          subscriptionId: subscription.id,
          requestId: randomUUID(),
          checkedInAt: at.time(-daysAgo, from),
          checkedOutAt: at.time(-daysAgo, to),
          checkoutMethod: 'MANUAL' as const,
        })),
      });
    // 12 hours so far, and present now.
    await checkIns(examStudent, [
      [6, '09:00', '13:00'],
      [5, '10:00', '15:00'],
      [3, '16:00', '19:00'],
    ]);
    await tx.checkIn.create({
      data: {
        spaceId,
        customerId: sara.id,
        subscriptionId: examStudent.id,
        requestId: randomUUID(),
        checkedInAt: new Date(now.getTime() - 60 * 60_000),
      },
    });
    await checkIns(split, [
      [4, '09:00', '14:00'],
      [2, '09:00', '14:00'],
    ]);
    await checkIns(everyOtherDay, [
      [9, '08:00', '12:00'],
      [7, '08:00', '12:00'],
      [5, '08:00', '12:00'],
    ]);
    // 16 of 20 hours used: ending soon.
    await checkIns(hoursPack, [
      [8, '08:00', '16:00'],
      [7, '08:00', '16:00'],
    ]);

    const rates = { hourRateAgorot: 500, dayRateAgorot: 2_500 };
    const visit = (data: Omit<Prisma.VisitUncheckedCreateInput, 'spaceId' | 'requestId'>) =>
      tx.visit.create({ data: { ...data, spaceId, requestId: randomUUID(), ...rates } });
    // Present now.
    await visit({ visitorName: 'عمر', checkedInAt: new Date(now.getTime() - 2 * 60 * 60_000) });
    // 2 h 50 min, rounded up to 3 hours, paid at check-out.
    const paid = await visit({
      visitorName: 'هبة',
      checkedInAt: at.time(-1, '09:00'),
      checkedOutAt: at.time(-1, '11:50'),
      checkoutMethod: 'MANUAL',
      roundingRule: 'UP_AFTER_MINUTES',
      roundingMinutes: 15,
      capApplied: false,
      chargeAgorot: 1_500,
    });
    // Closed at closing time and left unpaid: an uncollected visit, capped at the day price.
    await visit({
      visitorName: 'خالد',
      checkedInAt: at.time(-1, '14:00'),
      checkedOutAt: at.time(-1, '22:00'),
      checkoutMethod: 'AUTO',
      roundingRule: 'UP_AFTER_MINUTES',
      roundingMinutes: 15,
      capApplied: true,
      chargeAgorot: 2_500,
    });
    // Left unpaid with a phone: a debt on that customer.
    await visit({
      visitorName: 'رامي',
      customerId: rami.id,
      checkedInAt: at.time(-2, '10:00'),
      checkedOutAt: at.time(-2, '13:00'),
      checkoutMethod: 'MANUAL',
      roundingRule: 'UP_AFTER_MINUTES',
      roundingMinutes: 15,
      capApplied: false,
      chargeAgorot: 1_500,
    });

    const pay = (
      item: { visitId: number } | { subscriptionId: number },
      amountAgorot: number,
      recordedById: number,
      daysAgo: number,
      method: 'CASH' | 'TRANSFER' = 'CASH',
    ) =>
      tx.payment.create({
        data: {
          spaceId,
          requestId: randomUUID(),
          ...item,
          amountAgorot,
          method,
          recordedById,
          receivedAt: at.time(-daysAgo, '12:00'),
        },
      });
    await pay({ visitId: paid.id }, 1_500, reception.id, 1);
    // Paid ahead: 60 ₪ against 48 ₪ of hours so far, so the subscription holds credit.
    await pay({ subscriptionId: examStudent.id }, 6_000, reception.id, 6);
    // Partly paid.
    await pay({ subscriptionId: split.id }, 10_000, reception.id, 4, 'TRANSFER');
    // Recorded twice by mistake: the owner voided the first.
    const duplicate = await pay({ subscriptionId: everyOtherDay.id }, 20_000, reception.id, 10);
    await tx.payment.update({
      where: { id: duplicate.id },
      data: { voidedAt: at.time(-10, '13:00'), voidedById: owner.id, voidReason: 'سُجّلت مرتين' },
    });
    await pay({ subscriptionId: everyOtherDay.id }, 20_000, reception.id, 10);
    await pay({ subscriptionId: hoursPack.id }, 10_000, owner.id, 8);
  });

  return true;
}

/** Dates and times in Asia/Gaza, counted in days from `now`. */
function gazaClock(now: Date) {
  const zone = 'Asia/Gaza';
  const dayOf = (offsetDays: number) =>
    new Date(now.getTime() + offsetDays * 86_400_000).toLocaleDateString('en-CA', {
      timeZone: zone,
    });
  const offsetOn = (date: Date) =>
    new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: 'longOffset' })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')
      ?.value.replace('GMT', '') || '+00:00';
  return {
    /** A calendar date, as Prisma stores a `date` column. */
    date: (offsetDays: number) => new Date(`${dayOf(offsetDays)}T00:00:00Z`),
    /** A time of day, `HH:MM` on the Gaza clock. */
    time: (offsetDays: number, hhmm: string) => {
      const day = dayOf(offsetDays);
      return new Date(`${day}T${hhmm}:00${offsetOn(new Date(`${day}T12:00:00Z`))}`);
    },
  };
}
