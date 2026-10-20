import { prisma, type Tx } from '../../db/index.ts';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.ts';
import type { VisitRounding } from '../../generated/prisma/enums.ts';

/** The settings a space starts with; the others take their database defaults. */
export interface InitialSpaceSettings {
  autoCheckoutAtClosing: boolean;
  visitRounding: VisitRounding;
  visitRoundingMinutes: number | null;
  visitCapAtDayPrice: boolean;
}

const SETTINGS = {
  autoCheckoutAtClosing: true,
  maxStayMinutes: true,
  visitRounding: true,
  visitRoundingMinutes: true,
  visitCapAtDayPrice: true,
  visitStudentPrices: true,
  receptionMayTypePrices: true,
  reminderTemplate: true,
} as const satisfies Prisma.SpaceSettingsSelect;

export type SettingsRow = Prisma.SpaceSettingsGetPayload<{ select: typeof SETTINGS }>;

/** What an edit writes: the fields it sets, each with its new value. */
export type SettingsData = Partial<SettingsRow>;

export function createSpaceSettingsRepository(db: PrismaClient = prisma) {
  return {
    async create(spaceId: number, settings: InitialSpaceSettings, tx: Tx = db): Promise<void> {
      await tx.spaceSettings.create({ data: { spaceId, ...settings }, select: { spaceId: true } });
    },

    /** The space's settings row; every space has one, so `null` is a fault for the caller. */
    find(spaceId: number, tx: Tx = db): Promise<SettingsRow | null> {
      return tx.spaceSettings.findUnique({ where: { spaceId }, select: SETTINGS });
    },

    /** These spaces' settings rows, in one query; a space without one is absent. */
    findMany(spaceIds: readonly number[], tx: Tx = db) {
      return tx.spaceSettings.findMany({
        where: { spaceId: { in: [...spaceIds] } },
        select: { spaceId: true, ...SETTINGS },
      });
    },

    /** The edit, by the space's key, so it can touch no other space's row. */
    update(spaceId: number, data: SettingsData, tx: Tx): Promise<SettingsRow> {
      return tx.spaceSettings.update({ where: { spaceId }, data, select: SETTINGS });
    },
  };
}
