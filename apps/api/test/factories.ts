import { randomUUID } from 'node:crypto';

import type { Prisma } from '../src/generated/prisma/client.ts';
import { prisma } from '../src/db/index.ts';

// The smallest valid rows the API lane's database tests build on. Each takes overrides for the
// field under test.

export async function createSpace(slug = 'focus-hub') {
  const governorate = await prisma.governorate.upsert({
    where: { nameAr: 'غزة' },
    create: { nameAr: 'غزة', nameEn: 'Gaza City' },
    update: {},
  });
  const area = await prisma.area.upsert({
    where: { governorateId_nameAr: { governorateId: governorate.id, nameAr: 'النصر' } },
    create: { governorateId: governorate.id, nameAr: 'النصر', nameEn: 'An-Nasr' },
    update: {},
  });
  return prisma.space.create({
    data: {
      slug,
      nameAr: 'فوكس هاب',
      addressAr: 'غرب المزنر',
      areaId: area.id,
      lat: 31.53,
      lng: 34.46,
    },
  });
}

export async function createUser(email = 'staff@example.com') {
  return prisma.user.create({ data: { email, name: 'Sara', passwordHash: 'x' } });
}

export async function createCustomer(
  spaceId: number,
  data: Partial<Prisma.CustomerUncheckedCreateInput> = {},
) {
  return prisma.customer.create({ data: { spaceId, name: 'Sara', ...data } });
}

/** A custom, fixed-price subscription with no limits, unless overridden. */
export async function createSubscription(
  customer: { id: number; spaceId: number },
  data: Partial<Prisma.SubscriptionUncheckedCreateInput> = {},
) {
  return prisma.subscription.create({
    data: {
      spaceId: customer.spaceId,
      customerId: customer.id,
      name: 'شهري',
      billing: 'FIXED',
      priceAgorot: 30_000,
      ...data,
    },
  });
}

export async function createCheckIn(
  subscription: { id: number; spaceId: number; customerId: number },
  data: Partial<Prisma.CheckInUncheckedCreateInput> = {},
) {
  return prisma.checkIn.create({
    data: {
      spaceId: subscription.spaceId,
      customerId: subscription.customerId,
      subscriptionId: subscription.id,
      idempotencyKey: randomUUID(),
      ...data,
    },
  });
}

/** An open visit by name, unless overridden. */
export async function createVisit(
  spaceId: number,
  data: Partial<Prisma.VisitUncheckedCreateInput> = {},
) {
  return prisma.visit.create({
    data: { spaceId, idempotencyKey: randomUUID(), visitorName: 'Omar', ...data },
  });
}

/** Stay times on one day, for closed check-ins and visits. */
export function stay(day: string, from: string, to: string) {
  return {
    checkedInAt: new Date(`${day}T${from}:00+03:00`),
    checkedOutAt: new Date(`${day}T${to}:00+03:00`),
    checkoutMethod: 'MANUAL' as const,
  };
}
