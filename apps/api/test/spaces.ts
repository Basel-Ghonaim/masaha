import { DEFAULT_SETTINGS } from '../src/db/seed/lookups.ts';
import { prisma } from '../src/db/index.ts';
import type { Prisma } from '../src/generated/prisma/client.ts';
import { accessTokens } from './app.ts';

// What the admin's space endpoints are tested on: the platform's settings, an area to place a space
// in, and the owners of spaces, each signed in.

/** The platform's settings with their seeded defaults: the staleness thresholds and the defaults. */
export async function seedSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.create({ data: { key, value: value } });
  }
}

let governorates = 0;

/** An area, in a governorate of its own, both active unless told otherwise. */
export async function createArea({
  areaActive = true,
  governorateActive = true,
  nameAr = 'النصر',
  nameEn = 'An-Nasr',
}: { areaActive?: boolean; governorateActive?: boolean; nameAr?: string; nameEn?: string } = {}) {
  governorates += 1;
  const governorate = await prisma.governorate.create({
    data: { nameAr: `غزة ${String(governorates)}`, nameEn: 'Gaza', isActive: governorateActive },
  });
  return prisma.area.create({
    data: {
      governorateId: governorate.id,
      nameAr,
      nameEn,
      isActive: areaActive,
    },
  });
}

let owners = 0;

/**
 * A new OWNER account linked to the space as its OWNER, which verifies the space, and the
 * Authorization header of its access token.
 */
export async function signInOwnerOf(
  spaceId: number,
): Promise<{ id: number; authorization: string }> {
  owners += 1;
  const user = await prisma.user.create({
    data: {
      email: `owner-${String(owners)}@example.com`,
      name: 'Ahmad',
      role: 'OWNER',
      passwordHash: 'x',
    },
  });
  await prisma.spaceManager.create({ data: { spaceId, userId: user.id, role: 'OWNER' } });
  const token = await accessTokens.sign({ userId: user.id, mustChangePassword: false });
  return { id: user.id, authorization: `Bearer ${token}` };
}

/**
 * A space as the public directory lists it: shown, in the area, its slug from its English name and
 * its profile dated now, with the fields under test overridden.
 */
export async function createPublicSpace(
  areaId: number,
  nameEn: string,
  data: Partial<Prisma.SpaceUncheckedCreateInput> = {},
) {
  return prisma.space.create({
    data: {
      slug: nameEn.toLowerCase().replaceAll(' ', '-'),
      nameEn,
      addressAr: 'شارع الشهداء',
      areaId,
      lat: 31.52,
      lng: 34.45,
      ...data,
    },
  });
}

/**
 * Writes the space's row anew, so a scan meets it after the rows inserted since: an order that
 * leans on insertion order, not on its tie-break, then shows it out of place.
 */
export async function moveRowToEnd(spaceId: number) {
  await prisma.$executeRaw`UPDATE spaces SET slug = slug WHERE id = ${spaceId}`;
}

/** Photos of the space, stored under these keys, in this order: the first is its cover. */
export async function addPhotos(spaceId: number, keys: readonly string[]) {
  for (const [sortOrder, path] of keys.entries()) {
    await prisma.spacePhoto.create({ data: { spaceId, path, sortOrder } });
  }
}

/** Where the test storage serves a size of the photo stored under `key`. */
export function photoUrl(key: string, size: 'card' | 'page') {
  return `/api/v1/files/spaces/${key}/${size}.webp`;
}

/** The space's week, Sunday first: `[opens, closes]` in minutes, or `null` for a closed day. */
export async function setWeek(spaceId: number, days: readonly ([number, number] | null)[]) {
  await prisma.spaceHours.createMany({
    data: days.map((day, dayOfWeek) =>
      day
        ? { spaceId, dayOfWeek, opensMinute: day[0], closesMinute: day[1] }
        : { spaceId, dayOfWeek, isClosed: true },
    ),
  });
}

/** A price of the space, for the general audience unless told otherwise. */
export async function addPrice(
  spaceId: number,
  period: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH',
  amountAgorot: number,
  audience: 'GENERAL' | 'STUDENT' = 'GENERAL',
) {
  await prisma.spacePrice.create({ data: { spaceId, period, audience, amountAgorot } });
}
