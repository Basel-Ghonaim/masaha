import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import {
  createArea,
  addPhotos,
  createPublicSpace,
  photoUrl,
  seedSettings,
  setWeek,
  signInOwnerOf,
} from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const NOW = new Date('2026-10-13T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });

let areaId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: areaId } = await createArea());
});

function pins(query = '') {
  return request(app).get(`/api/v1/map/spaces${query}`);
}

/** The pins' English names, in order. */
async function pinned(query = '') {
  const response = await pins(query);
  expect(response.status).toBe(200);
  return (response.body as { data: { pins: { nameEn: string }[] } }).data.pins.map(
    ({ nameEn }) => nameEn,
  );
}

/** `count` listed spaces in the area, in one statement. */
async function manySpaces(count: number) {
  await prisma.space.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      slug: `space-${String(i)}`,
      nameEn: `Space ${String(i)}`,
      addressAr: 'شارع الشهداء',
      areaId,
      lat: 31.52,
      lng: 34.45,
    })),
  });
}

describe('GET /map/spaces', () => {
  it('answers every listed space that passes the filters, unpaged, as light pins', async () => {
    const verified = await createPublicSpace(areaId, 'Verified', {
      nameAr: 'موثقة',
      lat: 31.501,
      lng: 34.461,
    });
    await signInOwnerOf(verified.id);
    await setWeek(
      verified.id,
      Array.from({ length: 7 }, () => [480, 1080] as [number, number]),
    );
    await addPhotos(verified.id, ['cover', 'other']);
    await createPublicSpace(areaId, 'Unverified');
    await createPublicSpace(areaId, 'Hidden', { isHidden: true });

    const response = await pins('?verified=true');

    expect(response.body).toEqual({
      success: true,
      data: {
        pins: [
          {
            id: verified.id,
            slug: 'verified',
            nameEn: 'Verified',
            nameAr: 'موثقة',
            areaId,
            location: { lat: 31.501, lng: 34.461 },
            isVerified: true,
            days: Array.from({ length: 7 }, () => ({ opensMinute: 480, closesMinute: 1080 })),
            cover: photoUrl('cover', 'card'),
          },
        ],
        truncated: false,
      },
    });
    expect(response.headers['cache-control']).toBe('public, max-age=30');
  });

  it('answers more spaces than a page holds, whole', async () => {
    await manySpaces(25);

    expect(await pinned()).toHaveLength(25);
  });

  it('keeps only the spaces inside the map’s viewport when its bounds are given', async () => {
    await createPublicSpace(areaId, 'Inside', { lat: 31.5, lng: 34.45 });
    await createPublicSpace(areaId, 'North of it', { lat: 31.6, lng: 34.45 });
    await createPublicSpace(areaId, 'West of it', { lat: 31.5, lng: 34.3 });

    expect(await pinned('?bounds=31.45,34.4,31.55,34.5')).toEqual(['Inside']);
  });

  it('applies the search as the list does', async () => {
    await createPublicSpace(areaId, 'Focus Hub');
    await createPublicSpace(areaId, 'Garden');

    expect(await pinned('?q=fucus')).toEqual(['Focus Hub']);
  });

  it('answers at most 1,000 pins, the first by id, and says when more passed', async () => {
    await manySpaces(1001);

    const response = await pins();

    const { data } = response.body as { data: { pins: { slug: string }[]; truncated: boolean } };
    expect(data.pins).toHaveLength(1000);
    expect(data.pins.at(-1)?.slug).toBe('space-999');
    expect(data.truncated).toBe(true);
  });

  it('is not truncated at exactly 1,000', async () => {
    await manySpaces(1000);

    const response = await pins();

    expect(response.body).toMatchObject({ data: { truncated: false } });
    expect((response.body as { data: { pins: unknown[] } }).data.pins).toHaveLength(1000);
  });

  it('refuses bounds it cannot read', async () => {
    const response = await pins('?bounds=31.6,34.4,31.5,34.5');

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: { errors: { bounds: ['invalid_format'] } } });
  });
});
