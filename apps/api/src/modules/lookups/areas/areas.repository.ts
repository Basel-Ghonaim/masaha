import type { Prisma } from '../../../generated/prisma/client.ts';

export const AREA = {
  id: true,
  governorateId: true,
  nameAr: true,
  nameEn: true,
  isActive: true,
} as const satisfies Prisma.AreaSelect;

export type AreaRow = Prisma.AreaGetPayload<{ select: typeof AREA }>;
