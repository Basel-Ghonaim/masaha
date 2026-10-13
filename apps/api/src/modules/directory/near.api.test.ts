import { Writable } from 'node:stream';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { createArea, createPublicSpace, seedSettings } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';
import { createLogger } from '../../shared/http/index.ts';

const NOW = new Date('2026-10-13T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });

let areaId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: areaId } = await createArea());
});

/** The list ordered from the point, sent as the device sends it: in the Masaha-Near header. */
function nearest(point: string, query = '', target = app) {
  return request(target).get(`/api/v1/spaces?sort=distance${query}`).set('Masaha-Near', point);
}

describe('GET /spaces?sort=distance, from the Masaha-Near header', () => {
  it('orders the spaces nearest first, with each distance straight-line to the nearest 100 m', async () => {
    // From 31.500,34.450: 0.01° of latitude is about 1,112 m.
    await createPublicSpace(areaId, 'Far', { lat: 31.53, lng: 34.45 });
    await createPublicSpace(areaId, 'Near', { lat: 31.51, lng: 34.45 });
    await createPublicSpace(areaId, 'Here', { lat: 31.5, lng: 34.45 });

    const response = await nearest('31.500,34.450');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: [
        { nameEn: 'Here', distanceMeters: 0 },
        { nameEn: 'Near', distanceMeters: 1100 },
        { nameEn: 'Far', distanceMeters: 3300 },
      ],
      meta: { totalRecords: 3 },
    });
  });

  it('orders spaces at one distance by id, so a page never repeats or skips one', async () => {
    const first = await createPublicSpace(areaId, 'First', { lat: 31.51, lng: 34.45 });
    const second = await createPublicSpace(areaId, 'Second', { lat: 31.51, lng: 34.45 });

    const response = await nearest('31.500,34.450', '&limit=1&page=2');

    expect(response.body).toMatchObject({ data: [{ id: second.id }] });
    expect(first.id).toBeLessThan(second.id);
  });

  it('carries no distance when the list is ordered otherwise', async () => {
    await createPublicSpace(areaId, 'Here');

    const response = await request(app).get('/api/v1/spaces');

    const [space] = (response.body as { data: object[] }).data;
    expect(space).toBeDefined();
    expect(space).not.toHaveProperty('distanceMeters');
  });

  it('lets no cache keep an answer ordered from where someone is', async () => {
    await createPublicSpace(areaId, 'Here');

    const response = await nearest('31.500,34.450');

    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('refuses a point finer than three decimals, and a point without the order it serves', async () => {
    const fine = await nearest('31.5001,34.450');
    const unordered = await request(app).get('/api/v1/spaces').set('Masaha-Near', '31.500,34.450');
    const missing = await request(app).get('/api/v1/spaces?sort=distance');

    expect(fine.status).toBe(422);
    expect(fine.body).toMatchObject({ error: { errors: { near: ['invalid_format'] } } });
    expect(unordered.body).toMatchObject({ error: { errors: { near: ['invalid_choice'] } } });
    expect(missing.body).toMatchObject({ error: { errors: { near: ['required'] } } });
  });

  it('never reads a point from the query: the location travels only in the header', async () => {
    await createPublicSpace(areaId, 'Here');

    const response = await request(app).get('/api/v1/spaces?sort=distance&near=31.500,34.450');

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: { errors: { near: ['required'] } } });
  });

  it('writes neither coordinate in the request’s log line (security.md › Location)', async () => {
    const lines: string[] = [];
    const logged = createTestApp({
      clock: () => NOW,
      logger: createLogger(
        'info',
        new Writable({
          write(chunk: Buffer, _encoding, done) {
            lines.push(chunk.toString());
            done();
          },
        }),
      ),
    });
    await createPublicSpace(areaId, 'Here');

    const answered = await nearest('31.517,34.468', '', logged);
    const refused = await nearest('31.5179,34.4689', '', logged);

    for (const response of [answered, refused]) {
      const id = String(response.headers['x-request-id']);
      const line = lines.find((text) => text.includes(id));
      expect(line).toBeDefined();
      expect(line).not.toMatch(/31\.517|34\.468/);
    }
  });
});
