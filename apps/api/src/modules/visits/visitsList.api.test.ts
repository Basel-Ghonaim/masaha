import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace, createVisit, stay } from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// A space's visits by the Gaza day they were checked in (docs/api/api-contract.md › Front desk
// (managed)): the owner any range, reception today only. Today is 18 October in Gaza (+03:00).
const app = createTestApp({ clock: () => new Date('2026-10-18T10:20:00+03:00') });

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

function list(caller: { authorization: string }, query = '', space = spaceId) {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(space)}/visits${query}`)
    .set('Authorization', caller.authorization);
}

const ids = (response: request.Response) =>
  (dataOf(response) as { id: number }[]).map(({ id }) => id);
const at = (instant: string) => new Date(instant);

/** Visits on both sides of the 16th and the 17th's Gaza midnights, and today's. */
async function visits() {
  const beforeRange = await createVisit(spaceId, {
    checkedInAt: at('2026-10-15T23:59:00+03:00'),
    checkedOutAt: at('2026-10-16T00:30:00+03:00'),
    checkoutMethod: 'MANUAL',
  });
  // Still the 15th in UTC: by Gaza's day, the range's first.
  const firstNight = await createVisit(spaceId, {
    checkedInAt: at('2026-10-16T01:30:00+03:00'),
    checkedOutAt: at('2026-10-16T04:00:00+03:00'),
    checkoutMethod: 'MANUAL',
  });
  const charged = await createVisit(spaceId, {
    ...stay('2026-10-17', '09:00', '12:00'),
    chargeAgorot: 1_500,
    roundingRule: 'PER_MINUTE',
    capApplied: false,
  });
  const sameTime = await createVisit(spaceId, stay('2026-10-17', '09:00', '11:00'));
  const stillOpen = await createVisit(spaceId, { checkedInAt: at('2026-10-17T15:00:00+03:00') });
  // Still the 17th in UTC: by Gaza's day, today's.
  const pastMidnight = await createVisit(spaceId, {
    checkedInAt: at('2026-10-18T00:30:00+03:00'),
    checkedOutAt: at('2026-10-18T02:00:00+03:00'),
    checkoutMethod: 'AUTO',
  });
  const today = await createVisit(spaceId, { checkedInAt: at('2026-10-18T09:00:00+03:00') });
  await createVisit(otherSpaceId, stay('2026-10-17', '10:00', '12:00'));
  await createVisit(otherSpaceId, { checkedInAt: at('2026-10-18T09:30:00+03:00') });
  return { beforeRange, firstNight, charged, sameTime, stillOpen, pastMidnight, today };
}

describe("a space's visits by day", () => {
  it('the owner reads the visits checked in on a range of Gaza days, open and closed, newest first, paged', async () => {
    const v = await visits();

    const range = await list(owner, '?from=2026-10-16&to=2026-10-17');
    expect(range.status).toBe(200);
    expect(ids(range)).toEqual([v.stillOpen.id, v.sameTime.id, v.charged.id, v.firstNight.id]);
    expect((range.body as { meta: object }).meta).toMatchObject({
      currentPage: 1,
      limit: 20,
      totalRecords: 4,
    });
    expect((dataOf(range) as object[])[2]).toMatchObject({
      id: v.charged.id,
      visitorName: 'Omar',
      checkedInAt: at('2026-10-17T09:00:00+03:00').toISOString(),
      checkedOutAt: at('2026-10-17T12:00:00+03:00').toISOString(),
      charge: { amountAgorot: 1_500 },
      writeOff: null,
    });
    expect((dataOf(range) as object[])[0]).toMatchObject({ checkedOutAt: null, charge: null });

    const second = await list(owner, '?from=2026-10-16&to=2026-10-17&page=2&limit=3');
    expect(ids(second)).toEqual([v.firstNight.id]);
    expect((second.body as { meta: object }).meta).toMatchObject({ totalRecords: 4 });

    expect(ids(await list(owner, '?from=2026-10-15&to=2026-10-15'))).toEqual([v.beforeRange.id]);
    expect(ids(await list(owner))).toEqual([v.today.id, v.pastMidnight.id]);
    expect(ids(await list(owner, '?from=2026-10-18&to=2026-10-18'))).toEqual([
      v.today.id,
      v.pastMidnight.id,
    ]);
  });

  it('refuses half a range, a range backwards and one past 92 days', async () => {
    for (const [query, errors] of [
      ['?from=2026-10-16', { to: ['required'] }],
      ['?to=2026-10-16', { from: ['required'] }],
      ['?from=2026-10-16&to=2026-10-15', { to: ['out_of_range'] }],
      ['?from=2026-07-01&to=2026-10-01', { to: ['out_of_range'] }],
      ['?from=2026-10-32&to=2026-11-01', { from: ['invalid_format'] }],
    ] as const) {
      const response = await list(owner, query);
      expect(response.status, query).toBe(422);
      expect(errorOf(response).errors, query).toEqual(errors);
    }
    expect((await list(owner, '?from=2026-07-01&to=2026-09-30')).status).toBe(200);
  });

  it("reception reads today's only; a range from reception is forbidden", async () => {
    const v = await visits();

    const today = await list(reception);
    expect(today.status).toBe(200);
    expect(ids(today)).toEqual([v.today.id, v.pastMidnight.id]);

    for (const query of ['?from=2026-10-16&to=2026-10-17', '?from=2026-10-18&to=2026-10-18']) {
      const response = await list(reception, query);
      expect(response.status).toBe(403);
      expect(errorOf(response).type).toBe('forbidden');
    }
  });

  it("another space's visits never; a stranger and the admin not_found", async () => {
    const v = await visits();

    expect(ids(await list(owner, '?from=2026-10-15&to=2026-10-18'))).toEqual([
      v.today.id,
      v.pastMidnight.id,
      v.stillOpen.id,
      v.sameTime.id,
      v.charged.id,
      v.firstNight.id,
      v.beforeRange.id,
    ]);
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await list(caller);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    expect((await list(owner, '', otherSpaceId)).status).toBe(404);
  });
});
