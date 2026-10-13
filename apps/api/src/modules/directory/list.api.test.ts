import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import {
  addPrice,
  createArea,
  createPublicSpace,
  moveRowToEnd,
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

function list(query = '') {
  return request(app).get(`/api/v1/spaces${query}`);
}

/** The listed spaces' English names, in order. */
async function namesListed(query = '') {
  const response = await list(query);
  expect(response.status).toBe(200);
  return (response.body as { data: { nameEn: string }[] }).data.map(({ nameEn }) => nameEn);
}

const SAT_TO_THU: ([number, number] | null)[] = [
  [480, 1320],
  [480, 1320],
  [480, 1320],
  [480, 1320],
  [480, 1320],
  null,
  [480, 1320],
];

describe('GET /spaces', () => {
  it('lists only the publicly listed spaces: not hidden, not deleted, in a listed area', async () => {
    await createPublicSpace(areaId, 'Listed');
    await createPublicSpace(areaId, 'Hidden', { isHidden: true });
    await createPublicSpace(areaId, 'Deleted', { deletedAt: NOW });
    const { id: hiddenArea } = await createArea({ areaActive: false });
    await createPublicSpace(hiddenArea, 'In a hidden area');
    const { id: inHiddenGovernorate } = await createArea({ governorateActive: false });
    await createPublicSpace(inHiddenGovernorate, 'In a hidden governorate');

    expect(await namesListed()).toEqual(['Listed']);
  });

  it('answers a card with no price, capacity or live status: its names, area, verified and week', async () => {
    const space = await createPublicSpace(areaId, 'Focus Hub', { nameAr: 'فوكس هب' });
    await setWeek(space.id, SAT_TO_THU);
    await addPrice(space.id, 'DAY', 2000);

    const response = await list();

    expect(response.body).toEqual({
      success: true,
      data: [
        {
          id: space.id,
          slug: 'focus-hub',
          nameEn: 'Focus Hub',
          nameAr: 'فوكس هب',
          area: { id: areaId, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
          isVerified: false,
          days: SAT_TO_THU.map((day) => day && { opensMinute: day[0], closesMinute: day[1] }),
        },
      ],
      meta: {
        currentPage: 1,
        limit: 20,
        totalPages: 1,
        totalRecords: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });

  it('gives a space whose hours were never saved no week', async () => {
    await createPublicSpace(areaId, 'No hours');

    const response = await list();

    expect(response.body).toMatchObject({ data: [{ days: null }] });
  });

  it('cuts the page after every filter, ties by id, so each page is full and the total right', async () => {
    const { id: otherArea } = await createArea();
    const earliest = await createPublicSpace(areaId, 'Space 1', { profileUpdatedAt: daysAgo(1) });
    for (let i = 2; i <= 23; i += 1) {
      await createPublicSpace(areaId, `Space ${String(i)}`, { profileUpdatedAt: daysAgo(1) });
    }
    await createPublicSpace(otherArea, 'Elsewhere', { profileUpdatedAt: NOW });
    // The first space now comes last in a scan: only the tie-break by id puts it first.
    await moveRowToEnd(earliest.id);

    const first = await list(`?area=${String(areaId)}`);
    const second = await list(`?area=${String(areaId)}&page=2`);

    const names = (response: request.Response) =>
      (response.body as { data: { nameEn: string }[] }).data.map(({ nameEn }) => nameEn);
    expect(names(first)).toEqual(Array.from({ length: 20 }, (_, i) => `Space ${String(i + 1)}`));
    expect(names(second)).toEqual(['Space 21', 'Space 22', 'Space 23']);
    expect(second.body).toMatchObject({
      meta: { currentPage: 2, totalPages: 2, totalRecords: 23, hasPreviousPage: true },
    });
  });

  it('orders by the latest update of any group, newest first, by default', async () => {
    await createPublicSpace(areaId, 'Old', { profileUpdatedAt: daysAgo(9) });
    await createPublicSpace(areaId, 'Prices today', {
      profileUpdatedAt: daysAgo(9),
      pricesUpdatedAt: NOW,
    });
    await createPublicSpace(areaId, 'Yesterday', { profileUpdatedAt: daysAgo(1) });

    expect(await namesListed()).toEqual(['Prices today', 'Yesterday', 'Old']);
  });

  it('orders by the name in the interface’s language: the Arabic one, else the English', async () => {
    await createPublicSpace(areaId, 'Alpha', { nameAr: 'يافا' });
    await createPublicSpace(areaId, 'Zulu', { nameAr: 'باب' });
    await createPublicSpace(areaId, 'Mike');

    expect(await namesListed('?sort=name')).toEqual(['Zulu', 'Alpha', 'Mike']);
    expect(await namesListed('?sort=name&lang=en')).toEqual(['Alpha', 'Mike', 'Zulu']);
  });

  describe('its filters', () => {
    it('keeps the spaces of the areas named, an area not listed narrowing to none', async () => {
      const { id: second } = await createArea();
      const { id: hidden } = await createArea({ areaActive: false });
      await createPublicSpace(areaId, 'Here');
      await createPublicSpace(second, 'There');
      await createPublicSpace(hidden, 'Hidden area');

      expect(await namesListed(`?area=${String(second)}`)).toEqual(['There']);
      expect(
        await namesListed(`?area=${String(areaId)},${String(second)}&sort=name&lang=en`),
      ).toEqual(['Here', 'There']);
      expect(await namesListed(`?area=${String(hidden)}`)).toEqual([]);
    });

    it('keeps the verified spaces', async () => {
      const verified = await createPublicSpace(areaId, 'Verified');
      await createPublicSpace(areaId, 'Unverified');
      await signInOwnerOf(verified.id);

      expect(await namesListed('?verified=true')).toEqual(['Verified']);
      const { data } = (await list('?sort=name&lang=en')).body as {
        data: { nameEn: string; isVerified: boolean }[];
      };
      expect(data.map(({ nameEn, isVerified }) => [nameEn, isVerified])).toEqual([
        ['Unverified', false],
        ['Verified', true],
      ]);
    });

    it('keeps the spaces open on Friday, leaving out a closed Friday and hours never saved', async () => {
      const open = await createPublicSpace(areaId, 'Open Friday');
      await setWeek(
        open.id,
        Array.from({ length: 7 }, () => [0, 1440] as [number, number]),
      );
      const closed = await createPublicSpace(areaId, 'Closed Friday');
      await setWeek(closed.id, SAT_TO_THU);
      await createPublicSpace(areaId, 'No hours');

      expect(await namesListed('?openFriday=true')).toEqual(['Open Friday']);
    });

    it('keeps a general price of the period within the bounds, inclusive', async () => {
      const inRange = await createPublicSpace(areaId, 'Day 20', { pricesUpdatedAt: NOW });
      await addPrice(inRange.id, 'DAY', 2000);
      const atBound = await createPublicSpace(areaId, 'Day 30', { pricesUpdatedAt: NOW });
      await addPrice(atBound.id, 'DAY', 3000);
      const tooDear = await createPublicSpace(areaId, 'Day 31', { pricesUpdatedAt: NOW });
      await addPrice(tooDear.id, 'DAY', 3100);
      const otherPeriod = await createPublicSpace(areaId, 'Month 20', { pricesUpdatedAt: NOW });
      await addPrice(otherPeriod.id, 'MONTH', 2000);
      const studentOnly = await createPublicSpace(areaId, 'Student day 20', {
        pricesUpdatedAt: NOW,
      });
      await addPrice(studentOnly.id, 'DAY', 2000, 'STUDENT');

      expect(
        await namesListed('?period=DAY&priceMin=2000&priceMax=3000&sort=name&lang=en'),
      ).toEqual(['Day 20', 'Day 30']);
      expect(await namesListed('?period=MONTH&sort=name&lang=en')).toEqual(['Month 20']);
    });

    it('leaves out an unverified space whose prices are stale, as its page hides them, but keeps a verified one', async () => {
      const staleUnverified = await createPublicSpace(areaId, 'Stale unverified', {
        pricesUpdatedAt: daysAgo(31),
      });
      await addPrice(staleUnverified.id, 'DAY', 2000);
      await addPrice(staleUnverified.id, 'DAY', 1500, 'STUDENT');
      const staleVerified = await createPublicSpace(areaId, 'Stale verified', {
        pricesUpdatedAt: daysAgo(31),
      });
      await addPrice(staleVerified.id, 'DAY', 2000);
      await addPrice(staleVerified.id, 'DAY', 1500, 'STUDENT');
      await signInOwnerOf(staleVerified.id);
      const fresh = await createPublicSpace(areaId, 'Fresh', { pricesUpdatedAt: daysAgo(30) });
      await addPrice(fresh.id, 'DAY', 2000);
      await addPrice(fresh.id, 'DAY', 1500, 'STUDENT');

      expect(await namesListed('?period=DAY&priceMax=5000&sort=name&lang=en')).toEqual([
        'Fresh',
        'Stale verified',
      ]);
      expect(await namesListed('?studentPrices=true&sort=name&lang=en')).toEqual([
        'Fresh',
        'Stale verified',
      ]);
    });

    it('keeps the spaces with a student price', async () => {
      const student = await createPublicSpace(areaId, 'Student', { pricesUpdatedAt: NOW });
      await addPrice(student.id, 'MONTH', 15000, 'STUDENT');
      const general = await createPublicSpace(areaId, 'General', { pricesUpdatedAt: NOW });
      await addPrice(general.id, 'MONTH', 20000);

      expect(await namesListed('?studentPrices=true')).toEqual(['Student']);
    });
  });

  describe('its search', () => {
    it.each([
      ['a typo in the English name', 'Fucus'],
      ['a typo in the Arabic name', 'مصاحة'],
      ['another hamza on the alef', 'الابداع'],
      ['ه for ة', 'مساحه'],
      ['tashkeel and tatweel', 'مَسـاحة'],
      ['ي for ى', 'مستشفي'],
      ['part of the name, in any case', 'focus'],
    ])('finds a space by %s', async (_case, q) => {
      await createPublicSpace(areaId, 'Focus Hub', { nameAr: 'مساحة الإبداع' });
      await createPublicSpace(areaId, 'Hospital Corner', { nameAr: 'ركن المستشفى' });
      await createPublicSpace(areaId, 'Other Place', { nameAr: 'مكان آخر' });

      const found = await namesListed(`?q=${encodeURIComponent(q)}`);

      expect(found[0]).toBe(q.includes('ستشف') ? 'Hospital Corner' : 'Focus Hub');
      expect(found).not.toContain('Other Place');
    });

    it('folds the hamzas before it compares, where similarity alone would miss the name', async () => {
      await createPublicSpace(areaId, 'Iqra Center', { nameAr: 'مركز إقرأ' });
      await createPublicSpace(areaId, 'Hope House', { nameAr: 'دار الأمل' });

      expect(await namesListed(`?q=${encodeURIComponent('اقرا')}`)).toEqual(['Iqra Center']);
      expect(await namesListed(`?q=${encodeURIComponent('امل')}`)).toEqual(['Hope House']);
    });

    it('finds the spaces of an area by its Arabic or English name', async () => {
      const { id: tal } = await createArea({ nameAr: 'تل الهوى', nameEn: 'Tal al-Hawa' });
      await createPublicSpace(tal, 'In Tal');
      await createPublicSpace(areaId, 'In Rimal');

      expect(await namesListed(`?q=${encodeURIComponent('تل الهوي')}`)).toEqual(['In Tal']);
      expect(await namesListed('?q=hawa')).toEqual(['In Tal']);
    });

    it('ranks a match above a typo, and leaves out what does not match', async () => {
      await createPublicSpace(areaId, 'Fucus Point');
      await createPublicSpace(areaId, 'Focus Hub');
      await createPublicSpace(areaId, 'Garden');

      expect(await namesListed('?q=Focus')).toEqual(['Focus Hub', 'Fucus Point']);
    });

    it('keeps its other filters and orders when another order is asked', async () => {
      await createPublicSpace(areaId, 'Focus B');
      await createPublicSpace(areaId, 'Focus A');

      expect(await namesListed('?q=focus&sort=name&lang=en')).toEqual(['Focus A', 'Focus B']);
    });
  });

  it('refuses a query it cannot read, by field', async () => {
    const response = await list('?sort=relevance&period=DAY&priceMin=0&area=x');

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      error: {
        type: 'validation',
        errors: { area: ['invalid_format'], priceMin: ['out_of_range'] },
      },
    });
  });

  it('lets a browser keep the answer briefly, and answers an unchanged one with 304', async () => {
    await createPublicSpace(areaId, 'Focus Hub');

    const first = await list();
    const again = await list().set('If-None-Match', String(first.headers.etag));

    expect(first.headers['cache-control']).toBe('public, max-age=30');
    expect(first.headers.etag).toBeDefined();
    expect(again.status).toBe(304);
  });
});
