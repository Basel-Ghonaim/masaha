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

const DATED = {
  profileUpdatedAt: BEFORE,
  hoursUpdatedAt: BEFORE,
  pricesUpdatedAt: BEFORE,
  amenitiesUpdatedAt: BEFORE,
  contactsUpdatedAt: BEFORE,
};

let admin: { id: number; authorization: string };
let spaceId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
  admin = await signIn('ADMIN');
  ({ id: spaceId } = await createSpace());
  await prisma.space.update({ where: { id: spaceId }, data: DATED });
});

function confirm(group: string, id = spaceId) {
  return adminRequest(app, admin, 'post', `/spaces/${String(id)}/${group}/confirm`);
}

/** The space's row, as the database holds it. */
function stored() {
  return prisma.space.findUniqueOrThrow({ where: { id: spaceId } });
}

describe('POST /admin/spaces/:spaceId/:group/confirm', () => {
  it.each(['profile', 'hours', 'prices', 'amenities', 'contacts'] as const)(
    'confirms the %s unchanged: its date renewed, the others and the data untouched',
    async (group) => {
      const before = await stored();

      const response = await confirm(group);

      expect(response.status).toBe(200);
      const at = (name: string) => (name === group ? NOW : BEFORE).toISOString();
      expect((dataOf(response) as { updatedAt: unknown }).updatedAt).toEqual({
        profile: at('profile'),
        hours: at('hours'),
        prices: at('prices'),
        amenities: at('amenities'),
        contacts: at('contacts'),
      });
      expect(await stored()).toEqual({
        ...before,
        [`${group}UpdatedAt`]: NOW,
        updatedAt: expect.any(Date) as Date,
      });
    },
  );

  it('audits the confirmation with the group’s date before and after', async () => {
    await confirm('prices');

    expect(await auditEntries()).toEqual([
      {
        actorId: admin.id,
        action: 'space.pricesConfirmed',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        before: { pricesUpdatedAt: BEFORE.toISOString() },
        after: { pricesUpdatedAt: NOW.toISOString() },
      },
    ]);
  });

  it('refuses to confirm a group never saved: there is nothing to confirm', async () => {
    await prisma.space.update({ where: { id: spaceId }, data: { hoursUpdatedAt: null } });

    const response = await confirm('hours');

    expect(response.status).toBe(409);
    expect(errorOf(response)).toMatchObject({ type: 'conflict' });
    expect(errorOf(response).code).toBeUndefined();
    expect((await stored()).hoursUpdatedAt).toBeNull();
    expect(await auditEntries()).toEqual([]);
  });

  it.each(['profile', 'contacts'] as const)(
    'refuses the admin on a verified space, for the %s too, confirming nothing',
    async (group) => {
      await signInOwnerOf(spaceId);

      const response = await confirm(group);

      expect(response.status).toBe(403);
      expect(errorOf(response)).toMatchObject({ type: 'forbidden' });
      expect(await stored()).toMatchObject(DATED);
      expect(await auditEntries()).toEqual([]);
    },
  );

  it('answers not_found for a soft-deleted space, an unknown one and an unknown group', async () => {
    const deleted = await createSpace('gone-hub');
    await prisma.space.update({ where: { id: deleted.id }, data: { deletedAt: NOW, ...DATED } });

    expect((await confirm('hours', deleted.id)).status).toBe(404);
    expect((await confirm('hours', 999)).status).toBe(404);
    expect((await confirm('photos')).status).toBe(404);
    expect(await auditEntries()).toEqual([]);
  });
});
