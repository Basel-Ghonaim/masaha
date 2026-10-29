import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { errorOf, signIn } from '../../../test/admin.ts';
import { createSpace } from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// Who reads the space's finance (docs/backend/security.md › Authorization): the owner alone
// (`finance.read`). Reception is refused at the route, before the query is read; anyone who is
// not the space's staff, the admin included, meets the boundary's `not_found`.
const app = createTestApp({ clock: () => new Date('2026-10-29T10:00:00+02:00') });

/** Each finance route, with a query its validation would refuse. */
const ROUTES = [
  'income?month=2026-13',
  'debts?state=PAID',
  'payers?month=2026-13',
  'occupancy?month=2026-13',
];

let spaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let otherOwner: { id: number; authorization: string };
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  await prisma.spaceManager.create({ data: { spaceId, userId: reception.id, role: 'RECEPTION' } });
  stranger = await signIn('USER', 'stranger@example.com');
  otherOwner = await signInOwnerOf((await createSpace('other-space')).id);
  admin = await signIn('ADMIN');
});

function read(caller: { authorization: string }, route: string) {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/finance/${route}`)
    .set('Authorization', caller.authorization);
}

describe("who reads the space's finance", () => {
  it('reception is 403 on the finance routes before the query is read (an invalid month still 403); a stranger, another space’s owner and the admin not_found', async () => {
    for (const route of ROUTES) {
      const refused = await read(reception, route);
      expect(refused.status, route).toBe(403);
      expect(errorOf(refused).type).toBe('forbidden');

      // The owner meets the query's validation: the route is the owner's.
      expect((await read(owner, route)).status, route).toBe(422);

      for (const caller of [stranger, otherOwner, admin]) {
        const missing = await read(caller, route);
        expect(missing.status, route).toBe(404);
        expect(errorOf(missing).type).toBe('not_found');
      }
    }
  });
});
