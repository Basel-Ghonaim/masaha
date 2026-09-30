import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../prisma.ts';
import { seed, type SeedInput } from './seed.ts';

const INPUT: SeedInput = {
  admin: { email: 'Admin@Example.com', password: 'change-me-1', name: 'Admin' },
  contact: { email: 'hello@example.com', whatsapp: '+970599000000' },
};

async function counts() {
  const [governorates, areas, amenities, settings, users] = await Promise.all([
    prisma.governorate.count(),
    prisma.area.count(),
    prisma.amenity.count(),
    prisma.setting.count(),
    prisma.user.count(),
  ]);
  return { governorates, areas, amenities, settings, users };
}

beforeEach(async () => {
  await resetDatabase(prisma);
});

describe('seed', () => {
  it('creates the Gaza Strip lookups, the settings and one admin', async () => {
    await seed(prisma, INPUT);

    expect(await counts()).toEqual({
      governorates: 5,
      areas: 25,
      amenities: 8,
      settings: 4,
      users: 1,
    });
  });

  it('leaves the amenities nearly every space has out of the directory filter', async () => {
    await seed(prisma, INPUT);

    const unfiltered = await prisma.amenity.findMany({
      where: { isFilterable: false },
      select: { key: true },
      orderBy: { key: 'asc' },
    });
    expect(unfiltered.map(({ key }) => key)).toEqual(['internet', 'stable_power']);
  });

  it('hides the unreachable governorate and areas', async () => {
    await seed(prisma, INPUT);

    const hiddenGovernorates = await prisma.governorate.findMany({
      where: { isActive: false },
      select: { nameEn: true },
    });
    const hiddenAreas = await prisma.area.findMany({
      where: { isActive: false },
      select: { nameEn: true },
      orderBy: { nameEn: 'asc' },
    });
    expect(hiddenGovernorates).toEqual([{ nameEn: 'Rafah' }]);
    expect(hiddenAreas.map(({ nameEn }) => nameEn)).toEqual([
      'Abasan',
      'Al-Qarara',
      "Al-Shuja'iyya",
      'Bani Suheila',
      "Khuza'a",
      'Rafah (city)',
      'Tal al-Sultan',
    ]);
  });

  it('stores the admin with a lowercased email and a bcrypt hash, not the password', async () => {
    await seed(prisma, INPUT);

    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });
    expect(admin).toMatchObject({ role: 'ADMIN', mustChangePassword: false });
    expect(admin.passwordHash).not.toContain(INPUT.admin.password);
    expect(await bcrypt.compare(INPUT.admin.password, admin.passwordHash ?? '')).toBe(true);
  });

  it('stores the default settings, and the contact only when given', async () => {
    await seed(prisma, { ...INPUT, contact: {} });

    const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
    expect(settings.map(({ key, value }) => [key, value])).toEqual([
      ['priceStalenessDays', 30],
      ['stalenessDays', 60],
    ]);
  });

  it('changes nothing when run again, and keeps the admin edits', async () => {
    await seed(prisma, INPUT);
    const shati = await prisma.area.findFirstOrThrow({ where: { nameEn: 'Al-Shati (Beach)' } });
    await prisma.area.update({ where: { id: shati.id }, data: { isActive: false } });
    await prisma.setting.update({ where: { key: 'stalenessDays' }, data: { value: 45 } });
    const before = await counts();

    await seed(prisma, { ...INPUT, admin: { ...INPUT.admin, password: 'another-pass-2' } });

    expect(await counts()).toEqual(before);
    expect(await prisma.area.findUniqueOrThrow({ where: { id: shati.id } })).toMatchObject({
      isActive: false,
    });
    expect(
      await prisma.setting.findUniqueOrThrow({ where: { key: 'stalenessDays' } }),
    ).toMatchObject({ value: 45 });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });
    expect(await bcrypt.compare(INPUT.admin.password, admin.passwordHash ?? '')).toBe(true);
  });
});
