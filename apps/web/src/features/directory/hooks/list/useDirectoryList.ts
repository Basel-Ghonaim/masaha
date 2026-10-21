import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { paginationView } from '@shared/lists';
import { useLanguage } from '@shared/localisation';
import { useEffect } from 'react';
import { cardViewOf } from '../../services/cardView';
import type { DirectoryOrder } from '../../types/DirectoryFilters';
import type { DirectoryListView, ListFailureView } from '../../types/DirectoryListView';
import { useDirectoryFilters } from './useDirectoryFilters';
import { useDirectoryQuery } from './useDirectoryQuery';

/**
 * The directory's list, ready to render: the search, the order, the count, the cards a page at a
 * time, the pages, and the words of each state (loading, failed, an empty directory, no match).
 *
 * A failure is read as any refusal is: no connection or no answer says so, any other with its
 * request's reference. A failed refresh keeps the cards shown. While another page or filter loads,
 * the cards shown stay, the results marked busy. A page past the last shows the last in its place.
 * «Best match» is offered only while a search applies: the server's order then.
 */
export function useDirectoryList(): DirectoryListView {
  const copy = useCopy();
  const words = copy.directory;
  const english = useLanguage() === 'en';
  const filters = useDirectoryFilters();
  const query = useDirectoryQuery(filters.request);
  const answer = query.data;

  const failed = answer === undefined ? query.error : null;
  const load = useRefusalView(failed, words.loadFailed);
  const refresh = useRefusalView(
    answer !== undefined && query.isError ? query.error : null,
    words.refreshFailed,
  );
  const failureOf = (
    view: typeof load,
    error: AppError | null,
    title: string,
  ): ListFailureView | null =>
    error === null || view.view === null
      ? null
      : {
          title,
          line: view.view.message,
          reference: view.view.kind === 'refused' ? (view.view.reference ?? null) : null,
          retry: {
            label: copy.status.retry,
            blocked: view.blocked,
            run: () => {
              void query.refetch();
            },
          },
        };

  // A page past the last (as after spaces left the directory) shows the last page in its place.
  const lastPage = answer?.meta.totalPages ?? 0;
  const pastLast =
    answer !== undefined &&
    !query.isPlaceholderData &&
    answer.data.length === 0 &&
    lastPage > 0 &&
    filters.filters.page > lastPage;
  const { replacePage } = filters;
  useEffect(() => {
    if (pastLast) replacePage(lastPage);
  }, [pastLast, lastPage, replacePage]);

  const searching = filters.filters.q !== undefined;
  const order: DirectoryOrder = filters.filters.sort ?? (searching ? 'relevance' : 'updated');
  const orders: DirectoryOrder[] = searching
    ? ['relevance', 'updated', 'name']
    : ['updated', 'name'];
  const now = new Date();
  const cards = (answer?.data ?? []).map((space) => cardViewOf(space, { english, now, copy }));

  return {
    search: {
      label: words.search.label,
      placeholder: words.search.placeholder,
      text: filters.search.text,
      change: filters.search.change,
      error: filters.search.refused ? words.search.refused : null,
    },
    sort: {
      label: words.sort.label,
      valueText: words.sort.value({ sort: words.sort.options[order] }),
      value: order,
      options: orders.map((value) => ({ value, label: words.sort.options[value] })),
      choose: (value) => {
        const chosen = orders.find((candidate) => candidate === value);
        if (chosen !== undefined) filters.apply({ sort: chosen });
      },
    },
    count:
      answer === undefined
        ? ''
        : filters.anyApplied
          ? words.count.matching({ count: answer.meta.totalRecords })
          : words.count.all({ count: answer.meta.totalRecords }),
    results: {
      heading: words.results,
      busy: answer !== undefined && query.isFetching,
      state:
        query.isPending || pastLast
          ? 'loading'
          : answer === undefined
            ? 'failed'
            : cards.length > 0
              ? 'ready'
              : filters.anyApplied
                ? 'noMatch'
                : 'empty',
      cards,
      failure: failureOf(load, failed, words.loadFailed),
      refreshFailure: failureOf(
        refresh,
        answer !== undefined && query.isError ? query.error : null,
        words.refreshFailed,
      ),
      empty: { title: words.empty.title, text: words.empty.text },
      noMatch: {
        title: words.noMatch.title,
        text: words.noMatch.text,
        clear: { label: words.clearFilters, run: filters.clearAll },
      },
    },
    page: answer?.meta.currentPage ?? filters.filters.page,
    pagination: paginationView({
      current: answer?.meta.currentPage ?? 1,
      total: lastPage,
      words: words.pagination,
      searchOf: filters.searchOf,
    }),
  };
}
