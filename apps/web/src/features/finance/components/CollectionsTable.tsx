import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/design-system';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import { useId, useMemo } from 'react';
import type { IncomeTabView } from '../hooks/income/useIncomeTab';

type CollectionsView = Extract<IncomeTabView, { state: 'ready' }>['collections'];
type Row = CollectionsView['rows'][number];

const column = createDataTableColumnHelper<Row>();

/**
 * «التحصيل حسب الموظف»: each staff member's collections in the month — how many, the total, cash and
 * transfer — a table from 768 px, a card each below it.
 */
export function CollectionsTable({ collections }: { collections: CollectionsView }) {
  const headingId = useId();
  const { columns: headers } = collections;
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'staff',
          header: headers.staff,
          cell: (info) => <span dir="auto">{info.row.original.name}</span>,
        }),
        column.display({
          id: 'count',
          header: headers.count,
          cell: (info) => info.row.original.count,
        }),
        column.display({
          id: 'total',
          header: headers.total,
          cell: (info) => (
            <span className="text-label" dir="ltr">
              {info.row.original.total}
            </span>
          ),
        }),
        column.display({
          id: 'cash',
          header: headers.cash,
          cell: (info) => <span dir="ltr">{info.row.original.cash}</span>,
        }),
        column.display({
          id: 'transfer',
          header: headers.transfer,
          cell: (info) => <span dir="ltr">{info.row.original.transfer}</span>,
        }),
      ]),
    [headers],
  );

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <CardTitle>
          <h2 id={headingId}>{collections.title}</h2>
        </CardTitle>
        <CardDescription>{collections.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          label={collections.title}
          columns={columns}
          data={collections.rows}
          getRowId={(row) => row.key}
          renderCard={(row) => (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-label" dir="auto">
                  {row.name}
                </span>
                <span className="text-label" dir="ltr">
                  {row.total}
                </span>
              </div>
              <span className="text-caption text-muted-foreground">
                {headers.count} {row.count} · {headers.cash} <bdi>{row.cash}</bdi> ·{' '}
                {headers.transfer} <bdi>{row.transfer}</bdi>
              </span>
            </div>
          )}
          empty={<p className="text-body-sm text-muted-foreground">{collections.none}</p>}
        />
      </CardContent>
    </Card>
  );
}
