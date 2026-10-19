import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace } from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

const app = createTestApp();
let spaceId: number;
let otherSpaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let unrelatedOwner: { id: number; authorization: string };
let admin: { id: number; authorization: string };

/** The space's settings as its creation writes them: the four defaults, the rest the database's. */
const STARTING = {
  autoCheckoutAtClosing: true,
  maxStayMinutes: null,
  visitRounding: 'UP_AFTER_MINUTES',
  visitRoundingMinutes: 15,
  visitCapAtDayPrice: true,
  visitStudentPrices: true,
  receptionMayTypePrices: false,
  reminderTemplate: null,
} as const;

/** The other space's settings, each unlike the space's. */
const OTHER = {
  autoCheckoutAtClosing: false,
  maxStayMinutes: 120,
  visitRounding: 'PER_MINUTE',
  visitRoundingMinutes: null,
  visitCapAtDayPrice: false,
  visitStudentPrices: false,
  receptionMayTypePrices: true,
  reminderTemplate: 'باقي عليك {المبلغ}',
} as const;

beforeEach(async () => {
  await resetDatabase(prisma);
  // The other space first, so a read that ignores the space meets its row first.
  ({ id: otherSpaceId } = await createSpace('other-space'));
  await prisma.spaceSettings.create({ data: { spaceId: otherSpaceId, ...OTHER } });
  ({ id: spaceId } = await createSpace());
  await prisma.spaceSettings.create({
    data: {
      spaceId,
      autoCheckoutAtClosing: true,
      visitRounding: 'UP_AFTER_MINUTES',
      visitRoundingMinutes: 15,
      visitCapAtDayPrice: true,
    },
  });
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  stranger = await signIn('USER', 'stranger@example.com');
  unrelatedOwner = await signInOwnerOf(otherSpaceId);
  admin = await signIn('ADMIN');
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
});

/** The settings route of the space, as the caller. */
function settings(caller: { authorization: string }, method: 'get' | 'patch', body?: object) {
  const path = `/api/v1/manage/spaces/${String(spaceId)}/settings`;
  const call = request(app)[method](path).set('Authorization', caller.authorization);
  return body ? call.send(body) : call;
}

/** The space's settings row, as stored. */
function storedSettings(at = spaceId) {
  return prisma.spaceSettings.findUniqueOrThrow({
    where: { spaceId: at },
    select: {
      autoCheckoutAtClosing: true,
      maxStayMinutes: true,
      visitRounding: true,
      visitRoundingMinutes: true,
      visitCapAtDayPrice: true,
      visitStudentPrices: true,
      receptionMayTypePrices: true,
      reminderTemplate: true,
    },
  });
}

