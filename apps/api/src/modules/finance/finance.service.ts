import { addMonths, gazaClockOf } from '@masaha/shared/core';
import type { FinanceMonthQuery, IncomeReport } from '@masaha/shared/finance';

import type { ReadSnapshot } from '../../db/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { IncomeWindow, PaymentsService } from '../payments/index.ts';
import type { UsersService } from '../users/index.ts';
import { toCollections } from './finance.mapper.ts';
import {
  currentMonth,
  dayWindow,
  daysEnding,
  monthError,
  monthsEnding,
  monthWindow,
} from './windows.ts';

interface Dependencies {
  /** One snapshot per answer whose figures must agree (conventions › Composed reads). */
  readSnapshot: ReadSnapshot;
  /** The ledger's aggregates: income, collections. */
  payments: PaymentsService;
  /** The names of who recorded the payments. */
  users: UsersService;
  /** The one clock (conventions §11): today and the current month. */
  now: () => Date;
}

/**
 * The owner's finance (docs/features/finance.md): read models over the ledger and the stays,
 * every figure computed in the database by its owning module's aggregate, on Gaza's calendar. It
 * writes nothing.
 */
export function createFinanceService({ readSnapshot, payments, users, now }: Dependencies) {
  /** The month asked, the current Gaza month by default; one finance does not read → 422. */
  function monthAsked(month: string | undefined, at: Date): string {
    const asked = month ?? currentMonth(at);
    if (monthError(asked, at)) throw AppError.validation({ month: ['out_of_range'] });
    return asked;
  }

  return {
    /**
     * A month's income (data model › Income): the month, the month before, today and all time by
     * the kind of item paid; the last 12 months and the visits' last 30 days; each staff member's
     * collections in the month by method. The sums and the collections in one snapshot, so the
     * month equals its bar; the names after it (a name is no figure).
     */
    async income(spaceId: number, query: FinanceMonthQuery): Promise<IncomeReport> {
      const at = now();
      const month = monthAsked(query.month, at);
      const today = gazaClockOf(at).date;
      const months = monthsEnding(currentMonth(at), 12);
      const days = daysEnding(today, 30);
      const windows: IncomeWindow[] = [
        monthWindow(month),
        monthWindow(addMonths(month, -1)),
        dayWindow(today),
        { from: null, to: null },
        ...months.map(monthWindow),
        ...days.map(dayWindow),
      ];
      const [totals, first, collections] = await readSnapshot((tx) =>
        Promise.all([
          payments.incomeIn(spaceId, windows, tx),
          payments.firstReceivedAt(spaceId, tx),
          payments.collectionsIn(spaceId, monthWindow(month), tx),
        ]),
      );
      const names = new Map(
        (await users.namesFor(collections.map(({ recordedById }) => recordedById))).map(
          ({ id, name }) => [id, name],
        ),
      );
      const split = (index: number) => {
        const found = totals[index];
        if (!found) throw new Error(`The income window ${String(index)} is missing.`);
        return found;
      };
      return {
        month,
        income: split(0),
        previousMonth: split(1),
        today: split(2),
        allTime: { ...split(3), since: first && gazaClockOf(first).date },
        months: months.map((asked, i) => ({ month: asked, income: split(4 + i) })),
        visitsByDay: days.map((date, i) => ({
          date,
          agorot: split(4 + months.length + i).visitsAgorot,
        })),
        collections: collections.map((row) => {
          const name = names.get(row.recordedById);
          if (name === undefined)
            throw new Error(`The user ${String(row.recordedById)} has no name.`);
          return toCollections(row, name);
        }),
      };
    },
  };
}

export type FinanceService = ReturnType<typeof createFinanceService>;
