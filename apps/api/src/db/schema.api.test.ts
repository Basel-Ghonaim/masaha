import { beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase } from '../../test/reset-database.ts';
import { prisma } from './prisma.ts';

// The rules the database itself enforces beyond Prisma's own checks: the partial unique indexes and
// the CHECK constraints of the init migration (docs/architecture/data-model.md › Constraints worth
// stating). Only the real database can prove them.

beforeEach(async () => {
  await resetDatabase(prisma);
});

const PHONE = '+970599000001';

async function createSpace(slug = 'focus-hub') {
  const governorate = await prisma.governorate.upsert({
    where: { nameAr: 'غزة' },
    create: { nameAr: 'غزة', nameEn: 'Gaza City' },
    update: {},
  });
  const area = await prisma.area.upsert({
    where: { governorateId_nameAr: { governorateId: governorate.id, nameAr: 'النصر' } },
    create: { governorateId: governorate.id, nameAr: 'النصر', nameEn: 'An-Nasr' },
    update: {},
  });
  return prisma.space.create({
    data: {
      slug,
      nameAr: 'فوكس هاب',
      addressAr: 'غرب المزنر',
      areaId: area.id,
      lat: 31.53,
      lng: 34.46,
    },
  });
}

async function createMember(spaceId: number, phone = PHONE) {
  return prisma.member.create({ data: { spaceId, name: 'Sara', phone } });
}

describe('a member', () => {
  it('cannot share a phone with another non-deleted member of the same space', async () => {
    const space = await createSpace();
    await createMember(space.id);

    await expect(createMember(space.id)).rejects.toMatchObject({ code: 'P2002' });
  });

  it('may share a phone with a member of another space', async () => {
    const space = await createSpace();
    const other = await createSpace('branch-hub');
    await createMember(space.id);

    await expect(createMember(other.id)).resolves.toMatchObject({ phone: PHONE });
  });

  it('may reuse the phone of a soft-deleted member', async () => {
    const space = await createSpace();
    const deleted = await createMember(space.id);
    await prisma.member.update({ where: { id: deleted.id }, data: { deletedAt: new Date() } });

    await expect(createMember(space.id)).resolves.toMatchObject({ phone: PHONE });
  });

  it('stores its phone in E.164', async () => {
    const space = await createSpace();

    await expect(createMember(space.id, '0599000001')).rejects.toThrow(/members_phone_e164_check/);
  });
});

describe('a check-in', () => {
  it('cannot be opened twice for the same member', async () => {
    const space = await createSpace();
    const member = await createMember(space.id);
    await prisma.checkIn.create({ data: { spaceId: space.id, memberId: member.id } });

    await expect(
      prisma.checkIn.create({ data: { spaceId: space.id, memberId: member.id } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('can be opened again once the previous one is closed', async () => {
    const space = await createSpace();
    const member = await createMember(space.id);
    await prisma.checkIn.create({
      data: {
        spaceId: space.id,
        memberId: member.id,
        checkedInAt: new Date('2026-09-28T08:00:00Z'),
        checkedOutAt: new Date('2026-09-28T12:00:00Z'),
        checkoutMethod: 'MANUAL',
      },
    });

    await expect(
      prisma.checkIn.create({ data: { spaceId: space.id, memberId: member.id } }),
    ).resolves.toMatchObject({ checkedOutAt: null });
  });

  it('belongs to a member or a daily visitor, never both and never neither', async () => {
    const space = await createSpace();
    const member = await createMember(space.id);

    await expect(
      prisma.checkIn.create({
        data: { spaceId: space.id, memberId: member.id, visitorName: 'Omar' },
      }),
    ).rejects.toThrow(/check_ins_member_or_visitor_check/);
    await expect(prisma.checkIn.create({ data: { spaceId: space.id } })).rejects.toThrow(
      /check_ins_member_or_visitor_check/,
    );
  });

  it('closes after it opens, with a method exactly when closed', async () => {
    const space = await createSpace();
    const checkedInAt = new Date('2026-09-28T08:00:00Z');

    await expect(
      prisma.checkIn.create({
        data: {
          spaceId: space.id,
          visitorName: 'Omar',
          checkedInAt,
          checkedOutAt: new Date('2026-09-28T07:00:00Z'),
          checkoutMethod: 'MANUAL',
        },
      }),
    ).rejects.toThrow(/check_ins_checked_out_at_check/);
    await expect(
      prisma.checkIn.create({
        data: { spaceId: space.id, visitorName: 'Omar', checkedInAt, checkoutMethod: 'AUTO' },
      }),
    ).rejects.toThrow(/check_ins_checkout_method_check/);
  });
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
});

describe('dates', () => {
  it('never let a membership end before it starts', async () => {
    const space = await createSpace();
    const member = await createMember(space.id);

    await expect(
      prisma.membership.create({
        data: {
          memberId: member.id,
          type: 'MONTHLY',
          startsOn: new Date('2026-10-01'),
          endsOn: new Date('2026-09-30'),
        },
      }),
    ).rejects.toThrow(/memberships_dates_check/);
  });

  it('never let an announcement end before it starts', async () => {
    const space = await createSpace();
    const startsAt = new Date('2026-10-01T08:00:00Z');

    await expect(
      prisma.announcement.create({
        data: { spaceId: space.id, type: 'CLOSURE', textAr: 'مغلق', startsAt, endsAt: startsAt },
      }),
    ).rejects.toThrow(/announcements_dates_check/);
  });
});

describe('a user', () => {
  it('stores a phone in E.164, when given', async () => {
    const user = (email: string, phone: string | null) =>
      prisma.user.create({ data: { email, phone, passwordHash: 'x', name: 'Sara' } });

    await expect(user('a@example.com', '+970 59 900 0001')).rejects.toThrow(
      /users_phone_e164_check/,
    );
    await expect(user('b@example.com', null)).resolves.toBeDefined();
  });
});
