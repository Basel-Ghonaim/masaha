import { pino } from 'pino';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
  stay,
} from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { createRunInTransaction, prisma } from '../../db/index.ts';
import { writeAudit } from '../../shared/audit/index.ts';
import { createCustomersService } from '../customers/index.ts';
import { createSpaceSettingsService } from '../space-settings/index.ts';
import { createSpacesService } from '../spaces/index.ts';
import { createSubscriptionsService } from './subscriptions.service.ts';

// The customers whose current subscription is ending soon, as the owner's overview counts them
// (docs/features/subscriptions.md), on Tuesday 2026-10-20 in Gaza: the customers list's
// `status=ENDING_SOON`, counted, and the first five by end date.

const NOW = new Date('2026-10-20T12:00:00+03:00');
const clock = () => NOW;
const app = createTestApp({ clock });
const day = (date: string) => new Date(`${date}T00:00:00Z`);

const runInTransaction = createRunInTransaction();
const spaces = createSpacesService();
const subscriptions = createSubscriptionsService({
  runInTransaction,
  audit: writeAudit,
  spaces,
  spaceSettings: createSpaceSettingsService({
    runInTransaction,
    audit: writeAudit,
    lockSpace: (spaceId, tx) => spaces.lock(spaceId, tx),
  }),
  customers: createCustomersService({ runInTransaction, audit: writeAudit, spaces, now: clock }),
  logger: pino({ level: 'silent' }),
  now: clock,
});

let spaceId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
});

/** A customer of the space with one subscription from 2026-09-25 to `endsOn`. */
async function endingOn(name: string, endsOn: string, space = spaceId) {
  const customer = await createCustomer(space, { name });
  const subscription = await createSubscription(customer, {
    name: `${name}'s month`,
    startsOn: day('2026-09-25'),
    endsOn: day(endsOn),
  });
  return { customer, subscription };
}

describe('the subscriptions ending soon', () => {
  it('endingSoon counts the customers whose current subscription is ending soon, equal to the customers list’s status=ENDING_SOON total; the first five by end date', async () => {
    const omar = await endingOn('Omar', '2026-10-24');
    const huda = await endingOn('Huda', '2026-10-22');
    const mona = await endingOn('Mona', '2026-10-26');
    const sami = await endingOn('Sami', '2026-10-23');
    const lina = await endingOn('Lina', '2026-10-25');
    // Ending soon by its days, with no end date: one day of five left; it comes last.
    const tala = await createCustomer(spaceId, { name: 'Tala' });
    const talas = await createSubscription(tala, {
      name: 'Five days',
      startsOn: day('2026-10-01'),
      totalDays: 5,
    });
    for (const date of ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']) {
      await createCheckIn(talas, stay(date, '09:00', '12:00'));
    }
    // Bilal's old subscription is ending soon, but his current one is the later, active one.
    const bilal = await endingOn('Bilal', '2026-10-24');
    await createSubscription(bilal.customer, {
      startsOn: day('2026-10-15'),
      endsOn: day('2026-12-15'),
    });
    // An archived customer, and another space's, are not on the list.
    const rami = await endingOn('Rami', '2026-10-23');
    await prisma.customer.update({ where: { id: rami.customer.id }, data: { archivedAt: NOW } });
    const { id: otherSpaceId } = await createSpace('other-space');
    await endingOn('Yara', '2026-10-21', otherSpaceId);

    const first = (
      { customer, subscription }: Awaited<ReturnType<typeof endingOn>>,
      endsOn: string,
    ) => ({
      customer: { id: customer.id, name: customer.name },
      subscription: { id: subscription.id, name: subscription.name, endsOn },
    });
    expect(await subscriptions.endingSoon(spaceId, NOW)).toEqual({
      total: 6,
      first: [
        first(huda, '2026-10-22'),
        first(sami, '2026-10-23'),
        first(omar, '2026-10-24'),
        first(lina, '2026-10-25'),
        first(mona, '2026-10-26'),
      ],
    });

    const owner = await signInOwnerOf(spaceId);
    const listed = await request(app)
      .get(`/api/v1/manage/spaces/${String(spaceId)}/customers?status=ENDING_SOON`)
      .set('Authorization', owner.authorization);
    expect((listed.body as { meta: { totalRecords: number } }).meta.totalRecords).toBe(6);
  });
});
