import type { AdminSpaceRow } from '@masaha/shared/space-links';
import { Badge } from '@shared/design-system';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useAdminSpacesList } from '../../hooks/admin-list/useAdminSpacesList';
import type { AdminSpaceRowView } from '../../types/AdminSpaceRowView';
import type { PlaceField } from '../../types/PlaceField';
import { AdminSpaceCard } from './AdminSpaceCard';
import { AdminSpacesPagination } from './AdminSpacesPagination';
import { AdminSpacesState } from './AdminSpacesState';
import { AdminSpacesToolbar } from './AdminSpacesToolbar';
import { BadgeList } from './BadgeList';
import { OwnersText } from './OwnersText';
import { SpaceNameText } from './SpaceNameText';

const column = createDataTableColumnHelper<AdminSpaceRowView>();

/**
 * The admin's spaces list: the search and the filters, then a table of the page's spaces from 768 px,
 * or a card per space on a phone, with the count the filters keep and the pages. It shows its own
 * loading, failure, empty and no-match states; while another page or filter loads, it keeps the rows
 * shown, marked busy.
 *
 * The page that sets it fills two slots from other capabilities: each row's `actions`, in the last
 * column and at a card's end, and the `placeField`, inside the list's own "Governorate / area" field.
 * When the row that held the focus leaves the list, as a deleted space does, the focus moves to the
 * list rather than being lost.
 */
export function AdminSpacesList({
  actions,
  placeField,
}: {
  actions: (space: AdminSpaceRow) => ReactNode;
  placeField: PlaceField;
}) {
  const list = useAdminSpacesList();
  const region = useRef<HTMLElement>(null);
  // The last element inside the list that held the focus.
  const focused = useRef<Element | null>(null);

  useEffect(() => {
    const element = focused.current;
    // Only a focus lost with its element: one moved elsewhere on purpose stays there.
    const lost = document.activeElement === null || document.activeElement === document.body;
    if (element !== null && !element.isConnected && lost) {
      focused.current = null;
      region.current?.focus();
    }
  }, [list.rows]);

  // The table draws each cell as a component of its own, so new columns would draw every row anew,
  // losing the focus inside it: they change only with their words and the actions handed in.
  const { columns: headers, noOwner } = list;
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'name',
          header: headers.space,
          cell: (info) => <SpaceNameText name={info.row.original.name} />,
        }),
        column.display({
          id: 'area',
          header: headers.area,
          cell: (info) => info.row.original.area,
        }),
        column.display({
          id: 'state',
          header: headers.status,
          cell: (info) => (
            <Badge variant={info.row.original.state.variant}>{info.row.original.state.label}</Badge>
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
          cell: (info) => <BadgeList badges={info.row.original.freshness} />,
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
    [headers, noOwner, actions],
  );

  return (
    <section
      ref={region}
      aria-label={list.label}
      aria-busy={list.busy || undefined}
      tabIndex={-1}
      className="outline-none"
      onFocus={(event) => {
        if (event.target !== region.current) focused.current = event.target;
      }}
    >
      <DataTable
        label={list.label}
        columns={columns}
        data={list.rows}
        getRowId={(row) => String(row.id)}
        renderCard={(row) => <AdminSpaceCard row={row} actions={actions(row.row)} />}
        loading={list.status === 'loading'}
        empty={<AdminSpacesState list={list} />}
        toolbar={<AdminSpacesToolbar filters={list.filters} placeField={placeField} />}
        summary={list.summary}
        pagination={
          list.pagination !== null && <AdminSpacesPagination pagination={list.pagination} />
        }
      />
    </section>
  );
}
