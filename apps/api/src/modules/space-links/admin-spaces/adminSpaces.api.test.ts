import { beforeEach, describe, expect, it } from 'vitest';

import { adminRequest, dataOf, errorOf, signIn } from '../../../../test/admin.ts';
import { accessTokens, createTestApp } from '../../../../test/app.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { createArea, seedSettings, signInOwnerOf } from '../../../../test/spaces.ts';
import { createRunInTransaction, prisma } from '../../../db/index.ts';
import { writeAudit } from '../../../shared/audit/index.ts';
import { createCounter, createLimiter } from '../../../shared/rate-limit/index.ts';
import { createLookupsService } from '../../lookups/index.ts';
import { createPlatformSettingsService } from '../../platform-settings/index.ts';
import { createListingService } from '../../spaces/index.ts';
import { createUsersService } from '../../users/index.ts';
import { createAdminSpacesService } from './adminSpaces.service.ts';

const NOW = new Date('2026-10-06T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });
const DAY_MS = 24 * 60 * 60 * 1000;

/** A date `days` before now. */
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY_MS);

// The admin's spaces as the composition root builds them, for the admin overview's counts.
const clock = () => NOW;
const adminSpaces = createAdminSpacesService({
  listing: createListingService({
    platformSettings: createPlatformSettingsService({
      runInTransaction: createRunInTransaction(),
      audit: writeAudit,
    }),
    now: clock,
  }),
  lookups: createLookupsService(),
  users: createUsersService({
    accessTokens,
    limiter: createLimiter(createCounter(), clock),
    audit: writeAudit,
    now: clock,
    receptionSpaceOf: () => Promise.resolve(null),
  }),
});

let admin: { id: number; authorization: string };
let areaId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: areaId } = await createArea());
  admin = await signIn('ADMIN');
});

interface SpaceOptions {
  nameAr?: string;
  area?: number;
  isHidden?: boolean;
  deleted?: boolean;
  /** How many days ago each group was dated, or null for a group never saved; now by default. */
  ages?: Partial<Record<'hours' | 'prices' | 'amenities' | 'contacts', number | null>> & {
    profile?: number;
  };
}

/** A space named `nameEn`, every group dated now unless aged or missing. */
async function space(nameEn: string, options: SpaceOptions = {}) {
  const { nameAr, area = areaId, isHidden = false, deleted = false, ages = {} } = options;
  const at = (group: 'hours' | 'prices' | 'amenities' | 'contacts') => {
    const age = ages[group];
    return age === null ? null : daysAgo(age ?? 0);
  };
  return prisma.space.create({
    data: {
      slug: nameEn.toLowerCase().replaceAll(' ', '-'),
      nameEn,
      nameAr: nameAr ?? null,
      addressAr: 'شارع الشهداء',
      areaId: area,
      lat: 31.52,
      lng: 34.45,
      isHidden,
      deletedAt: deleted ? NOW : null,
      profileUpdatedAt: daysAgo(ages.profile ?? 0),
      hoursUpdatedAt: at('hours'),
      pricesUpdatedAt: at('prices'),
      amenitiesUpdatedAt: at('amenities'),
      contactsUpdatedAt: at('contacts'),
    },
  });
}

/** A user linked to the space, as its owner unless told otherwise. */
async function link(
  spaceId: number,
  name: string,
  { role = 'OWNER', deactivated = false, day = '2026-01-01' } = {},
) {
  const user = await prisma.user.create({
    data: { email: `${name.toLowerCase()}@example.com`, name, passwordHash: 'x' },
  });
  await prisma.spaceManager.create({
    data: {
      spaceId,
      userId: user.id,
      role: role as 'OWNER' | 'RECEPTION',
      createdAt: new Date(`${day}T09:00:00Z`),
      deactivatedAt: deactivated ? NOW : null,
    },
  });
  return user;
}

async function list(query = '') {
  return adminRequest(app, admin, 'get', `/spaces${query}`);
}

/** The listed spaces' English names, in order. */
async function namesListed(query = '') {
  const response = await list(query);
  expect(response.status).toBe(200);
  return (dataOf(response) as { nameEn: string }[]).map(({ nameEn }) => nameEn);
}

