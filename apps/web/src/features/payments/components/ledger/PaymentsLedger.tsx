import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  EmptyState,
} from '@shared/design-system';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import { ListPagination } from '@shared/lists';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useLedger, type LedgerView } from '../../hooks/ledger/useLedger';
import { useFocusAfterLeave } from '../../hooks/useFocusAfterLeave';
import type { LedgerPerson } from '../../types/LedgerPerson';
import type { LedgerPayment, PaymentRowView } from '../../types/PaymentRowView';
import { PaymentAmount } from '../PaymentAmount';
import { LedgerFilters } from './LedgerFilters';
import { LedgerTotals } from './LedgerTotals';

/** What the page sets at a row's end: the owner's void, which says `gone` once it leaves. */
export type LedgerRowAction = (payment: LedgerPayment, gone: () => void) => ReactNode;

const column = createDataTableColumnHelper<PaymentRowView>();

/** Who paid: the customer as a link to their file, else the visitor's name, in its own direction. */
function Who({ row, link }: { row: PaymentRowView; link: (customerId: number) => string }) {
  return row.customerId === null ? (
    <span className="self-start text-label" dir="auto">
      {row.who}
    </span>
  ) : (
    <Link
      to={link(row.customerId)}
      dir="auto"
      className="self-start text-label text-foreground underline-offset-4 hover:underline"
    >
      {row.who}
    </Link>
  );
}

/** A row's slot: the page's action, under the row's key, so the focus can follow it (DI-8). */
function RowSlot({
  row,
  action,
  leave,
}: {
  row: PaymentRowView;
  action: LedgerRowAction;
  leave: (key: string) => void;
}) {
  return (
    <div data-row-key={row.key} className="flex justify-end">
      {action(row.payment, () => {
        leave(row.key);
      })}
    </div>
  );
}

/** What stands in for the rows when there are none: the failure with its retry, or the empty states. */
function LedgerEmpty({ ledger }: { ledger: LedgerView }) {
  if (ledger.state === 'failed') {
    const { failure } = ledger;
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
  const { empty } = ledger;
  return (
    <EmptyState title={empty.title} description={empty.text}>
      {empty.clear !== null && (
        <Button variant="outline" onClick={empty.clear.run}>
          {empty.clear.label}
        </Button>
      )}
    </EmptyState>
  );
}

/**
 * «الدفعات» (screen 17), the owner's ledger: the filters (a sheet below 768 px, P5), «إظهار الملغاة»,
 * «مسح الفلاتر» and the count; the totals line; then a table of five columns from 768 px — the day
 * and the time; the customer, a link to their file (`customerLink`), with the item under it; the
 * amount with its method (a voided one struck, marked and explained, DI-6); who recorded it; the
 * page's action (`rowAction`) — or a card per payment below it; and the pages. Its own loading,
 * failure, empty-today and no-match states; while another page or filter loads the rows stay, marked
 * busy, and a failed refresh says so over them.
 */
export function PaymentsLedger({
  spaceId,
  people,
  customerLink,
  rowAction,
}: {
  spaceId: number;
  /** Who may have recorded a payment, for the staff filter: the owner and the reception accounts. */
  people: readonly LedgerPerson[];
  /** A customer's file, by id, as the page routes it. */
  customerLink: (customerId: number) => string;
  /** The page's action at a row's end: the owner's void (S1). */
  rowAction: LedgerRowAction;
}) {
  const ledger = useLedger(spaceId, { people });
  // When the row whose action holds the focus leaves, the next row's action takes it, else the
  // totals line (DI-8).
  const { listRef, totalsRef, leave } = useFocusAfterLeave(ledger.rows.map((row) => row.key));

  // The table draws each cell as a component of its own, so new columns would draw every row anew:
  // they change only with their words and what the page hands in.
  const { columns: headers } = ledger;
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'date',
          header: headers.date,
          cell: (info) => (
            <span className="flex flex-col">
              <span>{info.row.original.day}</span>
              <span dir="ltr" className="self-start text-caption text-muted-foreground">
                {info.row.original.time}
              </span>
            </span>
          ),
        }),
        column.display({
          id: 'customer',
          header: headers.customer,
          cell: (info) => (
            <span className="flex flex-col">
              <Who row={info.row.original} link={customerLink} />
              <span className="text-caption text-muted-foreground" dir="auto">
                {info.row.original.item}
              </span>
            </span>
          ),
        }),
        column.display({
          id: 'amount',
          header: headers.amount,
          cell: (info) => <PaymentAmount row={info.row.original} />,
        }),
        column.display({
          id: 'recorder',
          header: headers.recorder,
          cell: (info) => <span dir="auto">{info.row.original.recorder}</span>,
        }),
        column.display({
          id: 'actions',
          header: () => <span className="sr-only">{headers.actions}</span>,
          cell: (info) => <RowSlot row={info.row.original} action={rowAction} leave={leave} />,
          meta: { className: 'w-px' },
        }),
      ]),
    [headers, customerLink, rowAction, leave],
  );

  return (
    <section
      ref={listRef}
      aria-label={ledger.label}
      aria-busy={ledger.busy || undefined}
      className="flex flex-col gap-3"
    >
      {ledger.totals !== null && <LedgerTotals totals={ledger.totals} focusRef={totalsRef} />}
      {ledger.refreshFailure !== null && (
        <p className="text-body-sm text-muted-foreground">{ledger.refreshFailure}</p>
      )}
      <DataTable
        label={ledger.label}
        columns={columns}
        data={ledger.rows}
        getRowId={(row) => row.key}
        renderCard={(row) => (
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-2">
              <Who row={row} link={customerLink} />
              <span className="text-caption text-muted-foreground">
                {row.day} · <span dir="ltr">{row.time}</span> · {row.item} · {row.method} ·{' '}
                {row.recorder}
              </span>
              <PaymentAmount row={row} withMethod={false} />
            </div>
            <RowSlot row={row} action={rowAction} leave={leave} />
          </div>
        )}
        loading={ledger.state === 'loading'}
        empty={<LedgerEmpty ledger={ledger} />}
        toolbar={<LedgerFilters toolbar={ledger.toolbar} count={ledger.count} />}
        pagination={ledger.pagination !== null && <ListPagination pagination={ledger.pagination} />}
      />
    </section>
  );
}
