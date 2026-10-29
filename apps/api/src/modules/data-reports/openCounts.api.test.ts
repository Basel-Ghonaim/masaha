import { beforeEach, describe, expect, it } from 'vitest';

import { createSpace, createUser } from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';
import type { Prisma } from '../../generated/prisma/client.ts';
import { createDataReportsRepository } from './data-reports.repository.ts';

// The platform's open reports, counted for the admin's overview (docs/features/data-reports.md):
// in all, those the admin handles (an unverified space's) and those the owners handle (a verified
// space's), a soft-deleted space's left out.

const NOW = new Date('2026-10-25T09:00:00.000Z');

let verifiedId: number;
let unverifiedId: number;
let reporterId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: verifiedId } = await createSpace());
  ({ id: unverifiedId } = await createSpace('quiet-corner'));
  ({ id: reporterId } = await createUser('rima.reporter@example.com'));
});

function report(spaceId: number, data: Partial<Prisma.DataReportUncheckedCreateInput> = {}) {
  return prisma.dataReport.create({
    data: { spaceId, userId: reporterId, field: 'PRICES', createdAt: NOW, ...data },
  });
}

describe("the platform's open reports, counted", () => {
  it('openCounts splits the open reports by who handles them; a deleted space’s left out', async () => {
    await report(verifiedId);
    await report(verifiedId, { field: 'HOURS' });
    await report(unverifiedId);
    await report(unverifiedId, {
      status: 'DISMISSED',
      resolvedAt: NOW,
      resolvedById: reporterId,
      resolvedAs: 'ADMIN',
      resolutionNote: 'صحيح',
    });
    const { id: deletedId } = await createSpace('closed-down');
    await prisma.space.update({ where: { id: deletedId }, data: { deletedAt: NOW } });
    await report(deletedId);

    expect(await createDataReportsRepository().openCounts([verifiedId])).toEqual({
      open: 3,
      awaitingAdmin: 1,
      awaitingOwners: 2,
    });
  });
});
