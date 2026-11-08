import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { createCheckIn, createCustomer, createSubscription } from '../../../test/factories.ts';
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

// The directory's hours filters, «مفتوحة الآن» and «مفتوحة مساءً», on the real database at a fixed
// clock each test sets (Gaza's clock: UTC+2 in winter, UTC+3 in summer until 2026-10-24), and every
// filter together (docs/features/directory.md).

let now = new Date('2026-11-08T10:00:00+02:00');
const app = createTestApp({ clock: () => now });

/** An instant on Gaza's winter clock, UTC+2 (from 2026-10-24). */
const gaza = (date: string, time: string) => new Date(`${date}T${time}:00+02:00`);
/** Sunday 2026-11-08 in Gaza, at `time`. */
const sunday = (time: string) => gaza('2026-11-08', time);

type Day = [number, number] | null;

/** The same range on all seven days. */
const everyDay = (opens: number, closes: number): Day[] =>
  Array.from({ length: 7 }, () => [opens, closes]);
/** Open 08:00–18:00 every day. */
const DAY_HOURS = everyDay(8 * 60, 18 * 60);

let areaId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: areaId } = await createArea());
  now = sunday('10:00');
});

/** A listed space, unverified unless told, with the week given (none: hours never saved). */
async function space(
  nameEn: string,
  { week, verified = false }: { week?: Day[]; verified?: boolean } = {},
) {
  const created = await createPublicSpace(areaId, nameEn);
  if (verified) await signInOwnerOf(created.id);
  if (week) await setWeek(created.id, week);
  return created;
}

/** A closure of the space, its window and state as given. */
async function closure(
  spaceId: number,
  {
    startsAt,
    endsAt = null,
    deletedAt = null,
    type = 'CLOSURE',
  }: {
    startsAt: Date;
    endsAt?: Date | null;
    deletedAt?: Date | null;
    type?: 'CLOSURE' | 'OUTAGE';
  },
) {
  await prisma.announcement.create({
    data: {
      spaceId,
      type,
      textAr: 'مغلق',
      startsAt,
      endsAt,
      deletedAt,
      idempotencyKey: randomUUID(),
    },
  });
}

/** An override of the verified space's live status, by its owner, until `until`. */
async function override(spaceId: number, state: 'CLOSED' | 'FULL', until: Date) {
  const { userId } = await prisma.spaceManager.findFirstOrThrow({ where: { spaceId } });
  await prisma.spaceOccupancy.upsert({
    where: { spaceId },
    create: { spaceId, stateOverride: state, stateOverrideUntil: until, stateOverrideById: userId },
    update: { stateOverride: state, stateOverrideUntil: until, stateOverrideById: userId },
  });
}

interface Card {
  nameEn: string;
  liveStatus: string | null;
  hoursStatus: string | null;
}

/** The list's answer at the query, its cards and its meta. */
async function listed(query: string) {
  const response = await request(app).get(`/api/v1/spaces${query}`);
  expect(response.status).toBe(200);
  return response.body as { data: Card[]; meta: { totalRecords: number; totalPages: number } };
}

/** The listed spaces' English names, by name, at most 50. */
async function names(query = '') {
  const { data } = await listed(`?limit=50&sort=name&lang=en${query}`);
  return data.map(({ nameEn }) => nameEn);
}

/** The map's pins' English names, sorted. */
async function pinNames(query = '') {
  const response = await request(app).get(`/api/v1/map/spaces${query}`);
  expect(response.status).toBe(200);
  const { pins } = (response.body as { data: { pins: { nameEn: string }[] } }).data;
  return pins.map(({ nameEn }) => nameEn).sort();
}

