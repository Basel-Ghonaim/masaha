import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, createAccount, signAccess } from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import {
  addPrice,
  createArea,
  createPublicSpace,
  moveRowToEnd,
  seedSettings,
  signInOwnerOf,
} from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// The directory's price by subscription on the real database: the period alone, its bounds, the
// card's price and the price orders, and the hidden-price rule through each (docs/features/directory.md).

const NOW = new Date('2026-11-08T10:00:00+02:00');
const app = createTestApp({ clock: () => NOW });
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY_MS);

let areaId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: areaId } = await createArea());
});

/** A listed space, its prices dated now unless told, unverified unless told. */
async function space(
  nameEn: string,
  { pricesUpdatedAt = NOW, verified = false }: { pricesUpdatedAt?: Date; verified?: boolean } = {},
) {
  const created = await createPublicSpace(areaId, nameEn, { pricesUpdatedAt });
  if (verified) await signInOwnerOf(created.id);
  return created;
}

interface Card {
  id: number;
  nameEn: string;
  priceAgorot?: number;
}

async function listed(query: string) {
  const response = await request(app).get(`/api/v1/spaces${query}`);
  expect(response.status, JSON.stringify(response.body)).toBe(200);
  return response.body as { data: Card[]; meta: { totalRecords: number; totalPages: number } };
}

/** The listed spaces' English names, by name. */
async function names(query = '') {
  const { data } = await listed(`?limit=50&sort=name&lang=en${query}`);
  return data.map(({ nameEn }) => nameEn);
}

/** Each listed card's price, by its English name; a card without one reads `undefined`. */
async function pricesOf(query: string) {
  const { data } = await listed(`?limit=50${query}`);
  return Object.fromEntries(data.map(({ nameEn, priceAgorot }) => [nameEn, priceAgorot]));
}

describe('the period alone', () => {
  it('keeps exactly the spaces with a general price of it, whose prices are shown', async () => {
    const day = await space('Day Price');
    await addPrice(day.id, 'DAY', 2000);
    const studentOnly = await space('Student Day Only');
    await addPrice(studentOnly.id, 'DAY', 1500, 'STUDENT');
    const month = await space('Month Only');
    await addPrice(month.id, 'MONTH', 30000);
    await space('No Prices');
    const stale = await space('Stale Unverified', { pricesUpdatedAt: daysAgo(31) });
    await addPrice(stale.id, 'DAY', 2000);
    const staleVerified = await space('Stale Verified', {
      pricesUpdatedAt: daysAgo(31),
      verified: true,
    });
    await addPrice(staleVerified.id, 'DAY', 2500);
    const thirtyDays = await space('Thirty Days', { pricesUpdatedAt: daysAgo(30) });
    await addPrice(thirtyDays.id, 'DAY', 1800);

    expect(await names('&period=DAY')).toEqual(['Day Price', 'Stale Verified', 'Thirty Days']);
    expect(await names('&period=MONTH')).toEqual(['Month Only']);
    expect(await names('&period=HOUR')).toEqual([]);
    expect(await names()).toHaveLength(7);
  });
});

describe('the bounds', () => {
  beforeEach(async () => {
    const at = await space('At 2000');
    await addPrice(at.id, 'DAY', 2000);
  });

  it.each([
    ['priceMin=2000', ['At 2000']],
    ['priceMin=2001', []],
    ['priceMax=2000', ['At 2000']],
    ['priceMax=1999', []],
    ['priceMin=2000&priceMax=2000', ['At 2000']],
    ['priceMin=1999&priceMax=2001', ['At 2000']],
  ])('are inclusive: %s', async (bounds, expected) => {
    expect(await names(`&period=DAY&${bounds}`)).toEqual(expected);
  });

  it.each([
    ['?period=DAY&priceMin=2001&priceMax=2000', { priceMax: ['out_of_range'] }],
    ['?priceMin=1000', { period: ['required'] }],
    ['?period=DAY&priceMin=0', { priceMin: ['out_of_range'] }],
    ['?period=DAY&priceMax=-1', { priceMax: ['out_of_range'] }],
    ['?period=DAY&priceMin=12.5', { priceMin: ['invalid_format'] }],
  ])('refuses %s by field', async (query, errors) => {
    const response = await request(app).get(`/api/v1/spaces${query}`);

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: { type: 'validation', errors } });
  });
});

