import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { auditEntries, dataOf, errorOf } from '../../../test/admin.ts';
import { createCustomer, createSpace, createSubscription } from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// A closure whose subscriptions were extended (docs/api/api-contract.md › Announcements (managed)):
// the database keeps its type, its start and its existence, and lets its end only come earlier;
// the managed list and the summary show it extended. Gaza is UTC+2 in November.
const NOW = new Date('2026-11-10T10:00:00+02:00');
const app = createTestApp({ clock: () => NOW });
const START = new Date('2026-11-08T08:00:00+02:00');
const END = new Date('2026-11-11T08:00:00+02:00');

let spaceId: number;
let owner: { id: number; authorization: string };
let closureId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  ({ id: closureId } = await prisma.announcement.create({
    data: {
      spaceId,
      type: 'CLOSURE',
      textAr: 'مغلق',
      startsAt: START,
      endsAt: END,
      idempotencyKey: randomUUID(),
    },
  }));
  await createSubscription(await createCustomer(spaceId), {
    startsOn: new Date('2026-11-01'),
    endsOn: new Date('2026-11-30'),
  });
});

const pathOf = (suffix = '') => `/api/v1/manage/spaces/${String(spaceId)}/announcements${suffix}`;

const extend = () =>
  request(app)
    .post(pathOf(`/${String(closureId)}/extend-subscriptions`))
    .set('Authorization', owner.authorization)
    .set('Idempotency-Key', randomUUID())
    .send({ days: 3 });

const edit = (body: object) =>
  request(app)
    .patch(pathOf(`/${String(closureId)}`))
    .set('Authorization', owner.authorization)
    .send(body);

const stored = () =>
  prisma.announcement.findUniqueOrThrow({
    where: { id: closureId },
    select: { type: true, textAr: true, startsAt: true, endsAt: true, deletedAt: true },
  });

describe('an extended closure', () => {
  it("after its extension a closure's delete, new type, new start and later end are CLOSURE_EXTENDED, writing nothing; its text and end now are 200", async () => {
    expect((await extend()).status).toBe(201);
    const before = await stored();

    const refusals = [
      await request(app)
        .delete(pathOf(`/${String(closureId)}`))
        .set('Authorization', owner.authorization),
      await edit({ type: 'GENERAL' }),
      await edit({ startsAt: '2026-11-07T08:00:00+02:00' }),
      await edit({ endsAt: '2026-11-12T08:00:00+02:00' }),
      await edit({ endsAt: null }),
    ];
    for (const response of refusals) {
      expect(response.status).toBe(409);
      expect(errorOf(response).code).toBe('CLOSURE_EXTENDED');
    }
    expect(await stored()).toEqual(before);
    expect((await auditEntries()).map(({ action }) => action)).toEqual([
      'closure.subscriptionsExtended',
    ]);

    const text = await edit({ textAr: 'مغلق للصيانة' });
    expect(text.status).toBe(200);
    expect(dataOf(text)).toMatchObject({ textAr: 'مغلق للصيانة' });
    const ended = await request(app)
      .post(pathOf(`/${String(closureId)}/end`))
      .set('Authorization', owner.authorization);
    expect(ended.status).toBe(200);
    expect(dataOf(ended)).toMatchObject({ endsAt: NOW.toISOString(), state: 'ENDED' });
  });

  it('the list shows the extension applied, and the summary no longer awaits it', async () => {
    const list = () =>
      request(app).get(pathOf()).set('Authorization', owner.authorization).expect(200);
    const summary = () =>
      request(app).get(pathOf('/summary')).set('Authorization', owner.authorization).expect(200);
    expect(dataOf(await list())).toEqual([expect.objectContaining({ extension: null })]);
    expect(dataOf(await summary())).toMatchObject({ closuresAwaitingExtension: 1 });

    expect((await extend()).status).toBe(201);

    const { name } = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
    expect(dataOf(await list())).toEqual([
      expect.objectContaining({
        id: closureId,
        extension: {
          days: 3,
          subscriptions: 1,
          appliedAt: NOW.toISOString(),
          appliedBy: { id: owner.id, name },
        },
      }),
    ]);
    expect(dataOf(await summary())).toMatchObject({ closuresAwaitingExtension: 0 });
  });
});
