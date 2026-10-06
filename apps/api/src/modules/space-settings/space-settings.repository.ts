import { prisma, type Tx } from '../../db/index.ts';
import type { PrismaClient } from '../../generated/prisma/client.ts';
import type { VisitRounding } from '../../generated/prisma/enums.ts';

/** The settings a space starts with; the others take their database defaults. */
export interface InitialSpaceSettings {
  autoCheckoutAtClosing: boolean;
  visitRounding: VisitRounding;
  visitRoundingMinutes: number | null;
  visitCapAtDayPrice: boolean;
}

export function createSpaceSettingsRepository(db: PrismaClient = prisma) {
  return {
    async create(spaceId: number, settings: InitialSpaceSettings, tx: Tx = db): Promise<void> {
      await tx.spaceSettings.create({ data: { spaceId, ...settings }, select: { spaceId: true } });
    },
  };
}
