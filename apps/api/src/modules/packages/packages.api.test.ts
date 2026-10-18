import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace } from '../../../test/factories.ts';
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
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const read = await packages(caller, 'get');
      expect(read.status).toBe(404);
      expect(errorOf(read).type).toBe('not_found');
    }
  });
});
