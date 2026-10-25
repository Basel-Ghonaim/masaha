import {
  CUSTOMER_KINDS,
  PAYMENT_FILTERS,
  type CustomerRow,
  type CustomersQuery,
} from '@masaha/shared/desk';
import { SUBSCRIPTION_STATUSES } from '@masaha/shared/subscriptions';
import type { Page } from '@shared/api';
import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { paginationView, usePageInRange } from '@shared/lists';
import { useLanguage } from '@shared/localisation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { customerCardView } from '../card/useCustomerCard';
import { deskKeys } from '../queryKeys';
import { useCustomersFilters } from './useCustomersFilters';

const repository = createDeskRepository();

/** «الكل»: no filter, as a choice's value. */
const ALL = 'all';

/** A page of the customers the filters find; the page before stays shown while the next loads. */
function useCustomersPageQuery(spaceId: number, query: CustomersQuery) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<Page<CustomerRow[]>, AppError>({
    queryKey: deskKeys.customers(spaceId, query),
    queryFn: () => repository.customers(spaceId, query),
    placeholderData: keepPreviousData,
  });
}

/**
 * «الزبائن», ready to render: the space's customers 20 a page, found by the search, the status chips
 * («مؤرشف» the owner's only), the kind and the payment — every filter and the page in the address
 * (S11); each row a customer's card as the desk words it (their current subscription, its status and
 * end, their balance from one badge, DI-40), an archived one marked so. Its states: loading, failed
 * (the reference and a retry), failed again over the rows shown (they stay), empty, no match, no
 * archived customer. While another page or filter loads the rows shown stay, the list marked busy.
 */
export function useCustomersList(spaceId: number, { owner }: { owner: boolean }) {
  const copy = useCopy();
  const words = copy.desk.customers;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const filters = useCustomersFilters(owner);
  const query = useCustomersPageQuery(spaceId, filters.query);
  const answer = query.data;
  const { view, blocked } = useRefusalView(
    answer === undefined ? query.error : null,
    words.loadFailed,
  );
  const pastLast = usePageInRange({
    answer,
    placeholder: query.isPlaceholderData,
    page: filters.filters.page,
    replacePage: filters.replacePage,
  });

  const rows = (answer?.data ?? []).map((row) => ({
    id: row.id,
    key: String(row.id),
    card: customerCardView(row, copy.desk.customer, language),
    archived: row.archivedAt === null ? null : words.status.ARCHIVED,
  }));
  const total = answer?.meta.totalRecords ?? 0;
  const { status, kind, payment } = filters.filters;

  return {
    label: words.label,
    columns: words.columns,
    state:
      query.isPending || pastLast
        ? ('loading' as const)
        : answer === undefined
          ? ('failed' as const)
          : rows.length > 0
            ? ('ready' as const)
            : status === 'ARCHIVED'
              ? ('archivedEmpty' as const)
              : filters.anyApplied
                ? ('noMatch' as const)
                : ('empty' as const),
    rows,
    /** Another page or filter is loading, the rows shown meanwhile those already there. */
    busy: query.isPlaceholderData,
    count: answer === undefined ? undefined : words.count({ count: total }),
    empty:
      status === 'ARCHIVED'
        ? { title: words.archivedEmpty, text: null }
        : filters.anyApplied
          ? { title: words.noMatch.title, text: words.noMatch.text }
          : { title: words.empty.title, text: words.empty.text },
    pagination: paginationView({
      current: answer?.meta.currentPage ?? 1,
      total: answer?.meta.totalPages ?? 0,
      words: words.pagination,
      searchOf: filters.searchOf,
    }),
    failure: {
      title: words.loadFailed,
      message: view?.message,
      reference: view?.kind === 'refused' ? view.reference : undefined,
      retryLabel: copy.status.retry,
      blocked,
      retry: () => {
        void query.refetch();
      },
    },
    refreshFailure:
      answer !== undefined && query.isError ? copy.occupancy.present.refreshFailed : null,
    toolbar: {
      search: {
        label: copy.desk.search.label,
        placeholder: copy.desk.search.placeholder,
        text: filters.search.text,
        change: filters.search.change,
      },
      status: {
        label: words.status.label,
        value: status ?? ALL,
        options: [
          { value: ALL, label: words.status.all },
          ...SUBSCRIPTION_STATUSES.map((value) => ({
            value,
            label: copy.desk.customer.statuses[value],
          })),
          ...(owner ? [{ value: 'ARCHIVED' as const, label: words.status.ARCHIVED }] : []),
        ],
        choose: (value: string) => {
          // A chip pressed again leaves its group empty: the filter stays as it was.
          if (value === '') return;
          filters.choose.status(
            value === 'ARCHIVED' ? value : SUBSCRIPTION_STATUSES.find((each) => each === value),
          );
        },
      },
      kind: {
        label: words.kind.label,
        value: kind ?? ALL,
        options: [
          { value: ALL, label: words.kind.options.all },
          ...CUSTOMER_KINDS.map((value) => ({ value, label: words.kind.options[value] })),
        ],
        choose: (value: string) => {
          filters.choose.kind(CUSTOMER_KINDS.find((each) => each === value));
        },
      },
      payment: {
        label: words.payment.label,
        value: payment ?? ALL,
        options: [
          { value: ALL, label: words.payment.options.all },
          ...PAYMENT_FILTERS.map((value) => ({ value, label: words.payment.options[value] })),
        ],
        choose: (value: string) => {
          filters.choose.payment(PAYMENT_FILTERS.find((each) => each === value));
        },
      },
      /** The phone's sheet that holds the kind and the payment. */
      sheet: {
        title: words.filters.title,
        label:
          filters.applied > 0
            ? words.filters.applied({ count: filters.applied })
            : words.filters.title,
        count: filters.applied,
        show: words.filters.show({ count: total }),
        clearLabel: words.filters.clear,
        clear: filters.clearFilters,
        closeLabel: words.filters.close,
      },
    },
  };
}

/** «الزبائن», ready to render. */
export type CustomersListView = ReturnType<typeof useCustomersList>;
/** One customer of the list. */
export type CustomersListRow = CustomersListView['rows'][number];
