import { gazaClockOf } from '@masaha/shared/core';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { clockOf, priceText } from '@shared/lib';
import { paginationView } from '@shared/lists';
import { isolate, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { dayWord } from '../../services/dayWord';
import type { DeskAbilities } from '../../types/DeskAbilities';
import type { UncollectedItem } from '../../types/UncollectedItem';
import { useUncollectedQuery } from './useUncollectedQuery';

/** The card's anchor: the owner's overview links to it (DI-19). */
export const UNCOLLECTED_ID = 'uncollected';
/** The address's page of the list, from 2. */
const PAGE_PARAM = 'uncollectedPage';
/** The rows shown before «عرض الكل» (DI-23). */
const FIRST_ROWS = 3;

export type UncollectedDialog = { kind: 'collect' | 'debt' | 'writeOff'; item: UncollectedItem };

const pageOf = (value: string | null) => {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? page : 1;
};

/**
 * «غير محصّل», ready to render: the title counting the visits from the page's `meta`, never a sum of
 * money (DI-3); three rows, then all of the page with its pages (DI-23), opened whole on arriving at
 * `#uncollected` (DI-19). Each row says who, how and when it closed, and what it still owes, the
 * server's; «تحصيل» while it has a price, «تسجيل دين» while it has no customer, and the owner's
 * «لن يُحصَّل…» in its «⋯» (S5). The rows are the server's: it lists the auto check-out's visits and a
 * hand-closed one owing again after a void, and the card filters none. One dialog at a time.
 */
export function useUncollectedCard(spaceId: number, abilities: DeskAbilities) {
  const copy = useCopy();
  const words = copy.desk.uncollected;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const [search] = useSearchParams();
  const arrivedAtCard = useLocation().hash === `#${UNCOLLECTED_ID}`;
  const page = pageOf(search.get(PAGE_PARAM));
  const query = useUncollectedQuery(spaceId, page);
  const answer = query.data;
  const [expanded, setExpanded] = useState(arrivedAtCard || page > 1);
  const [dialog, setDialog] = useState<UncollectedDialog | null>(null);
  const { view, blocked } = useRefusalView(
    answer === undefined ? query.error : null,
    words.loadFailed,
  );

  const now = new Date();
  const timeOf = (instant: string) => clockOf(gazaClockOf(new Date(instant)).minute);
  const items = (answer?.data ?? []).map((uncollected) => {
    const { visit, balanceAgorot } = uncollected;
    const closed = visit.checkedOutAt ?? visit.checkedInAt;
    const item: UncollectedItem = {
      uncollected,
      name: visit.customer?.name ?? visit.visitorName ?? '',
      day: dayWord(closed, now, language, words),
    };
    const when = {
      day: item.day,
      range: isolate(`${timeOf(visit.checkedInAt)}–${timeOf(closed)}`),
    };
    const open = (kind: UncollectedDialog['kind']) => () => {
      setDialog({ kind, item });
    };
    return {
      key: String(visit.id),
      name: item.name,
      how: visit.checkoutMethod === 'AUTO' ? words.how(when) : words.howManual(when),
      amount: balanceAgorot === null ? words.unpriced : isolate(priceText(balanceAgorot, language)),
      collect: balanceAgorot === null ? null : { label: words.collect, run: open('collect') },
      debt: visit.customer === null ? { label: words.debt, run: open('debt') } : null,
      // The write-off is of a priced visit's rest; an unpriced one is priced first.
      more:
        abilities.writeOff && balanceAgorot !== null
          ? {
              label: words.more({ name: isolate(item.name) }),
              writeOff: { label: words.writeOff, run: open('writeOff') },
            }
          : null,
    };
  });
  const total = answer?.meta.totalRecords ?? 0;
  const current = answer?.meta.currentPage ?? page;
  const searchOf = (target: number) => {
    const next = new URLSearchParams(search);
    if (target > 1) next.set(PAGE_PARAM, String(target));
    else next.delete(PAGE_PARAM);
    const text = next.toString();
    return text === '' ? '' : `?${text}`;
  };

  return {
    id: UNCOLLECTED_ID,
    arrivedAtCard,
    title: words.title({ count: total }),
    state: query.isPending
      ? ('loading' as const)
      : answer === undefined
        ? ('failed' as const)
        : items.length === 0
          ? ('empty' as const)
          : ('ready' as const),
    rows: expanded ? items : items.slice(0, FIRST_ROWS),
    busy: query.isPlaceholderData,
    toggle:
      total > FIRST_ROWS
        ? {
            label: expanded ? words.showFewer : words.showAll({ count: total }),
            expanded,
            run: () => {
              setExpanded(!expanded);
            },
          }
        : null,
    pagination: expanded
      ? paginationView({
          current,
          total: answer?.meta.totalPages ?? 0,
          words: words.pagination,
          searchOf,
        })
      : null,
    empty: words.none,
    failure: {
      title: words.loadFailed,
      message: view?.message,
      reference: view?.kind === 'refused' ? view.reference : undefined,
      retryLabel: copy.status.retry,
      blocked,
      retry: () => {
        void query.refetch();
      },
    },
    refreshFailure:
      answer !== undefined && query.isError ? copy.occupancy.present.refreshFailed : null,
    dialog,
    closeDialog: () => {
      setDialog(null);
    },
  };
}

/** «غير محصّل», ready to render. */
export type UncollectedCardView = ReturnType<typeof useUncollectedCard>;
/** One row of «غير محصّل». */
export type UncollectedRowView = UncollectedCardView['rows'][number];