describe('openNow: open now by the hours, on Gaza’s clock', () => {
  it('passes from the opening minute and fails from the closing minute', async () => {
    await space('Day Hours', { week: DAY_HOURS });

    for (const [time, expected] of [
      ['07:59', []],
      ['08:00', ['Day Hours']],
      ['17:59', ['Day Hours']],
      ['18:00', []],
    ] as const) {
      now = sunday(time);
      expect(await names('&openNow=true'), time).toEqual(expected);
    }
  });

  it('fails on a closed day and passes on an open one', async () => {
    // Closed on Friday (5).
    await space('Not Friday', { week: DAY_HOURS.map((day, i) => (i === 5 ? null : day)) });

    now = gaza('2026-11-06', '10:00');
    expect(await names('&openNow=true')).toEqual([]);
    now = gaza('2026-11-05', '10:00');
    expect(await names('&openNow=true')).toEqual(['Not Friday']);
  });

  it('never passes a space whose hours were never saved, at any clock', async () => {
    await space('No Hours');
    await space('Around The Clock', { week: everyDay(0, 1440) });

    for (const time of ['00:00', '10:00', '23:59']) {
      now = sunday(time);
      expect(await names('&openNow=true'), time).toEqual(['Around The Clock']);
    }
  });

  it('leaves out a space under a closure in force, but not one ended, not begun, deleted, or an outage', async () => {
    const inForce = await space('Closure In Force', { week: DAY_HOURS });
    await closure(inForce.id, { startsAt: sunday('09:00') });
    const endsNow = await space('Ended Now', { week: DAY_HOURS });
    await closure(endsNow.id, { startsAt: sunday('08:00'), endsAt: sunday('10:00') });
    const ended = await space('Ended Before', { week: DAY_HOURS });
    await closure(ended.id, { startsAt: sunday('08:00'), endsAt: sunday('09:00') });
    const later = await space('Not Begun', { week: DAY_HOURS });
    await closure(later.id, { startsAt: sunday('10:01') });
    const deleted = await space('Deleted Closure', { week: DAY_HOURS });
    await closure(deleted.id, { startsAt: sunday('09:00'), deletedAt: sunday('09:30') });
    const outage = await space('Outage', { week: DAY_HOURS });
    await closure(outage.id, { startsAt: sunday('09:00'), type: 'OUTAGE' });
    // Begins exactly now: in force.
    const beginsNow = await space('Begins Now', { week: DAY_HOURS });
    await closure(beginsNow.id, { startsAt: sunday('10:00') });

    expect(await names('&openNow=true')).toEqual([
      'Deleted Closure',
      'Ended Before',
      'Ended Now',
      'Not Begun',
      'Outage',
    ]);
  });

  it('keeps a FULL verified space with its badge, and leaves out one closed by hand while that override is in force', async () => {
    const full = await space('Full', { week: DAY_HOURS, verified: true });
    await prisma.spaceOccupancy.create({ data: { spaceId: full.id, capacity: 1 } });
    await createCheckIn(await createSubscription(await createCustomer(full.id)), {
      checkedInAt: sunday('09:00'),
    });
    const available = await space('Available', { week: DAY_HOURS, verified: true });
    await prisma.spaceOccupancy.create({ data: { spaceId: available.id, capacity: 5 } });
    await space('Unverified Open', { week: DAY_HOURS });
    const closedByHand = await space('Closed By Hand', { week: DAY_HOURS, verified: true });
    await override(closedByHand.id, 'CLOSED', sunday('11:00'));
    const expired = await space('Override Expired', { week: DAY_HOURS, verified: true });
    await override(expired.id, 'CLOSED', sunday('10:00'));
    const fullByHand = await space('Full By Hand', { week: DAY_HOURS, verified: true });
    await override(fullByHand.id, 'FULL', sunday('11:00'));

    const { data } = await listed('?openNow=true&limit=50&sort=name&lang=en');

    expect(data.map(({ nameEn, liveStatus }) => [nameEn, liveStatus])).toEqual([
      ['Available', 'AVAILABLE'],
      ['Full', 'FULL'],
      ['Full By Hand', 'FULL'],
      ['Override Expired', null],
      ['Unverified Open', null],
    ]);
  });

  it('reads Gaza’s day across midnight, not UTC’s', async () => {
    await space('Friday Only', { week: [null, null, null, null, null, [0, 1440], null] });
    await space('Thursday Only', { week: [null, null, null, null, [480, 1440], null, null] });

    // Thursday 23:30 UTC is Friday 01:30 in Gaza.
    now = new Date('2026-11-05T23:30:00Z');
    expect(await names('&openNow=true')).toEqual(['Friday Only']);
    // Thursday 21:30 UTC is Thursday 23:30 in Gaza.
    now = new Date('2026-11-05T21:30:00Z');
    expect(await names('&openNow=true')).toEqual(['Thursday Only']);
  });

  it('follows Gaza’s offset across the change of time, not a fixed one', async () => {
    await space('Opens At Eight', { week: everyDay(8 * 60, 18 * 60) });

    // After 2026-10-24's change to UTC+2: 05:30Z is 07:30, 06:00Z is 08:00.
    now = new Date('2026-10-24T05:30:00Z');
    expect(await names('&openNow=true')).toEqual([]);
    now = new Date('2026-10-24T06:00:00Z');
    expect(await names('&openNow=true')).toEqual(['Opens At Eight']);
    // In summer, UTC+3: 05:30Z is 08:30.
    now = new Date('2026-03-28T05:30:00Z');
    expect(await names('&openNow=true')).toEqual(['Opens At Eight']);
  });

  it('a day that closes at midnight is open at 23:59 and not at the next day’s 00:00', async () => {
    // Open until 24:00 on Sunday; Monday closed.
    await space('Until Midnight', { week: [[480, 1440], null, null, null, null, null, null] });

    now = sunday('23:59');
    expect(await names('&openNow=true')).toEqual(['Until Midnight']);
    now = gaza('2026-11-09', '00:00');
    expect(await names('&openNow=true')).toEqual([]);
  });

  it('applies before the page is cut: every page full, the total right, every card open', async () => {
    for (let i = 1; i <= 9; i += 1) {
      await space(`Space ${String(i)}`, { week: i <= 5 ? DAY_HOURS : everyDay(12 * 60, 18 * 60) });
    }

    const seen: string[] = [];
    for (const [page, size] of [
      [1, 2],
      [2, 2],
      [3, 1],
    ] as const) {
      const body = await listed(`?openNow=true&limit=2&page=${String(page)}&sort=name&lang=en`);
      expect(body.data).toHaveLength(size);
      expect(body.meta).toMatchObject({ totalRecords: 5, totalPages: 3 });
      expect(body.data.every(({ hoursStatus }) => hoursStatus === 'OPEN')).toBe(true);
      seen.push(...body.data.map(({ nameEn }) => nameEn));
    }
    expect(seen).toEqual(['Space 1', 'Space 2', 'Space 3', 'Space 4', 'Space 5']);
  });

  it('openNow=false filters nothing', async () => {
    await space('Open', { week: DAY_HOURS });
    await space('No Hours');

    expect(await names('&openNow=false')).toEqual(['No Hours', 'Open']);
  });
});

