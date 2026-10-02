import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
  createUser,
  createVisit,
  stay,
} from '../../test/factories.ts';
import { resetDatabase } from '../../test/reset-database.ts';
import { prisma } from './prisma.ts';

// The front desk's rules that the database enforces: customers, subscription check-ins, visits and
// the idempotency key (docs/architecture/data-model.md › Constraints worth stating).

beforeEach(async () => {
  await resetDatabase(prisma);
});

const PHONE = '+970599000001';

describe('a customer', () => {
  it('cannot share a phone with another customer of the space who is not archived', async () => {
    const space = await createSpace();
    await createCustomer(space.id, { phone: PHONE });

    await expect(createCustomer(space.id, { phone: PHONE })).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('may share a phone with a customer of another space', async () => {
    const space = await createSpace();
    const other = await createSpace('branch-hub');
    await createCustomer(space.id, { phone: PHONE });

    await expect(createCustomer(other.id, { phone: PHONE })).resolves.toMatchObject({
      phone: PHONE,
    });
  });

  it('may reuse the phone of an archived customer', async () => {
    const space = await createSpace();
    const archived = await createCustomer(space.id, { phone: PHONE });
    await prisma.customer.update({ where: { id: archived.id }, data: { archivedAt: new Date() } });

    await expect(createCustomer(space.id, { phone: PHONE })).resolves.toMatchObject({
      phone: PHONE,
    });
  });

  it('may have no phone, like any number of other customers', async () => {
    const space = await createSpace();
    await createCustomer(space.id);

    await expect(createCustomer(space.id)).resolves.toMatchObject({ phone: null });
  });

  it('stores a phone in E.164', async () => {
    const space = await createSpace();

    await expect(createCustomer(space.id, { phone: '0599000001' })).rejects.toThrow(
      /customers_phone_e164_check/,
    );
  });
});

describe('a check-in', () => {
  it('cannot be opened twice for the same customer', async () => {
    const space = await createSpace();
    const subscription = await createSubscription(await createCustomer(space.id));
    await createCheckIn(subscription);

    await expect(createCheckIn(subscription)).rejects.toMatchObject({ code: 'P2002' });
  });

  it('can be opened again once the previous one is closed', async () => {
    const space = await createSpace();
    const subscription = await createSubscription(await createCustomer(space.id));
    await createCheckIn(subscription, stay('2026-10-01', '08:00', '12:00'));

    await expect(createCheckIn(subscription)).resolves.toMatchObject({ checkedOutAt: null });
  });

  it("is on the customer's own subscription, in the customer's space", async () => {
    const space = await createSpace();
    const other = await createSpace('branch-hub');
    const sara = await createCustomer(space.id);
    const omar = await createCustomer(space.id, { name: 'Omar' });
    const omarsSubscription = await createSubscription(omar);

    await expect(
      createCheckIn({ ...omarsSubscription, customerId: sara.id }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(createCheckIn({ ...omarsSubscription, spaceId: other.id })).rejects.toMatchObject({
      code: 'P2003',
    });
  });

  it('closes after it opens, with a method exactly when closed', async () => {
    const space = await createSpace();
    const subscription = await createSubscription(await createCustomer(space.id));

    await expect(
      createCheckIn(subscription, { ...stay('2026-10-01', '08:00', '07:00') }),
    ).rejects.toThrow(/check_ins_checked_out_at_check/);
    await expect(createCheckIn(subscription, { checkoutMethod: 'AUTO' })).rejects.toThrow(
      /check_ins_checkout_method_check/,
    );
  });
});

describe('a visit', () => {
  it('is by name, as a customer, or both, never neither', async () => {
    const space = await createSpace();
    const customer = await createCustomer(space.id);

    await expect(createVisit(space.id)).resolves.toBeDefined();
    await expect(
      createVisit(space.id, { visitorName: null, customerId: customer.id }),
    ).resolves.toBeDefined();
    await expect(createVisit(space.id, { visitorName: null })).rejects.toThrow(
      /visits_visitor_or_customer_check/,
    );
  });

  it('is open at most once per customer, while visitors by name are not limited', async () => {
    const space = await createSpace();
    const customer = await createCustomer(space.id);
    await createVisit(space.id, { customerId: customer.id });
    await createVisit(space.id);

    await expect(createVisit(space.id, { customerId: customer.id })).rejects.toMatchObject({
      code: 'P2002',
    });
    await expect(createVisit(space.id)).resolves.toBeDefined();
  });

  it('names only a customer and a shift of its own space', async () => {
    const space = await createSpace();
    const other = await createSpace('branch-hub');
    const otherCustomer = await createCustomer(other.id);
    const otherShift = await prisma.spaceShift.create({
      data: { spaceId: other.id, nameAr: 'صباحي', startsMinute: 480, endsMinute: 960 },
    });

    await expect(createVisit(space.id, { customerId: otherCustomer.id })).rejects.toMatchObject({
      code: 'P2003',
    });
    await expect(createVisit(space.id, { shiftId: otherShift.id })).rejects.toMatchObject({
      code: 'P2003',
    });
  });

  it('closes after it opens, with a method exactly when closed', async () => {
    const space = await createSpace();

    await expect(createVisit(space.id, stay('2026-10-01', '12:00', '11:00'))).rejects.toThrow(
      /visits_checked_out_at_check/,
    );
    await expect(createVisit(space.id, { checkoutMethod: 'MANUAL' })).rejects.toThrow(
      /visits_checkout_method_check/,
    );
  });

  it('stores its charge at check-out, never while open', async () => {
    const space = await createSpace();

    await expect(createVisit(space.id, { chargeAgorot: 1_000 })).rejects.toThrow(
      /visits_charge_check/,
    );
    await expect(
      createVisit(space.id, {
        ...stay('2026-10-01', '08:00', '10:20'),
        hourRateAgorot: 500,
        dayRateAgorot: 2_500,
        roundingRule: 'UP_AFTER_MINUTES',
        roundingMinutes: 15,
        capApplied: false,
        chargeAgorot: 1_500,
      }),
    ).resolves.toMatchObject({ chargeAgorot: 1_500, capApplied: false });
  });

  it('names who typed a charge at the desk, and only with a charge', async () => {
    const space = await createSpace();
    const staff = await createUser();
    const closed = stay('2026-10-01', '08:00', '10:00');

    await expect(createVisit(space.id, { ...closed, chargeSetById: staff.id })).rejects.toThrow(
      /visits_charge_set_by_check/,
    );
    await expect(
      createVisit(space.id, { ...closed, chargeAgorot: 1_200, chargeSetById: staff.id }),
    ).resolves.toMatchObject({ chargeSetById: staff.id });
  });

  it('keeps rounding minutes for the "up after N minutes" rule only, from 1 to 59', async () => {
    const space = await createSpace();
    const closed = stay('2026-10-01', '08:00', '10:00');

    await expect(
      createVisit(space.id, { ...closed, roundingRule: 'UP_AFTER_MINUTES' }),
    ).rejects.toThrow(/visits_rounding_check/);
    await expect(
      createVisit(space.id, { ...closed, roundingRule: 'UP_AFTER_MINUTES', roundingMinutes: 60 }),
    ).rejects.toThrow(/visits_rounding_check/);
    await expect(
      createVisit(space.id, { ...closed, roundingRule: 'PER_MINUTE', roundingMinutes: 15 }),
    ).rejects.toThrow(/visits_rounding_check/);
    await expect(
      createVisit(space.id, { ...closed, roundingRule: 'NEAREST_HALF_HOUR' }),
    ).resolves.toBeDefined();
  });

  it('never has a negative rate or charge', async () => {
    const space = await createSpace();

    await expect(createVisit(space.id, { hourRateAgorot: -1 })).rejects.toThrow(
      /visits_amounts_check/,
    );
  });
});

describe('the idempotency key', () => {
  it('records a retried visit once', async () => {
    const space = await createSpace();
    const idempotencyKey = randomUUID();
    const first = await createVisit(space.id, { idempotencyKey });

    await expect(createVisit(space.id, { idempotencyKey })).rejects.toMatchObject({
      code: 'P2002',
    });
    expect(await prisma.visit.count()).toBe(1);
    await expect(
      prisma.visit.findUnique({
        where: { spaceId_idempotencyKey: { spaceId: space.id, idempotencyKey } },
      }),
    ).resolves.toMatchObject({ id: first.id });
  });

  it('records a retried check-in once', async () => {
    const space = await createSpace();
    const subscription = await createSubscription(await createCustomer(space.id));
    const idempotencyKey = randomUUID();
    await createCheckIn(subscription, { ...stay('2026-10-01', '08:00', '12:00'), idempotencyKey });

    await expect(createCheckIn(subscription, { idempotencyKey })).rejects.toMatchObject({
      code: 'P2002',
    });
    expect(await prisma.checkIn.count()).toBe(1);
  });

  it('is scoped to its space', async () => {
    const space = await createSpace();
    const other = await createSpace('branch-hub');
    const idempotencyKey = randomUUID();
    await createVisit(space.id, { idempotencyKey });

    await expect(createVisit(other.id, { idempotencyKey })).resolves.toBeDefined();
  });
});
