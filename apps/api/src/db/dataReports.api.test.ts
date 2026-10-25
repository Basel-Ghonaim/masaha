import { beforeEach, describe, expect, it } from 'vitest';

import { createSpace, createUser } from '../../test/factories.ts';
import { resetDatabase } from '../../test/reset-database.ts';
import type { Prisma } from '../generated/prisma/client.ts';
import { prisma } from './prisma.ts';

// The rules the database holds on a data report (docs/architecture/data-model.md › Constraints):
// one open report per user, space and field, and a decision's fields together.

let spaceId: number;
let userId: number;
let adminId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  ({ id: userId } = await createUser('reporter@example.com'));
  ({ id: adminId } = await createUser('admin@example.com'));
});

function report(data: Partial<Prisma.DataReportUncheckedCreateInput> = {}) {
  return prisma.dataReport.create({ data: { spaceId, userId, field: 'PRICES', ...data } });
}

/** A decision's fields, all set. */
const decided = (status: 'RESOLVED' | 'DISMISSED' = 'RESOLVED') => ({
  status,
  resolvedAt: new Date('2026-10-25T09:00:00Z'),
  resolvedById: adminId,
  resolvedAs: 'ADMIN' as const,
  resolutionNote: 'عُدّل',
});

describe('data reports', () => {
  it('one open report per user, space and field; a decided one frees the field', async () => {
    await report();
    await expect(report()).rejects.toMatchObject({ code: 'P2002' });
    // Another field, or another user: their own.
    await report({ field: 'HOURS' });
    await report({ userId: adminId });

    await prisma.dataReport.updateMany({ where: { userId, field: 'PRICES' }, data: decided() });
    await report();
    await prisma.dataReport.updateMany({
      where: { userId, field: 'PRICES', status: 'OPEN' },
      data: decided('DISMISSED'),
    });
    await report();
    expect(await prisma.dataReport.count({ where: { userId, field: 'PRICES' } })).toBe(3);
  });

  it('a decision’s time, decider and side come together, and only with a decision', async () => {
    const { resolvedAt, resolvedById, resolvedAs } = decided();
    for (const partial of [
      { status: 'RESOLVED' as const },
      { status: 'RESOLVED' as const, resolvedAt, resolvedById },
      { status: 'RESOLVED' as const, resolvedAt, resolvedAs },
      { status: 'RESOLVED' as const, resolvedById, resolvedAs },
      { resolvedAt, resolvedById, resolvedAs },
      { resolutionNote: 'ملاحظة' },
      { ...decided(), resolutionNote: '   ' },
    ]) {
      await expect(report(partial)).rejects.toThrow(/data_reports_decision_check/);
    }
    await report({ ...decided(), resolutionNote: null });
    await report({ ...decided(), field: 'HOURS' });
  });

  it('a dismissal carries its reply; «أخرى» its message', async () => {
    await expect(report({ ...decided('DISMISSED'), resolutionNote: null })).rejects.toThrow(
      /data_reports_dismissal_note_check/,
    );
    await report(decided('DISMISSED'));

    for (const message of [null, '  ']) {
      await expect(report({ field: 'OTHER', message })).rejects.toThrow(
        /data_reports_other_message_check/,
      );
    }
    await report({ field: 'OTHER', message: 'المكان أُغلق' });
  });
});
