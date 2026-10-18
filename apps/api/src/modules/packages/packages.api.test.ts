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
let shift: { id: number };
let otherShift: { id: number };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  stranger = await signIn('USER', 'stranger@example.com');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  unrelatedOwner = await signInOwnerOf(otherSpaceId);
  admin = await signIn('ADMIN');
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
  shift = await prisma.spaceShift.create({
    data: { spaceId, nameAr: 'صباحي', startsMinute: 480, endsMinute: 840 },
  });
  otherShift = await prisma.spaceShift.create({
    data: { spaceId: otherSpaceId, nameAr: 'صباحي', startsMinute: 480, endsMinute: 840 },
  });
});

/** The packages route of the space `at`, by default the one under test. */
function packages(
  caller: { authorization: string },
  method: 'get' | 'post' | 'patch',
  suffix = '',
  body?: object,
  at = spaceId,
) {
  const path = `/api/v1/manage/spaces/${String(at)}/packages${suffix}`;
  const call = request(app)[method](path).set('Authorization', caller.authorization);
  return body ? call.send(body) : call;
}

const VALID = {
  name: 'Morning',
  validityDays: 30,
  billing: 'FIXED',
  priceAgorot: 5000,
  audience: 'GENERAL',
} as const;

describe("a space's packages", () => {
  it('answers the owner and reception every package of the space, retired ones included, by place then name, whole', async () => {
    const terms = { validityDays: 30, billing: 'FIXED', priceAgorot: 5000 } as const;
    const beta = await prisma.package.create({ data: { spaceId, name: 'Beta', ...terms } });
    const alpha = await prisma.package.create({
      data: { spaceId, name: 'Alpha', ...terms, isActive: false },
    });
    const aardvark = await prisma.package.create({
      data: { spaceId, name: 'Aardvark', ...terms, sortOrder: 1 },
    });
    await prisma.package.create({ data: { spaceId: otherSpaceId, name: 'Other', ...terms } });

    const ownerRead = await packages(owner, 'get');
    const receptionRead = await packages(reception, 'get');

    expect(ownerRead.status).toBe(200);
    expect(dataOf(ownerRead)).toEqual([
      {
        id: alpha.id,
        name: 'Alpha',
        validityDays: 30,
        totalDays: null,
        daysPerWeek: null,
        hoursPerDay: null,
        totalHours: null,
        billing: 'FIXED',
        priceAgorot: 5000,
        audience: 'GENERAL',
        shiftId: null,
        isActive: false,
      },
      {
        id: beta.id,
        name: 'Beta',
        validityDays: 30,
        totalDays: null,
        daysPerWeek: null,
        hoursPerDay: null,
        totalHours: null,
        billing: 'FIXED',
        priceAgorot: 5000,
        audience: 'GENERAL',
        shiftId: null,
        isActive: true,
      },
      {
        id: aardvark.id,
        name: 'Aardvark',
        validityDays: 30,
        totalDays: null,
        daysPerWeek: null,
        hoursPerDay: null,
        totalHours: null,
        billing: 'FIXED',
        priceAgorot: 5000,
        audience: 'GENERAL',
        shiftId: null,
        isActive: true,
      },
    ]);
    expect((ownerRead.body as { meta?: unknown }).meta).toBeUndefined();
    expect(receptionRead.status).toBe(200);
    expect(dataOf(receptionRead)).toEqual(dataOf(ownerRead));
  });

  it('answers not_found to a stranger, an owner of another space and an unlinked admin', async () => {
    const seeded = await prisma.package.create({
      data: { spaceId, name: 'Alpha', validityDays: 30, billing: 'FIXED', priceAgorot: 5000 },
    });

    for (const caller of [stranger, unrelatedOwner, admin]) {
      const read = await packages(caller, 'get');
      expect(read.status).toBe(404);
      expect(errorOf(read).type).toBe('not_found');

      const create = await packages(caller, 'post', '', VALID);
      expect(create.status).toBe(404);
      expect(errorOf(create).type).toBe('not_found');

      const edit = await packages(caller, 'patch', `/${String(seeded.id)}`, { priceAgorot: 1 });
      expect(edit.status).toBe(404);
      expect(errorOf(edit).type).toBe('not_found');
    }

    // Only the seeded one: no refused create wrote a row, and the edit changed none.
    expect(await prisma.package.count()).toBe(1);
    const stored = await prisma.package.findUniqueOrThrow({ where: { id: seeded.id } });
    expect(stored.priceAgorot).toBe(5000);
  });

  it('creates an active package with its terms, placed after the last, and audits package.created', async () => {
    const zeta = await packages(owner, 'post', '', { ...VALID, name: 'Zeta' });
    expect(zeta.status).toBe(201);
    const zetaId = (dataOf(zeta) as { id: number }).id;
    expect(zetaId).toEqual(expect.any(Number));
    expect(dataOf(zeta)).toEqual({
      id: zetaId,
      name: 'Zeta',
      validityDays: 30,
      totalDays: null,
      daysPerWeek: null,
      hoursPerDay: null,
      totalHours: null,
      billing: 'FIXED',
      priceAgorot: 5000,
      audience: 'GENERAL',
      shiftId: null,
      isActive: true,
    });

    const alpha = await packages(owner, 'post', '', {
      name: 'Alpha',
      validityDays: 45,
      totalDays: 10,
      daysPerWeek: 3,
      hoursPerDay: 5,
      totalHours: 40,
      billing: 'PER_DAY',
      priceAgorot: 1000,
      audience: 'STUDENT',
      shiftId: shift.id,
    });
    expect(alpha.status).toBe(201);
    const alphaId = (dataOf(alpha) as { id: number }).id;
    expect(alphaId).toEqual(expect.any(Number));
    expect(dataOf(alpha)).toEqual({
      id: alphaId,
      name: 'Alpha',
      validityDays: 45,
      totalDays: 10,
      daysPerWeek: 3,
      hoursPerDay: 5,
      totalHours: 40,
      billing: 'PER_DAY',
      priceAgorot: 1000,
      audience: 'STUDENT',
      shiftId: shift.id,
      isActive: true,
    });

    const listed = await packages(owner, 'get');
    expect(listed.status).toBe(200);
    expect((dataOf(listed) as { name: string }[]).map(({ name }) => name)).toEqual([
      'Zeta',
      'Alpha',
    ]);

    expect(await auditEntries()).toEqual([
      {
        actorId: owner.id,
        action: 'package.created',
        entityType: 'package',
        entityId: zetaId,
        spaceId,
        before: null,
        after: {
          name: 'Zeta',
          validityDays: 30,
          totalDays: null,
          daysPerWeek: null,
          hoursPerDay: null,
          totalHours: null,
          billing: 'FIXED',
          priceAgorot: 5000,
          audience: 'GENERAL',
          shiftId: null,
        },
      },
      {
        actorId: owner.id,
        action: 'package.created',
        entityType: 'package',
        entityId: alphaId,
        spaceId,
        before: null,
        after: {
          name: 'Alpha',
          validityDays: 45,
          totalDays: 10,
          daysPerWeek: 3,
          hoursPerDay: 5,
          totalHours: 40,
          billing: 'PER_DAY',
          priceAgorot: 1000,
          audience: 'STUDENT',
          shiftId: shift.id,
        },
      },
    ]);
  });

  it('refuses a price of zero and a limit out of its range on their fields, writing nothing', async () => {
    const refused = await packages(owner, 'post', '', {
      ...VALID,
      priceAgorot: 0,
      daysPerWeek: 8,
    });

    expect(refused.status).toBe(422);
    expect(errorOf(refused).type).toBe('validation');
    expect(errorOf(refused).errors).toEqual({
      priceAgorot: ['out_of_range'],
      daysPerWeek: ['out_of_range'],
    });
    expect(await prisma.package.count()).toBe(0);
  });

  it('refuses a name another package of the space holds, retired or not, on its field; another space may hold it', async () => {
    expect((await packages(owner, 'post', '', { ...VALID, name: 'Alpha' })).status).toBe(201);
    const alpha = await prisma.package.findFirstOrThrow({ where: { spaceId, name: 'Alpha' } });
    await prisma.package.update({ where: { id: alpha.id }, data: { isActive: false } });

    const repeated = await packages(owner, 'post', '', { ...VALID, name: 'Alpha' });
    expect(repeated.status).toBe(409);
    expect(errorOf(repeated).type).toBe('conflict');
    expect(errorOf(repeated).errors).toEqual({ name: ['not_unique'] });

    expect(await prisma.package.count({ where: { spaceId } })).toBe(1);
    expect(await auditEntries()).toHaveLength(1);

    const elsewhere = await packages(
      unrelatedOwner,
      'post',
      '',
      { ...VALID, name: 'Alpha' },
      otherSpaceId,
    );
    expect(elsewhere.status).toBe(201);
  });

  it('refuses a shift that is not the space’s own with invalid_choice on shiftId, writing nothing', async () => {
    const foreign = await packages(owner, 'post', '', { ...VALID, shiftId: otherShift.id });
    const unknown = await packages(owner, 'post', '', { ...VALID, shiftId: 2147483647 });

    for (const refused of [foreign, unknown]) {
      expect(refused.status).toBe(422);
      expect(errorOf(refused).type).toBe('validation');
      expect(errorOf(refused).errors).toEqual({ shiftId: ['invalid_choice'] });
    }
    expect(await prisma.package.count()).toBe(0);
  });

  it('refuses reception’s create with 403 before reading its body, and writes nothing', async () => {
    const empty = await packages(reception, 'post', '', {});
    const valid = await packages(reception, 'post', '', VALID);

    for (const refused of [empty, valid]) {
      expect(refused.status).toBe(403);
      expect(errorOf(refused).type).toBe('forbidden');
    }
    expect(await prisma.package.count()).toBe(0);
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses reception’s edit with 403 before reading its body, and changes nothing', async () => {
    const created = await prisma.package.create({
      data: { spaceId, name: 'Alpha', validityDays: 30, billing: 'FIXED', priceAgorot: 5000 },
    });

    const empty = await packages(reception, 'patch', `/${String(created.id)}`, { priceAgorot: 0 });
    const valid = await packages(reception, 'patch', `/${String(created.id)}`, {
      priceAgorot: 6000,
    });

    for (const refused of [empty, valid]) {
      expect(refused.status).toBe(403);
      expect(errorOf(refused).type).toBe('forbidden');
    }
    const stored = await prisma.package.findUniqueOrThrow({ where: { id: created.id } });
    expect(stored.priceAgorot).toBe(5000);
    expect(await auditEntries()).toEqual([]);
  });

  it('decides a write on the links under the space’s lock: an owner unlinked meanwhile is refused', async () => {
    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`,
      () => packages(owner, 'post', '', VALID),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: owner.id } },
          data: { deactivatedAt: new Date() },
        }),
    );

    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    expect(await prisma.package.count()).toBe(0);
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses a write to a space deleted while it waited for its lock', async () => {
    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`,
      () => packages(owner, 'post', '', VALID),
      (tx) => tx.space.update({ where: { id: spaceId }, data: { deletedAt: new Date() } }),
    );

    expect(response.status).toBe(404);
    expect(errorOf(response).type).toBe('not_found');
    expect(await prisma.package.count()).toBe(0);
  });

  it('edits what the patch sets, clears a limit with null, and audits package.edited with the fields that changed', async () => {
    const created = await packages(owner, 'post', '', {
      ...VALID,
      name: 'Alpha',
      totalDays: 10,
      hoursPerDay: 5,
    });
    const id = (dataOf(created) as { id: number }).id;

    const edited = await packages(owner, 'patch', `/${String(id)}`, {
      name: 'Alpha',
      priceAgorot: 6000,
      totalDays: null,
    });
    expect(edited.status).toBe(200);
    expect(dataOf(edited)).toEqual({
      id,
      name: 'Alpha',
      validityDays: 30,
      totalDays: null,
      daysPerWeek: null,
      hoursPerDay: 5,
      totalHours: null,
      billing: 'FIXED',
      priceAgorot: 6000,
      audience: 'GENERAL',
      shiftId: null,
      isActive: true,
    });

    const entries = await auditEntries();
    expect(entries.at(-1)).toEqual({
      actorId: owner.id,
      action: 'package.edited',
      entityType: 'package',
      entityId: id,
      spaceId,
      before: { priceAgorot: 5000, totalDays: 10 },
      after: { priceAgorot: 6000, totalDays: null },
    });
  });

  it('retires a package with isActive false, keeps it in the list, and offers it again', async () => {
    const created = await packages(owner, 'post', '', { ...VALID, name: 'Alpha' });
    const id = (dataOf(created) as { id: number }).id;

    const retired = await packages(owner, 'patch', `/${String(id)}`, { isActive: false });
    expect(retired.status).toBe(200);
    expect((dataOf(retired) as { isActive: boolean }).isActive).toBe(false);

    const listed = await packages(owner, 'get');
    expect(dataOf(listed)).toEqual([expect.objectContaining({ id, isActive: false })]);

    const entries = await auditEntries();
    expect(entries.at(-1)).toEqual({
      actorId: owner.id,
      action: 'package.edited',
      entityType: 'package',
      entityId: id,
      spaceId,
      before: { isActive: true },
      after: { isActive: false },
    });

    const offered = await packages(owner, 'patch', `/${String(id)}`, { isActive: true });
    expect(offered.status).toBe(200);
    expect((dataOf(offered) as { isActive: boolean }).isActive).toBe(true);
  });

  it('writes nothing for a patch that changes nothing', async () => {
    const created = await packages(owner, 'post', '', { ...VALID, name: 'Alpha' });
    const id = (dataOf(created) as { id: number }).id;
    const before = await prisma.package.findUniqueOrThrow({ where: { id } });

    for (const body of [{}, { name: 'Alpha', priceAgorot: 5000 }]) {
      const answer = await packages(owner, 'patch', `/${String(id)}`, body);
      expect(answer.status).toBe(200);
      expect(dataOf(answer)).toEqual(dataOf(created));
    }

    const after = await prisma.package.findUniqueOrThrow({ where: { id } });
    expect(after.updatedAt).toEqual(before.updatedAt);
    expect(await auditEntries()).toHaveLength(1);
  });

  it('answers not_found for a package of another space, or an id no package has, changing nothing', async () => {
    const other = await prisma.package.create({
      data: {
        spaceId: otherSpaceId,
        name: 'Other',
        validityDays: 30,
        billing: 'FIXED',
        priceAgorot: 5000,
      },
    });

    const foreign = await packages(owner, 'patch', `/${String(other.id)}`, { priceAgorot: 1 });
    expect(foreign.status).toBe(404);
    expect(errorOf(foreign).type).toBe('not_found');
    const untouched = await prisma.package.findUniqueOrThrow({ where: { id: other.id } });
    expect(untouched.priceAgorot).toBe(5000);

    for (const suffix of ['/999999', '/abc']) {
      const unknown = await packages(owner, 'patch', suffix, { priceAgorot: 1 });
      expect(unknown.status).toBe(404);
      expect(errorOf(unknown).type).toBe('not_found');
    }
  });

  it('refuses renaming to another package’s name, and a shift that is not the space’s own, on their fields', async () => {
    const alpha = await packages(owner, 'post', '', { ...VALID, name: 'Alpha' });
    const beta = await packages(owner, 'post', '', { ...VALID, name: 'Beta' });
    const betaId = (dataOf(beta) as { id: number }).id;

    const renamed = await packages(owner, 'patch', `/${String(betaId)}`, { name: 'Alpha' });
    expect(renamed.status).toBe(409);
    expect(errorOf(renamed).type).toBe('conflict');
    expect(errorOf(renamed).errors).toEqual({ name: ['not_unique'] });

    const shifted = await packages(owner, 'patch', `/${String(betaId)}`, {
      shiftId: otherShift.id,
    });
    expect(shifted.status).toBe(422);
    expect(errorOf(shifted).type).toBe('validation');
    expect(errorOf(shifted).errors).toEqual({ shiftId: ['invalid_choice'] });

    const stored = await prisma.package.findUniqueOrThrow({ where: { id: betaId } });
    expect(stored.name).toBe('Beta');
    expect(stored.shiftId).toBeNull();
    const untouched = await prisma.package.findUniqueOrThrow({
      where: { id: (dataOf(alpha) as { id: number }).id },
    });
    expect(untouched.name).toBe('Alpha');
    expect(untouched.shiftId).toBeNull();
    expect(await auditEntries()).toHaveLength(2);
  });

  it('decides an edit on the links under the space’s lock: an owner unlinked meanwhile is refused', async () => {
    const seeded = await prisma.package.create({
      data: { spaceId, name: 'Alpha', validityDays: 30, billing: 'FIXED', priceAgorot: 5000 },
    });

    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`,
      () => packages(owner, 'patch', `/${String(seeded.id)}`, { priceAgorot: 6000 }),
      (tx) =>
        tx.spaceManager.update({
          where: { spaceId_userId: { spaceId, userId: owner.id } },
          data: { deactivatedAt: new Date() },
        }),
    );

    expect(response.status).toBe(403);
    expect(errorOf(response).type).toBe('forbidden');
    const stored = await prisma.package.findUniqueOrThrow({ where: { id: seeded.id } });
    expect(stored.priceAgorot).toBe(5000);
    expect(await auditEntries()).toEqual([]);
  });

  it('refuses an edit to a space deleted while it waited for its lock, and writes nothing', async () => {
    const seeded = await prisma.package.create({
      data: { spaceId, name: 'Alpha', validityDays: 30, billing: 'FIXED', priceAgorot: 5000 },
    });

    const response = await whileHeld(
      (tx) => tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`,
      () => packages(owner, 'patch', `/${String(seeded.id)}`, { priceAgorot: 6000 }),
      (tx) => tx.space.update({ where: { id: spaceId }, data: { deletedAt: new Date() } }),
    );

    expect(response.status).toBe(404);
    expect(errorOf(response).type).toBe('not_found');
    const stored = await prisma.package.findUniqueOrThrow({ where: { id: seeded.id } });
    expect(stored.priceAgorot).toBe(5000);
    expect(await auditEntries()).toEqual([]);
  });
});
