import { gazaClockOf } from '@masaha/shared/core';
import {
  PAYMENT_KINDS,
  PAYMENT_METHODS,
  type PaymentRow,
  type PaymentsMeta,
  type PaymentsQuery,
} from '@masaha/shared/payments';
import type { Page } from '@shared/api';
import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { priceText } from '@shared/lib';
import { paginationView, usePageInRange } from '@shared/lists';
import { isolate, useLanguage } from '@shared/localisation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createPaymentsRepository } from '../../repository/paymentsRepository';
import { paymentRowView } from '../../services/paymentRowView';
import { periodText } from '../../services/periodText';
import type { LedgerPerson } from '../../types/LedgerPerson';
import { paymentsKeys } from '../queryKeys';
import { useLedgerFilters } from './useLedgerFilters';

const repository = createPaymentsRepository();

/** «الكل»: no filter, as a choice's value. */
const ALL = 'all';

/** A page of the payments the filters find; the page before stays shown while the next loads. */
function useLedgerQuery(spaceId: number, query: PaymentsQuery) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<Page<PaymentRow[], PaymentsMeta>, AppError>({
    queryKey: paymentsKeys.list(spaceId, query),
    queryFn: () => repository.list(spaceId, query),
    placeholderData: keepPreviousData,
  });
}

/**
 * «الدفعات», the owner's ledger, ready to render: the space's payments 20 a page, the latest received
 * first, by a range of Gaza days (today by default, at most 92), the staff member who recorded them,
 * the method, the kind and «إظهار الملغاة» — every filter and the page in the address (S8). The totals
 * line names its period first (DI-2) and says what the server's totals say — received, by cash, by
 * transfer, how many, and the voided ones apart — never a sum of the rows (DI-11). The staff options
 * are `people`: the owner first, «(أنت)», then the reception accounts, a deactivated one marked
 * (DI-4). Its states: loading, failed (the reference and a retry), failed again over the rows shown
 * (they stay), empty today, no match (with «مسح الفلاتر»); while another page or filter loads the
 * rows shown stay, the list marked busy.
 */
export function useLedger(spaceId: number, { people }: { people: readonly LedgerPerson[] }) {
  const copy = useCopy();
  const words = copy.payments.ledger;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const filters = useLedgerFilters();
  const query = useLedgerQuery(spaceId, filters.query);
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
  const now = new Date();
  const today = gazaClockOf(now).date;
  const rows = (answer?.data ?? []).map((row) => paymentRowView(row, { language, now, copy }));

  const { from, to, staff, method, kind, voided } = filters.filters;
  const period = periodText({ from, to }, language, today, { today: words.range.today });
  const money = (agorot: number) => isolate(priceText(agorot, language));
  const totals = answer?.meta.totals;
  const total = answer?.meta.totalRecords ?? 0;
  const clear = { label: words.filters.clear, run: filters.clear };

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
            : filters.anyApplied
              ? ('noMatch' as const)
              : ('emptyToday' as const),
    rows,
    /** Another page or filter is loading, the rows shown meanwhile those already there. */
    busy: query.isPlaceholderData,
    count: answer === undefined ? undefined : words.count({ count: total }),
    totals:
      totals === undefined
        ? null
        : {
            line: words.totals({
              period,
              received: money(totals.receivedAgorot),
              cash: money(totals.byMethod.CASH),
              transfer: money(totals.byMethod.TRANSFER),
              count: words.count({ count: totals.count }),
            }),
            voided:
              totals.voided.count === 0
                ? null
                : words.totalsVoided({
                    count: words.count({ count: totals.voided.count }),
                    amount: money(totals.voided.amountAgorot),
                  }),
          },
    toolbar: {
      range: {
        label: words.range.label,
        text: period,
        panel: words.range.choose,
        value: from === undefined || to === undefined ? null : { from, to },
        choose: filters.choose.range,
        error: filters.rangeError,
        today: {
          label: words.range.today,
          run: () => {
            filters.choose.range();
          },
        },
        calendar: { previous: words.range.previous, next: words.range.next },
      },
      staff: {
        label: words.staff.label,
        value: staff === undefined ? ALL : String(staff),
        options: [
          { value: ALL, label: words.staff.all },
          // The person signed in first, then the others in the order given.
          ...[...people]
            .sort((a, b) => Number(b.self) - Number(a.self))
            .map((person) => ({
              value: String(person.id),
              label: person.self
                ? words.staff.self({ name: person.name })
                : person.active
                  ? person.name
                  : words.staff.inactive({ name: person.name }),
            })),
        ],
        choose: (value: string) => {
          filters.choose.staff(value === ALL ? undefined : Number(value));
        },
      },
      method: {
        label: words.method.label,
        value: method ?? ALL,
        options: [
          { value: ALL, label: words.method.all },
          ...PAYMENT_METHODS.map((value) => ({ value, label: copy.desk.money.methods[value] })),
        ],
        choose: (value: string) => {
          filters.choose.method(PAYMENT_METHODS.find((each) => each === value));
        },
      },
      kind: {
        label: words.kind.label,
        value: kind ?? ALL,
        options: [
          { value: ALL, label: words.kind.all },
          ...PAYMENT_KINDS.map((value) => ({ value, label: words.kind[value] })),
        ],
        choose: (value: string) => {
          filters.choose.kind(PAYMENT_KINDS.find((each) => each === value));
        },
      },
      voided: {
        label: words.voided.chip,
        quick: words.voided.quick,
        on: voided,
        toggle: (on: boolean) => {
          filters.choose.voided(on);
        },
      },
      /** The phone's sheet that holds the range, the staff member, the method and the kind. */
      sheet: {
        title: words.filters.title,
        label:
          filters.applied > 0
            ? words.filters.applied({ count: filters.applied })
            : words.filters.title,
        count: filters.applied,
        show:
          answer !== undefined && total === 0
            ? words.filters.none
            : words.filters.show({ count: total }),
        clear,
        closeLabel: words.filters.close,
      },
      /** «مسح الفلاتر», at every width, while any filter applies (DI-3). */
      clear: filters.anyApplied ? clear : null,
    },
    empty: filters.anyApplied
      ? { title: words.noMatch.title, text: words.noMatch.text, clear }
      : { title: words.emptyToday.title, text: words.emptyToday.text, clear: null },
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
  };
}

/** «الدفعات», ready to render. */
export type LedgerView = ReturnType<typeof useLedger>;
