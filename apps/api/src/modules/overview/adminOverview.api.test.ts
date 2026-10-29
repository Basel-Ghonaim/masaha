import type { AdminOverview } from '@masaha/shared/overview';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { adminRequest, dataOf, errorOf, REFUSED_CALLERS, signIn } from '../../../test/admin.ts';
import { createTestApp } from '../../../test/app.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { createArea, seedSettings, signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

// The admin's overview (docs/features/overview.md; the owner's OV4–OV6, A8): the platform's tiles,
// each equal to the admin's list it links to, and «اكتمال البيانات»; nothing of a space's
// operations. On Tuesday 2026-11-10 at 10:00 in Gaza, in winter (+02:00); the last 30 days start
// at the Gaza midnight of 2026-10-12, in summer (+03:00).

const NOW = new Date('2026-11-10T10:00:00+02:00');
const app = createTestApp({ clock: () => NOW });
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);
const LONG_AGO = new Date('2026-01-01T00:00:00Z');

let admin: { id: number; authorization: string };
let areaId: number;
let reporterId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  ({ id: areaId } = await createArea());
  admin = await signIn('ADMIN');
  ({ id: reporterId } = await prisma.user.create({
    data: { email: 'rima.reporter@example.com', name: 'Rima', passwordHash: 'x' },
  }));
});

type Group = 'hours' | 'prices' | 'amenities' | 'contacts';

/** A space named `nameEn`, every group dated now unless aged (days) or missing (`null`). */
function space(
  nameEn: string,
  {
    isHidden = false,
    deleted = false,
    ages = {},
  }: { isHidden?: boolean; deleted?: boolean; ages?: Partial<Record<Group, number | null>> } = {},
) {
  const at = (group: Group) => {
    const age = ages[group];
    return age === null ? null : daysAgo(age ?? 0);
  };
  return prisma.space.create({
    data: {
      slug: nameEn.toLowerCase(),
      nameEn,
      addressAr: 'شارع الشهداء',
      areaId,
      lat: 31.52,
      lng: 34.45,
      isHidden,
      deletedAt: deleted ? NOW : null,
      profileUpdatedAt: NOW,
      hoursUpdatedAt: at('hours'),
      pricesUpdatedAt: at('prices'),
      amenitiesUpdatedAt: at('amenities'),
      contactsUpdatedAt: at('contacts'),
    },
  });
}

/** A space with an owner, which verifies it, and the owner signed in. */
async function verified(nameEn: string, options: Parameters<typeof space>[1] = {}) {
  const created = await space(nameEn, options);
  return { space: created, owner: await signInOwnerOf(created.id) };
}

function report(spaceId: number, data: Partial<Prisma.DataReportUncheckedCreateInput> = {}) {
  return prisma.dataReport.create({
    data: { spaceId, userId: reporterId, field: 'PRICES', createdAt: daysAgo(1), ...data },
  });
}

/** Every account so far made long ago, so only the test's own count as new. */
async function ageAccounts() {
  await prisma.user.updateMany({ data: { createdAt: LONG_AGO } });
}

function account(email: string, createdAt: Date) {
  return prisma.user.create({ data: { email, name: 'Sara', passwordHash: 'x', createdAt } });
}

async function overviewOf(): Promise<AdminOverview> {
  const response = await adminRequest(app, admin, 'get', '/overview');
  expect(response.status).toBe(200);
  return dataOf(response) as AdminOverview;
}

/** An admin list's total. */
async function totalOf(path: string): Promise<number> {
  const response = await adminRequest(app, admin, 'get', path);
  expect(response.status).toBe(200);
  return (response.body as { meta: { totalRecords: number } }).meta.totalRecords;
}

/**
 * The platform: Atlas and Grove verified and shown, Grove's prices stale; Bloom verified and
 * hidden; Cedar unverified; Dune unverified and hidden, its hours stale; Ember unverified, its
 * contacts missing; Fable deleted and stale. Two open reports on Atlas, one on Cedar and one
 * decided, one on Fable.
 */
async function seedPlatform() {
  const atlas = await verified('Atlas');
  await verified('Bloom', { isHidden: true });
  const cedar = await space('Cedar');
  const dune = await space('Dune', { isHidden: true, ages: { hours: 70 } });
  const ember = await space('Ember', { ages: { contacts: null } });
  const fable = await space('Fable', { deleted: true, ages: { hours: 90 } });
  await verified('Grove', { ages: { prices: 31 } });

  await report(atlas.space.id);
  await report(atlas.space.id, { field: 'HOURS' });
  await report(cedar.id);
  await report(cedar.id, {
    status: 'DISMISSED',
    resolvedAt: NOW,
    resolvedById: admin.id,
    resolvedAs: 'ADMIN',
    resolutionNote: 'صحيح',
  });
  await report(fable.id);
  return { dune, ember };
}

