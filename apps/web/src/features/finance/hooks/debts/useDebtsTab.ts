import { addDays, addMonths, DEFAULT_PAGE_SIZE, gazaClockOf } from '@masaha/shared/core';
import type { BalanceRow } from '@masaha/shared/finance';
import { useCopy } from '@shared/copy';
import { spaceNameOf, whatsappLink } from '@shared/lib';
import { paginationView, rangeSummary } from '@shared/lists';
import { isolate } from '@shared/localisation';
import { dateText } from '../../services/dateText';
import { monthLabel } from '../../services/monthLabel';
import { reminderText } from '../../services/reminderText';
import type { FinanceLinks } from '../../types/FinanceLinks';
import type { FinanceTabsView } from '../useFinanceTabs';
import { useLoadFailure } from '../useLoadFailure';
import { useMoney } from '../useMoney';
import { useDebtsQuery } from './useDebtsQuery';
import { usePayersQuery } from './usePayersQuery';

/** How many of the month's payers the card lists; the rest are the ledger's. */
const PAYERS_SHOWN = 5;

/**
 * Finance › Debts (D5.4), ready to render: four tiles — what is owed, the customers' credit, who paid
 * in the month, and the uncollected visits, never added to the debts (DI9, 193); who owes, largest
 * first, each with the oldest item, the amount, a WhatsApp reminder when there is a phone and
 * «استلام دفعة» to the file (DI15); who is in credit; and five of who paid in the month, «عرض الكل»
 * to the ledger's range of that month. Every figure is the server's. A tile is `ltr` when its value
 * must keep its order in an RTL page (an amount), never a counted phrase («7 زبائن»).
 */
