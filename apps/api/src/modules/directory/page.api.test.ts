import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import {
  addPrice,
  createArea,
  createPublicSpace,
  seedSettings,
  setWeek,
  signInOwnerOf,
} from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const NOW = new Date('2026-10-13T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });
const DAY_MS = 24 * 60 * 60 * 1000;

/** A date `days` before now. */
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY_MS);

let areaId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: areaId } = await createArea({ nameAr: 'الرمال', nameEn: 'Al-Rimal' }));
});

function page(slug: string) {
  return request(app).get(`/api/v1/spaces/${slug}`);
}

/** A platform amenity, active unless told otherwise, placed at `sortOrder`. */
function amenity(key: string, sortOrder: number, isActive = true) {
  return prisma.amenity.create({
    data: { key, nameAr: `ميزة ${key}`, nameEn: key, icon: 'wifi', sortOrder, isActive },
  });
}

describe('GET /spaces/:slug', () => {
  it('answers a listed space’s public page whole, with no capacity, count or live status', async () => {
    const space = await createPublicSpace(areaId, 'Focus Hub', {
      nameAr: 'فوكس هب',
      descriptionAr: 'مساحة هادئة',
      landmarkAr: 'قرب الجامعة',
      lat: 31.521,
      lng: 34.452,
      profileUpdatedAt: daysAgo(70),
      hoursUpdatedAt: NOW,
      pricesUpdatedAt: NOW,
      amenitiesUpdatedAt: NOW,
    });
    await setWeek(
      space.id,
      Array.from({ length: 7 }, () => [480, 1080] as [number, number]),
    );
    const shift = await prisma.spaceShift.create({
      data: { spaceId: space.id, nameAr: 'صباحية', startsMinute: 480, endsMinute: 780 },
    });
    await prisma.spacePrice.create({
      data: { spaceId: space.id, period: 'HOUR', amountAgorot: 500, shiftId: shift.id },
    });
    await addPrice(space.id, 'MONTH', 15000, 'STUDENT');
    const second = await amenity('power', 2);
    const first = await amenity('internet', 1);
    const retired = await amenity('printer', 0, false);
    await prisma.spaceAmenity.createMany({
      data: [second, first, retired].map(({ id }) => ({ spaceId: space.id, amenityId: id })),
    });
    await prisma.spaceOwnAmenity.create({
      data: { spaceId: space.id, nameAr: 'قاعة تدريب', sortOrder: 0 },
    });
    await prisma.spaceContact.create({
      data: { spaceId: space.id, type: 'WHATSAPP', value: '+970599123456' },
    });
    await prisma.spaceOccupancy.create({ data: { spaceId: space.id, capacity: 40 } });

    const response = await page('focus-hub');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        id: space.id,
        slug: 'focus-hub',
        nameEn: 'Focus Hub',
        nameAr: 'فوكس هب',
        descriptionAr: 'مساحة هادئة',
        descriptionEn: null,
        area: { id: areaId, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
        addressAr: 'شارع الشهداء',
        addressEn: null,
        landmarkAr: 'قرب الجامعة',
        landmarkEn: null,
        location: { lat: 31.521, lng: 34.452 },
        isVerified: false,
        hours: {
          days: Array.from({ length: 7 }, () => ({ opensMinute: 480, closesMinute: 1080 })),
          shifts: [
            { id: shift.id, nameAr: 'صباحية', nameEn: null, startsMinute: 480, endsMinute: 780 },
          ],
        },
        prices: [
          {
            period: 'HOUR',
            audience: 'GENERAL',
            shiftId: shift.id,
            labelAr: null,
            labelEn: null,
            amountAgorot: 500,
          },
          {
            period: 'MONTH',
            audience: 'STUDENT',
            shiftId: null,
            labelAr: null,
            labelEn: null,
            amountAgorot: 15000,
          },
        ],
        amenities: [
          { nameAr: 'ميزة internet', nameEn: 'internet', icon: 'wifi' },
          { nameAr: 'ميزة power', nameEn: 'power', icon: 'wifi' },
          { nameAr: 'قاعة تدريب', nameEn: null, icon: null },
        ],
        contacts: [{ type: 'WHATSAPP', value: '+970599123456' }],
        updatedAt: {
          profile: daysAgo(70).toISOString(),
          hours: NOW.toISOString(),
          prices: NOW.toISOString(),
          amenities: NOW.toISOString(),
          contacts: null,
        },
        staleGroups: ['profile'],
      },
    });
    expect(response.headers['cache-control']).toBe('public, max-age=30');
  });

  it('hides an unverified space’s stale prices, and shows a verified space’s with their stale mark', async () => {
    const unverified = await createPublicSpace(areaId, 'Unverified', {
      pricesUpdatedAt: daysAgo(31),
    });
    await addPrice(unverified.id, 'DAY', 2000);
    const verified = await createPublicSpace(areaId, 'Verified', {
      pricesUpdatedAt: daysAgo(31),
    });
    await addPrice(verified.id, 'DAY', 2000);
    await signInOwnerOf(verified.id);

    const hidden = await page('unverified');
    const shown = await page('verified');

    expect(hidden.body).toMatchObject({
      data: { isVerified: false, prices: null, staleGroups: ['prices'] },
    });
    expect(shown.body).toMatchObject({
      data: { isVerified: true, prices: [{ amountAgorot: 2000 }], staleGroups: ['prices'] },
    });
  });

  it('decides verified on the links as they are under the space’s lock, with the facts it shows', async () => {
    const space = await createPublicSpace(areaId, 'Verified', { pricesUpdatedAt: daysAgo(31) });
    await addPrice(space.id, 'DAY', 2000);
    const owner = await signInOwnerOf(space.id);

    // The owner is unlinked while the page waits for the space's lock, as a link change holds it.
    const answer = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${space.id} FOR NO KEY UPDATE`,
      () => page('verified'),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId: space.id, userId: owner.id } },
          data: { deactivatedAt: NOW },
        }),
    );

    expect(answer.body).toMatchObject({ data: { isVerified: false, prices: null } });
  });

  it.each([
    ['an unknown slug', 'nowhere'],
    ['a hidden space', 'hidden'],
    ['a deleted space', 'deleted'],
    ['a space in a hidden area', 'in-a-hidden-area'],
    ['a space in a hidden governorate', 'in-a-hidden-governorate'],
  ])('answers not_found for %s', async (_case, slug) => {
    await createPublicSpace(areaId, 'Hidden', { isHidden: true });
    await createPublicSpace(areaId, 'Deleted', { deletedAt: NOW });
    const { id: hiddenArea } = await createArea({ areaActive: false });
    await createPublicSpace(hiddenArea, 'In a hidden area');
    const { id: hiddenGovernorate } = await createArea({ governorateActive: false });
    await createPublicSpace(hiddenGovernorate, 'In a hidden governorate');

    const response = await page(slug);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: { type: 'not_found' } });
  });
});
