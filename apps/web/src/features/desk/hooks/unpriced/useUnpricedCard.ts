import { gazaClockOf } from '@masaha/shared/core';
import type { DeskVisit } from '@masaha/shared/visits';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { clockOf, dayWord } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { useUnpricedQuery } from './useUnpricedQuery';

/**
 * «بدون سعر», ready to render, only for whoever may type a price (`mayTypePrice`, the terms' answer
 * for the caller, S5): its list is not even read for anyone else. The title counts all the visits;
 * the rows are the first page's — each priced leaves it, and the next takes its place — each saying
 * who, how and when it closed, with «تحديد السعر». The card is absent with none to price.
 */
export function useUnpricedCard(spaceId: number, { mayTypePrice }: { mayTypePrice: boolean }) {
  const copy = useCopy();
  const words = copy.desk;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const query = useUnpricedQuery(spaceId, 1, mayTypePrice);
  const answer = query.data;
  const [dialog, setDialog] = useState<{ visit: DeskVisit; name: string } | null>(null);
  const { view, blocked } = useRefusalView(
    answer === undefined ? query.error : null,
    words.unpriced.loadFailed,
  );

  const now = new Date();
  const timeOf = (instant: string) => clockOf(gazaClockOf(new Date(instant)).minute);
  const rows = (answer?.data ?? []).map((visit) => {
    const name = visit.customer?.name ?? visit.visitorName ?? '';
    const closed = visit.checkedOutAt ?? visit.checkedInAt;
    const when = {
      day: dayWord(closed, now, language, words.uncollected),
      range: isolate(`${timeOf(visit.checkedInAt)}–${timeOf(closed)}`),
    };
    return {
      key: String(visit.id),
      name,
      how:
        visit.checkoutMethod === 'AUTO'
          ? words.uncollected.how(when)
          : words.uncollected.howManual(when),
      price: {
        label: words.unpriced.price,
        run: () => {
          setDialog({ visit, name });
        },
      },
    };
  });

  return {
    shown: mayTypePrice && !(answer !== undefined && rows.length === 0),
    title: words.unpriced.title({ count: answer?.meta.totalRecords ?? 0 }),
    state: query.isPending
      ? ('loading' as const)
      : answer === undefined
        ? ('failed' as const)
        : ('ready' as const),
    rows,
    failure: {
      title: words.unpriced.loadFailed,
      message: view?.message,
      reference: view?.kind === 'refused' ? view.reference : undefined,
      retryLabel: copy.status.retry,
      blocked,
      retry: () => {
        void query.refetch();
      },
    },
    dialog,
    closeDialog: () => {
      setDialog(null);
    },
  };
}

/** «بدون سعر», ready to render. */
export type UnpricedCardView = ReturnType<typeof useUnpricedCard>;
