import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { addPrice, createArea, createPublicSpace, seedSettings } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// `GET /price-ranges`: each period's lowest and highest general price over the publicly listed
// spaces whose prices are shown — the range's hints on the web (docs/api/api-contract.md).

const NOW = new Date('2026-11-08T10:00:00+02:00');
const app = createTestApp({ clock: () => NOW });
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

let areaId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: areaId } = await createArea());
});

describe('GET /price-ranges', () => {
  it('answers each period’s lowest and highest general price over the listed spaces whose prices are shown, null for none', async () => {
    const a = await createPublicSpace(areaId, 'Alpha', { pricesUpdatedAt: NOW });
    await addPrice(a.id, 'DAY', 1250);
    await addPrice(a.id, 'MONTH', 30000);
    const b = await createPublicSpace(areaId, 'Beta', { pricesUpdatedAt: NOW });
    await addPrice(b.id, 'DAY', 9950);
    await addPrice(b.id, 'HOUR', 500);
    // Left out: a student price, below every other.
    await addPrice(b.id, 'DAY', 100, 'STUDENT');
    // Left out: an unverified space's stale prices, a hidden, a deleted and an unlisted area's.
    const stale = await createPublicSpace(areaId, 'Stale', { pricesUpdatedAt: daysAgo(31) });
    await addPrice(stale.id, 'DAY', 50);
    const hidden = await createPublicSpace(areaId, 'Hidden', {
      pricesUpdatedAt: NOW,
      isHidden: true,
    });
    await addPrice(hidden.id, 'DAY', 60);
    const deleted = await createPublicSpace(areaId, 'Deleted', {
      pricesUpdatedAt: NOW,
      deletedAt: NOW,
    });
    await addPrice(deleted.id, 'WEEK', 70);
    const { id: closedArea } = await createArea({ areaActive: false });
    const unlisted = await createPublicSpace(closedArea, 'Unlisted', { pricesUpdatedAt: NOW });
    await addPrice(unlisted.id, 'DAY', 99_999);

    const response = await request(app).get('/api/v1/price-ranges');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        HOUR: { minAgorot: 500, maxAgorot: 500 },
        DAY: { minAgorot: 1250, maxAgorot: 9950 },
        WEEK: null,
        MONTH: { minAgorot: 30000, maxAgorot: 30000 },
      },
    });
  });

  it('is kept 30 seconds with a validator, an unchanged one answered 304', async () => {
    const first = await request(app).get('/api/v1/price-ranges');
    const again = await request(app)
      .get('/api/v1/price-ranges')
      .set('If-None-Match', String(first.headers.etag));

    expect(first.headers['cache-control']).toBe('public, max-age=30');
    expect(first.body).toEqual({
      success: true,
      data: { HOUR: null, DAY: null, WEEK: null, MONTH: null },
    });
    expect(again.status).toBe(304);
  });
});