describe('the card’s price', () => {
  it('is the lowest general price of the period within the bounds, any of several passing; without bounds the lowest of all', async () => {
    const several = await space('Several');
    const { id: shiftId } = await prisma.spaceShift.create({
      data: { spaceId: several.id, nameAr: 'مسائية', startsMinute: 960, endsMinute: 1320 },
    });
    await addPrice(several.id, 'DAY', 3000);
    await prisma.spacePrice.create({
      data: { spaceId: several.id, period: 'DAY', amountAgorot: 1000, shiftId },
    });
    await prisma.spacePrice.create({
      data: { spaceId: several.id, period: 'DAY', amountAgorot: 2500, labelAr: 'قاعة هادئة' },
    });
    // A student price lower than all: never the card's.
    await addPrice(several.id, 'DAY', 500, 'STUDENT');

    expect(await pricesOf('&period=DAY')).toEqual({ Several: 1000 });
    expect(await pricesOf('&period=DAY&priceMin=2000')).toEqual({ Several: 2500 });
    expect(await pricesOf('&period=DAY&priceMin=2600&priceMax=4000')).toEqual({ Several: 3000 });
    expect(await pricesOf('&period=DAY&priceMin=3001')).toEqual({});
  });

  it('is on every card exactly when the period is asked; never on a pin, a favourite or the page', async () => {
    const a = await space('Alpha');
    await addPrice(a.id, 'MONTH', 20000);
    const b = await space('Beta');
    await addPrice(b.id, 'MONTH', 15000);
    await addPrice(b.id, 'DAY', 2000);

    expect(await pricesOf('&period=MONTH')).toEqual({ Alpha: 20000, Beta: 15000 });
    const unfiltered = await listed('?limit=50');
    expect(unfiltered.data.every((card) => !('priceAgorot' in card))).toBe(true);

    const map = await request(app).get('/api/v1/map/spaces?period=MONTH');
    const { pins } = (map.body as { data: { pins: object[] } }).data;
    expect(pins).toHaveLength(2);
    expect(pins.every((pin) => !('priceAgorot' in pin))).toBe(true);

    const page = await request(app).get('/api/v1/spaces/alpha');
    expect('priceAgorot' in (page.body as { data: object }).data).toBe(false);

    const user = await createAccount({ email: 'reader@example.com' });
    await prisma.favorite.create({ data: { userId: user.id, spaceId: a.id } });
    const token = await signAccess(user.id, { sessionVersion: user.sessionVersion });
    const favorites = await request(app)
      .get('/api/v1/me/favorites')
      .set('Authorization', `Bearer ${token}`);
    expect(favorites.status).toBe(200);
    const [favorite] = (favorites.body as { data: { space: object }[] }).data;
    expect(favorite?.space).toBeDefined();
    expect('priceAgorot' in (favorite?.space ?? {})).toBe(false);
  });
});

