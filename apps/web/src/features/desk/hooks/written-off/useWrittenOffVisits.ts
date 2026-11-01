import { gazaClockOf } from '@masaha/shared/core';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { dayText, priceText } from '@shared/lib';
import { paginationView, usePageInRange } from '@shared/lists';
import { isolate, useLanguage } from '@shared/localisation';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useWrittenOffQuery } from './useWrittenOffQuery';

/** The address's page of the written-off visits, from 2. */
const PAGE_PARAM = 'writtenOffPage';

const pageOf = (value: string | null) => {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? page : 1;
};

/**
 * «لن تُحصَّل» (164, DI19), the owner's view of the uncollected card, ready to render: a page of the
 * visits written off and not undone, the server's order; each row's visitor (their file when a
 * customer's), the visit's day, what was written off and why, who wrote it off and when, and the
 * visit's id for «تراجع». Read while the view is shown; its page lives in the address.
 */
export function useWrittenOffVisits(spaceId: number) {
  const copy = useCopy();
  const words = copy.desk.writtenOff;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const [search, setSearch] = useSearchParams();
  const page = pageOf(search.get(PAGE_PARAM));
  const query = useWrittenOffQuery(spaceId, page);
  const answer = query.data;
  const replacePage = useCallback(
    (target: number) => {
      setSearch(
        (current) => {
          const next = new URLSearchParams(current);
          if (target > 1) next.set(PAGE_PARAM, String(target));
          else next.delete(PAGE_PARAM);
          return next;
        },
        { replace: true },
      );
    },
    [setSearch],
  );
  // A page past the last (its last visits undone, or a stale address) shows the last page.
  const pastLast = usePageInRange({
    answer,
    placeholder: query.isPlaceholderData,
    page,
    replacePage,
  });
  const { view, blocked } = useRefusalView(
    answer === undefined ? query.error : null,
    words.loadFailed,
  );

  const dateOf = (instant: string) => dayText(gazaClockOf(new Date(instant)).date, language);
  const rows = (answer?.data ?? []).map(({ visit, writtenOffBy, writtenOffAgorot }) => {
    const name = visit.customer?.name ?? visit.visitorName ?? '';
    const day = dateOf(visit.checkedOutAt ?? visit.checkedInAt);
    return {
      key: String(visit.id),
      visitId: visit.id,
      name,
      customerId: visit.customer?.id ?? null,
      day,
      line: words.line({
        amount: isolate(priceText(writtenOffAgorot, language)),
        reason: isolate(visit.writeOff?.reason ?? ''),
      }),
      by: words.by({
        name: isolate(writtenOffBy.name),
        date: dateOf(visit.writeOff?.at ?? visit.checkedInAt),
      }),
      undo: words.undo,
      // Named by its visit, as the desk names a row's control by its person.
      undoName: words.undoName({ name: isolate(name), day }),
    };
  });
  const total = answer?.meta.totalRecords ?? 0;
  const searchOf = (target: number) => {
    const next = new URLSearchParams(search);
    if (target > 1) next.set(PAGE_PARAM, String(target));
    else next.delete(PAGE_PARAM);
    const text = next.toString();
    return text === '' ? '' : `?${text}`;
  };

  return {
    state:
      query.isPending || pastLast
        ? ('loading' as const)
        : answer === undefined
          ? query.error.type === 'network' || query.error.type === 'timeout'
            ? ('offline' as const)
            : ('failed' as const)
          : total === 0
            ? ('empty' as const)
            : ('ready' as const),
    rows,
    busy: query.isPlaceholderData,
    empty: words.none,
    pagination: paginationView({
      current: answer?.meta.currentPage ?? page,
      total: answer?.meta.totalPages ?? 0,
      words: words.pagination,
      searchOf,
      onlyPastOne: true,
    }),
    offline: { title: copy.status.offline.title, text: copy.status.offline.description },
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
  };
}

/** «لن تُحصَّل», ready to render. */
export type WrittenOffVisitsView = ReturnType<typeof useWrittenOffVisits>;
/** One written-off visit. */
export type WrittenOffRowView = WrittenOffVisitsView['rows'][number];