describe('evening: closes at 20:00 or later on one of its open days', () => {
  it('reads the week, never the clock', async () => {
    await space('Closes At Twenty', { week: everyDay(480, 1200) });
    await space('Closes At 19:59', { week: everyDay(480, 1199) });
    await space('One Late Day', {
      week: [[480, 900], [480, 900], [480, 1260], null, [480, 900], null, [480, 900]],
    });
    await space('Around The Clock', { week: everyDay(0, 1440) });
    await space('Every Day Closed', { week: Array.from({ length: 7 }, () => null) });
    await space('No Hours');

    const expected = ['Around The Clock', 'Closes At Twenty', 'One Late Day'];
    // A morning on a day the late space is closed (Wednesday, 3), and Tuesday evening.
    for (const at of [gaza('2026-11-11', '07:00'), gaza('2026-11-10', '21:00')]) {
      now = at;
      expect(await names('&evening=true')).toEqual(expected);
    }
    expect(await names('&evening=false')).toHaveLength(6);
  });
});

describe('the retired availableNow', () => {
  it('is dropped as any unknown key: an old client gets the whole list, not a refusal', async () => {
    await space('Open', { week: DAY_HOURS });
    await space('Closed Now', { week: everyDay(12 * 60, 18 * 60) });
    await space('No Hours');

    const response = await request(app).get('/api/v1/spaces?availableNow=true');

    expect(response.status).toBe(200);
    expect((response.body as { meta: { totalRecords: number } }).meta.totalRecords).toBe(3);
  });
});