describe('the hidden prices', () => {
  it('are never filtered, priced or ordered: a stale unverified space under any price filter or order', async () => {
    const stale = await space('Stale Unverified', { pricesUpdatedAt: daysAgo(31) });
    await addPrice(stale.id, 'DAY', 1000);
    await addPrice(stale.id, 'DAY', 800, 'STUDENT');
    const staleVerified = await space('Stale Verified', {
      pricesUpdatedAt: daysAgo(31),
      verified: true,
    });
    await addPrice(staleVerified.id, 'DAY', 2000);
    await addPrice(staleVerified.id, 'DAY', 1600, 'STUDENT');
    const fresh = await space('Fresh', { pricesUpdatedAt: daysAgo(30) });
    await addPrice(fresh.id, 'DAY', 3000);
    await addPrice(fresh.id, 'DAY', 2400, 'STUDENT');

    for (const query of [
      '&period=DAY',
      '&period=DAY&priceMax=5000',
      '&studentPrices=true',
      '&period=DAY&sort=priceAsc',
      '&period=DAY&sort=priceDesc',
    ]) {
      const { data } = await listed(`?limit=50${query}`);
      expect(
        data.map(({ nameEn }) => nameEn),
        query,
      ).not.toContain('Stale Unverified');
    }
    // Student prices keep a verified space's stale ones, and fresh ones at 30 days.
    expect(await names('&studentPrices=true')).toEqual(['Fresh', 'Stale Verified']);
    // The verified stale space keeps its price.
    expect(await pricesOf('&period=DAY&sort=priceAsc')).toEqual({
      'Stale Verified': 2000,
      Fresh: 3000,
    });
    // Unfiltered, it is listed, with no price on its card.
    const all = await pricesOf('');
    expect(Object.keys(all).sort()).toEqual(['Fresh', 'Stale Unverified', 'Stale Verified']);
    expect(all['Stale Unverified']).toBeUndefined();
  });
});

describe('the price orders', () => {
  /** Five spaces whose day prices tie in pairs, the earliest made last in a scan. */
  async function priced() {
    const made = [];
    for (const [name, amount] of [
      ['P1', 3000],
      ['P2', 1000],
      ['P3', 2000],
      ['P4', 1000],
      ['P5', 3000],
    ] as const) {
      const created = await space(name);
      await addPrice(created.id, 'DAY', amount);
      made.push(created);
    }
    // Only the tie-break by id keeps P2 before P4 and P1 before P5 once P2 and P1 scan last.
    await moveRowToEnd(made[1]?.id ?? 0);
    await moveRowToEnd(made[0]?.id ?? 0);
  }

  it.each([
    ['priceAsc', ['P2', 'P4', 'P3', 'P1', 'P5']],
    ['priceDesc', ['P1', 'P5', 'P3', 'P2', 'P4']],
  ])(
    '%s orders by the card’s price, ties by id ascending, whole across pages',
    async (sort, expected) => {
      await priced();

      const seen: string[] = [];
      for (const page of [1, 2, 3]) {
        const body = await listed(`?period=DAY&sort=${sort}&limit=2&page=${String(page)}`);
        expect(body.meta).toMatchObject({ totalRecords: 5, totalPages: 3 });
        seen.push(...body.data.map(({ nameEn }) => nameEn));
      }
      expect(seen).toEqual(expected);
    },
  );

  it('needs a period, and with one orders by price even while searching', async () => {
    await priced();
    const refused = await request(app).get('/api/v1/spaces?sort=priceAsc');
    expect(refused.status).toBe(422);
    expect(refused.body).toMatchObject({ error: { errors: { sort: ['invalid_choice'] } } });

    // «P» matches every name alike: the order is the price's, not the score's.
    const { data } = await listed('?period=DAY&q=P&sort=priceDesc&limit=50');
    expect(data.map(({ nameEn }) => nameEn)).toEqual(['P1', 'P5', 'P3', 'P2', 'P4']);
  });

  it('with bounds, orders by the price within them', async () => {
    const wide = await space('Wide');
    await addPrice(wide.id, 'DAY', 500);
    await prisma.spacePrice.create({
      data: { spaceId: wide.id, period: 'DAY', amountAgorot: 2500, labelAr: 'قاعة هادئة' },
    });
    const narrow = await space('Narrow');
    await addPrice(narrow.id, 'DAY', 2000);

    // Wide's cheapest, 500, is out of the bounds: it sorts by 2500, after Narrow.
    const { data } = await listed('?period=DAY&priceMin=1000&sort=priceAsc');
    expect(data.map(({ nameEn, priceAgorot }) => [nameEn, priceAgorot])).toEqual([
      ['Narrow', 2000],
      ['Wide', 2500],
    ]);
  });
});
