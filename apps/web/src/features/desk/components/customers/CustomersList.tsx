import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  EmptyState,
} from '@shared/design-system';
import { DataTable, createDataTableColumnHelper } from '@shared/design-system/data';
import { ListPagination } from '@shared/lists';
import { useMemo } from 'react';
import { Link } from 'react-router';
import {
  useCustomersList,
  type CustomersListRow,
  type CustomersListView,
} from '../../hooks/customers/useCustomersList';
import { BalanceBadge } from '../card/BalanceBadge';
import type { SheetEntry } from '../../types/SheetEntry';
import { CustomerActions } from '../menu/CustomerActions';
import { CustomersFilters } from './CustomersFilters';

const column = createDataTableColumnHelper<CustomersListRow>();

/** A customer's name, in its own direction, as a link to their file. */
function NameLink({ row, to }: { row: CustomersListRow; to: string }) {
  return (
    <Link
      to={to}
      dir="auto"
      className="text-label text-foreground underline-offset-4 hover:underline"
    >
      {row.card.name}
    </Link>
  );
}

/** A customer's phone, left to right, or that they gave none. */
function PhoneLine({ row }: { row: CustomersListRow }) {
  const { phone } = row.card;
  return (
    <span className="text-caption text-muted-foreground">
      {phone.number ? <span dir="ltr">{phone.text}</span> : phone.text}
    </span>
  );
}

/**
 * A customer's current subscription's status, or that they are archived; nothing with no
 * subscription, which the subscription's own line already says.
 */
function StatusBadge({ row }: { row: CustomersListRow }) {
  if (row.archived !== null) return <Badge variant="neutral">{row.archived}</Badge>;
  const { subscription } = row.card;
  return subscription === null ? null : (
    <Badge variant={subscription.status.tone}>{subscription.status.label}</Badge>
  );
}

/** A customer's current subscription with its end under it, or that they have none. */
function SubscriptionLines({ row }: { row: CustomersListRow }) {
  const { subscription } = row.card;
  if (subscription === null) {
    return <span className="text-body-sm text-muted-foreground">{row.card.noSubscription}</span>;
  }
  return (
    <span className="flex flex-col">
      <span dir="auto">{subscription.name}</span>
      <span className="text-caption text-muted-foreground">{subscription.until}</span>
    </span>
  );
}

/** What stands in for the rows when there are none: the failure with its retry, or the empty states. */
function ListEmpty({ list }: { list: CustomersListView }) {
  if (list.state === 'failed') {
    const { failure } = list;
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
  return <EmptyState title={list.empty.title} description={list.empty.text ?? undefined} />;
}

/**
 * «الزبائن» (screen 14): the search, the kind and the payment (a sheet below 768 px, P5), the status
 * chips and the count; then a table of five columns from 768 px — the name, a link to the customer's
 * file (`fileLink`), with the phone under it; the subscription with its end; its status; the balance
 * (DI-40); the actions — or a card per customer below it; and the pages. It shows its own loading,
 * failure, empty, no-match and no-archived states; while another page or filter loads the rows stay,
 * marked busy, and a failed refresh says so over them. Each customer's actions are their «⋯», or the
 * owner's «استرجاع» for an archived one.
 */
export function CustomersList({
  spaceId,
  owner,
  fileLink,
  subscribe,
}: {
  spaceId: number;
  /** The owner's list offers «مؤرشف»; the server decides (S5). */
  owner: boolean;
  /** A customer's file, by id, as the page routes it. */
  fileLink: (customerId: number) => string;
  /** Opens the page's subscription sheet, from a customer's «⋯». */
  subscribe: (entry: SheetEntry) => void;
}) {
  const list = useCustomersList(spaceId, { owner });

  // The table draws each cell as a component of its own, so new columns would draw every row anew:
  // they change only with their words and the link handed in.
  const { columns: headers } = list;
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'name',
          header: headers.name,
          cell: (info) => (
            <span className="flex flex-col">
              <NameLink row={info.row.original} to={fileLink(info.row.original.id)} />
              <PhoneLine row={info.row.original} />
            </span>
          ),
        }),
        column.display({
          id: 'subscription',
          header: headers.subscription,
          cell: (info) => <SubscriptionLines row={info.row.original} />,
        }),
        column.display({
          id: 'status',
          header: headers.status,
          cell: (info) => <StatusBadge row={info.row.original} />,
        }),
        column.display({
          id: 'balance',
          header: headers.balance,
          cell: (info) => <BalanceBadge balance={info.row.original.card.balance} />,
        }),
        column.display({
          id: 'actions',
          header: () => <span className="sr-only">{headers.actions}</span>,
          cell: (info) => (
            <CustomerActions
              spaceId={spaceId}
              customer={info.row.original.customer}
              debtAgorot={info.row.original.customer.debtAgorot}
              owner={owner}
              fileLink={fileLink(info.row.original.id)}
              subscribe={subscribe}
            />
          ),
          meta: { className: 'w-px' },
        }),
      ]),
    [headers, fileLink, spaceId, owner, subscribe],
  );

  return (
    <section
      aria-label={list.label}
      aria-busy={list.busy || undefined}
      className="flex flex-col gap-3"
    >
      {list.refreshFailure !== null && (
        <p className="text-body-sm text-muted-foreground">{list.refreshFailure}</p>
      )}
      <DataTable
        label={list.label}
        columns={columns}
        data={list.rows}
        getRowId={(row) => row.key}
        renderCard={(row) => (
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-2">
              <NameLink row={row} to={fileLink(row.id)} />
              <PhoneLine row={row} />
              <SubscriptionLines row={row} />
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge row={row} />
                <BalanceBadge balance={row.card.balance} />
              </div>
            </div>
            <CustomerActions
              spaceId={spaceId}
              customer={row.customer}
              debtAgorot={row.customer.debtAgorot}
              owner={owner}
              fileLink={fileLink(row.id)}
              subscribe={subscribe}
            />
          </div>
        )}
        loading={list.state === 'loading'}
        empty={<ListEmpty list={list} />}
        toolbar={<CustomersFilters toolbar={list.toolbar} count={list.count} />}
        pagination={list.pagination !== null && <ListPagination pagination={list.pagination} />}
      />
    </section>
  );
}
