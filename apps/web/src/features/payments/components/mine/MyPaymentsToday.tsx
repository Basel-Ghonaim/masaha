import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  EmptyState,
  Skeleton,
} from '@shared/design-system';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import { ListPagination } from '@shared/lists';
import { useMemo } from 'react';
import { useMyPaymentsToday, type MyPaymentsTodayView } from '../../hooks/mine/useMyPaymentsToday';
import type { PaymentRowView } from '../../types/PaymentRowView';
import { PaymentAmount } from '../PaymentAmount';
import { HandoverFigures } from './HandoverFigures';

const column = createDataTableColumnHelper<PaymentRowView>();

/** The method as a badge: cash neutral, a transfer `info`. */
function MethodBadge({ row }: { row: PaymentRowView }) {
  return (
    <Badge variant={row.payment.method === 'TRANSFER' ? 'info' : 'neutral'}>{row.method}</Badge>
  );
}

/** What stands in for the rows when there are none: the failure with its retry, or the empty state. */
function MineEmpty({ mine }: { mine: MyPaymentsTodayView }) {
  if (mine.state === 'failed') {
    const { failure } = mine;
    return (
      <Alert variant="destructive">
        <AlertTitle>{failure.title}</AlertTitle>
        <AlertDescription>
          {failure.message}
          {failure.reference !== undefined && <span className="block">{failure.reference}</span>}
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" disabled={failure.blocked} onClick={failure.retry}>
            {failure.retryLabel}
          </Button>
        </AlertAction>
      </Alert>
    );
  }
  return <EmptyState title={mine.empty} />;
}

/**
 * «دفعاتي اليوم» (screen 17, reception's): what the page is for and today's date; the handover's
 * figures, the server's (DI-10, DI-11); the note that the owner voids a mistake; then its own
 * payments of today — from 768 px a table of the time, the name, what it paid, the method and the
 * amount (a voided one struck, with who voided it and why), a card each below it — and the pages.
 */
export function MyPaymentsToday({ spaceId }: { spaceId: number }) {
  const mine = useMyPaymentsToday(spaceId);

  const { columns: headers } = mine;
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'time',
          header: headers.time,
          cell: (info) => <span dir="ltr">{info.row.original.time}</span>,
        }),
        column.display({
          id: 'name',
          header: headers.name,
          cell: (info) => (
            <span className="text-label" dir="auto">
              {info.row.original.who}
            </span>
          ),
        }),
        column.display({
          id: 'item',
          header: headers.item,
          cell: (info) => <span dir="auto">{info.row.original.item}</span>,
        }),
        column.display({
          id: 'method',
          header: headers.method,
          cell: (info) => <MethodBadge row={info.row.original} />,
        }),
        column.display({
          id: 'amount',
          header: headers.amount,
          cell: (info) => <PaymentAmount row={info.row.original} withMethod={false} />,
        }),
      ]),
    [headers],
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-muted-foreground">{mine.intro}</p>
      {mine.figures !== null ? (
        <HandoverFigures figures={mine.figures} />
      ) : (
        mine.state === 'loading' && <Skeleton className="h-24 w-full" />
      )}
      <p className="text-caption text-muted-foreground">{mine.note}</p>
      <section
        aria-label={mine.label}
        aria-busy={mine.busy || undefined}
        className="flex flex-col gap-3"
      >
        {mine.refreshFailure !== null && (
          <p className="text-body-sm text-muted-foreground">{mine.refreshFailure}</p>
        )}
        <DataTable
          label={mine.label}
          columns={columns}
          data={mine.rows}
          getRowId={(row) => row.key}
          renderCard={(row) => (
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="self-start text-label" dir="auto">
                  {row.who}
                </span>
                <span className="text-caption text-muted-foreground">
                  <span dir="ltr">{row.time}</span> · {row.item}
                </span>
                <MethodBadge row={row} />
              </div>
              <PaymentAmount row={row} withMethod={false} />
            </div>
          )}
          loading={mine.state === 'loading'}
          empty={<MineEmpty mine={mine} />}
          pagination={mine.pagination !== null && <ListPagination pagination={mine.pagination} />}
        />
      </section>
    </div>
  );
}
