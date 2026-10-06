import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { signIn } from '../../../../test/admin.ts';
import { createTestApp } from '../../../../test/app.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { prisma } from '../../../db/index.ts';

const app = createTestApp();

beforeEach(async () => {
  await resetDatabase(prisma);
});

function governorate(nameEn: string, sortOrder: number, isActive = true) {
  return prisma.governorate.create({ data: { nameAr: nameEn, nameEn, sortOrder, isActive } });
}

function area(governorateId: number, nameEn: string, sortOrder: number, isActive = true) {
  return prisma.area.create({
    data: { governorateId, nameAr: nameEn, nameEn, sortOrder, isActive },
  });
}

function amenity(key: string, sortOrder: number, isActive = true) {
  return prisma.amenity.create({
    data: { key, nameAr: key, nameEn: key, icon: 'wifi', sortOrder, isActive },
  });
}

describe('GET /lookups', () => {
  it('answers a guest with the active governorates, their active areas and the active amenities, in order', async () => {
    const north = await governorate('North', 2);
    const gaza = await governorate('Gaza', 1);
    await area(gaza.id, 'Al-Rimal', 2);
    await area(gaza.id, 'An-Nasr', 1);
    await area(gaza.id, 'Closed area', 0, false);
    await area(north.id, 'Jabalia', 1);
    await amenity('printer', 2);
    await amenity('wifi', 1);
    await amenity('retired', 0, false);

    const response = await request(app).get('/api/v1/lookups');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        governorates: [
          {
            id: gaza.id,
            nameAr: 'Gaza',
            nameEn: 'Gaza',
            areas: [
              { id: expect.any(Number) as number, nameAr: 'An-Nasr', nameEn: 'An-Nasr' },
              { id: expect.any(Number) as number, nameAr: 'Al-Rimal', nameEn: 'Al-Rimal' },
            ],
          },
          {
            id: north.id,
            nameAr: 'North',
            nameEn: 'North',
            areas: [{ id: expect.any(Number) as number, nameAr: 'Jabalia', nameEn: 'Jabalia' }],
          },
        ],
        amenities: [
          {
            id: expect.any(Number) as number,
            key: 'wifi',
            nameAr: 'wifi',
            nameEn: 'wifi',
            icon: 'wifi',
            isFilterable: true,
          },
          {
            id: expect.any(Number) as number,
            key: 'printer',
            nameAr: 'printer',
            nameEn: 'printer',
            icon: 'wifi',
            isFilterable: true,
          },
        ],
      },
    });
  });

  it('leaves out a hidden governorate with all its areas, active or not', async () => {
    const hidden = await governorate('Hidden', 1, false);
    await area(hidden.id, 'Still active', 1);
    await governorate('Shown', 2);

    const response = await request(app).get('/api/v1/lookups');

    const { governorates } = (response.body as { data: { governorates: { nameEn: string }[] } })
      .data;
    expect(governorates.map(({ nameEn }) => nameEn)).toEqual(['Shown']);
  });

  it('answers a signed-in user the same catalogue', async () => {
    await governorate('Gaza', 1);
    const { authorization } = await signIn('USER');

    const response = await request(app).get('/api/v1/lookups').set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect((response.body as { data: { governorates: unknown[] } }).data.governorates).toHaveLength(
      1,
    );
  });
});