describe("the admin's overview", () => {
  it('the admin reads the tiles: verified, unverified, hidden, no owner, stale or missing, open reports split, new users of the last 30 Gaza days', async () => {
    await seedPlatform();
    await ageAccounts();
    // Just before the window, 23:30 on 2026-10-11 in Gaza; just inside it, 00:30 on the 12th.
    await account('late@example.com', new Date('2026-10-11T23:30:00+03:00'));
    await account('early@example.com', new Date('2026-10-12T00:30:00+03:00'));
    await account('today@example.com', new Date('2026-11-10T09:00:00+02:00'));

    const overview = await overviewOf();
    expect(overview.spaces).toEqual({
      verified: 2,
      unverified: 2,
      hidden: 2,
      unverifiedNoOwner: 2,
      staleOrMissing: 3,
    });
    expect(overview.reports).toEqual({ open: 3, awaitingAdmin: 1, awaitingOwners: 2 });
    expect(overview.newUsers).toBe(2);
    expect(overview.at).toBe(NOW.toISOString());
  });

  it('the tiles equal the admin’s lists', async () => {
    await seedPlatform();

    const overview = await overviewOf();
    expect(await totalOf('/spaces?status=verified')).toBe(overview.spaces.verified);
    expect(await totalOf('/spaces?status=unverified')).toBe(overview.spaces.unverified);
    expect(await totalOf('/spaces?status=hidden')).toBe(overview.spaces.hidden);
    expect(await totalOf('/spaces?stale=true')).toBe(overview.spaces.staleOrMissing);
    expect(await totalOf('/spaces?status=editable&stale=true')).toBe(overview.completeness.total);
    expect(await totalOf('/data-reports?status=OPEN')).toBe(overview.reports.open);
    const open = dataOf(
      await adminRequest(app, admin, 'get', '/data-reports?status=OPEN&limit=50'),
    ) as { space: { verified: boolean } }[];
    expect(open.filter(({ space: { verified: v } }) => !v)).toHaveLength(
      overview.reports.awaitingAdmin,
    );
    expect(open.filter(({ space: { verified: v } }) => v)).toHaveLength(
      overview.reports.awaitingOwners,
    );
  });

  it('completeness: the first five unverified spaces with a group stale or missing, hidden ones included, each with its groups and days; the total', async () => {
    const hollow = await space('Hollow', { ages: { amenities: null, prices: 45 } });
    const atlas = await space('Atlas', { isHidden: true, ages: { hours: 61 } });
    const ivory = await space('Ivory', { ages: { contacts: null } });
    const brook = await space('Brook', { ages: { prices: 31 } });
    const cove = await space('Cove', { isHidden: true, ages: { hours: null, contacts: 80 } });
    await space('Jade', { ages: { hours: 90 } });
    // Each left out: a verified space, a deleted one, a fresh one.
    await verified('Aaron', { ages: { hours: 90 } });
    await space('Abbey', { deleted: true, ages: { hours: 90 } });
    await space('Fresh');

    const row = (
      { id, nameEn }: { id: number; nameEn: string },
      hidden: boolean,
      missing: string[],
      stale: { group: string; days: number }[],
    ) => ({ id, nameEn, nameAr: null, hidden, missing, stale });
    expect((await overviewOf()).completeness).toEqual({
      total: 6,
      first: [
        row(atlas, true, [], [{ group: 'hours', days: 61 }]),
        row(brook, false, [], [{ group: 'prices', days: 31 }]),
        row(cove, true, ['hours'], [{ group: 'contacts', days: 80 }]),
        row(hollow, false, ['amenities'], [{ group: 'prices', days: 45 }]),
        row(ivory, false, ['contacts'], []),
      ],
    });
  });

  it('a saved threshold changes both overviews at once', async () => {
    const { space: kept, owner } = await verified('Kept', { ages: { hours: 70 } });
    await space('Lone', { ages: { hours: 70 } });
    const ownerOverview = async () => {
      const response = await request(app)
        .get(`/api/v1/manage/spaces/${String(kept.id)}/overview`)
        .set('Authorization', owner.authorization);
      expect(response.status).toBe(200);
      return (dataOf(response) as { attention: { groups: unknown } }).attention.groups;
    };

    expect(await ownerOverview()).toEqual({
      missing: [],
      stale: [{ group: 'hours', days: 70 }],
    });
    const before = await overviewOf();
    expect([before.spaces.staleOrMissing, before.completeness.total]).toEqual([2, 1]);

    const saved = await adminRequest(app, admin, 'put', '/settings/staleness', {
      stalenessDays: 90,
      priceStalenessDays: 45,
    });
    expect(saved.status).toBe(200);

    expect(await ownerOverview()).toEqual({ missing: [], stale: [] });
    const after = await overviewOf();
    expect([after.spaces.staleOrMissing, after.completeness.total]).toEqual([0, 0]);
  });

  it.each(REFUSED_CALLERS)(
    'refuses a $caller with $status',
    async ({ caller, status, type, code }) => {
      const response = await adminRequest(app, caller, 'get', '/overview');

      expect(response.status).toBe(status);
      const error = errorOf(response);
      expect({ type: error.type, code: error.code }).toEqual({ type, code });
    },
  );

  it('nothing of a space’s operations in the body', async () => {
    await seedPlatform();

    const response = await adminRequest(app, admin, 'get', '/overview');
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toMatch(
      /present|customer|capacity|visit|subscription|payment|agorot/i,
    );
  });
});
