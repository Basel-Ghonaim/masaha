import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createCustomer, createSpace, createSubscription } from '../../../test/factories.ts';
import { whileHeld } from '../../../test/locks.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// Ending a subscription early (docs/api/api-contract.md › Subscriptions (managed)), on Wednesday
// 21 October 2026 at 10:00 in Gaza.
const NOW = '2026-10-21T07:00:00.000Z';
const app = createTestApp({ clock: () => new Date(NOW) });

let spaceId: number;
let otherSpaceId: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  stranger = await signIn('USER', 'stranger@example.com');
  admin = await signIn('ADMIN');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
});

/** A month at ₪300 of the space's customer, from 1 October unless told. */
async function monthly(more: Record<string, unknown> = {}, space = spaceId) {
  return createSubscription(await createCustomer(space), {
    startsOn: new Date('2026-10-01'),
    endsOn: new Date('2026-10-30'),
    billing: 'FIXED',
    priceAgorot: 30_000,
    ...more,
  });
}

function end(caller: { authorization: string }, id: number) {
  return request(app)
    .post(`/api/v1/manage/spaces/${String(spaceId)}/subscriptions/${String(id)}/end`)
    .set('Authorization', caller.authorization);
}

const lockSpace = (tx: Pick<typeof prisma, '$queryRaw'>) =>
  tx.$queryRaw`SELECT id FROM spaces WHERE id = ${spaceId} FOR NO KEY UPDATE`;

describe('ending a subscription early', () => {
  it('sets the end to today, records who and when, audited subscription.ended; the money is unchanged; the status EXPIRED', async () => {
    const { id } = await monthly();
    await prisma.payment.create({
      data: {
        spaceId,
        subscriptionId: id,
        idempotencyKey: randomUUID(),
        recordedById: owner.id,
        method: 'CASH',
        amountAgorot: 10_000,
      },
    });

    const response = await end(reception, id);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      id,
      startsOn: '2026-10-01',
      endsOn: '2026-10-21',
      ended: { at: NOW, byId: reception.id },
      status: 'EXPIRED',
      priceAgorot: 30_000,
      dueAgorot: 30_000,
    });
    expect(await auditEntries()).toEqual([
      {
        actorId: reception.id,
        action: 'subscription.ended',
        entityType: 'subscription',
        entityId: id,
        spaceId,
        before: { endsOn: '2026-10-30' },
        after: { endsOn: '2026-10-21', endedAt: NOW },
      },
    ]);
    expect(await prisma.payment.count()).toBe(1);
  });

  it('an upcoming one ends on its start; again → as it is, nothing audited', async () => {
    const { id } = await monthly({
      startsOn: new Date('2026-11-01'),
      endsOn: new Date('2026-11-30'),
    });

    const response = await end(owner, id);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      startsOn: '2026-11-01',
      endsOn: '2026-11-01',
      status: 'EXPIRED',
    });
    const again = await end(reception, id);
    expect(again.status).toBe(200);
    expect(dataOf(again)).toEqual(dataOf(response));
    expect(await auditEntries()).toHaveLength(1);
  });

  it('one already past its end keeps its end; one with no dates ends today', async () => {
    const past = await monthly({
      startsOn: new Date('2026-09-01'),
      endsOn: new Date('2026-09-30'),
    });
    expect(dataOf(await end(owner, past.id))).toMatchObject({ endsOn: '2026-09-30' });

    const hours = await monthly({ startsOn: null, endsOn: null, totalHours: 20 });
    expect(dataOf(await end(owner, hours.id))).toMatchObject({
      startsOn: null,
      endsOn: '2026-10-21',
      status: 'EXPIRED',
    });
  });

  it("the staff end; another space's subscription, a stranger and the admin not_found; a link ended meanwhile 403", async () => {
    const theirs = await monthly({}, otherSpaceId);
    const foreign = await end(owner, theirs.id);
    expect(foreign.status).toBe(404);
    expect(errorOf(foreign).type).toBe('not_found');
    const { id } = await monthly();
    for (const caller of [stranger, admin]) {
      expect((await end(caller, id)).status).toBe(404);
    }

    const response = await whileHeld(
      lockSpace,
      () => end(reception, id),
      (tx) =>
        tx.spaceManager.updateMany({
          where: { spaceId, userId: reception.id },
          data: { deactivatedAt: new Date() },
        }),
    );
    expect(response.status).toBe(403);
    expect(await prisma.subscription.findUniqueOrThrow({ where: { id } })).toMatchObject({
      endedAt: null,
    });
  });
});
