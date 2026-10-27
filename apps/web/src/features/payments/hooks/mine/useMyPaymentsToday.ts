import { gazaClockOf } from '@masaha/shared/core';
import type { PaymentRow, PaymentsMeta, PaymentsQuery } from '@masaha/shared/payments';
import type { Page } from '@shared/api';
import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { dayText, priceText } from '@shared/lib';
import { paginationView, usePageInRange } from '@shared/lists';
import { isolate, useLanguage } from '@shared/localisation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { createPaymentsRepository } from '../../repository/paymentsRepository';
import { paymentRowView } from '../../services/paymentRowView';
import { paymentsKeys } from '../queryKeys';

const repository = createPaymentsRepository();

/** The page from the address: a whole number above zero, else the first. */
function pageOf(value: string | null): number {
  const page = value !== null && /^\d+$/.test(value) ? Number(value) : 1;
  return page >= 1 && page <= 2_147_483_647 ? page : 1;
}

/**
 * «دفعاتي اليوم», reception's, ready to render (K4, DK-015): its own payments of today — the
 * server answers reception's own of today, so no range and no `recordedById` is sent —, voided ones
 * included, struck with who voided them and why; the handover's figures — the cash to hand over
 * first, the transfers, the total and how many — every one the server's totals, never summed
 * (DI-11). The page in the address (`?page=`). Its states: loading, failed (the reference and a
 * retry), failed again over the rows shown, empty.
 */
export function useMyPaymentsToday(spaceId: number) {
  const copy = useCopy();
  const words = copy.payments.mine;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const [params, setParams] = useSearchParams();
  const page = pageOf(params.get('page'));
  const query: PaymentsQuery = { voided: 'INCLUDE', page, limit: 20 };
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const result = useQuery<Page<PaymentRow[], PaymentsMeta>, AppError>({
    queryKey: paymentsKeys.mine(spaceId, page),
    queryFn: () => repository.list(spaceId, query),
    placeholderData: keepPreviousData,
  });
  const answer = result.data;
  const { view, blocked } = useRefusalView(
    answer === undefined ? result.error : null,
    words.loadFailed,
  );
  const searchOf = (next: number) => (next === 1 ? '' : `?page=${String(next)}`);
  const pastLast = usePageInRange({
    answer,
    placeholder: result.isPlaceholderData,
    page,
    replacePage: (next) => {
      setParams(searchOf(next), { replace: true });
    },
  });
  const now = new Date();
  const rows = (answer?.data ?? []).map((row) => paymentRowView(row, { language, now, copy }));
  const money = (agorot: number) => isolate(priceText(agorot, language));
  const totals = answer?.meta.totals;

  return {
    intro: words.intro({ date: isolate(dayText(gazaClockOf(now).date, language)) }),
    figures:
      totals === undefined
        ? null
        : {
            label: words.figures,
            cash: { label: words.cash, amount: money(totals.byMethod.CASH) },
            transfer: {
              label: words.transfer,
              amount: money(totals.byMethod.TRANSFER),
              helper: words.transferHelper,
            },
            total: {
              label: words.total,
              amount: money(totals.receivedAgorot),
              count: copy.payments.ledger.count({ count: totals.count }),
            },
          },
    note: words.note,
    label: words.label,
    columns: words.columns,
    state:
      result.isPending || pastLast
        ? ('loading' as const)
        : answer === undefined
          ? ('failed' as const)
          : rows.length > 0
            ? ('ready' as const)
            : ('empty' as const),
    rows,
    /** Another page is loading, the rows shown meanwhile those already there. */
    busy: result.isPlaceholderData,
    empty: words.empty,
    pagination: paginationView({
      current: answer?.meta.currentPage ?? 1,
      total: answer?.meta.totalPages ?? 0,
      words: copy.payments.ledger.pagination,
      searchOf,
    }),
    failure: {
      title: words.loadFailed,
      message: view?.message,
      reference: view?.kind === 'refused' ? view.reference : undefined,
      retryLabel: copy.status.retry,
      blocked,
      retry: () => {
        void result.refetch();
      },
    },
    refreshFailure:
      answer !== undefined && result.isError ? copy.occupancy.present.refreshFailed : null,
  };
}

/** «دفعاتي اليوم», ready to render. */
export type MyPaymentsTodayView = ReturnType<typeof useMyPaymentsToday>;
