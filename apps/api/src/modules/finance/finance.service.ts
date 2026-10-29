import { addMonths, gazaClockOf, type PaginationMeta } from '@masaha/shared/core';
import type {
  BalanceRow,
  DebtsMeta,
  DebtsQuery,
  FinanceMonthQuery,
  IncomeReport,
  OccupancyReport,
  Payer,
  PayersQuery,
} from '@masaha/shared/finance';

import type { ReadSnapshot } from '../../db/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import { toSkip } from '../../shared/http/index.ts';
import type { CustomersService } from '../customers/index.ts';
import type { IncomeWindow, PaymentsService } from '../payments/index.ts';
import type { SpaceSettingsService } from '../space-settings/index.ts';
import type { SubscriptionsService } from '../subscriptions/index.ts';
import type { UsersService } from '../users/index.ts';
import type { VisitsService } from '../visits/index.ts';
import { toBalanceRow, toCollections } from './finance.mapper.ts';
import { createFinanceRepository } from './finance.repository.ts';
import { averageDailyAttendance, averagePerHour, peakHour } from './occupancyGrid.ts';
import {
  currentMonth,
  dayWindow,
  daysEnding,
  daysOfMonth,
  fourWeeksBefore,
  hourSlots,
  monthError,
  monthsEnding,
  monthWindow,
} from './windows.ts';

interface Dependencies {
  /** One snapshot per answer whose figures must agree (conventions › Composed reads). */
  readSnapshot: ReadSnapshot;
  /** The ledger's aggregates: income, collections, the balances and the uncollected visits. */
  payments: PaymentsService;
  /** The names of who recorded the payments. */
  users: UsersService;
  /** The debtors' names and phones, an archived one marked; the payers' names. */
  customers: CustomersService;
  /** The name of a debtor's oldest subscription still owing. */
  subscriptions: SubscriptionsService;
  /** The name of a debtor's oldest visit still owing. */
  visits: VisitsService;
  /** The space's reminder template. */
  spaceSettings: SpaceSettingsService;
  /** The one clock (conventions §11): today and the current month. */
  now: () => Date;
}

/**
 * The owner's finance (docs/features/finance.md): read models over the ledger and the stays,
 * every figure computed in the database by its owning module's aggregate, on Gaza's calendar. It
 * writes nothing.
 */
