import { ACCOUNT_STATES } from '@masaha/shared/space-links';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { useLanguage } from '@shared/localisation';
import { paginationView } from '../../services/paginationView';
import { userRowView } from '../../services/userRowView';
import { usePageInRange } from '../usePageInRange';
import { useAdminUsersQuery } from '../users-list/useAdminUsersQuery';
import { useUsersFilters } from '../users-list/useUsersFilters';

/** The state chip that applies no filter, as `ToggleGroup` values name it. */
const ALL = 'all';

/**
 * The admin's owners page, ready to render: the users list with its role fixed to the owners, its
 * state (loading, failed, empty, no match, or the rows), a page of rows worded in the interface's
 * language, the count the filters keep, the pages, the search and the state chips, and the words of
 * each state. The rows, their order and the filters' meaning are the server's; this words them.
 *
 * A failure to load is read as any refusal is, with its line, its request's reference and, for too
 * many requests, the wait, during which the retry waits too; a failed refetch keeps the rows. While
 * another page or filter loads, the rows and the pages shown stay, the list marked busy. A page past
 * the last shows the last page in its place.
 */
export function useOwnersList() {
  const copy = useCopy();
  const lines = copy.spaceLinks.ownersList;
  const english = useLanguage() === 'en';
  const filters = useUsersFilters();
  const query = useAdminUsersQuery({ ...filters.request, role: 'owner' });
  const answer = query.data;
  const { view, blocked } = useRefusalView(
    answer === undefined ? query.error : null,
    lines.loadFailed,
  );

  const pastLast = usePageInRange({
    answer,
    placeholder: query.isPlaceholderData,
    page: filters.filters.page,
    replacePage: filters.replacePage,
  });

  const rows = (answer?.data ?? []).map((row) => userRowView(row, { lines, english }));

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
    intro: lines.intro,
    columns: lines.columns,
    /** The line of an owner whose every space is deleted, which leads to the deleted spaces. */
    allSpacesDeleted: lines.allSpacesDeleted,
    count: answer === undefined ? undefined : lines.count({ count: answer.meta.totalRecords }),
    pagination: paginationView({
      current: answer?.meta.currentPage ?? 1,
      total: answer?.meta.totalPages ?? 0,
      words: lines.pagination,
      searchOf: filters.searchOf,
    }),
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
      state: {
        label: lines.state,
        value: filters.filters.state ?? ALL,
        options: [
          { value: ALL, label: lines.states.all },
          ...ACCOUNT_STATES.map((state) => ({ value: state, label: lines.states[state] })),
        ],
        choose: (value: string) => {
          // The chip already on hands `''` when clicked again: it stays on.
          if (value === '') return;
          filters.chooseState(ACCOUNT_STATES.find((state) => state === value));
        },
      },
    },
  };
}