export function useDebtsTab(
  spaceId: number,
  place: Pick<FinanceTabsView, 'month' | 'asked' | 'owesPage' | 'creditPage' | 'searchOf'>,
  {
    links,
    spaceName,
  }: { links: FinanceLinks; spaceName: { nameAr: string | null; nameEn: string } },
) {
  const copy = useCopy();
  const words = copy.finance.debts;
  const { language, money } = useMoney();
  const owes = useDebtsQuery(spaceId, {
    state: 'OWES',
    page: place.owesPage,
    limit: DEFAULT_PAGE_SIZE,
  });
  const credit = useDebtsQuery(spaceId, {
    state: 'CREDIT',
    page: place.creditPage,
    limit: DEFAULT_PAGE_SIZE,
  });
  const payers = usePayersQuery(spaceId, {
    ...(place.asked !== undefined && { month: place.asked }),
    page: 1,
    limit: PAYERS_SHOWN,
  });
  const failed = [owes, credit, payers].find(
    (result) => result.data === undefined && result.isError,
  );
  const failure = useLoadFailure(failed?.error ?? null, () => {
    for (const result of [owes, credit, payers]) {
      if (result.isError) void result.refetch();
    }
  });

  if (owes.data === undefined || credit.data === undefined || payers.data === undefined) {
    return failed === undefined
      ? { state: 'loading' as const, failure }
      : { state: 'failed' as const, failure };
  }

  const shown = (agorot: number) => isolate(money(agorot));
  const { totals, reminderTemplate } = owes.data.meta;
  const template = reminderTemplate ?? copy.spaceSettings.reminder.defaultText;
  const label = monthLabel(place.month, language);
  const today = gazaClockOf(new Date()).date;
  const monthEnd = addDays(`${addMonths(place.month, 1)}-01`, -1);
  const pagination = copy.payments.ledger.pagination;

  const owesRow = (row: BalanceRow) => ({
    key: String(row.customer.id),
    name: row.customer.name,
    href: links.customer(row.customer.id),
    archived: row.customer.archived ? words.owes.archived : null,
    since:
      row.oldestItem === null
        ? null
        : words.owes.since({
            date: isolate(dateText(row.oldestItem.since, language)),
            item: isolate(row.oldestItem.name ?? words.owes.items[row.oldestItem.kind]),
          }),
    amount: words.owes.amount({ amount: shown(row.amountAgorot) }),
    whatsapp:
      row.customer.phone === null
        ? null
        : {
            label: words.owes.whatsapp,
            href: whatsappLink(
              row.customer.phone,
              reminderText(template, {
                name: row.customer.name,
                amount: money(row.amountAgorot),
                // One language a message: the English default names it in English.
                space: spaceNameOf(spaceName, reminderTemplate === null && language === 'en').text,
              }),
            ),
          },
    receive: { label: words.owes.receive, href: links.customer(row.customer.id) },
  });

  return {
    state: 'ready' as const,
    failure,
    busy: owes.isPlaceholderData || credit.isPlaceholderData || payers.isPlaceholderData,
    tiles: [
      {
        key: 'owed',
        label: words.tiles.owed,
        value: shown(totals.owed.agorot),
        ltr: true,
        helper: words.customers({ count: totals.owed.customers }),
        href: null,
      },
      {
        key: 'credit',
        label: words.tiles.credit,
        value: shown(totals.credit.agorot),
        ltr: true,
        helper: words.tiles.creditHelper({
          customers: words.customers({ count: totals.credit.customers }),
        }),
        href: null,
      },
      {
        key: 'paid',
        label: words.tiles.paid({ month: label }),
        value: words.customers({ count: payers.data.meta.totalRecords }),
        ltr: false,
        helper: undefined,
        href: null,
      },
      {
        key: 'uncollected',
        label: words.tiles.uncollected,
        value: words.visits({ count: totals.uncollected.visits }),
        ltr: false,
        helper:
          words.tiles.uncollectedHelper({ amount: shown(totals.uncollected.owedAgorot) }) +
          (totals.uncollected.unpriced > 0
            ? words.tiles.unpriced({ count: totals.uncollected.unpriced })
            : ''),
        href: links.uncollected,
      },
    ],
    owes: {
      title: words.owes.title,
      description: words.owes.description,
      rows: owes.data.data.map(owesRow),
      empty: words.owes.empty,
      range: rangeSummary(owes.data.meta, { range: copy.forms.listRange }),
      pagination: paginationView({
        current: owes.data.meta.currentPage,
        total: owes.data.meta.totalPages,
        words: { ...pagination, label: words.owes.pages },
        searchOf: (page) => place.searchOf({ page, credit: place.creditPage }),
        onlyPastOne: true,
      }),
    },
    credit: {
      title: words.credit.title,
      description: words.credit.description,
      rows: credit.data.data.map((row) => ({
        key: String(row.customer.id),
        name: row.customer.name,
        href: links.customer(row.customer.id),
        amount: words.credit.amount({ amount: shown(row.amountAgorot) }),
      })),
      none: words.credit.none,
      pagination: paginationView({
        current: credit.data.meta.currentPage,
        total: credit.data.meta.totalPages,
        words: { ...pagination, label: words.credit.pages },
        searchOf: (page) => place.searchOf({ page: place.owesPage, credit: page }),
        onlyPastOne: true,
      }),
    },
    payers: {
      title: words.tiles.paid({ month: label }),
      rows: payers.data.data.map((payer) => ({
        key: String(payer.customer.id),
        name: payer.customer.name,
        href: links.customer(payer.customer.id),
        line: words.payers.line({
          paid: shown(payer.paidAgorot),
          date: isolate(dateText(gazaClockOf(new Date(payer.lastPaidAt)).date, language)),
        }),
      })),
      none: words.payers.none,
      viewAll:
        payers.data.meta.totalRecords > PAYERS_SHOWN
          ? {
              label: words.payers.viewAll,
              href: links.ledger({
                from: `${place.month}-01`,
                to: monthEnd < today ? monthEnd : today,
              }),
            }
          : null,
    },
  };
}

/** Finance › Debts, ready to render. */
export type DebtsTabView = ReturnType<typeof useDebtsTab>;