describe("a space's settings", () => {
  it("answers the owner the space's settings, and only its own", async () => {
    await prisma.spaceSettings.update({
      where: { spaceId },
      data: { maxStayMinutes: 300, reminderTemplate: 'عليك {المبلغ}' },
    });

    const read = await settings(owner, 'get');

    expect(read.status).toBe(200);
    expect(dataOf(read)).toEqual({
      ...STARTING,
      maxStayMinutes: 300,
      reminderTemplate: 'عليك {المبلغ}',
    });
    expect(dataOf(read)).toEqual(await storedSettings());
  });

  it('answers not_found to a stranger, an owner of another space and an unlinked admin, on the read and the edit, changing nothing', async () => {
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const read = await settings(caller, 'get');
      expect(read.status).toBe(404);
      expect(errorOf(read).type).toBe('not_found');

      const edit = await settings(caller, 'patch', { maxStayMinutes: 240 });
      expect(edit.status).toBe(404);
      expect(errorOf(edit).type).toBe('not_found');
    }

    expect(await storedSettings()).toEqual(STARTING);
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses reception’s read and edit with 403 before reading the body, changing nothing', async () => {
    const read = await settings(reception, 'get');
    const invalid = await settings(reception, 'patch', { maxStayMinutes: 0 });
    const valid = await settings(reception, 'patch', { maxStayMinutes: 240 });

    for (const refused of [read, invalid, valid]) {
      expect(refused.status).toBe(403);
      expect(errorOf(refused).type).toBe('forbidden');
    }
    expect(await storedSettings()).toEqual(STARTING);
    expect(await auditEntries()).toEqual([]);
  });

  it('edits what the patch sets, clears with null, and audits space.settingsEdited with only the fields that changed', async () => {
    const edited = await settings(owner, 'patch', {
      autoCheckoutAtClosing: false,
      maxStayMinutes: 240,
      visitCapAtDayPrice: true,
      receptionMayTypePrices: true,
      reminderTemplate: 'عليك {المبلغ}',
    });

    const changed = {
      ...STARTING,
      autoCheckoutAtClosing: false,
      maxStayMinutes: 240,
      receptionMayTypePrices: true,
      reminderTemplate: 'عليك {المبلغ}',
    };
    expect(edited.status).toBe(200);
    expect(dataOf(edited)).toEqual(changed);
    expect(await storedSettings()).toEqual(changed);
    expect(await storedSettings(otherSpaceId)).toEqual(OTHER);
    expect(await auditEntries()).toEqual([
      {
        actorId: owner.id,
        action: 'space.settingsEdited',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        before: {
          autoCheckoutAtClosing: true,
          maxStayMinutes: null,
          receptionMayTypePrices: false,
          reminderTemplate: null,
        },
        after: {
          autoCheckoutAtClosing: false,
          maxStayMinutes: 240,
          receptionMayTypePrices: true,
          reminderTemplate: 'عليك {المبلغ}',
        },
      },
    ]);

    const cleared = await settings(owner, 'patch', {
      maxStayMinutes: null,
      reminderTemplate: null,
    });

    expect(cleared.status).toBe(200);
    expect(dataOf(cleared)).toEqual({ ...changed, maxStayMinutes: null, reminderTemplate: null });
    const entries = await auditEntries();
    expect(entries).toHaveLength(2);
    expect(entries.at(-1)).toEqual({
      actorId: owner.id,
      action: 'space.settingsEdited',
      entityType: 'space',
      entityId: spaceId,
      spaceId,
      before: { maxStayMinutes: 240, reminderTemplate: 'عليك {المبلغ}' },
      after: { maxStayMinutes: null, reminderTemplate: null },
    });
  });

  it('changes the rounding rule and its minutes together', async () => {
    const perMinute = await settings(owner, 'patch', {
      visitRounding: 'PER_MINUTE',
      visitRoundingMinutes: null,
    });
    expect(perMinute.status).toBe(200);
    expect(await storedSettings()).toMatchObject({
      visitRounding: 'PER_MINUTE',
      visitRoundingMinutes: null,
    });

    const upAfter = await settings(owner, 'patch', {
      visitRounding: 'UP_AFTER_MINUTES',
      visitRoundingMinutes: 20,
    });
    expect(upAfter.status).toBe(200);
    expect(dataOf(upAfter)).toMatchObject({
      visitRounding: 'UP_AFTER_MINUTES',
      visitRoundingMinutes: 20,
    });
    expect(await storedSettings()).toMatchObject({
      visitRounding: 'UP_AFTER_MINUTES',
      visitRoundingMinutes: 20,
    });
    expect((await auditEntries()).at(-1)).toMatchObject({
      action: 'space.settingsEdited',
      before: { visitRounding: 'PER_MINUTE', visitRoundingMinutes: null },
      after: { visitRounding: 'UP_AFTER_MINUTES', visitRoundingMinutes: 20 },
    });
  });

  it('refuses a bound on its field, writing nothing', async () => {
    const refusals = [
      [{ maxStayMinutes: 1_440 }, { maxStayMinutes: ['out_of_range'] }],
      [
        { visitRounding: 'UP_AFTER_MINUTES', visitRoundingMinutes: 60 },
        { visitRoundingMinutes: ['out_of_range'] },
      ],
      [{ visitRounding: 'PER_MINUTE' }, { visitRoundingMinutes: ['required'] }],
    ] as const;

    for (const [body, errors] of refusals) {
      const refused = await settings(owner, 'patch', body);
      expect(refused.status).toBe(422);
      expect(errorOf(refused).type).toBe('validation');
      expect(errorOf(refused).errors).toEqual(errors);
    }
    expect(await storedSettings()).toEqual(STARTING);
    expect(await auditEntries()).toEqual([]);
  });

  it('writes nothing for a patch that changes nothing', async () => {
    const { updatedAt } = await prisma.spaceSettings.findUniqueOrThrow({ where: { spaceId } });

    for (const body of [{}, STARTING]) {
      const unchanged = await settings(owner, 'patch', body);
      expect(unchanged.status).toBe(200);
      expect(dataOf(unchanged)).toEqual(STARTING);
    }
    expect(await auditEntries()).toEqual([]);
    const stored = await prisma.spaceSettings.findUniqueOrThrow({ where: { spaceId } });
    expect(stored.updatedAt).toEqual(updatedAt);
  });

  it('decides an edit on the links under the space’s lock: an owner unlinked meanwhile is refused', async () => {
    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`,
      () => settings(owner, 'patch', { maxStayMinutes: 240 }),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: owner.id } },
          data: { deactivatedAt: new Date() },
        }),
    );

    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    expect(await storedSettings()).toEqual(STARTING);
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses an edit to a space deleted while it waited for its lock, and writes nothing', async () => {
    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`,
      () => settings(owner, 'patch', { maxStayMinutes: 240 }),
      (tx) => tx.space.update({ where: { id: spaceId }, data: { deletedAt: new Date() } }),
    );

    expect(response.status).toBe(404);
    expect(errorOf(response).type).toBe('not_found');
    expect(await storedSettings()).toEqual(STARTING);
    expect(await auditEntries()).toEqual([]);
  });
});
