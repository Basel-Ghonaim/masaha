import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../test/admin.ts';
import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
  createVisit,
  stay,
} from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// Wednesday 2026-10-21 in Gaza.
const app = createTestApp({ clock: () => new Date('2026-10-21T10:00:00+03:00') });
const day = (date: string) => new Date(`${date}T00:00:00Z`);

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

/** The list as the caller, with this query string. */
function list(caller: { authorization: string }, query = '') {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/customers${query}`)
    .set('Authorization', caller.authorization);
}

/** A payment on one item of the space. */
function pay(item: { visitId: number } | { subscriptionId: number }, amountAgorot: number) {
  return prisma.payment.create({
    data: {
      spaceId,
      ...item,
      idempotencyKey: randomUUID(),
      recordedById: owner.id,
      method: 'CASH',
      amountAgorot,
    },
  });
}

/**
 * Five customers, in name order: Hadi (no subscription, settled), Lina (no subscription, owes a
 * visit's 1,500), Omar (custom, ending soon, 2,500 in credit), Sara (the package's, active, owes
 * 20,000; an older expired one paid in full), Tala (the package's, ending soon, settled).
 */
async function seed() {
  const pack = await prisma.package.create({
    data: { spaceId, name: 'Monthly', validityDays: 30, billing: 'FIXED', priceAgorot: 30_000 },
  });
  const hadi = await createCustomer(spaceId, { name: 'Hadi' });
  const lina = await createCustomer(spaceId, { name: 'Lina', phone: '+970599000201' });
  await pay(
    {
      visitId: (
        await createVisit(spaceId, {
          ...stay('2026-10-20', '09:00', '12:00'),
          customerId: lina.id,
          chargeAgorot: 2_000,
        })
      ).id,
    },
    500,
  );
  const omar = await createCustomer(spaceId, { name: 'Omar' });
  const omars = await createSubscription(omar, {
    name: 'Custom days',
    billing: 'PER_DAY',
    priceAgorot: 2_500,
    startsOn: day('2026-10-01'),
    endsOn: day('2026-10-25'),
  });
  await createCheckIn(omars, stay('2026-10-19', '09:00', '12:00'));
  await pay({ subscriptionId: omars.id }, 5_000);
  const sara = await createCustomer(spaceId, { name: 'Sara', phone: '+970599000205' });
  const saras = await createSubscription(sara, {
    name: 'Monthly',
    packageId: pack.id,
    startsOn: day('2026-10-01'),
    endsOn: day('2026-10-31'),
  });
  await pay({ subscriptionId: saras.id }, 10_000);
  // Older and expired, but made later: a higher id.
  const saraExpired = await createSubscription(sara, {
    name: 'September',
    priceAgorot: 20_000,
    startsOn: day('2026-09-01'),
    endsOn: day('2026-09-30'),
  });
  await pay({ subscriptionId: saraExpired.id }, 20_000);
  const tala = await createCustomer(spaceId, { name: 'Tala' });
  const talas = await createSubscription(tala, {
    name: 'Monthly',
    packageId: pack.id,
    priceAgorot: 10_000,
    startsOn: day('2026-09-26'),
    endsOn: day('2026-10-25'),
  });
  await pay({ subscriptionId: talas.id }, 10_000);
  return { pack, hadi, lina, omar, omars, sara, saras, tala, talas };
}

const names = (response: request.Response) =>
  (dataOf(response) as { name: string }[]).map(({ name }) => name);
const total = (response: request.Response) =>
  (response.body as { meta: { totalRecords: number } }).meta.totalRecords;

describe('the customers list', () => {
  it('pages the space’s customers by name, each with their current subscription, its status, their debt and credit', async () => {
    const { hadi, lina, omar, omars, sara, saras, tala, talas, pack } = await seed();
    await createCustomer(otherSpaceId, { name: 'Another space' });

    const response = await list(reception);
    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual([
      { ...row(hadi), current: null, debtAgorot: 0, creditAgorot: 0 },
      { ...row(lina), current: null, debtAgorot: 1_500, creditAgorot: 0 },
      {
        ...row(omar),
        current: current(omars, null, '2026-10-25', 'ENDING_SOON'),
        debtAgorot: 0,
        creditAgorot: 2_500,
      },
      {
        ...row(sara),
        current: current(saras, pack.id, '2026-10-31', 'ACTIVE'),
        debtAgorot: 20_000,
        creditAgorot: 0,
      },
      {
        ...row(tala),
        current: current(talas, pack.id, '2026-10-25', 'ENDING_SOON'),
        debtAgorot: 0,
        creditAgorot: 0,
      },
    ]);
    expect((response.body as { meta: object }).meta).toEqual({
      currentPage: 1,
      limit: 20,
      totalPages: 1,
      totalRecords: 5,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('q finds a name with its hamza or ta marbuta folded, and a phone by its last digits or whole in any form', async () => {
    await createCustomer(spaceId, { name: 'أسامة علي', phone: '+970599000205' });
    await createCustomer(spaceId, { name: 'سارة', phone: '+970599000777' });
    await createCustomer(spaceId, { name: 'Dana', phone: '+972521234567' });

    expect(names(await list(owner, `?q=${encodeURIComponent('اسامه')}`))).toEqual(['أسامة علي']);
    expect(names(await list(owner, `?q=${encodeURIComponent('ساره')}`))).toEqual(['سارة']);
    expect(names(await list(owner, '?q=0205'))).toEqual(['أسامة علي']);
    expect(names(await list(owner, '?q=0599000205'))).toEqual(['أسامة علي']);
    expect(names(await list(owner, '?q=4444'))).toEqual([]);
    expect(names(await list(owner, '?q=0521234567'))).toEqual(['Dana']);
    expect(names(await list(owner, '?q=00970599000205'))).toEqual(['أسامة علي']);
    expect(names(await list(owner, '?q=059-900-0777'))).toEqual(['سارة']);
    expect(names(await list(owner, '?q=02-05'))).toEqual(['أسامة علي']);
  });

  it('each filter applies before the page is cut: every page full, the total right', async () => {
    const { pack } = await seed();
    const pages = async (query: string) => {
      const first = await list(reception, `${query}&limit=1`);
      const second = await list(reception, `${query}&limit=1&page=2`);
      expect([first.status, second.status]).toEqual([200, 200]);
      return { names: [...names(first), ...names(second)], total: total(first) };
    };

    expect(await pages('?payment=OWES')).toEqual({ names: ['Lina', 'Sara'], total: 2 });
    expect(await pages('?payment=CREDIT')).toEqual({ names: ['Omar'], total: 1 });
    expect(await pages('?status=ENDING_SOON')).toEqual({ names: ['Omar', 'Tala'], total: 2 });
    expect(await pages('?status=ACTIVE')).toEqual({ names: ['Sara'], total: 1 });
    expect(await pages('?kind=PACKAGE')).toEqual({ names: ['Sara', 'Tala'], total: 2 });
    expect(await pages(`?packageId=${String(pack.id)}`)).toEqual({
      names: ['Sara', 'Tala'],
      total: 2,
    });
    expect(await pages(`?packageId=${String(pack.id + 1)}`)).toEqual({ names: [], total: 0 });
    expect(await pages('?kind=CUSTOM')).toEqual({ names: ['Omar'], total: 1 });
    expect(await pages('?status=ENDING_SOON&payment=SETTLED')).toEqual({
      names: ['Tala'],
      total: 1,
    });
  });

  it('kind NONE lists the customers with no subscription; SETTLED those with no debt and no credit', async () => {
    await seed();

    expect(names(await list(owner, '?kind=NONE'))).toEqual(['Hadi', 'Lina']);
    expect(names(await list(owner, '?payment=SETTLED'))).toEqual(['Hadi', 'Tala']);
    expect(names(await list(owner, '?kind=NONE&payment=SETTLED'))).toEqual(['Hadi']);
  });

  it('archived customers only under status ARCHIVED, the owner’s; reception 403; a stranger, another space’s owner and the admin not_found', async () => {
    await createCustomer(spaceId, { name: 'Kept' });
    await createCustomer(spaceId, { name: 'Gone', archivedAt: new Date() });

    expect(names(await list(owner))).toEqual(['Kept']);
    expect(names(await list(owner, '?status=ARCHIVED'))).toEqual(['Gone']);
    const byReception = await list(reception, '?status=ARCHIVED');
    expect(byReception.status).toBe(403);
    expect(errorOf(byReception).type).toBe('forbidden');
    for (const caller of [stranger, unrelatedOwner, admin]) {
      const response = await list(caller);
      expect(response.status).toBe(404);
      expect(errorOf(response).type).toBe('not_found');
    }
    expect((await list(owner, '?kind=SHARED')).status).toBe(422);
  });

  it('the list, the payment filter and a file answer with a payment on every item: 1,000 subscriptions, 2,000 paid visits', async () => {
    // Each customer owes 2,000 of a 3,000 subscription; every walk-in visit is paid in full.
    await prisma.$executeRaw`
      INSERT INTO customers (space_id, name, updated_at)
      SELECT ${spaceId}, 'Paid ' || lpad(n::text, 4, '0'), now() FROM generate_series(1, 1000) n`;
    await prisma.$executeRaw`ANALYZE customers`;
    await prisma.$executeRaw`
      INSERT INTO subscriptions (space_id, customer_id, request_id, name, billing, price_agorot, updated_at)
      SELECT space_id, id, gen_random_uuid(), 'Monthly', 'FIXED', 3000, now()
      FROM customers WHERE space_id = ${spaceId}`;
    await prisma.$executeRaw`ANALYZE subscriptions`;
    await prisma.$executeRaw`
      INSERT INTO payments (space_id, subscription_id, request_id, amount_agorot, method, recorded_by_id)
      SELECT space_id, id, gen_random_uuid(), 1000, 'CASH', ${owner.id} FROM subscriptions
      WHERE space_id = ${spaceId}`;
    await prisma.$executeRaw`
      INSERT INTO visits (space_id, request_id, visitor_name, checked_in_at, checked_out_at,
                          checkout_method, charge_agorot, updated_at)
      SELECT ${spaceId}, gen_random_uuid(), 'Walk-in', '2026-10-20T09:00:00+03:00',
             '2026-10-20T12:00:00+03:00', 'MANUAL', 1500, now() FROM generate_series(1, 2000)`;
    await prisma.$executeRaw`ANALYZE visits`;
    await prisma.$executeRaw`
      INSERT INTO payments (space_id, visit_id, request_id, amount_agorot, method, recorded_by_id)
      SELECT space_id, id, gen_random_uuid(), 1500, 'CASH', ${owner.id} FROM visits
      WHERE space_id = ${spaceId}`;
    await prisma.$executeRaw`ANALYZE payments`;

    const page = await list(owner, '?limit=2');
    expect(page.status).toBe(200);
    expect(
      (dataOf(page) as { name: string; debtAgorot: number }[]).map(({ name, debtAgorot }) => ({
        name,
        debtAgorot,
      })),
    ).toEqual([
      { name: 'Paid 0001', debtAgorot: 2_000 },
      { name: 'Paid 0002', debtAgorot: 2_000 },
    ]);
    const owing = await list(owner, '?payment=OWES&limit=1');
    expect(total(owing)).toBe(1_000);
    const first = (dataOf(page) as { id: number }[])[0];
    const answer = await request(app)
      .get(`/api/v1/manage/spaces/${String(spaceId)}/customers/${String(first?.id)}`)
      .set('Authorization', owner.authorization);
    expect(dataOf(answer)).toMatchObject({
      debtAgorot: 2_000,
      creditAgorot: 0,
      subscriptions: [{ dueAgorot: 3_000, paidAgorot: 1_000, balanceAgorot: 2_000 }],
      unpaidVisits: [],
    });
  });
});

/** A customer as a row shows them. */
function row({ id, name, phone }: { id: number; name: string; phone: string | null }) {
  return { id, name, phone, archivedAt: null };
}

/** A row's current subscription. */
function current(
  { id, name }: { id: number; name: string },
  packageId: number | null,
  endsOn: string,
  status: string,
) {
  return { id, name, packageId, endsOn, status };
}
