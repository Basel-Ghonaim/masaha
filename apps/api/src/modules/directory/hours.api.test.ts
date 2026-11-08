import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import {
  createArea,
  createPublicSpace,
  seedSettings,
  setWeek,
  signInOwnerOf,
} from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// The state by the hours (`hoursStatus`) the directory's cards and pins carry, verified or not, and
// its tie to «مفتوحة الآن»: the SQL filter and the TypeScript rule are one comparison read twice
// (docs/architecture/data-model.md › Derived values), so they must agree at every clock.

let now = new Date('2026-11-08T10:00:00+02:00');
const app = createTestApp({ clock: () => now });

/** An instant on Gaza's winter clock, UTC+2. */
const gaza = (date: string, time: string) => new Date(`${date}T${time}:00+02:00`);
/** Sunday 2026-11-08 in Gaza, at `time`. */
const sunday = (time: string) => gaza('2026-11-08', time);

type Day = [number, number] | null;
const everyDay = (opens: number, closes: number): Day[] =>
  Array.from({ length: 7 }, () => [opens, closes]);

let areaId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: areaId } = await createArea());
  now = sunday('10:00');
});

async function space(
  nameEn: string,
  { week, verified = false, capacity }: { week?: Day[]; verified?: boolean; capacity?: number },
) {
  const created = await createPublicSpace(areaId, nameEn);
  if (verified) await signInOwnerOf(created.id);
  if (week) await setWeek(created.id, week);
  if (capacity !== undefined) {
    await prisma.spaceOccupancy.create({ data: { spaceId: created.id, capacity } });
  }
  return created;
}

async function closureFrom(spaceId: number, startsAt: Date) {
  await prisma.announcement.create({
    data: { spaceId, type: 'CLOSURE', textAr: 'مغلق', startsAt, idempotencyKey: randomUUID() },
  });
}

interface Card {
  id: number;
  nameEn: string;
  isVerified: boolean;
  liveStatus: string | null;
  hoursStatus: string | null;
}

async function cards(query = '') {
  const response = await request(app).get(`/api/v1/spaces?limit=50&sort=name&lang=en${query}`);
  expect(response.status).toBe(200);
  return (response.body as { data: Card[] }).data;
}

async function pins(query = '') {
  const response = await request(app).get(`/api/v1/map/spaces${query}`);
  expect(response.status).toBe(200);
  return (response.body as { data: { pins: Card[] } }).data.pins;
}

/** Each item's state by its hours, by its English name. */
const hoursOf = (items: readonly Card[]) =>
  Object.fromEntries(items.map(({ nameEn, hoursStatus }) => [nameEn, hoursStatus]));

describe('hoursStatus on the card and the pin', () => {
  it('open or closed by the hours, closed under a closure, none without hours; verified spaces too, their live status kept', async () => {
    await space('Open', { week: everyDay(480, 1080) });
    await space('Closed By Hours', { week: everyDay(720, 1080) });
    const underClosure = await space('Under Closure', { week: everyDay(480, 1080) });
    await closureFrom(underClosure.id, sunday('09:00'));
    await space('No Hours', {});
    await space('Verified Open', { week: everyDay(480, 1080), verified: true, capacity: 5 });
    await space('Verified Closed', { week: everyDay(720, 1080), verified: true, capacity: 5 });

    const expected = {
      Open: 'OPEN',
      'Closed By Hours': 'CLOSED',
      'Under Closure': 'CLOSED',
      'No Hours': null,
      'Verified Open': 'OPEN',
      'Verified Closed': 'CLOSED',
    };
    const list = await cards();
    expect(hoursOf(list)).toEqual(expected);
    expect(hoursOf(await pins())).toEqual(expected);
    expect(Object.fromEntries(list.map(({ nameEn, liveStatus }) => [nameEn, liveStatus]))).toEqual({
      Open: null,
      'Closed By Hours': null,
      'Under Closure': null,
      'No Hours': null,
      'Verified Open': 'AVAILABLE',
      'Verified Closed': 'CLOSED',
    });
  });
});

describe('openNow and hoursStatus are one rule', () => {
  beforeEach(async () => {
    await space('Morning', { week: everyDay(480, 720) });
    await space('Afternoon', { week: everyDay(720, 1080) });
    await space('Until Midnight', { week: everyDay(1080, 1440) });
    await space('Weekdays', { week: everyDay(480, 1080).map((day, i) => (i >= 5 ? null : day)) });
    await space('No Hours', {});
    const closed = await space('Closure', { week: everyDay(0, 1440) });
    await closureFrom(closed.id, sunday('00:00'));
    await space('Verified Morning', { week: everyDay(480, 720), verified: true, capacity: 3 });
    await space('Verified Afternoon', { week: everyDay(720, 1080), verified: true, capacity: 3 });
  });

  it.each([
    ['an opening minute', sunday('12:00')],
    ['a closing minute', sunday('18:00')],
    ['a minute before midnight', sunday('23:59')],
    ['a day boundary, into Friday', gaza('2026-11-06', '00:00')],
  ])('at %s, openNow keeps exactly the spaces whose card says OPEN', async (_, at) => {
    now = at;

    const all = await cards();
    const open = await cards('&openNow=true');

    expect(open.map(({ id }) => id)).toEqual(
      all.filter(({ hoursStatus }) => hoursStatus === 'OPEN').map(({ id }) => id),
    );
    // A verified space with no override is CLOSED exactly when its hours say so.
    for (const card of all.filter(({ isVerified }) => isVerified)) {
      expect(card.liveStatus === 'CLOSED', card.nameEn).toBe(card.hoursStatus === 'CLOSED');
    }
  });

  it('the clocks above see both states, so the agreement is not empty', async () => {
    now = sunday('12:00');
    expect(hoursOf(await cards())).toEqual({
      Afternoon: 'OPEN',
      Closure: 'CLOSED',
      Morning: 'CLOSED',
      'No Hours': null,
      'Until Midnight': 'CLOSED',
      'Verified Afternoon': 'OPEN',
      'Verified Morning': 'CLOSED',
      Weekdays: 'OPEN',
    });
  });
});
