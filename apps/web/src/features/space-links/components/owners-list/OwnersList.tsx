import { Badge } from '@shared/design-system';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import { ListPagination } from '@shared/lists';
import { useMemo } from 'react';
import { useOwnersList } from '../../hooks/owners-list/useOwnersList';
import { useFocusKeeper } from '../../hooks/useFocusKeeper';
import type { UserRowView } from '../../types/UserRowView';
import { ListState } from '../ListState';
import { OwnerActionsMenu } from '../owner-actions/OwnerActionsMenu';
import { UsersToolbar } from '../users-list/UsersToolbar';
import { OwnerCard } from './OwnerCard';
import { OwnerSpaces } from './OwnerSpaces';

const column = createDataTableColumnHelper<UserRowView>();

/**
 * The admin's owners: the search and the state chips, then a table of the page's owners from 768 px,
 * or a card per owner on a phone, with the count the filters keep and the pages. Each row names the
 * owner, their email (under the name until 1024 px, its own column from there), their spaces and
 * their state, and its actions (link, and an unlink per space); an owner whose every space is deleted
 * leads to the deleted spaces, by the path the page gives (`deletedSpacesLink`). It shows its own loading, failure, empty and no-match states;
 * while another page or filter loads, it keeps the rows shown, marked busy. When the row that held
 * the focus leaves the list, the focus moves to the list rather than being lost.
 */
export function OwnersList({ deletedSpacesLink }: { deletedSpacesLink: string }) {
  const list = useOwnersList();
  const { region, onFocus } = useFocusKeeper(list.rows);

  // The table draws each cell as a component of its own, so new columns would draw every row anew:
  // they change only with their words and the link handed in.
  const { columns: headers, allSpacesDeleted } = list;
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'name',
          header: headers.name,
          cell: (info) => (
            <div className="flex flex-col gap-1">
              <span className="text-label">
                <span dir="auto">{info.row.original.name}</span>
              </span>
              <span className="text-caption text-muted-foreground lg:hidden">
                <span dir="ltr">{info.row.original.email}</span>
              </span>
            </div>
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
          meta: { className: 'hidden lg:table-cell' },
        }),
        column.display({
          id: 'spaces',
          header: headers.spaces,
          cell: (info) => (
            <OwnerSpaces
              row={info.row.original}
              allSpacesDeleted={allSpacesDeleted}
              deletedSpacesLink={deletedSpacesLink}
            />
          ),
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
          cell: (info) => <OwnerActionsMenu row={info.row.original} />,
          meta: { className: 'w-px' },
        }),
      ]),
    [headers, allSpacesDeleted, deletedSpacesLink],
  );

  return (
    <section
      ref={region}
      aria-label={list.label}
      aria-busy={list.busy || undefined}
      tabIndex={-1}
      className="flex flex-col gap-4 outline-none"
      onFocus={onFocus}
    >
      <p className="text-body-sm text-muted-foreground">{list.intro}</p>
      <DataTable
        label={list.label}
        columns={columns}
        data={list.rows}
        getRowId={(row) => String(row.id)}
        renderCard={(row) => (
          <OwnerCard
            row={row}
            allSpacesDeleted={allSpacesDeleted}
            deletedSpacesLink={deletedSpacesLink}
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
