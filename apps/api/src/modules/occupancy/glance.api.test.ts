import { pino } from 'pino';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf } from '../../../test/admin.ts';
import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
  createVisit,
  stay,
} from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { setWeek, signInOwnerOf } from '../../../test/spaces.ts';
import { createRunInTransaction, prisma } from '../../db/index.ts';
import { writeAudit } from '../../shared/audit/index.ts';
import type { LoadedSpace } from '../../shared/auth/index.ts';
import { createAnnouncementsService } from '../announcements/index.ts';
import { createCustomersService } from '../customers/index.ts';
import { createSpaceSettingsService } from '../space-settings/index.ts';
import { createSpacesService } from '../spaces/index.ts';
import { createSubscriptionsService } from '../subscriptions/index.ts';
import { createVisitsService } from '../visits/index.ts';
import { createOccupancyService } from './occupancy.service.ts';

// The space's state at a glance, as the owner's overview reads it (docs/features/occupancy.md): how
// many are present, split into visits and members, its capacity and its live status, and no one's
// name; on Sunday 2026-10-18 at 10:00 in Gaza.

const NOW = new Date('2026-10-18T10:00:00+03:00');
const clock = () => NOW;
const app = createTestApp({ clock });

const runInTransaction = createRunInTransaction();
const logger = pino({ level: 'silent' });
const spaces = createSpacesService();
const spaceSettings = createSpaceSettingsService({
  runInTransaction,
  audit: writeAudit,
  lockSpace: (spaceId, tx) => spaces.lock(spaceId, tx),
});
const customers = createCustomersService({
  runInTransaction,
  audit: writeAudit,
  spaces,
  now: clock,
});
const occupancy = createOccupancyService({
  runInTransaction,
  audit: writeAudit,
  spaces,
  visits: createVisitsService({
    runInTransaction,
    audit: writeAudit,
    spaces,
    spaceSettings,
    now: clock,
    logger,
  }),
  subscriptions: createSubscriptionsService({
    runInTransaction,
    audit: writeAudit,
    spaces,
    spaceSettings,
    customers,
    logger,
    now: clock,
  }),
  customers,
  announcements: createAnnouncementsService({
    runInTransaction,
    audit: writeAudit,
    spaces,
    now: clock,
  }),
  now: clock,
});

let spaceId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
});

/** The space with its links, as the route's links loader puts it on the request. */
async function loaded(): Promise<LoadedSpace> {
  const links = await prisma.spaceManager.findMany({
    where: { spaceId },
    select: { userId: true, role: true, deactivatedAt: true },
  });
  return { id: spaceId, links, linksUnder: () => Promise.resolve(links) };
}

describe("the space's state at a glance", () => {
  it('glance answers the present visits and members, the capacity and the status, no names', async () => {
    const owner = await signInOwnerOf(spaceId);
    await setWeek(
      spaceId,
      Array.from({ length: 7 }, () => [8 * 60, 18 * 60] as [number, number]),
    );
    await prisma.spaceOccupancy.create({ data: { spaceId, capacity: 3 } });
    // The staff's read prices the open visits by the space's settings.
    await prisma.spaceSettings.create({
      data: {
        spaceId,
        autoCheckoutAtClosing: true,
        visitRounding: 'PER_MINUTE',
        visitCapAtDayPrice: true,
      },
    });
    await createVisit(spaceId, { visitorName: 'Omar' });
    await createVisit(spaceId, { visitorName: 'Huda' });
    await createVisit(spaceId, stay('2026-10-18', '08:00', '09:00'));
    const member = await createSubscription(await createCustomer(spaceId, { name: 'Sara' }));
    await createCheckIn(member);
    const { id: otherSpaceId } = await createSpace('other-space');
    await createVisit(otherSpaceId);

    const glance = await occupancy.glance(await loaded(), NOW);
    expect(glance).toEqual({
      capacity: 3,
      status: 'FULL',
      present: { visits: 2, members: 1, total: 3 },
    });

    // The same as the staff's own read of the space now.
    const now = dataOf(
      await request(app)
        .get(`/api/v1/manage/spaces/${String(spaceId)}/occupancy`)
        .set('Authorization', owner.authorization),
    ) as { status: string; capacity: number; present: number };
    expect([now.status, now.capacity, now.present]).toEqual([
      glance.status,
      glance.capacity,
      glance.present.total,
    ]);
  });
});
