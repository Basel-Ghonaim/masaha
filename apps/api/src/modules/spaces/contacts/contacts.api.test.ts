import { beforeEach, describe, expect, it } from 'vitest';

import { adminRequest, auditEntries, dataOf, errorOf, signIn } from '../../../../test/admin.ts';
import { createTestApp } from '../../../../test/app.ts';
import { createSpace } from '../../../../test/factories.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { seedSettings, signInOwnerOf } from '../../../../test/spaces.ts';
import { prisma } from '../../../db/index.ts';

const NOW = new Date('2026-10-06T09:00:00.000Z');
const BEFORE = new Date('2026-09-01T09:00:00.000Z');
const app = createTestApp({ clock: () => NOW });

let admin: { id: number; authorization: string };
let spaceId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  admin = await signIn('ADMIN');
  ({ id: spaceId } = await createSpace());
  await prisma.space.update({
    where: { id: spaceId },
    data: {
      profileUpdatedAt: BEFORE,
      hoursUpdatedAt: BEFORE,
      pricesUpdatedAt: BEFORE,
      amenitiesUpdatedAt: BEFORE,
      contactsUpdatedAt: BEFORE,
    },
  });
});

function save(contacts: { type: string; value: string }[], id = spaceId) {
  return adminRequest(app, admin, 'put', `/spaces/${String(id)}/contacts`, { contacts });
}

/** The contacts the database holds, in their order, and the contacts' date. */
async function stored() {
  return {
    contacts: await prisma.spaceContact.findMany({
      where: { spaceId },
      orderBy: { sortOrder: 'asc' },
      select: { type: true, value: true, sortOrder: true },
    }),
    contactsUpdatedAt: (await prisma.space.findUniqueOrThrow({ where: { id: spaceId } }))
      .contactsUpdatedAt,
  };
}

describe('PUT /admin/spaces/:spaceId/contacts', () => {
  it('replaces the contacts in their order, each in its stored form, and dates them now', async () => {
    await prisma.spaceContact.create({ data: { spaceId, type: 'EMAIL', value: 'old@masaha.ps' } });

    const response = await save([
      { type: 'WHATSAPP', value: '059-912 3456' },
      { type: 'INSTAGRAM', value: '@masaha' },
      { type: 'EMAIL', value: 'Hello@Masaha.PS' },
    ]);

    expect(response.status).toBe(200);
    const contacts = [
      { type: 'WHATSAPP', value: '+970599123456' },
      { type: 'INSTAGRAM', value: 'https://www.instagram.com/masaha' },
      { type: 'EMAIL', value: 'hello@masaha.ps' },
    ];
    const data = dataOf(response) as { contacts: unknown; updatedAt: { contacts: string } };
    expect(data.contacts).toEqual(contacts);
    expect(data.updatedAt.contacts).toBe(NOW.toISOString());
    expect(await stored()).toEqual({
      contacts: contacts.map((contact, sortOrder) => ({ ...contact, sortOrder })),
      contactsUpdatedAt: NOW,
    });
    expect(await prisma.space.findUniqueOrThrow({ where: { id: spaceId } })).toMatchObject({
      profileUpdatedAt: BEFORE,
      hoursUpdatedAt: BEFORE,
      pricesUpdatedAt: BEFORE,
      amenitiesUpdatedAt: BEFORE,
    });
  });

  it('answers the contacts in the space’s read', async () => {
    await save([{ type: 'TIKTOK', value: 'masaha' }]);

    const response = await adminRequest(app, admin, 'get', `/spaces/${String(spaceId)}`);

    expect((dataOf(response) as { contacts: unknown }).contacts).toEqual([
      { type: 'TIKTOK', value: 'https://www.tiktok.com/@masaha' },
    ]);
  });

  it('audits the contacts before and after, whole', async () => {
    await prisma.spaceContact.create({ data: { spaceId, type: 'EMAIL', value: 'old@masaha.ps' } });

    await save([{ type: 'PHONE', value: '0599123456' }]);

    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'space.contactsEdited',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        before: { contacts: [{ type: 'EMAIL', value: 'old@masaha.ps' }] },
        after: { contacts: [{ type: 'PHONE', value: '+970599123456' }] },
      },
    ]);
  });

  it('refuses an invalid contact or a repeated one with the shared rules, writing nothing', async () => {
    const invalid = await save([{ type: 'INSTAGRAM', value: 'https://www.facebook.com/masaha' }]);
    const repeated = await save([
      { type: 'WHATSAPP', value: '0599123456' },
      { type: 'WHATSAPP', value: '+970599123456' },
    ]);

    expect(invalid.status).toBe(422);
    expect(errorOf(invalid).errors).toEqual({ 'contacts.0.value': ['invalid_format'] });
    expect(errorOf(repeated).errors).toEqual({ 'contacts.1.value': ['not_unique'] });
    expect(await stored()).toEqual({ contacts: [], contactsUpdatedAt: BEFORE });
  });

  it('dates the contacts at their first save, even with none, and a repeat writes nothing', async () => {
    await prisma.space.update({ where: { id: spaceId }, data: { contactsUpdatedAt: null } });

    await save([]);
    const first = await stored();
    await prisma.space.update({ where: { id: spaceId }, data: { contactsUpdatedAt: BEFORE } });
    await save([]);

    expect(first.contactsUpdatedAt).toEqual(NOW);
    expect((await stored()).contactsUpdatedAt).toEqual(BEFORE);
    expect((await auditEntries()).map(({ action }) => action)).toEqual(['space.contactsEdited']);
  });

  it('refuses the admin once an owner has joined, writing nothing', async () => {
    await signInOwnerOf(spaceId);

    const response = await save([{ type: 'PHONE', value: '0599123456' }]);

    expect(response.status).toBe(403);
    expect(await stored()).toEqual({ contacts: [], contactsUpdatedAt: BEFORE });
    expect(await auditEntries()).toEqual([]);
  });

  it('answers not_found for a soft-deleted space and an unknown one', async () => {
    await prisma.space.update({ where: { id: spaceId }, data: { deletedAt: NOW } });

    expect((await save([])).status).toBe(404);
    expect((await save([], 999)).status).toBe(404);
  });
});
