import { SPACE_STATES } from '@masaha/shared/space-links';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { useLanguage } from '@shared/localisation';
import { useEffect } from 'react';
import { pageItems } from '../../services/pageItems';
import { rowView } from '../../services/rowView';
import { useAdminSpacesFilters } from './useAdminSpacesFilters';
import { useAdminSpacesQuery } from './useAdminSpacesQuery';

/**
 * The admin's spaces list, ready to render: its state (loading, failed, empty, no match, or the
 * rows), a page of rows worded in the interface's language, the count the filters keep, the pages,
 * the filters, and the words of each state. The rows, their order, their states and the filters'
 * meaning are the server's; this words them.
 *
 * A failure to load is read as any refusal is, with its line, its request's reference and, for too
 * many requests, the wait, during which the retry waits too; a failed refetch keeps the rows. While
 * another page or filter loads, the rows and the pages shown stay, the list marked busy, so a page
 * chosen from the keyboard keeps the focus. A page past the last, as after deleting the last row
 * there, shows the last page in its place.
 */
export function useAdminSpacesList() {
  const copy = useCopy();
  const lines = copy.spaceLinks.adminList;
  const english = useLanguage() === 'en';
  const filters = useAdminSpacesFilters();
  const query = useAdminSpacesQuery(filters.request);
  const answer = query.data;
  const { view, blocked } = useRefusalView(
    answer === undefined ? query.error : null,
    lines.loadFailed,
  );

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

  const now = new Date();
  const rows = (answer?.data ?? []).map((row) => rowView(row, { lines, english, now }));
  const current = answer?.meta.currentPage ?? 1;

  return {
    status:
      query.isPending || pastLast
        ? ('loading' as const)
        : answer === undefined
          ? ('error' as const)
          : rows.length > 0
            ? ('ready' as const)
            : filters.anyApplied
              ? ('noMatch' as const)
              : ('empty' as const),
    rows,
    /** Another page or filter is loading, the rows shown meanwhile those already there. */
    busy: query.isPlaceholderData,
    label: lines.label,
    columns: lines.columns,
    noOwner: lines.noOwner,
    summary: answer && lines.count({ count: answer.meta.totalRecords }),
    pagination:
      lastPage > 1
        ? {
            label: lines.pagination.label,
            more: lines.pagination.more,
            summary: lines.pagination.summary({ page: current, total: lastPage }),
            previous: {
              label: lines.pagination.previous,
              search: current > 1 ? filters.searchOf(current - 1) : null,
            },
            next: {
              label: lines.pagination.next,
              search: current < lastPage ? filters.searchOf(current + 1) : null,
            },
            items: pageItems(current, lastPage).map((item) =>
              typeof item === 'number'
                ? {
                    kind: 'page' as const,
                    page: item,
                    label: lines.pagination.page({ page: item }),
                    search: filters.searchOf(item),
                    current: item === current,
                  }
                : { kind: 'gap' as const, key: item },
            ),
          }
        : null,
    empty: { title: lines.empty, description: lines.emptyHint },
    noMatch: { title: lines.noMatch, clearLabel: lines.clearFilters, clear: filters.clearAll },
    failure: {
      title: lines.loadFailed,
      message: view?.message,
      reference: view?.kind === 'refused' ? view.reference : undefined,
      retryLabel: copy.status.retry,
      blocked,
      retry: () => {
        void query.refetch();
      },
    },
    filters: {
      search: {
        label: lines.search,
        placeholder: lines.searchPlaceholder,
        text: filters.search.text,
        change: filters.search.change,
      },
      place: {
        label: lines.place,
        value: filters.filters.place,
        choose: filters.choosePlace,
      },
      status: {
        label: lines.status,
        value: filters.filters.status ?? 'all',
        options: [
          { value: 'all', label: lines.allStatuses },
          ...SPACE_STATES.map((state) => ({ value: state, label: lines.states[state] })),
        ],
        choose: (value: string) => {
          filters.chooseStatus(SPACE_STATES.find((state) => state === value));
        },
      },
      stale: {
        label: lines.staleOnly,
        checked: filters.filters.stale,
        toggle: filters.chooseStale,
      },
      /** The phone's sheet that holds the place, the state and stale only. */
      sheet: {
        text: lines.filters,
        label:
          filters.applied > 0 ? lines.filtersApplied({ count: filters.applied }) : lines.filters,
        count: filters.applied,
        title: lines.filters,
        closeLabel: lines.close,
        clearLabel: lines.clearFilters,
        clear: filters.clearFilters,
      },
    },
  };
}
