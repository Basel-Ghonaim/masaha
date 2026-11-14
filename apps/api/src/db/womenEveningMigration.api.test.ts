import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { createArea, createPublicSpace } from '../../test/spaces.ts';
import { resetDatabase } from '../../test/reset-database.ts';
import { prisma } from './prisma.ts';

// The evening and women's hall migration's data steps — its UPDATE and its INSERT, exactly as the
// file writes them — run against fixtures the lane makes: the lane applied the whole file to an empty
// database, where neither step has a row to act on. Its ALTER TABLE is left out here: the lane's
// `migrate deploy` has already proven it, and the column exists.

const MIGRATIONS = join(import.meta.dirname, '../../prisma/migrations');
const folder = readdirSync(MIGRATIONS).find((name) => name.endsWith('_women_evening'));
if (!folder) throw new Error('The women_evening migration is missing');
const SQL = readFileSync(join(MIGRATIONS, folder, 'migration.sql'), 'utf8');

/** The file's data steps, one at a time: a prepared statement holds one command. */
const STATEMENTS = SQL.split('\n')
  .filter((line) => !line.trimStart().startsWith('--'))
  .join('\n')
  .split(/;\s*$/m)
  .map((statement) => statement.trim())
  .filter((statement) => statement !== '' && !statement.startsWith('ALTER TABLE'));

async function runMigration() {
  for (const statement of STATEMENTS) await prisma.$executeRawUnsafe(statement);
}

/** A week open on Sunday only, closing at `closesMinute`; the other days closed. */
async function sundayUntil(spaceId: number, closesMinute: number) {
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
    await prisma.spaceHours.create({
      data:
        dayOfWeek === 0
          ? { spaceId, dayOfWeek, opensMinute: 480, closesMinute }
          : { spaceId, dayOfWeek, isClosed: true },
    });
  }
}

async function amenity(key: string, sortOrder: number, isActive = true) {
  return prisma.amenity.create({
    data: { key, nameAr: key, nameEn: key, icon: 'wifi', sortOrder, isActive },
  });
}

beforeEach(async () => {
  await resetDatabase(prisma);
});

describe('the women_evening migration', () => {
  it('switches the evening on for a space whose open day closes at 20:00 or later, once', async () => {
    const { id: areaId } = await createArea();
    const atEight = await createPublicSpace(areaId, 'At Eight');
    const midnight = await createPublicSpace(areaId, 'Midnight');
    const halfSeven = await createPublicSpace(areaId, 'Half Seven');
    await createPublicSpace(areaId, 'No Hours');
    await sundayUntil(atEight.id, 1200);
    await sundayUntil(midnight.id, 1440);
    await sundayUntil(halfSeven.id, 1170);

    await runMigration();

    const spaces = await prisma.space.findMany({
      select: { nameEn: true, worksEvenings: true },
      orderBy: { id: 'asc' },
    });
    expect(spaces).toEqual([
      { nameEn: 'At Eight', worksEvenings: true },
      { nameEn: 'Midnight', worksEvenings: true },
      { nameEn: 'Half Seven', worksEvenings: false },
      { nameEn: 'No Hours', worksEvenings: false },
    ]);
  });

  it("adds the women's hall last, by its key, with both names and its icon, and only once", async () => {
    await amenity('internet', 1);
    await amenity('hot_drinks', 2);
    await amenity('meeting_room', 5, false);

    await runMigration();
    await runMigration();

    const halls = await prisma.amenity.findMany({ where: { key: 'womens_hall' } });
    expect(halls).toEqual([
      expect.objectContaining({
        nameAr: 'قاعة للنساء',
        nameEn: "Women's hall",
        icon: 'venus',
        sortOrder: 6,
        isActive: true,
      }),
    ]);
    expect(await prisma.amenity.count()).toBe(4);
  });

  it('leaves a womens_hall key already held as it is', async () => {
    await amenity('internet', 1);
    await amenity('womens_hall', 2, false);

    await runMigration();

    expect(await prisma.amenity.findUniqueOrThrow({ where: { key: 'womens_hall' } })).toMatchObject(
      { nameAr: 'womens_hall', icon: 'wifi', sortOrder: 2, isActive: false },
    );
  });

  it('adds nothing to a catalogue not yet seeded, which the seed fills', async () => {
    await runMigration();

    expect(await prisma.amenity.count()).toBe(0);
  });
});
