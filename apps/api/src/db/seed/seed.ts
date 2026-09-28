import type { PrismaClient } from '../../generated/prisma/client.ts';
import { hashPassword } from '../../shared/auth/index.ts';
import { AMENITIES, DEFAULT_SETTINGS, GOVERNORATES } from './lookups.ts';

export interface SeedInput {
  readonly admin: { readonly email: string; readonly password: string; readonly name: string };
  /** The platform's public contact, when the environment provides it. */
  readonly contact: { readonly email?: string; readonly whatsapp?: string };
}

/**
 * Creates what is missing — the lookups, the admin account and the settings — and never changes a
 * row that exists, so the admin's edits survive a second run.
 */
export async function seed(db: PrismaClient, input: SeedInput): Promise<void> {
  for (const [governorateIndex, { areas, ...governorate }] of GOVERNORATES.entries()) {
    const { id: governorateId } = await db.governorate.upsert({
      where: { nameAr: governorate.nameAr },
      create: { ...governorate, sortOrder: governorateIndex + 1 },
      update: {},
    });
    for (const [areaIndex, area] of areas.entries()) {
      await db.area.upsert({
        where: { governorateId_nameAr: { governorateId, nameAr: area.nameAr } },
        create: { ...area, governorateId, sortOrder: areaIndex + 1 },
        update: {},
      });
    }
  }

  for (const [index, amenity] of AMENITIES.entries()) {
    await db.amenity.upsert({
      where: { key: amenity.key },
      create: { ...amenity, sortOrder: index + 1 },
      update: {},
    });
  }

  const settings: Record<string, string | number> = { ...DEFAULT_SETTINGS };
  if (input.contact.email) settings.contactEmail = input.contact.email;
  if (input.contact.whatsapp) settings.contactWhatsapp = input.contact.whatsapp;
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  const email = input.admin.email.toLowerCase();
  if (!(await db.user.findUnique({ where: { email }, select: { id: true } }))) {
    await db.user.create({
      data: {
        email,
        name: input.admin.name,
        passwordHash: await hashPassword(input.admin.password),
        role: 'ADMIN',
      },
    });
  }
}
