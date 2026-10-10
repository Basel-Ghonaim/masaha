// The design-system layer's second entry, @shared/design-system/data: the data components built on a
// heavy library (TanStack Table under DataTable). Only what draws them imports this entry, so the
// library stays out of the site's first download (docs/frontend/design-system/foundation.md §3,
// finding 45).
export {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
  type DataTableColumnMeta,
  type DataTableProps,
  type DataTableSorting,
} from './components/data/DataTable';