describe('GET /admin/spaces', () => {
  it.each([
    { caller: 'guest', status: 401, type: 'unauthorized', code: undefined },
    { caller: 'USER', status: 403, type: 'forbidden', code: undefined },
    {
      caller: 'ADMIN with a pending password change',
      status: 403,
      type: 'forbidden',
      code: 'PASSWORD_CHANGE_REQUIRED',
    },
  ] as const)('refuses a $caller with $status', async ({ caller, status, type, code }) => {
    const response = await adminRequest(app, caller, 'get', '/spaces');

    expect(response.status).toBe(status);
    const error = errorOf(response);
    expect({ type: error.type, code: error.code }).toEqual({ type, code });
  });

  it('refuses the OWNER of a listed space, and the OWNER of another, with 403', async () => {
    const theirs = await space('Their Hub');
    const other = await space('Other Hub');
    for (const spaceId of [theirs.id, other.id]) {
      const owner = await signInOwnerOf(spaceId);
      expect((await adminRequest(app, owner, 'get', '/spaces')).status).toBe(403);
    }
  });

  it('lists each space with its area, its state, its active owners, its stale and missing groups and its last update', async () => {
    const focus = await space('Focus Hub', {
      nameAr: 'فوكس هب',
      ages: { prices: 31, hours: 2, amenities: null },
    });
    await link(focus.id, 'Maha', { day: '2026-03-01' });
    await link(focus.id, 'Ahmad', { day: '2026-02-01' });
    await link(focus.id, 'Layla', { role: 'RECEPTION' });
    await link(focus.id, 'Omar', { deactivated: true });

    const response = await list();

    expect(response.status).toBe(200);
    const names = await prisma.user.findMany({ select: { id: true, name: true } });
    const idOf = (name: string) => names.find((user) => user.name === name)?.id;
    expect(dataOf(response)).toEqual([
      {
        id: focus.id,
        slug: 'focus-hub',
        nameEn: 'Focus Hub',
        nameAr: 'فوكس هب',
        area: { id: areaId, nameAr: 'النصر', nameEn: 'An-Nasr' },
        isVerified: true,
        isHidden: false,
        deletedAt: null,
        owners: [
          { id: idOf('Ahmad'), name: 'Ahmad' },
          { id: idOf('Maha'), name: 'Maha' },
        ],
        staleGroups: ['prices'],
        missingGroups: ['amenities'],
        lastUpdatedAt: NOW.toISOString(),
      },
    ]);
    expect((response.body as { meta: unknown }).meta).toEqual({
      currentPage: 1,
      limit: 20,
      totalPages: 1,
      totalRecords: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('orders by English name, and leaves a soft-deleted space out', async () => {
    await space('White Space');
    await space('Branch Hub');
    await space('Gone Hub', { deleted: true });

    expect(await namesListed()).toEqual(['Branch Hub', 'White Space']);
  });

  it.each([
    ['no status', '', ['Live Hub']],
    ['verified', '?status=verified', []],
    ['unverified', '?status=unverified', ['Live Hub']],
    ['hidden', '?status=hidden', []],
  ])('leaves every soft-deleted space out for %s', async (_, query, expected) => {
    await space('Live Hub');
    const owned = await space('Gone Owned', { deleted: true });
    await link(owned.id, 'Ahmad');
    await space('Gone Hidden', { deleted: true, isHidden: true });
    await space('Gone Plain', { deleted: true });

    expect(await namesListed(query)).toEqual(expected);
  });

  describe('the deleted spaces', () => {
    it('lists only the soft-deleted spaces, hidden or not, verified or not, with their owners and when each was deleted', async () => {
      await space('Live Hub');
      const owned = await space('Gone Owned', { deleted: true, isHidden: true });
      await link(owned.id, 'Ahmad');
      await space('Gone Plain', { deleted: true });

      const response = await list('?status=deleted');

      expect(response.status).toBe(200);
      expect(
        (
          dataOf(response) as {
            nameEn: string;
            isVerified: boolean;
            isHidden: boolean;
            deletedAt: string | null;
            owners: { name: string }[];
          }[]
        ).map(({ nameEn, isVerified, isHidden, deletedAt, owners }) => ({
          nameEn,
          isVerified,
          isHidden,
          deletedAt,
          owners: owners.map(({ name }) => name),
        })),
      ).toEqual([
        {
          nameEn: 'Gone Owned',
          isVerified: true,
          isHidden: true,
          deletedAt: '2026-10-06T09:00:00.000Z',
          owners: ['Ahmad'],
        },
        {
          nameEn: 'Gone Plain',
          isVerified: false,
          isHidden: false,
          deletedAt: '2026-10-06T09:00:00.000Z',
          owners: [],
        },
      ]);
    });

    it('gives a live space no deletion date', async () => {
      await space('Live Hub');

      expect((dataOf(await list()) as { deletedAt: unknown }[])[0]?.deletedAt).toBeNull();
    });

    it('searches them, keeps those of a place, and those with a stale group', async () => {
      const elsewhere = await createArea();
      await space('Nasr Hub');
      await space('Gone Nasr Hub', { deleted: true });
      await space('Gone Far Hub', { deleted: true, area: elsewhere.id });
      await space('Gone Old', { deleted: true, ages: { prices: 31 } });

      expect(await namesListed(`?status=deleted&q=hub&areaId=${String(areaId)}`)).toEqual([
        'Gone Nasr Hub',
      ]);
      expect(await namesListed('?status=deleted&stale=true')).toEqual(['Gone Old']);
    });

    it('filters them before it pages: full pages and the right total', async () => {
      // Deleted and live spaces interleaved by name, so a page filtered after it was fetched would
      // come up short.
      for (const letter of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
        await space(`${letter} Hub`, { deleted: 'ACEGI'.includes(letter) });
      }

      const first = await list('?status=deleted&limit=2');
      const last = await list('?status=deleted&limit=2&page=3');

      expect((dataOf(first) as { nameEn: string }[]).map(({ nameEn }) => nameEn)).toEqual([
        'A Hub',
        'C Hub',
      ]);
      expect(
        (first.body as { meta: { totalRecords: number; totalPages: number } }).meta,
      ).toMatchObject({ totalRecords: 5, totalPages: 3 });
      expect((dataOf(last) as { nameEn: string }[]).map(({ nameEn }) => nameEn)).toEqual(['I Hub']);
    });
  });

  describe('its filters', () => {
    beforeEach(async () => {
      const verified = await space('Verified Hub');
      await link(verified.id, 'Ahmad');
      const hiddenVerified = await space('Hidden Verified', { isHidden: true });
      await link(hiddenVerified.id, 'Maha');
      await space('Unverified Hub');
      await space('Hidden Unverified', { isHidden: true });
    });

    it.each([
      ['verified', ['Verified Hub']],
      ['unverified', ['Unverified Hub']],
      ['hidden', ['Hidden Unverified', 'Hidden Verified']],
    ])('keeps the %s spaces', async (status, expected) => {
      expect(await namesListed(`?status=${status}`)).toEqual(expected);
    });

    it('searches either name, whatever the case', async () => {
      await space('Nook', { nameAr: 'ركن الهدوء' });

      expect(await namesListed('?q=VERIFIED%20h')).toEqual(['Unverified Hub', 'Verified Hub']);
      expect(await namesListed(`?q=${encodeURIComponent('الهدوء')}`)).toEqual(['Nook']);
    });
  });

  it('keeps the spaces of a governorate, of an area, or of an area in a governorate', async () => {
    const elsewhere = await createArea();
    const { governorateId } = await prisma.area.findUniqueOrThrow({ where: { id: areaId } });
    const sameGovernorate = await prisma.area.create({
      data: { governorateId, nameAr: 'الرمال', nameEn: 'Al-Rimal', isActive: false },
    });
    await space('Nasr Hub');
    await space('Rimal Hub', { area: sameGovernorate.id });
    await space('Far Hub', { area: elsewhere.id });

    expect(await namesListed(`?governorateId=${String(governorateId)}`)).toEqual([
      'Nasr Hub',
      'Rimal Hub',
    ]);
    expect(await namesListed(`?areaId=${String(elsewhere.id)}`)).toEqual(['Far Hub']);
    expect(
      await namesListed(`?governorateId=${String(governorateId)}&areaId=${String(elsewhere.id)}`),
    ).toEqual([]);
  });

  it('keeps the spaces with a stale or a missing group only, by the platform’s thresholds', async () => {
    await prisma.setting.update({ where: { key: 'priceStalenessDays' }, data: { value: 10 } });
    await space('Fresh Hub', { ages: { prices: 9, profile: 59 } });
    await space('Old Prices', { ages: { prices: 11 } });
    await space('Old Contacts', { ages: { contacts: 61 } });
    await space('No Hours', { ages: { hours: null } });

    const response = await list('?stale=true');

    expect(
      (
        dataOf(response) as { nameEn: string; staleGroups: string[]; missingGroups: string[] }[]
      ).map(({ nameEn, staleGroups, missingGroups }) => [nameEn, staleGroups, missingGroups]),
    ).toEqual([
      ['No Hours', [], ['hours']],
      ['Old Contacts', ['contacts'], []],
      ['Old Prices', ['prices'], []],
    ]);
  });

  it.each(['prices', 'amenities', 'contacts'] as const)(
    'keeps a space whose %s are missing, as stale only',
    async (group) => {
      await space('Fresh Hub');
      await space('Missing Hub', { ages: { [group]: null } });

      expect(await namesListed('?stale=true')).toEqual(['Missing Hub']);
    },
  );

  it('filters by verified before it pages: full pages and the right total', async () => {
    // Verified and unverified spaces interleaved by name, so a page filtered after it was fetched
    // would come up short.
    for (const letter of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
      const created = await space(`${letter} Hub`);
      if ('ACEGI'.includes(letter)) await link(created.id, `Owner${letter}`);
    }

    const first = await list('?status=verified&limit=2');
    const last = await list('?status=verified&limit=2&page=3');

    expect((dataOf(first) as { nameEn: string }[]).map(({ nameEn }) => nameEn)).toEqual([
      'A Hub',
      'C Hub',
    ]);
    expect((first.body as { meta: unknown }).meta).toEqual({
      currentPage: 1,
      limit: 2,
      totalPages: 3,
      totalRecords: 5,
      hasNextPage: true,
      hasPreviousPage: false,
    });
    expect((dataOf(last) as { nameEn: string }[]).map(({ nameEn }) => nameEn)).toEqual(['I Hub']);
  });

  it('refuses an unknown status and a limit above 50', async () => {
    const response = await list('?status=closed&limit=51');

    expect(response.status).toBe(422);
    expect(errorOf(response).errors).toEqual({
      status: ['invalid_choice'],
      limit: ['out_of_range'],
    });
  });
});

describe("the admin's spaces, counted", () => {
  /** A list's total, as the admin reads it. */
  async function totalOf(query: string): Promise<number> {
    const response = await list(query);
    expect(response.status).toBe(200);
    return (response.body as { meta: { totalRecords: number } }).meta.totalRecords;
  }

  it('counts equal the list’s totals for verified, unverified, hidden and stale; a deleted space never counted', async () => {
    await link((await space('Atlas')).id, 'OwnerA');
    await link((await space('Bloom', { isHidden: true })).id, 'OwnerB');
    await space('Cedar');
    await space('Dune', { isHidden: true, ages: { hours: 61 } });
    await space('Ember', { ages: { contacts: null } });
    await space('Fable', { deleted: true, ages: { hours: 90 } });
    await link((await space('Grove', { ages: { prices: 31 } })).id, 'OwnerG');
    await link((await space('Haven', { deleted: true })).id, 'OwnerH');

    const counts = await adminSpaces.counts();
    expect(counts).toEqual({ verified: 2, unverified: 2, hidden: 2, staleOrMissing: 3 });
    expect(await totalOf('?status=verified')).toBe(counts.verified);
    expect(await totalOf('?status=unverified')).toBe(counts.unverified);
    expect(await totalOf('?status=hidden')).toBe(counts.hidden);
    expect(await totalOf('?stale=true')).toBe(counts.staleOrMissing);
  });

  it('staleEditable: unverified spaces, hidden included, with a group stale or missing; the verified never; the first five by name, and the total', async () => {
    const atlas = await space('Atlas', { ages: { hours: 70 } });
    const bloom = await space('Bloom', { isHidden: true, ages: { prices: 40 } });
    const cedar = await space('Cedar', { nameAr: 'سيدار', ages: { contacts: null } });
    const dune = await space('Dune', { ages: { amenities: null, hours: 61 } });
    const ember = await space('Ember', { ages: { prices: 31 } });
    await space('Fable', { isHidden: true, ages: { contacts: null } });
    await space('Grove', { ages: { hours: 90 } });
    // Each left out: a verified space, a deleted one, a fresh one.
    await link((await space('Aaron', { ages: { hours: 90 } })).id, 'OwnerA');
    await space('Abbey', { deleted: true, ages: { hours: 90 } });
    await space('Haven');

    const row = (
      { id, nameEn, nameAr }: { id: number; nameEn: string; nameAr: string | null },
      hidden: boolean,
      missing: string[],
      stale: { group: string; days: number }[],
    ) => ({ id, nameEn, nameAr, hidden, missing, stale });
    expect(await adminSpaces.staleEditable(5)).toEqual({
      total: 7,
      first: [
        row(atlas, false, [], [{ group: 'hours', days: 70 }]),
        row(bloom, true, [], [{ group: 'prices', days: 40 }]),
        row(cedar, false, ['contacts'], []),
        row(dune, false, ['amenities'], [{ group: 'hours', days: 61 }]),
        row(ember, false, [], [{ group: 'prices', days: 31 }]),
      ],
    });

    // «عرض الكل»: the same spaces, listed.
    expect(await totalOf('?status=editable&stale=true')).toBe(7);
    expect(await namesListed('?status=editable&stale=true&limit=5')).toEqual([
      'Atlas',
      'Bloom',
      'Cedar',
      'Dune',
      'Ember',
    ]);
  });
});
