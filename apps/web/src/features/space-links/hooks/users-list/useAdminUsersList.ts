import { ACCOUNT_STATES, USER_ROLE_FILTERS } from '@masaha/shared/space-links';
import { useCopy, type Catalogue } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { paginationView, usePageInRange } from '@shared/lists';
import { useLanguage } from '@shared/localisation';
import { userRowView } from '../../services/userRowView';
import type { UserRoleFilter } from '../../types/UsersFilters';
import { useAdminUsersQuery } from './useAdminUsersQuery';
import { useUsersFilters } from './useUsersFilters';

/** The role or state chip that applies no filter, as `ToggleGroup` values name it. */
const ALL = 'all';

/** The words a users list is said in: the owners and the users pages each have their own. */
export type AdminUsersListWords = Pick<
  Catalogue['spaceLinks']['ownersList'],
  | 'label'
  | 'search'
  | 'searchPlaceholder'
  | 'state'
  | 'states'
  | 'count'
  | 'empty'
  | 'emptyHint'
  | 'noMatch'
  | 'clearFilters'
  | 'loadFailed'
  | 'pagination'
>;

/** The words of the role chips, offered when the role is not fixed. */
type RoleWords = Pick<Catalogue['spaceLinks']['usersList'], 'role' | 'roles'>;

/**
 * The admin's users list, ready to render: its state (loading, failed, empty, no match, or the
 * rows), a page of rows worded in the interface's language, the count the filters keep, the pages,
 * the search, the role chips and the state chips, and the words of each state, in the list's own
 * `words`. With `fixedRole`, the list asks for that role alone, and offers no role chips. The rows,
 * their order and the filters' meaning are the server's; this words them.
 *
 * A failure to load is read as any refusal is, with its line, its request's reference and, for too
 * many requests, the wait, during which the retry waits too; a failed refetch keeps the rows. While
 * another page or filter loads, the rows and the pages shown stay, the list marked busy. A page
 * past the last shows the last page in its place.
 */
export function useAdminUsersList(
  options:
    | { fixedRole: UserRoleFilter; words: AdminUsersListWords }
    | { fixedRole?: undefined; words: AdminUsersListWords & RoleWords },
) {
  const { fixedRole, words } = options;
  const copy = useCopy();
  const english = useLanguage() === 'en';
  const filters = useUsersFilters(fixedRole === undefined ? {} : { fixedRole });
  const query = useAdminUsersQuery(filters.request);
  const answer = query.data;
  const { view, blocked } = useRefusalView(
    answer === undefined ? query.error : null,
    words.loadFailed,
  );

  const pastLast = usePageInRange({
    answer,
    placeholder: query.isPlaceholderData,
    page: filters.filters.page,
    replacePage: filters.replacePage,
  });

  const now = new Date();
  const rows = (answer?.data ?? []).map((row) =>
    userRowView(row, { words: copy.spaceLinks.usersList.row, english, now }),
  );

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
    label: words.label,
    count: answer === undefined ? undefined : words.count({ count: answer.meta.totalRecords }),
    pagination: paginationView({
      current: answer?.meta.currentPage ?? 1,
      total: answer?.meta.totalPages ?? 0,
      words: words.pagination,
      searchOf: filters.searchOf,
    }),
    empty: { title: words.empty, description: words.emptyHint },
    noMatch: { title: words.noMatch, clearLabel: words.clearFilters, clear: filters.clearAll },
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
    filters: {
      search: {
        label: words.search,
        placeholder: words.searchPlaceholder,
        text: filters.search.text,
        change: filters.search.change,
      },
      state: {
        label: words.state,
        value: filters.filters.state ?? ALL,
        options: [
          { value: ALL, label: words.states.all },
          ...ACCOUNT_STATES.map((state) => ({ value: state, label: words.states[state] })),
        ],
        choose: (value: string) => {
          // The chip already on hands `''` when clicked again: it stays on.
          if (value === '') return;
          filters.chooseState(ACCOUNT_STATES.find((state) => state === value));
        },
      },
      ...(options.fixedRole === undefined && {
        role: {
          label: options.words.role,
          value: filters.filters.role ?? ALL,
          options: [
            { value: ALL, label: options.words.roles.all },
            ...USER_ROLE_FILTERS.map((role) => ({ value: role, label: options.words.roles[role] })),
          ],
          choose: (value: string) => {
            // The chip already on hands `''` when clicked again: it stays on.
            if (value === '') return;
            filters.chooseRole(USER_ROLE_FILTERS.find((role) => role === value));
          },
        },
      }),
    },
  };
}

/** The admin's users list, ready to render. */
export type AdminUsersListView = ReturnType<typeof useAdminUsersList>;
