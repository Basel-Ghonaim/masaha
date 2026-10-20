import type { AdminSpaceRow } from '@masaha/shared/space-links';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import { useMemo, type ReactNode } from 'react';
import { useAdminSpacesList } from '../../hooks/admin-list/useAdminSpacesList';
import { useFocusKeeper } from '../../hooks/useFocusKeeper';
import type { AdminSpaceRowView } from '../../types/AdminSpaceRowView';
import type { PlaceField } from '../../types/PlaceField';
import { ListPagination } from '../ListPagination';
import { ListState } from '../ListState';
import { AdminSpaceCard } from './AdminSpaceCard';
import { AdminSpacesToolbar } from './AdminSpacesToolbar';
import { BadgeList } from './BadgeList';
import { OwnersText } from './OwnersText';
import { SpaceNameText } from './SpaceNameText';

const column = createDataTableColumnHelper<AdminSpaceRowView>();

/**
 * The admin's spaces list: the search and the filters, then a table of the page's spaces from
 * 1024 px, or a card per space below it (A7), with the count the filters
 * keep and the pages. It shows its own loading, failure, empty and no-match states; while another
 * page or filter loads, it keeps the rows shown, marked busy.
 *
 * The page that sets it fills two slots from other capabilities: each row's `actions`, in the last
 * column and at a card's end, and the `placeField`, inside the list's own "Governorate / area" field.
 * Each space's name is a link to its page, by the path the page gives (`spaceLink`).
 * When the row that held the focus leaves the list, as a deleted space does, the focus moves to the
 * list rather than being lost.
 */
export function AdminSpacesList({
  actions,
  placeField,
  spaceLink,
}: {
  actions: (space: AdminSpaceRow) => ReactNode;
  placeField: PlaceField;
  spaceLink: (space: AdminSpaceRow) => string;
}) {
  const list = useAdminSpacesList();
  const { region, onFocus } = useFocusKeeper(list.rows);

  // The table draws each cell as a component of its own, so new columns would draw every row anew,
  // losing the focus inside it: they change only with their words and the actions handed in.
  const { columns: headers, noOwner } = list;
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'name',
          header: headers.space,
          cell: (info) => (
            <SpaceNameText
              name={info.row.original.name}
              to={spaceLink(info.row.original.row)}
              muted={info.row.original.deletedOn !== null}
            />
          ),
        }),
        column.display({
          id: 'area',
          header: headers.area,
          cell: (info) => info.row.original.area,
        }),
        column.display({
          id: 'state',
          header: headers.status,
          cell: (info) =>
            info.row.original.deletedOn === null ? (
              <BadgeList badges={info.row.original.state} />
            ) : (
              // A deleted row says it in one muted line, as the design draws it.
              <span className="text-caption text-muted-foreground">
                {info.row.original.deletedOn}
              </span>
            ),
        }),
        column.display({
          id: 'owners',
          header: headers.owner,
          cell: (info) => <OwnersText owners={info.row.original.owners} noOwner={noOwner} />,
        }),
        column.display({
          id: 'freshness',
          header: headers.freshness,
          cell: (info) =>
            info.row.original.deletedOn === null ? (
              <BadgeList badges={info.row.original.freshness} />
            ) : (
              // Nothing will fill a deleted row's gaps, so the cell says nothing of them.
              <span aria-hidden className="text-muted-foreground">
                —
              </span>
            ),
        }),
        column.display({
          id: 'lastUpdate',
          header: headers.lastUpdate,
          cell: (info) => (
            <span className="whitespace-nowrap">{info.row.original.lastUpdated}</span>
          ),
        }),
        column.display({
          id: 'actions',
          header: () => <span className="sr-only">{headers.actions}</span>,
          cell: (info) => actions(info.row.original.row),
          meta: { className: 'w-px' },
        }),
      ]),
    [headers, noOwner, actions, spaceLink],
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
          <AdminSpaceCard row={row} actions={actions(row.row)} spaceLink={spaceLink(row.row)} />
        )}
        loading={list.status === 'loading'}
        empty={<ListState list={list} />}
        toolbar={
          <AdminSpacesToolbar filters={list.filters} placeField={placeField} count={list.count} />
        }
        pagination={list.pagination !== null && <ListPagination pagination={list.pagination} />}
      />
    </section>
  );
}
