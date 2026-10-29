import { beforeEach, describe, expect, it } from 'vitest';

import {
  adminRequest,
  auditEntries,
  dataOf,
  errorOf,
  REFUSED_CALLERS,
  signIn,
} from '../../../test/admin.ts';
import { createTestApp } from '../../../test/app.ts';
import { createSpace } from '../../../test/factories.ts';
import { waitingOnLock, whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { createArea, seedSettings } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const NOW = new Date('2026-10-06T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });
const DAY_MS = 24 * 60 * 60 * 1000;

let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  admin = await signIn('ADMIN');
});

const DEFAULTS = {
  autoCheckoutAtClosing: true,
  visitRounding: 'UP_AFTER_MINUTES',
  visitRoundingMinutes: 15,
  visitCapAtDayPrice: true,
};
const NEW_DEFAULTS = {
  autoCheckoutAtClosing: false,
  visitRounding: 'PER_MINUTE',
  visitRoundingMinutes: null,
  visitCapAtDayPrice: true,
};

/** The six routes: each card's read and save. */
const ROUTES = [
  { method: 'get', path: '/settings/new-space-defaults', body: undefined },
  { method: 'put', path: '/settings/new-space-defaults', body: NEW_DEFAULTS },
  { method: 'get', path: '/settings/staleness', body: undefined },
  {
    method: 'put',
    path: '/settings/staleness',
    body: { stalenessDays: 45, priceStalenessDays: 30 },
  },
  { method: 'get', path: '/settings/contact', body: undefined },
  { method: 'put', path: '/settings/contact', body: { email: 'hello@masaha.ps', whatsapp: null } },
] as const;

/** The stored settings, by key. */
async function stored() {
  const rows = await prisma.setting.findMany({ select: { key: true, value: true } });
  return Object.fromEntries(rows.map(({ key, value }) => [key, value]));
}

const card = (method: 'get' | 'put', path: string, body?: object) =>
  adminRequest(app, admin, method, `/settings/${path}`, body);