export function createFinanceService({
  readSnapshot,
  payments,
  users,
  customers,
  subscriptions,
  visits,
  spaceSettings,
  now,
}: Dependencies) {
  const repository = createFinanceRepository();

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

    /**
     * Who owes, or who is in credit (`state`), by the ledger's one balance rule — an archived
     * customer's kept and marked — the largest first, paged, each with their phone and, who owes,
     * the item still owing made first; with the space's totals (owed, in credit, the uncollected
     * visits apart) and its reminder template. All of it in one snapshot, so the page agrees with
     * its totals.
     */
    debts(
      spaceId: number,
      query: DebtsQuery,
    ): Promise<{
      rows: BalanceRow[];
      total: number;
      meta: Omit<DebtsMeta, keyof PaginationMeta>;
    }> {
      const at = now();
      return readSnapshot(async (tx) => {
        const [page, balances, uncollected, settings] = await Promise.all([
          payments.balancesPage(spaceId, query.state, at, query, tx),
          payments.balanceTotals(spaceId, at, tx),
          payments.uncollectedTotals(spaceId, tx),
          spaceSettings.read(spaceId, tx),
        ]);
        const oldestOf = (kind: 'VISIT' | 'SUBSCRIPTION') =>
          page.rows.flatMap(({ oldest }) => (oldest?.kind === kind ? [oldest.id] : []));
        const [contacts, subscriptionNames, deskVisits] = await Promise.all([
          customers.contactsOf(
            spaceId,
            page.rows.map(({ customerId }) => customerId),
            tx,
          ),
          subscriptions.namesOf(spaceId, oldestOf('SUBSCRIPTION'), tx),
          visits.deskVisitsOf(spaceId, oldestOf('VISIT'), tx),
        ]);
        /** The oldest item's name: a visit's visitor, else its customer; a subscription's. */
        const nameOf = ({ kind, id }: { kind: 'VISIT' | 'SUBSCRIPTION'; id: number }) => {
          if (kind === 'SUBSCRIPTION') {
            const subscription = subscriptionNames.get(id);
            if (!subscription) throw new Error(`The subscription ${String(id)} is missing.`);
            return subscription.name;
          }
          const visit = deskVisits.get(id);
          if (!visit) throw new Error(`The visit ${String(id)} is missing.`);
          return visit.visitorName ?? visit.customer?.name ?? null;
        };
        return {
          rows: page.rows.map((row) => {
            const contact = contacts.get(row.customerId);
            if (!contact) throw new Error(`The customer ${String(row.customerId)} is missing.`);
            return toBalanceRow(row, contact, row.oldest && nameOf(row.oldest));
          }),
          total: page.total,
          meta: {
            totals: { ...balances, uncollected },
            reminderTemplate: settings.reminderTemplate,
          },
        };
      });
    },

    /**
     * Who paid in the month (the current Gaza month by default): each customer with what they paid
     * then, the latest paid first, paged; named after the page. Read apart, as every list.
     */
    async payers(spaceId: number, query: PayersQuery): Promise<{ rows: Payer[]; total: number }> {
      const month = monthAsked(query.month, now());
      const { rows, total } = await repository.payersIn(spaceId, monthWindow(month), {
        skip: toSkip(query),
        take: query.limit,
      });
      const names = await customers.namesOf(
        spaceId,
        rows.map(({ customerId }) => customerId),
      );
      return {
        rows: rows.map(({ customerId, paidAgorot, lastPaidAt }) => {
          const name = names.get(customerId);
          if (name === undefined) throw new Error(`The customer ${String(customerId)} is missing.`);
          return {
            customer: { id: customerId, name },
            paidAgorot,
            lastPaidAt: lastPaidAt.toISOString(),
          };
        }),
        total,
      };
    },

    /**
     * The occupancy statistics (data model › Occupancy statistics), from closed stays: the month's
     * average stay, peak hour and average daily attendance, over its days up to today; visits and
     * members per day over the 14 days ending today; the average present per weekday and hour over
     * the 28 days before today. The reads in parallel, with no snapshot: each figure stands alone.
     */
    async occupancy(spaceId: number, query: FinanceMonthQuery): Promise<OccupancyReport> {
      const at = now();
      const month = monthAsked(query.month, at);
      const fortnight = daysEnding(gazaClockOf(at).date, 14);
      const monthDays = daysOfMonth(month, at);
      const weekSlots = hourSlots(fourWeeksBefore(at));
      const monthSlots = hourSlots(monthDays);
      const [byDay, monthByDay, weekPresence, monthPresence, averageStayMinutes] =
        await Promise.all([
          repository.perDay(spaceId, fortnight.map(dayWindow)),
          repository.perDay(spaceId, monthDays.map(dayWindow)),
          repository.presenceBySlot(spaceId, weekSlots),
          repository.presenceBySlot(spaceId, monthSlots),
          repository.stayMinutes(spaceId, monthWindow(month)),
        ]);
      return {
        month,
        averageStayMinutes,
        peakHour: peakHour(monthSlots, monthPresence),
        averageDailyAttendance: averageDailyAttendance(monthByDay),
        byDay: fortnight.map((date, i) => ({
          date,
          visits: byDay[i]?.visits ?? 0,
          members: byDay[i]?.members ?? 0,
        })),
        byHour: averagePerHour(weekSlots, weekPresence),
      };
    },
  };
}

export type FinanceService = ReturnType<typeof createFinanceService>;
