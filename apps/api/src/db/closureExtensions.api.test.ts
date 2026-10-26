import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import { createSpace, createUser } from '../../test/factories.ts';
import { resetDatabase } from '../../test/reset-database.ts';
import type { Prisma } from '../generated/prisma/client.ts';
import { prisma } from './prisma.ts';

// The rules the database holds on a closure's extension (docs/architecture/data-model.md ›
// Constraints): an extended closure keeps its type, its start and its existence, and its end only
// comes earlier (the trigger `announcements_guard_extended`); an extension's key is unique.

const START = new Date('2026-10-01T05:00:00Z');
const END = new Date('2026-10-03T05:00:00Z');

let spaceId: number;
let ownerId: number;

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  ({ id: ownerId } = await createUser());
});

function closure(data: Partial<Prisma.AnnouncementUncheckedCreateInput> = {}) {
  return prisma.announcement.create({
    data: {
      spaceId,
      type: 'CLOSURE',
      textAr: 'مغلق',
      startsAt: START,
      endsAt: END,
      idempotencyKey: randomUUID(),
      ...data,
    },
  });
}

function extend(announcementId: number, idempotencyKey: string = randomUUID()) {
  return prisma.closureExtension.create({
    data: { announcementId, days: 2, appliedById: ownerId, idempotencyKey },
  });
}

const edit = (id: number, data: Prisma.AnnouncementUpdateInput) =>
  prisma.announcement.update({ where: { id }, data });

describe('an extended closure', () => {
  it('refuses a new type, start, deletion or later end; its text and an earlier end pass; another closure is untouched', async () => {
    const { id } = await closure();
    await extend(id);

    const refused = /announcements_closure_extended/;
    await expect(edit(id, { type: 'GENERAL' })).rejects.toThrow(refused);
    await expect(edit(id, { startsAt: new Date('2026-09-30T05:00:00Z') })).rejects.toThrow(refused);
    await expect(edit(id, { deletedAt: END })).rejects.toThrow(refused);
    await expect(edit(id, { endsAt: new Date('2026-10-04T05:00:00Z') })).rejects.toThrow(refused);
    await expect(edit(id, { endsAt: null })).rejects.toThrow(refused);
    expect(await prisma.announcement.findUniqueOrThrow({ where: { id } })).toMatchObject({
      type: 'CLOSURE',
      startsAt: START,
      endsAt: END,
      deletedAt: null,
    });

    const earlier = new Date('2026-10-02T05:00:00Z');
    await expect(edit(id, { textAr: 'مغلق للصيانة', textEn: 'Closed' })).resolves.toMatchObject({
      textAr: 'مغلق للصيانة',
    });
    await expect(edit(id, { endsAt: earlier })).resolves.toMatchObject({ endsAt: earlier });

    // One with no end, extended while it runs, can still end.
    const running = await closure({ endsAt: null });
    await extend(running.id);
    await expect(edit(running.id, { endsAt: END })).resolves.toMatchObject({ endsAt: END });

    // Not extended: any change, deletion included.
    const other = await closure();
    await expect(
      edit(other.id, { type: 'GENERAL', startsAt: END, endsAt: null, deletedAt: END }),
    ).resolves.toMatchObject({ type: 'GENERAL', deletedAt: END });
  });

  it("an extension's key is unique", async () => {
    const key = randomUUID();
    await extend((await closure()).id, key);

    await expect(extend((await closure()).id, key)).rejects.toMatchObject({ code: 'P2002' });
    await expect(extend((await closure()).id)).resolves.toMatchObject({ days: 2 });
  });
});
