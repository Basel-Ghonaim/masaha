import { DEFAULT_SETTINGS } from '../src/db/seed/lookups.ts';
import { prisma } from '../src/db/index.ts';
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
}: { areaActive?: boolean; governorateActive?: boolean } = {}) {
  governorates += 1;
  const governorate = await prisma.governorate.create({
    data: { nameAr: `غزة ${String(governorates)}`, nameEn: 'Gaza', isActive: governorateActive },
  });
  return prisma.area.create({
    data: {
      governorateId: governorate.id,
      nameAr: 'النصر',
      nameEn: 'An-Nasr',
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
  const token = await accessTokens.sign({
    userId: user.id,
    role: 'OWNER',
    mustChangePassword: false,
  });
  return { id: user.id, authorization: `Bearer ${token}` };
}
