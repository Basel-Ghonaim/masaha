import type { AdminUserRow } from '@masaha/shared/space-links';
import { Badge } from '@shared/design-system';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import { useMemo, type ReactNode } from 'react';
import { useUsersList } from '../../hooks/users-list/useUsersList';
import { useFocusKeeper } from '../../hooks/useFocusKeeper';
import type { UserRowView } from '../../types/UserRowView';
import { ListPagination } from '../ListPagination';
import { ListState } from '../ListState';
import { UserCard } from './UserCard';
import { UserSpaces } from './UserSpaces';
import { UsersToolbar } from './UsersToolbar';

const column = createDataTableColumnHelper<UserRowView>();

/**
 * The admin's users: the search, the role chips and the state chips, then a table of the page's
 * people from 1024 px, or a card per person below it (A7), with the count the
 * filters keep and the pages. Each row names the person, their email, their role, how they sign in,
 * when they joined, the spaces they own and those whose front desk they work, and their state; an
 * owner whose every space is deleted leads to the deleted spaces, by the path the page gives
 * (`deletedSpacesLink`). The page fills each row's `actions`, in the last column and at a card's
 * end; the signed-in admin's own row reads «أنت» in their place. It shows its own loading, failure,
 * empty and no-match states; while another page or filter loads, it keeps the rows shown, marked
 * busy. When the row that held the focus leaves the list, the focus moves to the list rather than
 * being lost.
 */
export function UsersList({
  actions,
  deletedSpacesLink,
}: {
  actions: (row: AdminUserRow) => ReactNode;
  deletedSpacesLink: string;
}) {
  const list = useUsersList();
  const { region, onFocus } = useFocusKeeper(list.rows);

  // The table draws each cell as a component of its own, so new columns would draw every row anew:
  // they change only with their words, the slot and the link handed in, and the admin's own id.
  const { columns: headers, allSpacesDeleted, spacesWords, you, selfId } = list;
  const spacesOf = useMemo(
    () => (row: UserRowView) => (
      <UserSpaces
        row={row}
        words={spacesWords}
        allSpacesDeleted={allSpacesDeleted}
        deletedSpacesLink={deletedSpacesLink}
      />
    ),
    [spacesWords, allSpacesDeleted, deletedSpacesLink],
  );
  const actionsOf = useMemo(
    () => (row: UserRowView) =>
      row.id === selfId ? (
        <span className="text-caption text-muted-foreground">{you}</span>
      ) : (
        actions(row.row)
      ),
    [actions, selfId, you],
  );
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'name',
          header: headers.name,
          cell: (info) => (
            <span className="text-label">
              <span dir="auto">{info.row.original.name}</span>
            </span>
          ),
        }),
        column.display({
          id: 'email',
          header: headers.email,
          cell: (info) => (
            <span dir="ltr" className="whitespace-nowrap">
              {info.row.original.email}
            </span>
          ),
        }),
        column.display({
          id: 'role',
          header: headers.role,
          cell: (info) => info.row.original.role,
        }),
        column.display({
          id: 'signIn',
          header: headers.signIn,
          cell: (info) => info.row.original.signIn,
        }),
        column.display({
          id: 'joined',
          header: headers.joined,
          cell: (info) => <span className="whitespace-nowrap">{info.row.original.joined}</span>,
        }),
        column.display({
          id: 'spaces',
          header: headers.spaces,
          cell: (info) => spacesOf(info.row.original),
        }),
        column.display({
          id: 'state',
          header: headers.state,
          cell: (info) => (
            <Badge variant={info.row.original.state.variant}>{info.row.original.state.label}</Badge>
          ),
        }),
        column.display({
          id: 'actions',
          header: headers.actions,
          cell: (info) => actionsOf(info.row.original),
          meta: { className: 'w-px' },
        }),
      ]),
    [headers, spacesOf, actionsOf],
  );

  return (
    <section
      ref={region}
      aria-label={list.label}
      aria-busy={list.busy || undefined}
      tabIndex={-1}
      className="outline-none"
      onFocus={onFocus}
    >
      <DataTable
        label={list.label}
        columns={columns}
        data={list.rows}
        getRowId={(row) => String(row.id)}
        cardsBelow="lg"
        renderCard={(row) => (
          <UserCard
            row={row}
            line={list.cardLine(row)}
            actions={actionsOf(row)}
            spaces={spacesOf(row)}
          />
        )}
        loading={list.status === 'loading'}
        empty={<ListState list={list} />}
        toolbar={<UsersToolbar filters={list.filters} count={list.count} />}
        pagination={list.pagination !== null && <ListPagination pagination={list.pagination} />}
      />
    </section>
  );
}