describe('every filter together', () => {
  /** A space that passes every filter of `ALL`, the field given changed. */
  async function candidate(
    nameEn: string,
    {
      area = areaId,
      week = everyDay(480, 1260),
      price = 2000,
      studentPrice = true,
      verified = true,
    }: { area?: number; week?: Day[]; price?: number; studentPrice?: boolean; verified?: boolean },
  ) {
    // Its prices dated now, so an unverified one's are shown.
    const created = await createPublicSpace(area, nameEn, {
      nameAr: `مساحة ${nameEn}`,
      pricesUpdatedAt: now,
    });
    if (verified) await signInOwnerOf(created.id);
    await setWeek(created.id, week);
    await addPrice(created.id, 'DAY', price);
    if (studentPrice) await addPrice(created.id, 'DAY', price - 500, 'STUDENT');
    return created;
  }

  /** Each filter, and the one space failing it alone. */
  const FILTERS = {
    area: 'Focus Other Area',
    price: 'Focus Too Dear',
    openNow: 'Focus Opens At Noon',
    evening: 'Focus Closes Early',
    openFriday: 'Focus Friday Closed',
    verified: 'Focus Unverified',
    studentPrices: 'Focus No Student Price',
    q: 'Unmatched',
  } as const;
  type Filter = keyof typeof FILTERS;

  function queryOf(filters: readonly Filter[]) {
    const parts: Record<Filter, string> = {
      area: `area=${String(areaId)}`,
      price: 'period=DAY&priceMin=1000&priceMax=3000',
      openNow: 'openNow=true',
      evening: 'evening=true',
      openFriday: 'openFriday=true',
      verified: 'verified=true',
      studentPrices: 'studentPrices=true',
      q: 'q=Focus',
    };
    return filters.map((filter) => `&${parts[filter]}`).join('');
  }

  beforeEach(async () => {
    // Thursday 10:00 in Gaza: every candidate with hours is open but «Opens At Noon».
    now = gaza('2026-11-05', '10:00');
    const { id: otherArea } = await createArea({ nameAr: 'الشجاعية', nameEn: 'Ash-Shuja’iyya' });
    await candidate('Focus Passes', {});
    await candidate('Focus Other Area', { area: otherArea });
    await candidate('Focus Too Dear', { price: 3001 });
    await candidate('Focus Opens At Noon', { week: everyDay(720, 1260) });
    await candidate('Focus Closes Early', { week: everyDay(480, 1199) });
    await candidate('Focus Friday Closed', {
      week: everyDay(480, 1260).map((day, i) => (i === 5 ? null : day)),
    });
    await candidate('Focus Unverified', { verified: false });
    await candidate('Focus No Student Price', { studentPrice: false });
    await candidate('Unmatched', {});
    // Without hours, it fails only the hours filters.
    const noHours = await createPublicSpace(areaId, 'Focus No Hours');
    await signInOwnerOf(noHours.id);
    await addPrice(noHours.id, 'DAY', 2000);
    await addPrice(noHours.id, 'DAY', 1500, 'STUDENT');
  });

  const ALL = Object.keys(FILTERS) as Filter[];

  it('all of them keep exactly the one space that passes each', async () => {
    const body = await listed(`?limit=50${queryOf(ALL)}`);

    expect(body.data.map(({ nameEn }) => nameEn)).toEqual(['Focus Passes']);
    expect(body.meta.totalRecords).toBe(1);
  });

  it.each(ALL)('without %s, the space it alone excluded comes back', async (dropped) => {
    const kept = ALL.filter((filter) => filter !== dropped);

    const body = await listed(`?limit=50${queryOf(kept)}&sort=name&lang=en`);

    // The space without hours still fails the hours filters that remain.
    expect(body.data.map(({ nameEn }) => nameEn)).toEqual(
      ['Focus Passes', FILTERS[dropped]].sort(),
    );
    expect(body.meta.totalRecords).toBe(2);
  });

  it('a space without hours fails only the hours filters', async () => {
    const others: Filter[] = ['area', 'price', 'verified', 'studentPrices', 'q'];
    expect(await names(queryOf(others))).toEqual([
      'Focus Closes Early',
      'Focus Friday Closed',
      'Focus No Hours',
      'Focus Opens At Noon',
      'Focus Passes',
    ]);

    for (const hours of ['openNow', 'evening', 'openFriday'] as const) {
      expect(await names(queryOf([hours])), hours).not.toContain('Focus No Hours');
    }
  });

  it('the map keeps the same spaces as the list for each hours filter', async () => {
    for (const filters of [['openNow'], ['evening'], ['openNow', 'evening'], ALL] as Filter[][]) {
      const list = await names(queryOf(filters));
      expect(await pinNames(`?${queryOf(filters).slice(1)}`), filters.join()).toEqual(
        [...list].sort(),
      );
    }
  });
});
