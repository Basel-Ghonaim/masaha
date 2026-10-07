import { isDeepStrictEqual } from 'node:util';

import type { AdminSpace, Price, UpdateSpacePricesRequest } from '@masaha/shared/spaces';

import type { AuditValues } from '../../../shared/audit/index.ts';
import type { Actor, LoadedSpace } from '../../../shared/auth/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import { createGroupEdit, type GroupEditDependencies } from '../facts/groupEdit.ts';
import { createShiftsRepository } from '../hours/shifts.repository.ts';
import { createPricesRepository } from './prices.repository.ts';

/** The prices as an audit entry records them: the whole list. */
function pricesValues(prices: readonly Price[]): AuditValues {
  return {
    prices: prices.map((price) => ({
      period: price.period,
      audience: price.audience,
      shiftId: price.shiftId,
      labelAr: price.labelAr,
      labelEn: price.labelEn,
      amountAgorot: price.amountAgorot,
    })),
  };
}

/** The request's prices, each with every field, as they are stored. */
function asStored({ prices }: UpdateSpacePricesRequest): Price[] {
  return prices.map((price) => ({
    period: price.period,
    audience: price.audience,
    shiftId: price.shiftId ?? null,
    labelAr: price.labelAr ?? null,
    labelEn: price.labelEn ?? null,
    amountAgorot: price.amountAgorot,
  }));
}

/** The published prices, saved whole (decision F1). A price may name one of the space's shifts. */
export function createPricesService(dependencies: GroupEditDependencies) {
  const editGroup = createGroupEdit(dependencies);
  const prices = createPricesRepository();
  const shifts = createShiftsRepository();

  return {
    /**
     * Replaces the prices. Each shift must be one of the space's, as the space's lock holds them. A
     * save that changes nothing writes nothing, unless the prices were never saved.
     */
    update(
      actor: Actor,
      space: LoadedSpace,
      request: UpdateSpacePricesRequest,
    ): Promise<AdminSpace> {
      return editGroup(actor, space, 'prices', 'Edited', async (tx, current) => {
        const before = await prices.listFor(space.id, tx);
        const next = asStored(request);
        if (current.pricesUpdatedAt && isDeepStrictEqual(before, next)) return null;

        const shiftIds = await shifts.idsOf(space.id, tx);
        const unknown = next.flatMap(({ shiftId }, index) =>
          shiftId !== null && !shiftIds.has(shiftId) ? [index] : [],
        );
        if (unknown.length > 0) {
          throw AppError.validation(
            Object.fromEntries(
              unknown.map((index) => [`prices.${String(index)}.shiftId`, ['invalid_choice']]),
            ),
          );
        }

        await prices.replace(space.id, next, tx);
        return { before: pricesValues(before), after: pricesValues(next) };
      });
    },
  };
}

export type PricesService = ReturnType<typeof createPricesService>;
