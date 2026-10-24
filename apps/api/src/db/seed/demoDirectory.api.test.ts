import { GAZA_STRIP_BOUNDS } from '@masaha/shared/spaces';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase } from '../../../test/reset-database.ts';
import { createTestStorage, type TestStorage } from '../../../test/storage.ts';
import { prisma } from '../prisma.ts';
import { DEMO_OWNER_EMAIL, DEMO_SPACE_SLUG, seedDemo } from './demo.ts';
import { DIRECTORY_OWNER_EMAIL, seedDemoDirectory } from './demoDirectory.ts';
import { seed } from './seed.ts';

const NOW = new Date('2026-10-14T09:00:00Z'); // Wednesday
const DAY1 = NOW;
const DAY2 = new Date('2026-10-15T09:00:00Z'); // Thursday
const DAY2_AFTER_CLOSING = new Date('2026-10-15T17:00:00Z'); // Thursday 20:00 Gaza = 17:00 UTC
const DAY_MS = 86_400_000;

let files: TestStorage;

function directory(now: Date) {
  return seedDemoDirectory(prisma, {
    password: 'demo-pass-1',
    nodeEnv: 'development',
    storage: files.storage,
    now,
  });
}

function directoryAtNow() {
  return directory(NOW);
}

beforeEach(async () => {
  await resetDatabase(prisma);
  await seed(prisma, {
    admin: { email: 'admin@example.com', password: 'change-me-1', name: 'Admin' },
    contact: {},
  });
  files = await createTestStorage();
});

afterEach(() => files.cleanup());

/** The demo space, with everything the set could touch. */
function demoSpace() {
  return prisma.space.findUniqueOrThrow({
    where: { slug: DEMO_SPACE_SLUG },
    include: {
      managers: true,
      hours: true,
      prices: true,
      contacts: true,
      amenities: true,
      photos: true,
      occupancy: true,
    },
  });
}

/** The set's spaces, with what the cases read. */
function setSpaces() {
  return prisma.space.findMany({
    where: { slug: { not: DEMO_SPACE_SLUG } },
    include: {
      area: { include: { governorate: true } },
      managers: { include: { user: true } },
      hours: true,
      prices: true,
      contacts: true,
      ownAmenities: true,
      amenities: true,
      photos: { orderBy: { sortOrder: 'asc' } },
      occupancy: true,
      visits: { where: { checkedOutAt: null } },
      announcements: true,
    },
    orderBy: { id: 'asc' },
  });
}

