import { beforeEach, describe, expect, it } from 'vitest';

import { createSpace, createUser } from '../../../../test/factories.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { seedSettings } from '../../../../test/spaces.ts';
import { createRunInTransaction, prisma } from '../../../db/index.ts';
import { writeAudit } from '../../../shared/audit/index.ts';
import { createPlatformSettingsService } from '../../platform-settings/index.ts';
import { createListingService } from './listing.service.ts';

// One space's freshness, as the owner's overview reads it (docs/features/spaces.md): the groups never
// saved, and the stale ones with their Gaza days, by the thresholds the admin saves, at Tuesday
// 2026-10-20 at noon in Gaza.

const NOW = new Date('2026-10-20T12:00:00+03:00');
const platformSettings = createPlatformSettingsService({
  runInTransaction: createRunInTransaction(),
  audit: writeAudit,
});
const listing = createListingService({ platformSettings, now: () => NOW });

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedSettings();
});

describe("a space's freshness", () => {
  it('freshnessOf: missing and stale by the saved thresholds; a threshold saved applies at once', async () => {
    const { id: spaceId } = await createSpace();
    await prisma.space.update({
      where: { id: spaceId },
      data: {
        profileUpdatedAt: new Date('2026-10-15T10:00:00+03:00'),
        // 80 Gaza days before today: stale by the general 60.
        hoursUpdatedAt: new Date('2026-08-01T23:30:00+03:00'),
        // 40 Gaza days: stale by the prices' 30, fresh by the general 60.
        pricesUpdatedAt: new Date('2026-09-10T08:00:00+03:00'),
      },
    });

    expect(await listing.freshnessOf(spaceId, NOW)).toEqual({
      missing: ['amenities', 'contacts'],
      stale: [
        { group: 'hours', days: 80 },
        { group: 'prices', days: 40 },
      ],
    });

    const { id: adminId } = await createUser('admin@example.com');
    await platformSettings.saveStaleness(adminId, { stalenessDays: 90, priceStalenessDays: 45 });
    expect(await listing.freshnessOf(spaceId, NOW)).toEqual({
      missing: ['amenities', 'contacts'],
      stale: [],
    });
  });
});
