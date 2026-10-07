import { beforeEach, describe, expect, it } from 'vitest';

import { adminRequest, auditEntries, dataOf, errorOf, signIn } from '../../../../test/admin.ts';
import { createTestApp } from '../../../../test/app.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { createArea, seedSettings, signInOwnerOf } from '../../../../test/spaces.ts';
import { createSpace } from '../../../../test/factories.ts';
import { prisma } from '../../../db/index.ts';

const NOW = new Date('2026-10-06T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });

let areaId: number;
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: areaId } = await createArea());
  admin = await signIn('ADMIN');
});

/** A create request's body: the least a space needs, with overrides. */
function body(overrides: object = {}) {
  return {
    nameEn: 'Focus Hub',
    areaId,
    addressAr: 'شارع الشهداء',
    location: { lat: 31.5205, lng: 34.4535 },
    ...overrides,
  };
}

async function create(overrides: object = {}) {
  return adminRequest(app, admin, 'post', '/spaces', body(overrides));
}

/** What was written: spaces, settings rows and audit entries. */
async function written() {
  return {
    spaces: await prisma.space.count(),
    settings: await prisma.spaceSettings.count(),
    audit: await prisma.auditLog.count(),
  };
}

describe('POST /admin/spaces', () => {
  it.each([
    { caller: 'guest', status: 401, type: 'unauthorized', code: undefined },
    { caller: 'USER', status: 403, type: 'forbidden', code: undefined },
    {
      caller: 'ADMIN with a pending password change',
      status: 403,
      type: 'forbidden',
      code: 'PASSWORD_CHANGE_REQUIRED',
    },
  ] as const)('refuses a $caller with $status', async ({ caller, status, type, code }) => {
    const response = await adminRequest(app, caller, 'post', '/spaces', body());

    expect(response.status).toBe(status);
    const error = errorOf(response);
    expect({ type: error.type, code: error.code }).toEqual({ type, code });
    expect(await written()).toEqual({ spaces: 0, settings: 0, audit: 0 });
  });

  it('refuses the OWNER of another space with 403', async () => {
    const owner = await signInOwnerOf((await createSpace('their-hub')).id);

    const response = await adminRequest(app, owner, 'post', '/spaces', body());

    expect(response.status).toBe(403);
    expect(await prisma.space.count()).toBe(1);
  });

  it('creates an unverified, shown space, its profile dated now and its other groups missing, with its slug from the English name', async () => {
    const response = await create({
      nameAr: 'فوكس هب',
      descriptionEn: 'Quiet desks.\nA corner for calls.',
      landmarkAr: 'قرب مفترق العيون',
    });

    expect(response.status).toBe(201);
    const at = NOW.toISOString();
    expect(dataOf(response)).toEqual({
      id: expect.any(Number) as number,
      slug: 'focus-hub',
      nameEn: 'Focus Hub',
      nameAr: 'فوكس هب',
      descriptionAr: null,
      descriptionEn: 'Quiet desks.\nA corner for calls.',
      areaId,
      addressAr: 'شارع الشهداء',
      addressEn: null,
      landmarkAr: 'قرب مفترق العيون',
      landmarkEn: null,
      location: { lat: 31.5205, lng: 34.4535 },
      isHidden: false,
      isVerified: false,
      updatedAt: { profile: at, hours: null, prices: null, amenities: null, contacts: null },
      staleGroups: [],
      missingGroups: ['hours', 'prices', 'amenities', 'contacts'],
      hours: null,
      prices: [],
    });
  });

  it('copies the platform’s new-space defaults into the space’s settings', async () => {
    const response = await create();

    const settings = await prisma.spaceSettings.findUniqueOrThrow({
      where: { spaceId: (dataOf(response) as { id: number }).id },
    });
    expect(settings).toMatchObject({
      autoCheckoutAtClosing: true,
      visitRounding: 'UP_AFTER_MINUTES',
      visitRoundingMinutes: 15,
      visitCapAtDayPrice: true,
      maxStayMinutes: null,
      visitStudentPrices: true,
      reminderTemplate: null,
    });
  });

  it('copies the defaults as they are now, never a value of its own', async () => {
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

    const response = await create();

    expect(
      await prisma.spaceSettings.findUniqueOrThrow({
        where: { spaceId: (dataOf(response) as { id: number }).id },
      }),
    ).toMatchObject({
      autoCheckoutAtClosing: false,
      visitRounding: 'PER_MINUTE',
      visitRoundingMinutes: null,
      visitCapAtDayPrice: false,
    });
  });

  it('audits the creation with the profile it was created with', async () => {
    const response = await create({ nameAr: 'فوكس' });
    const { id } = dataOf(response) as { id: number };

    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'space.created',
        entityType: 'space',
        entityId: id,
        spaceId: id,
        before: null,
        after: {
          slug: 'focus-hub',
          nameEn: 'Focus Hub',
          nameAr: 'فوكس',
          descriptionAr: null,
          descriptionEn: null,
          areaId,
          addressAr: 'شارع الشهداء',
          addressEn: null,
          landmarkAr: null,
          landmarkEn: null,
          lat: 31.5205,
          lng: 34.4535,
        },
      },
    ]);
  });

  it('writes nothing when the new-space defaults cannot be read', async () => {
    await prisma.setting.delete({ where: { key: 'newSpaceDefaults' } });

    const response = await create();

    expect(response.status).toBe(500);
    expect(await written()).toEqual({ spaces: 0, settings: 0, audit: 0 });
  });

  it('writes nothing when the new-space defaults fail their rule', async () => {
    // The rounding minutes belong to the "up after N minutes" rule only.
    await prisma.setting.update({
      where: { key: 'newSpaceDefaults' },
      data: {
        value: {
          autoCheckoutAtClosing: true,
          visitRounding: 'PER_MINUTE',
          visitRoundingMinutes: 15,
          visitCapAtDayPrice: true,
        },
      },
    });

    const response = await create();

    expect(response.status).toBe(500);
    expect(await written()).toEqual({ spaces: 0, settings: 0, audit: 0 });
  });

  it('writes nothing when the staleness thresholds cannot be read', async () => {
    await prisma.setting.delete({ where: { key: 'stalenessDays' } });

    const response = await create();

    expect(response.status).toBe(500);
    expect(await written()).toEqual({ spaces: 0, settings: 0, audit: 0 });
  });

  it('gives creations of one name at once each its own slug', async () => {
    const responses = await Promise.all([create(), create(), create()]);

    expect(responses.map(({ status }) => status)).toEqual([201, 201, 201]);
    expect(responses.map((response) => (dataOf(response) as { slug: string }).slug).sort()).toEqual(
      ['focus-hub', 'focus-hub-2', 'focus-hub-3'],
    );
    expect(await written()).toEqual({ spaces: 3, settings: 3, audit: 3 });
  });

  it('suffixes a slug another space holds, and never reuses a soft-deleted space’s', async () => {
    const deleted = await createSpace('focus-hub');
    await prisma.space.update({ where: { id: deleted.id }, data: { deletedAt: new Date() } });

    const second = await create();
    const third = await create({ nameEn: 'Focus  Hub!' });

    expect((dataOf(second) as { slug: string }).slug).toBe('focus-hub-2');
    expect((dataOf(third) as { slug: string }).slug).toBe('focus-hub-3');
  });

  it('refuses an English name that yields no slug, with invalid_format', async () => {
    const response = await create({ nameEn: 'مساحة' });

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ nameEn: ['invalid_format'] });
    expect(await written()).toEqual({ spaces: 0, settings: 0, audit: 0 });
  });

  it('refuses a pin outside the Gaza Strip on the location, with out_of_range', async () => {
    const response = await create({ location: { lat: 31.77, lng: 35.21 } });

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ location: ['out_of_range'] });
  });

  it.each([
    ['a hidden area', { areaActive: false }],
    ['an area of a hidden governorate', { governorateActive: false }],
  ])('refuses %s with invalid_choice', async (_case, flags) => {
    const { id } = await createArea(flags);

    const response = await create({ areaId: id });

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ areaId: ['invalid_choice'] });
    expect(await written()).toEqual({ spaces: 0, settings: 0, audit: 0 });
  });

  it('refuses an unknown area with invalid_choice', async () => {
    const response = await create({ areaId: areaId + 100 });

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({ areaId: ['invalid_choice'] });
  });
});
