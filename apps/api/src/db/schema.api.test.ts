import { beforeEach, describe, expect, it } from 'vitest';

import {
  createCustomer,
  createSpace,
  createSubscription,
  createUser,
} from '../../test/factories.ts';
import { resetDatabase } from '../../test/reset-database.ts';
import { prisma } from './prisma.ts';

// The rules the database itself enforces beyond Prisma's own checks, for spaces, their facts and
// accounts: the partial unique indexes and the CHECK constraints (docs/architecture/data-model.md ›
// Constraints worth stating). Only the real database can prove them. The front desk, subscriptions
// and payments have their own files.

beforeEach(async () => {
  await resetDatabase(prisma);
});

describe('a price', () => {
  async function createPrice(
    spaceId: number,
    extra: { audience?: 'GENERAL' | 'STUDENT'; shiftId?: number; labelAr?: string } = {},
  ) {
    return prisma.spacePrice.create({
      data: { spaceId, period: 'MONTH', amountAgorot: 30_000, ...extra },
    });
  }

  it('is one per period and audience, a missing shift and label counting as one value', async () => {
    const space = await createSpace();
    await createPrice(space.id);

    await expect(createPrice(space.id)).rejects.toMatchObject({ code: 'P2002' });
    await expect(createPrice(space.id, { audience: 'STUDENT' })).resolves.toBeDefined();
  });

  it('is one per shift, and one per label', async () => {
    const space = await createSpace();
    const shift = await prisma.spaceShift.create({
      data: { spaceId: space.id, nameAr: 'صباحي', startsMinute: 480, endsMinute: 960 },
    });
    await createPrice(space.id);
    await createPrice(space.id, { shiftId: shift.id });
    await createPrice(space.id, { labelAr: 'مكتب خاص' });
    await createPrice(space.id, { shiftId: shift.id, labelAr: 'مكتب خاص' });

    await expect(createPrice(space.id, { shiftId: shift.id })).rejects.toMatchObject({
      code: 'P2002',
    });
    await expect(createPrice(space.id, { labelAr: 'مكتب خاص' })).rejects.toMatchObject({
      code: 'P2002',
    });
    await expect(
      createPrice(space.id, { shiftId: shift.id, labelAr: 'مكتب خاص' }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it("cannot name another space's shift", async () => {
    const space = await createSpace();
    const other = await createSpace('branch-hub');
    const otherShift = await prisma.spaceShift.create({
      data: { spaceId: other.id, nameAr: 'صباحي', startsMinute: 480, endsMinute: 960 },
    });

    await expect(createPrice(space.id, { shiftId: otherShift.id })).rejects.toMatchObject({
      code: 'P2003',
    });
  });

  it('keeps a shift in use from being deleted, but lets the whole space go', async () => {
    const space = await createSpace();
    const shift = await prisma.spaceShift.create({
      data: { spaceId: space.id, nameAr: 'صباحي', startsMinute: 480, endsMinute: 960 },
    });
    await createPrice(space.id, { shiftId: shift.id });

    await expect(prisma.spaceShift.delete({ where: { id: shift.id } })).rejects.toThrow();
    await expect(prisma.space.delete({ where: { id: space.id } })).resolves.toBeDefined();
  });

  it('is never negative', async () => {
    const space = await createSpace();

    await expect(
      prisma.spacePrice.create({ data: { spaceId: space.id, period: 'DAY', amountAgorot: -1 } }),
    ).rejects.toThrow(/space_prices_amount_check/);
  });
});

describe('opening hours and shifts', () => {
  it('have an open range inside the day, and a closed day has no times', async () => {
    const space = await createSpace();
    const day = (data: { isClosed?: boolean; opensMinute?: number; closesMinute?: number }) =>
      prisma.spaceHours.create({ data: { spaceId: space.id, dayOfWeek: 6, ...data } });

    await expect(day({ opensMinute: 1080, closesMinute: 480 })).rejects.toThrow(
      /space_hours_range_check/,
    );
    await expect(day({ opensMinute: 480, closesMinute: 1500 })).rejects.toThrow(
      /space_hours_range_check/,
    );
    await expect(day({})).rejects.toThrow(/space_hours_range_check/);
    await expect(day({ isClosed: true, opensMinute: 480, closesMinute: 1080 })).rejects.toThrow(
      /space_hours_range_check/,
    );
    await expect(
      prisma.spaceHours.create({
        data: { spaceId: space.id, dayOfWeek: 7, opensMinute: 480, closesMinute: 1080 },
      }),
    ).rejects.toThrow(/space_hours_day_of_week_check/);
    await expect(day({ opensMinute: 480, closesMinute: 1080 })).resolves.toBeDefined();
  });

  it('give a shift a range inside the day', async () => {
    const space = await createSpace();

    await expect(
      prisma.spaceShift.create({
        data: { spaceId: space.id, nameAr: 'مسائي', startsMinute: 960, endsMinute: 960 },
      }),
    ).rejects.toThrow(/space_shifts_range_check/);
  });
});

describe('a space', () => {
  it('has a location on the globe, and a positive capacity and stay limit when set', async () => {
    const space = await createSpace();
    const update = (data: { lat?: number; capacity?: number; maxStayMinutes?: number }) =>
      prisma.space.update({ where: { id: space.id }, data });

    await expect(update({ lat: 91 })).rejects.toThrow(/spaces_location_check/);
    await expect(update({ capacity: 0 })).rejects.toThrow(/spaces_capacity_check/);
    await expect(update({ maxStayMinutes: 0 })).rejects.toThrow(/spaces_max_stay_minutes_check/);
  });

  it('stores phone and WhatsApp contacts in E.164, other contacts as given', async () => {
    const space = await createSpace();
    const contact = (type: 'WHATSAPP' | 'PHONE' | 'INSTAGRAM', value: string) =>
      prisma.spaceContact.create({ data: { spaceId: space.id, type, value } });

    await expect(contact('WHATSAPP', '00970599000001')).rejects.toThrow(
      /space_contacts_phone_e164_check/,
    );
    await expect(contact('PHONE', '0569000001')).rejects.toThrow(/space_contacts_phone_e164_check/);
    await expect(contact('INSTAGRAM', 'https://instagram.com/focus')).resolves.toBeDefined();
  });

  it('starts with the default settings and no override', async () => {
    await expect(createSpace()).resolves.toMatchObject({
      autoCheckoutAtClosing: true,
      visitRounding: 'UP_AFTER_MINUTES',
      visitRoundingMinutes: 15,
      visitCapAtDayPrice: true,
      visitStudentPrices: true,
      reminderTemplate: null,
      stateOverride: null,
    });
  });

  it('keeps rounding minutes for the "up after N minutes" rule only, from 1 to 59', async () => {
    const space = await createSpace();
    const update = (data: {
      visitRounding?: 'UP_AFTER_MINUTES' | 'PER_MINUTE';
      visitRoundingMinutes?: number | null;
    }) => prisma.space.update({ where: { id: space.id }, data });

    await expect(update({ visitRounding: 'PER_MINUTE' })).rejects.toThrow(
      /spaces_visit_rounding_check/,
    );
    await expect(update({ visitRoundingMinutes: null })).rejects.toThrow(
      /spaces_visit_rounding_check/,
    );
    await expect(update({ visitRoundingMinutes: 60 })).rejects.toThrow(
      /spaces_visit_rounding_check/,
    );
    await expect(
      update({ visitRounding: 'PER_MINUTE', visitRoundingMinutes: null }),
    ).resolves.toMatchObject({ visitRounding: 'PER_MINUTE' });
  });

  it('sets a state override with its end and who set it, together', async () => {
    const space = await createSpace();
    const staff = await createUser();
    const update = (data: {
      stateOverride: 'FULL' | null;
      stateOverrideUntil?: Date | null;
      stateOverrideById?: number | null;
    }) => prisma.space.update({ where: { id: space.id }, data });

    await expect(update({ stateOverride: 'FULL' })).rejects.toThrow(/spaces_state_override_check/);
    await expect(
      update({
        stateOverride: 'FULL',
        stateOverrideUntil: new Date('2026-10-01T10:00:00Z'),
        stateOverrideById: staff.id,
      }),
    ).resolves.toMatchObject({ stateOverride: 'FULL' });
    await expect(
      update({ stateOverride: null, stateOverrideUntil: null, stateOverrideById: null }),
    ).resolves.toMatchObject({ stateOverride: null });
  });
});

describe('an announcement', () => {
  it('never ends before it starts', async () => {
    const space = await createSpace();
    const startsAt = new Date('2026-10-01T08:00:00Z');

    await expect(
      prisma.announcement.create({
        data: { spaceId: space.id, type: 'CLOSURE', textAr: 'مغلق', startsAt, endsAt: startsAt },
      }),
    ).rejects.toThrow(/announcements_dates_check/);
  });
});

describe('a closure extension', () => {
  async function closure() {
    const space = await createSpace();
    const owner = await createUser();
    const announcement = await prisma.announcement.create({
      data: {
        spaceId: space.id,
        type: 'CLOSURE',
        textAr: 'مغلق',
        startsAt: new Date('2026-10-01T05:00:00Z'),
        endsAt: new Date('2026-10-03T05:00:00Z'),
      },
    });
    return { space, owner, announcement };
  }

  it('is applied once per closure, and records the subscriptions it extended', async () => {
    const { space, owner, announcement } = await closure();
    const subscription = await createSubscription(await createCustomer(space.id), {
      startsOn: new Date('2026-09-15'),
      endsOn: new Date('2026-10-17'),
    });
    const data = { announcementId: announcement.id, days: 2, appliedById: owner.id };

    const extension = await prisma.closureExtension.create({
      data: { ...data, subscriptions: { create: [{ subscriptionId: subscription.id }] } },
      include: { _count: { select: { subscriptions: true } } },
    });
    expect(extension._count.subscriptions).toBe(1);
    await expect(prisma.closureExtension.create({ data })).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('extends by at least one day', async () => {
    const { owner, announcement } = await closure();

    await expect(
      prisma.closureExtension.create({
        data: { announcementId: announcement.id, days: 0, appliedById: owner.id },
      }),
    ).rejects.toThrow(/closure_extensions_days_check/);
  });
});

describe('a user', () => {
  const user = (email: string, sign: { passwordHash?: string; googleSubject?: string }) =>
    prisma.user.create({ data: { email, name: 'Sara', ...sign } });

  it('signs in with a password, Google or both, never neither', async () => {
    await expect(user('a@example.com', { passwordHash: 'x' })).resolves.toBeDefined();
    await expect(user('b@example.com', { googleSubject: '1001' })).resolves.toBeDefined();
    await expect(
      user('c@example.com', { passwordHash: 'x', googleSubject: '1002' }),
    ).resolves.toBeDefined();
    await expect(user('d@example.com', {})).rejects.toThrow(/users_sign_in_method_check/);
  });

  it('links one Google account to one user', async () => {
    await user('a@example.com', { googleSubject: '1001' });

    await expect(user('b@example.com', { googleSubject: '1001' })).rejects.toMatchObject({
      code: 'P2002',
    });
  });
});
