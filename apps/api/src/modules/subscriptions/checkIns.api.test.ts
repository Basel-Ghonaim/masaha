import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../test/admin.ts';
import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
} from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// The space's check-ins, open or by Gaza date (docs/api/api-contract.md › Front desk (managed)), on
// Wednesday 21 October 2026 in Gaza (UTC+3 until 2026-10-24).
const wednesday = (time: string) => new Date(`2026-10-21T${time}:00+03:00`);
const app = createTestApp({ clock: () => wednesday('10:00') });

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
  ({ id: otherSpaceId } = await createSpace('other-space'));
  admin = await signIn('ADMIN');
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
});

/** The space's check-ins as the caller, with this query. */
function checkIns(caller: { authorization: string }, query: string) {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/check-ins${query}`)
    .set('Authorization', caller.authorization);
}

/** A customer of the space (or another) by that name, with a month's subscription this October. */
async function subscriber(name: string, at = spaceId) {
  const customer = await createCustomer(at, { name });
  const subscription = await createSubscription(customer, {
    startsOn: new Date('2026-10-01'),
    endsOn: new Date('2026-10-30'),
  });
  return { customer, subscription };
}

/** A closed stay of an hour from this instant. */
const hourFrom = (iso: string) => ({
  checkedInAt: new Date(iso),
  checkedOutAt: new Date(new Date(iso).getTime() + 3_600_000),
  checkoutMethod: 'MANUAL' as const,
});

const ids = (response: request.Response) =>
  (dataOf(response) as { id: number }[]).map(({ id }) => id);

describe("the space's check-ins", () => {
  it('open=true answers every open check-in, the earliest first, whole: no closed one, no other space’s', async () => {
    const opened: number[] = [];
    // 21 present, more than a default page; each since a minute later than the one before.
    for (let i = 0; i < 21; i += 1) {
      const { subscription } = await subscriber(`Customer ${String(i)}`);
      const checkIn = await createCheckIn(subscription, {
        checkedInAt: new Date(wednesday('08:00').getTime() + i * 60_000),
      });
      opened.push(checkIn.id);
    }
    const sara = await subscriber('Sara');
    await prisma.customer.update({
      where: { id: sara.customer.id },
      data: { phone: '+970599000205' },
    });
    await createCheckIn(sara.subscription, hourFrom('2026-10-21T05:00:00Z'));
    const theirs = await subscriber('Huda', otherSpaceId);
    await createCheckIn(theirs.subscription, { checkedInAt: wednesday('08:00') });

    const response = await checkIns(reception, '?open=true');
    expect(response.status).toBe(200);
    expect(ids(response)).toEqual(opened);
    expect(response.body).not.toHaveProperty('meta');
    const [first] = dataOf(response) as object[];
    expect(first).toMatchObject({
      id: opened[0],
      customer: { name: 'Customer 0', phone: null },
      subscription: { status: 'ACTIVE', progress: { daysUsed: 1, minutesUsed: 0 } },
      checkedInAt: '2026-10-21T05:00:00.000Z',
      checkedOutAt: null,
      checkoutMethod: null,
    });
  });

  it('a range pages the check-ins by their Gaza date, the latest first, the total right', async () => {
    const { subscription } = await subscriber('Sara');
    // 01:30 in Gaza on the 18th, the range's first day: in, though its UTC date is the 17th.
    const earliest = await createCheckIn(subscription, hourFrom('2026-10-17T22:30:00Z'));
    // 23:00 in Gaza on the 17th: out.
    await createCheckIn(subscription, hourFrom('2026-10-17T20:00:00Z'));
    const middle = await createCheckIn(subscription, hourFrom('2026-10-19T07:00:00Z'));
    const latest = await createCheckIn(subscription, hourFrom('2026-10-20T07:00:00Z'));
    // 01:30 in Gaza on the 21st: out, though its UTC date is the 20th, the range's last day.
    await createCheckIn(subscription, hourFrom('2026-10-20T22:30:00Z'));
    const theirs = await subscriber('Huda', otherSpaceId);
    await createCheckIn(theirs.subscription, hourFrom('2026-10-19T07:00:00Z'));

    const firstPage = await checkIns(owner, '?from=2026-10-18&to=2026-10-20&limit=2');
    expect(firstPage.status).toBe(200);
    expect(ids(firstPage)).toEqual([latest.id, middle.id]);
    expect(firstPage.body).toMatchObject({
      meta: { currentPage: 1, limit: 2, totalPages: 2, totalRecords: 3, hasNextPage: true },
    });
    const secondPage = await checkIns(owner, '?from=2026-10-18&to=2026-10-20&limit=2&page=2');
    expect(ids(secondPage)).toEqual([earliest.id]);
    expect(dataOf(secondPage)).toMatchObject([
      {
        customer: { name: 'Sara' },
        checkoutMethod: 'MANUAL',
        checkedOutAt: '2026-10-17T23:30:00.000Z',
      },
    ]);
  });

  it('refuses a stranger and the admin with not_found; an invalid query with 422', async () => {
    for (const caller of [stranger, admin]) {
      const response = await checkIns(caller, '?open=true');
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    const tooLong = await checkIns(owner, '?from=2026-07-20&to=2026-10-21');
    expect(tooLong.status).toBe(422);
    expect(errorOf(tooLong).errors).toEqual({ to: ['out_of_range'] });
    const neither = await checkIns(owner, '');
    expect(neither.status).toBe(422);
    expect(errorOf(neither).errors).toEqual({ from: ['required'], to: ['required'] });
  });
});
