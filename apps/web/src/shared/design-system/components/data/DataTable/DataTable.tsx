import {
  FlexRender,
  createColumnHelper,
  createSortedRowModel,
  functionalUpdate,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnHelper,
  type Header,
  type RowData,
  type SortingState,
} from '@tanstack/react-table';
import { useState, type ReactNode } from 'react';
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from '../../../icons';
import { cn } from '../../../lib/cn';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { Skeleton } from '../../feedback/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../Table';

/** Layout classes for one column (a width, an alignment), put on its header and on its cells. */
export type DataTableColumnMeta = { className?: string };

// Carries the meta type into the feature set; the value itself is never read.
const COLUMN_META: DataTableColumnMeta = {};

// The only table features the layer offers: sorting. Rows are paged by the caller, through the
// Pagination component, since lists are paged by the server.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  columnMeta: COLUMN_META,
});

type DataTableFeatures = typeof features;

/**
 * Builds the columns of a DataTable, so no feature imports the table library. A column sorts only
 * when it asks to, with `enableSorting: true`.
 */
export function createDataTableColumnHelper<TData extends RowData>(): ColumnHelper<
  DataTableFeatures,
  TData
> {
  return createColumnHelper<DataTableFeatures, TData>();
}

/** One column, as `createDataTableColumnHelper().columns([...])` returns them. */
export type DataTableColumn<TData extends RowData> = ReturnType<
  ColumnHelper<DataTableFeatures, TData>['columns']
>[number];

/** The columns the rows are sorted by, in order: `[{ id: 'ends', desc: false }]`. */
export type DataTableSorting = SortingState;

export type DataTableProps<TData extends RowData> = {
  /** Names the table, and the list of cards on a phone, such as "Members of the space". */
  label: string;
  columns: DataTableColumn<TData>[];
  data: TData[];
  /** A row's stable id, such as its record id. By default, its position. */
  getRowId?: (row: TData) => string;
  /**
   * A row as a card, below 768px. The feature decides what the card shows; the layer draws the card
   * and the list around it.
   */
  renderCard: (row: TData) => ReactNode;
  /** Shown in place of the rows when there are none, such as an EmptyState. */
  empty: ReactNode;
  /** The rows are loading: placeholder rows stand in for them. */
  loading?: boolean;
  /** How many placeholder rows or cards stand in while loading. */
  loadingRows?: number;
  /** The sorting, when the caller holds it; with `onSortingChange`. */
  sorting?: DataTableSorting;
  /** The sorting to start from, when the table holds it. */
  defaultSorting?: DataTableSorting;
  onSortingChange?: (sorting: DataTableSorting) => void;
  /** The rows arrive sorted, by the server: the table only reports the sorting. */
  manualSorting?: boolean;
  /** Search and filters above the rows. */
  toolbar?: ReactNode;
  /** Where the list is, such as "Showing 1–8 of 38": at the start of the footer, from 768px. */
  summary?: ReactNode;
  /** The Pagination: at the end of the footer, or under the cards on a phone. */
  pagination?: ReactNode;
  className?: string;
};

const TABLET_UP = '(min-width: 768px)';

// The frame of the Owner › Members stress test: one card holding the toolbar, the table and the
// footer. On a phone there is no frame; each row is a card of its own.
const FRAME =
  'overflow-hidden rounded-lg border border-(--card-border) bg-card text-card-foreground shadow-raised';
const CARD =
  'rounded-lg border border-(--card-border) bg-card p-3 text-card-foreground shadow-raised';

type SortDirection = false | 'asc' | 'desc';

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === 'asc') {
    return <ArrowUpIcon aria-hidden />;
  }
  if (direction === 'desc') {
    return <ArrowDownIcon aria-hidden />;
  }
  return <ChevronsUpDownIcon aria-hidden className="text-muted-foreground" />;
}

/**
 * A list of records: a table from 768px, framed as a card with its toolbar and pagination, and a
 * list of cards below it, as in the Owner › Members stress test. Columns sort when they ask to; the
 * header then is a button, and `aria-sort` says the order. Placeholder rows stand in while loading,
 * and `empty` stands in when there are no rows. Every word arrives as a prop or through the columns.
 */