describe("the admin's settings cards", () => {
  it('the admin reads each card: the defaults, the thresholds, the contact null while unset', async () => {
    const defaults = await card('get', 'new-space-defaults');
    expect(defaults.status).toBe(200);
    expect(dataOf(defaults)).toEqual(DEFAULTS);

    const staleness = await card('get', 'staleness');
    expect(staleness.status).toBe(200);
    expect(dataOf(staleness)).toEqual({ stalenessDays: 60, priceStalenessDays: 30 });

    const contact = await card('get', 'contact');
    expect(contact.status).toBe(200);
    expect(dataOf(contact)).toEqual({ email: null, whatsapp: null });
  });

  it('each card saves on its own, answered as saved; audited with only what changed, no entity id; the same values write nothing', async () => {
    const defaults = await card('put', 'new-space-defaults', NEW_DEFAULTS);
    expect(defaults.status).toBe(200);
    expect(dataOf(defaults)).toEqual(NEW_DEFAULTS);

    const staleness = await card('put', 'staleness', { stalenessDays: 45, priceStalenessDays: 30 });
    expect(dataOf(staleness)).toEqual({ stalenessDays: 45, priceStalenessDays: 30 });

    const contact = await card('put', 'contact', {
      email: ' Hello@Masaha.PS',
      whatsapp: '0591234567',
    });
    expect(dataOf(contact)).toEqual({ email: 'hello@masaha.ps', whatsapp: '+970591234567' });

    expect(await stored()).toEqual({
      newSpaceDefaults: NEW_DEFAULTS,
      stalenessDays: 45,
      priceStalenessDays: 30,
      contactEmail: 'hello@masaha.ps',
      contactWhatsapp: '+970591234567',
    });
    const card3 = { actorId: admin.id, entityType: 'platformSettings', entityId: null };
    expect(await auditEntries()).toEqual([
      {
        ...card3,
        action: 'platformSettings.newSpaceDefaultsEdited',
        spaceId: null,
        before: {
          autoCheckoutAtClosing: true,
          visitRounding: 'UP_AFTER_MINUTES',
          visitRoundingMinutes: 15,
        },
        after: {
          autoCheckoutAtClosing: false,
          visitRounding: 'PER_MINUTE',
          visitRoundingMinutes: null,
        },
      },
      {
        ...card3,
        action: 'platformSettings.stalenessEdited',
        spaceId: null,
        before: { stalenessDays: 60 },
        after: { stalenessDays: 45 },
      },
      {
        ...card3,
        action: 'platformSettings.contactEdited',
        spaceId: null,
        before: { email: null, whatsapp: null },
        after: { email: 'hello@masaha.ps', whatsapp: '+970591234567' },
      },
    ]);

    // The same values again: answered as they are, nothing written.
    const contactAgain = await card('put', 'contact', {
      email: 'HELLO@masaha.ps',
      whatsapp: '+970 59 123 4567',
    });
    const again = [
      await card('put', 'new-space-defaults', NEW_DEFAULTS),
      await card('put', 'staleness', { stalenessDays: 45, priceStalenessDays: 30 }),
      contactAgain,
    ];
    expect(again.map((response) => response.status)).toEqual([200, 200, 200]);
    expect(dataOf(contactAgain)).toEqual({ email: 'hello@masaha.ps', whatsapp: '+970591234567' });
    expect(await auditEntries()).toHaveLength(3);

    // null clears one key of the contact, the other kept.
    const cleared = await card('put', 'contact', { email: null, whatsapp: '+970591234567' });
    expect(dataOf(cleared)).toEqual({ email: null, whatsapp: '+970591234567' });
    expect((await stored()).contactEmail).toBeNull();
    expect((await auditEntries()).at(-1)).toMatchObject({
      before: { email: 'hello@masaha.ps' },
      after: { email: null },
    });
  });

  it('saving a contact stored in another form stores its one form, audited from the stored to the saved', async () => {
    await prisma.setting.createMany({
      data: [
        { key: 'contactEmail', value: 'Hello@Masaha.PS' },
        { key: 'contactWhatsapp', value: '+972591234567' },
      ],
    });

    const saved = await card('put', 'contact', {
      email: 'Hello@Masaha.PS',
      whatsapp: '+972591234567',
    });

    expect(saved.status).toBe(200);
    expect(dataOf(saved)).toEqual({ email: 'hello@masaha.ps', whatsapp: '+970591234567' });
    expect(await stored()).toMatchObject({
      contactEmail: 'hello@masaha.ps',
      contactWhatsapp: '+970591234567',
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'platformSettings.contactEdited',
        entityType: 'platformSettings',
        entityId: null,
        spaceId: null,
        before: { email: 'Hello@Masaha.PS', whatsapp: '+972591234567' },
        after: { email: 'hello@masaha.ps', whatsapp: '+970591234567' },
      },
    ]);
  });

  it('a saved default is copied into the next space only; an existing space keeps its own', async () => {
    const { id: areaId } = await createArea();
    const create = (nameEn: string) =>
      adminRequest(app, admin, 'post', '/spaces', {
        nameEn,
        areaId,
        addressAr: 'شارع الشهداء',
        location: { lat: 31.52, lng: 34.45 },
      });
    const settingsOf = (spaceId: number) =>
      prisma.spaceSettings.findUniqueOrThrow({
        where: { spaceId },
        select: {
          autoCheckoutAtClosing: true,
          visitRounding: true,
          visitRoundingMinutes: true,
          visitCapAtDayPrice: true,
        },
      });

    const before = (dataOf(await create('Focus Hub')) as { id: number }).id;
    expect((await card('put', 'new-space-defaults', NEW_DEFAULTS)).status).toBe(200);
    const after = (dataOf(await create('Quiet Corner')) as { id: number }).id;

    expect(await settingsOf(before)).toEqual(DEFAULTS);
    expect(await settingsOf(after)).toEqual(NEW_DEFAULTS);
  });

  it('a threshold saved applies at once: a group 40 days old is stale under 30', async () => {
    const at = new Date(NOW.getTime() - 40 * DAY_MS);
    const { id } = await createSpace();
    await prisma.space.update({
      where: { id },
      data: {
        profileUpdatedAt: at,
        hoursUpdatedAt: at,
        pricesUpdatedAt: at,
        amenitiesUpdatedAt: at,
        contactsUpdatedAt: at,
      },
    });
    const staleGroups = async () =>
      (
        dataOf(await adminRequest(app, admin, 'get', `/spaces/${String(id)}`)) as {
          staleGroups: string[];
        }
      ).staleGroups;

    expect(await staleGroups()).toEqual(['prices']);
    await card('put', 'staleness', { stalenessDays: 30, priceStalenessDays: 30 });
    expect([...(await staleGroups())].sort()).toEqual([
      'amenities',
      'contacts',
      'hours',
      'prices',
      'profile',
    ]);
  });

  it("two saves of one card at once: the second's before is the first's after", async () => {
    const second = await whileHeld(
      (tx) => tx.$queryRaw`SELECT "key" FROM "settings" WHERE "key" = 'stalenessDays' FOR UPDATE`,
      () => card('put', 'staleness', { stalenessDays: 45, priceStalenessDays: 30 }),
      // The first save, committed while the second waits.
      (tx) => tx.setting.update({ where: { key: 'stalenessDays' }, data: { value: 50 } }),
    );

    expect(second.status).toBe(200);
    expect((await stored()).stalenessDays).toBe(45);
    expect(await auditEntries()).toMatchObject([
      {
        action: 'platformSettings.stalenessEdited',
        before: { stalenessDays: 50 },
        after: { stalenessDays: 45 },
      },
    ]);
  });

  it('two first saves of the contact at once make one row per key, both 200', async () => {
    let second: Promise<Awaited<ReturnType<typeof card>>> | undefined;
    await prisma.$transaction(
      async (tx) => {
        // The first save's rows, inserted and not yet committed.
        await tx.$executeRaw`INSERT INTO "settings" ("key", "value", "updated_at")
          VALUES ('contactEmail', '"first@masaha.ps"'::jsonb, now()), ('contactWhatsapp', 'null'::jsonb, now())`;
        second = Promise.resolve(
          card('put', 'contact', { email: 'second@masaha.ps', whatsapp: null }),
        );
        await waitingOnLock({ count: 1 });
      },
      { timeout: 10_000 },
    );
    if (!second) throw new Error('The second save never started');
    const answer = await second;

    expect(answer.status).toBe(200);
    expect(dataOf(answer)).toEqual({ email: 'second@masaha.ps', whatsapp: null });
    const rows = await prisma.setting.findMany({
      where: { key: { startsWith: 'contact' } },
      select: { key: true, value: true },
      orderBy: { key: 'asc' },
    });
    expect(rows).toEqual([
      { key: 'contactEmail', value: 'second@masaha.ps' },
      { key: 'contactWhatsapp', value: null },
    ]);
    expect(await auditEntries()).toMatchObject([
      { before: { email: 'first@masaha.ps' }, after: { email: 'second@masaha.ps' } },
    ]);
  });

  it.each(REFUSED_CALLERS)(
    'a $caller is $status on the six routes',
    async ({ caller, status, type, code }) => {
      const as = caller === 'guest' ? caller : await signIn(caller, 'refused@example.com');
      for (const { method, path, body } of ROUTES) {
        const response = await adminRequest(app, as, method, path, body);
        expect(response.status, `${method} ${path}`).toBe(status);
        expect({ type: errorOf(response).type, code: errorOf(response).code }).toEqual({
          type,
          code,
        });
      }
      expect(await auditEntries()).toEqual([]);
      expect((await stored()).stalenessDays).toBe(60);
    },
  );

  it('an invalid body is 422 on its field, writing nothing', async () => {
    const refusals = [
      [
        'staleness',
        { stalenessDays: 0, priceStalenessDays: 30 },
        { stalenessDays: ['out_of_range'] },
      ],
      [
        'staleness',
        { stalenessDays: 60, priceStalenessDays: 366 },
        { priceStalenessDays: ['out_of_range'] },
      ],
      ['contact', { email: 'masaha.ps', whatsapp: null }, { email: ['invalid_format'] }],
      ['contact', { email: null, whatsapp: '+201001234567' }, { whatsapp: ['invalid_format'] }],
      ['contact', { email: null }, { whatsapp: ['required'] }],
      [
        'new-space-defaults',
        { ...DEFAULTS, visitRoundingMinutes: null },
        { visitRoundingMinutes: ['required'] },
      ],
    ] as const;
    const before = await stored();

    for (const [path, body, errors] of refusals) {
      const refused = await card('put', path, body);
      expect(refused.status, path).toBe(422);
      expect(errorOf(refused).type).toBe('validation');
      expect(errorOf(refused).errors).toEqual(errors);
    }
    expect(await stored()).toEqual(before);
    expect(await auditEntries()).toEqual([]);
  });
});