describe('seedDemoDirectory, on a database holding the demo space', () => {
  // Seeded in the hook, which has the longer limit: the set takes a second or two.
  let created: boolean;
  let demoBefore: Awaited<ReturnType<typeof demoSpace>>;
  beforeEach(async () => {
    await seedDemo(prisma, { password: 'demo-pass-1', nodeEnv: 'development', now: NOW });
    demoBefore = await demoSpace();
    created = await directoryAtNow();
  });

  it('creates 24 listed spaces in the Strip, across governorates and areas', async () => {
    expect(created).toBe(true);

    const spaces = await setSpaces();
    expect(spaces).toHaveLength(24);
    for (const { lat, lng, isHidden, deletedAt, area } of spaces) {
      expect(lat).toBeGreaterThanOrEqual(GAZA_STRIP_BOUNDS.south);
      expect(lat).toBeLessThanOrEqual(GAZA_STRIP_BOUNDS.north);
      expect(lng).toBeGreaterThanOrEqual(GAZA_STRIP_BOUNDS.west);
      expect(lng).toBeLessThanOrEqual(GAZA_STRIP_BOUNDS.east);
      // Publicly listed: not hidden, not deleted, its area and governorate active.
      expect([isHidden, deletedAt, area.isActive, area.governorate.isActive]).toEqual([
        false,
        null,
        true,
        true,
      ]);
    }
    expect(new Set(spaces.map(({ area }) => area.governorateId)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(spaces.map(({ areaId }) => areaId)).size).toBeGreaterThanOrEqual(4);
  });

  it('links the verified spaces to the directory owner alone', async () => {
    const spaces = await setSpaces();
    const verified = spaces.filter(({ managers }) => managers.length > 0);
    expect(verified.length).toBeGreaterThan(0);
    expect(verified.length).toBeLessThan(spaces.length);
    for (const { managers } of verified) {
      expect(managers.map(({ role, user }) => [role, user.email, user.role])).toEqual([
        ['OWNER', DIRECTORY_OWNER_EMAIL, 'OWNER'],
      ]);
    }
    const demoOwner = await prisma.user.findUniqueOrThrow({
      where: { email: DEMO_OWNER_EMAIL },
      include: { managedSpaces: true },
    });
    expect(demoOwner.managedSpaces).toHaveLength(1);
  });

  it('holds each case the public pages show', async () => {
    const spaces = await setSpaces();
    type SetSpace = (typeof spaces)[number];
    const verified = (space: SetSpace) => space.managers.length > 0;
    const open = ({ isClosed }: { isClosed: boolean }) => !isClosed;
    const cases: Record<string, (space: SetSpace) => boolean> = {
      // Stale, so hidden.
      'an unverified space whose prices are 60 days old': (space) =>
        !verified(space) &&
        space.prices.length > 0 &&
        space.pricesUpdatedAt?.getTime() === NOW.getTime() - 60 * DAY_MS,
      photos: ({ photos }) => photos.length > 0,
      'no photo': ({ photos }) => photos.length === 0,
      'no hours': ({ hours, hoursUpdatedAt }) => hours.length === 0 && hoursUpdatedAt === null,
      'shift prices': ({ prices }) => prices.some(({ shiftId }) => shiftId !== null),
      'student prices': ({ prices }) => prices.some(({ audience }) => audience === 'STUDENT'),
      'open on Friday': ({ hours }) => hours.some((day) => day.dayOfWeek === 5 && open(day)),
      'closed on Friday': ({ hours }) => hours.some((day) => day.dayOfWeek === 5 && !open(day)),
      'a phone': ({ contacts }) => contacts.some(({ type }) => type === 'PHONE'),
      'a WhatsApp': ({ contacts }) => contacts.some(({ type }) => type === 'WHATSAPP'),
      amenities: ({ amenities }) => amenities.length > 0,
      'own amenities': ({ ownAmenities }) => ownAmenities.length > 0,
      'an English name alone': ({ nameAr }) => nameAr === null,
      'both names': ({ nameAr }) => nameAr !== null,
      // Verified, open around the clock, as many present as its capacity.
      full: (space) =>
        verified(space) &&
        space.hours.length === 7 &&
        space.hours.every((day) => day.opensMinute === 0 && day.closesMinute === 1440) &&
        space.occupancy?.capacity === space.visits.length,
      // Today's Gaza day, a Wednesday (3), closed; other days open.
      'closed by its hours': (space) =>
        verified(space) &&
        space.hours.some((day) => day.dayOfWeek === 3 && !open(day)) &&
        space.hours.some(open),
      'closed by a closure': ({ announcements }) =>
        announcements.some(
          ({ type, startsAt, endsAt }) => type === 'CLOSURE' && startsAt <= NOW && endsAt === null,
        ),
    };
    const missing = Object.entries(cases)
      .filter(([, test]) => !spaces.some(test))
      .map(([name]) => name);
    expect(missing).toEqual([]);

    // Each photo in order, the cover first, stored in its two sizes.
    const photos = spaces.flatMap((space) => space.photos);
    for (const space of spaces) {
      expect(space.photos.map(({ sortOrder }) => sortOrder)).toEqual(space.photos.map((_, i) => i));
    }
    expect(await files.files()).toHaveLength(photos.length * 2);
  });

  it('changes nothing when run again', async () => {
    const count = () =>
      Promise.all([
        prisma.space.count(),
        prisma.user.count(),
        prisma.spacePhoto.count(),
        prisma.visit.count(),
        files.files(),
      ]);
    const before = await count();

    await expect(directoryAtNow()).resolves.toBe(false);

    expect(await count()).toEqual(before);
  });

  it('leaves the demo space untouched', async () => {
    expect(await demoSpace()).toEqual(demoBefore);
  });
});

describe('seedDemoDirectory', () => {
  it('never runs in production', async () => {
    await expect(
      seedDemoDirectory(prisma, {
        password: 'demo-pass-1',
        nodeEnv: 'production',
        storage: files.storage,
      }),
    ).rejects.toThrow(/production/);
    expect(await prisma.space.count()).toBe(0);
  });
});

describe('seedDemoDirectory renewal across days', () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
    await seed(prisma, {
      admin: { email: 'admin@example.com', password: 'change-me-1', name: 'Admin' },
      contact: {},
    });
    files = await createTestStorage();
  });

  afterEach(() => files.cleanup());

  async function getSadaSpace() {
    return prisma.space.findUniqueOrThrow({
      where: { slug: 'sada-space' },
      include: { occupancy: true, visits: { where: { checkedOutAt: null } } },
    });
  }

  async function getRadwanSpace() {
    return prisma.space.findUniqueOrThrow({
      where: { slug: 'radwan-study-hall' },
      include: { hours: true },
    });
  }

  async function getDemoSpaceVisits() {
    return prisma.visit.count({ where: { space: { slug: DEMO_SPACE_SLUG }, checkedOutAt: null } });
  }

  async function getOutsideSpaceVisits() {
    // A space outside the set: the demo space
    return prisma.visit.count({ where: { space: { slug: DEMO_SPACE_SLUG }, checkedOutAt: null } });
  }

  it('day 1 then day 2: sada-space full and radwan-study-hall closed on day 2 weekday', async () => {
    await seedDemo(prisma, { password: 'demo-pass-1', nodeEnv: 'development', now: DAY1 });
    await directory(DAY1);
    await directory(DAY2);

    const sada = await getSadaSpace();
    expect(sada.visits).toHaveLength(4);
    expect(sada.occupancy?.capacity).toBe(4);

    const radwan = await getRadwanSpace();
    // Thursday = 4 in JS getDay (0=Sunday)
    expect(radwan.hours.some((h) => h.dayOfWeek === 4 && h.isClosed)).toBe(true);
    // Other days open with the seed's range 09:00-17:00 (540-1020)
    expect(
      radwan.hours
        .filter((h) => h.dayOfWeek !== 4)
        .every((h) => !h.isClosed && h.opensMinute === 540 && h.closesMinute === 1020),
    ).toBe(true);
  });

  it('day 2 again: no row changed (counts and hoursUpdatedAt unchanged)', async () => {
    await seedDemo(prisma, { password: 'demo-pass-1', nodeEnv: 'development', now: DAY1 });
    await directory(DAY1);
    await directory(DAY2);

    const sadaBefore = await getSadaSpace();
    const radwanBefore = await getRadwanSpace();
    const hoursUpdatedAtBefore = radwanBefore.hoursUpdatedAt?.getTime();

    await directory(DAY2);

    const sadaAfter = await getSadaSpace();
    const radwanAfter = await getRadwanSpace();
    const hoursUpdatedAtAfter = radwanAfter.hoursUpdatedAt?.getTime();

    expect(sadaAfter.visits).toHaveLength(sadaBefore.visits.length);
    expect(hoursUpdatedAtAfter).toBe(hoursUpdatedAtBefore);
  });

  it('one of day 2 visits checked out, then day 2 again: topped up to 4', async () => {
    await seedDemo(prisma, { password: 'demo-pass-1', nodeEnv: 'development', now: DAY1 });
    await directory(DAY1);
    await directory(DAY2);

    const sada = await getSadaSpace();
    const visitToClose = sada.visits[0];
    if (!visitToClose) throw new Error('No visit to close');
    await prisma.visit.update({
      where: { id: visitToClose.id },
      data: { checkedOutAt: DAY2, checkoutMethod: 'MANUAL' },
    });

    await directory(DAY2);

    const sadaAfter = await getSadaSpace();
    expect(sadaAfter.visits).toHaveLength(4);
  });

  it('run at 20:00 Gaza time (after closing for radwan): visits checked in at now - i seconds', async () => {
    await seedDemo(prisma, { password: 'demo-pass-1', nodeEnv: 'development', now: DAY1 });
    await directory(DAY1);
    await directory(DAY2_AFTER_CLOSING);

    const sada = await getSadaSpace();
    expect(sada.visits).toHaveLength(4);
    // All 4 visits checked in within a few seconds of now (now - 0, -1, -2, -3s)
    // Order by checkedInAt ASC is not guaranteed by createMany; just check all are close to now
    for (const visit of sada.visits) {
      const diff = DAY2_AFTER_CLOSING.getTime() - visit.checkedInAt.getTime();
      expect(diff).toBeGreaterThanOrEqual(0);
      expect(diff).toBeLessThanOrEqual(3000);
    }
  });

  it('demo space and space outside the set untouched (visit counts before and after)', async () => {
    await seedDemo(prisma, { password: 'demo-pass-1', nodeEnv: 'development', now: DAY1 });
    await directory(DAY1);

    const demoVisitsBefore = await getDemoSpaceVisits();
    const outsideVisitsBefore = await getOutsideSpaceVisits();

    await directory(DAY2);

    const demoVisitsAfter = await getDemoSpaceVisits();
    const outsideVisitsAfter = await getOutsideSpaceVisits();

    expect(demoVisitsAfter).toBe(demoVisitsBefore);
    expect(outsideVisitsAfter).toBe(outsideVisitsBefore);
  });
});