export function DataTable<TData extends RowData>({
  label,
  columns,
  data,
  getRowId,
  renderCard,
  empty,
  loading = false,
  loadingRows = 5,
  sorting,
  defaultSorting,
  onSortingChange,
  manualSorting = false,
  toolbar,
  summary,
  pagination,
  className,
}: DataTableProps<TData>) {
  const tabletUp = useMediaQuery(TABLET_UP);
  const [innerSorting, setInnerSorting] = useState<DataTableSorting>(defaultSorting ?? []);
  const currentSorting = sorting ?? innerSorting;

  const table = useTable({
    features,
    columns,
    data,
    getRowId,
    manualSorting,
    defaultColumn: { enableSorting: false },
    state: { sorting: currentSorting },
    onSortingChange: (updater) => {
      const next = functionalUpdate(updater, currentSorting);
      if (sorting === undefined) {
        setInnerSorting(next);
      }
      onSortingChange?.(next);
    },
  });

  const rows = table.getRowModel().rows;
  const columnCount = table.getAllLeafColumns().length;
  const placeholders = Array.from({ length: loadingRows }, (_, index) => index);

  if (!tabletUp) {
    return (
      <div
        data-slot="data-table"
        data-layout="cards"
        className={cn('flex flex-col gap-4', className)}
      >
        {toolbar}
        {loading ? (
          <ul aria-label={label} aria-busy className="flex flex-col gap-3">
            {placeholders.map((index) => (
              <li key={index} aria-hidden className={cn(CARD, 'flex flex-col gap-2')}>
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          empty
        ) : (
          <ul aria-label={label} className="flex flex-col gap-3">
            {rows.map((row) => (
              <li key={row.id} data-slot="data-table-card" className={CARD}>
                {renderCard(row.original)}
              </li>
            ))}
          </ul>
        )}
        {pagination}
      </div>
    );
  }

  return (
    <div data-slot="data-table" data-layout="table" className={cn(FRAME, className)}>
      {toolbar !== undefined && (
        <div data-slot="data-table-toolbar" className="px-(--card-padding) py-4">
          {toolbar}
        </div>
      )}
      <Table aria-label={label} aria-busy={loading || undefined}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <DataTableHead key={header.id} header={header} />
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            placeholders.map((index) => (
              <TableRow key={index} aria-hidden className="hover:bg-transparent">
                {Array.from({ length: columnCount }, (_, cell) => (
                  <TableCell key={cell}>
                    <Skeleton className="h-4 w-full max-w-32" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount}>{empty}</TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                    <FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {(summary !== undefined || pagination !== undefined) && (
        <div
          data-slot="data-table-footer"
          className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-(--card-padding) py-3"
        >
          <div className="text-body-sm text-muted-foreground">{summary}</div>
          {pagination}
        </div>
      )}
    </div>
  );
}

function DataTableHead<TData extends RowData>({
  header,
}: {
  header: Header<DataTableFeatures, TData>;
}) {
  const { column } = header;
  const className = column.columnDef.meta?.className;

  if (header.isPlaceholder) {
    return <TableHead colSpan={header.colSpan} className={className} />;
  }

  const content = <FlexRender header={header} />;
  if (!column.getCanSort()) {
    return (
      <TableHead colSpan={header.colSpan} className={className}>
        {content}
      </TableHead>
    );
  }

  const direction = column.getIsSorted();
  return (
    <TableHead
      colSpan={header.colSpan}
      aria-sort={direction === false ? 'none' : ARIA_SORT[direction]}
      className={className}
    >
      <button
        type="button"
        onClick={column.getToggleSortingHandler()}
        className="-mx-2 inline-flex h-7 items-center gap-1 rounded-sm px-2 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg]:size-3.5 [&_svg]:shrink-0"
      >
        {content}
        <SortIcon direction={direction} />
      </button>
    </TableHead>
  );
}
