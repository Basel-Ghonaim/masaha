import { gazaClockOf } from '@masaha/shared/core';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { clockOf, dayText, priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import type { VoidTarget } from '../../types/VoidTarget';
import { useStatementQuery } from './useStatementQuery';

/** Whole minutes as «2:30», hours and minutes. */
const hoursOf = (minutes: number) =>
  `${String(Math.floor(minutes / 60))}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * A subscription's statement in its card (DI-43), ready to render: «عرض الكشف», which opens it and
 * reads it then, never before; its check-ins, the earliest first — the day, in, out (or «حاضر الآن»
 * while open), the stay, and an auto check-out said so; its payments — the amount with its method
 * under it, a voided one marked «ملغاة» with its reason, never as paid, and the owner's void on one
 * not voided (S10); and the renewal's proposed start while it is not renewed. Every figure and time
 * is the server's, said on Gaza's clock.
 */
export function useStatement(
  spaceId: number,
  subscriptionId: number,
  abilities: { void: boolean },
) {
  const copy = useCopy();
  const words = copy.desk.statement;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const [open, setOpen] = useState(false);
  const query = useStatementQuery(spaceId, subscriptionId, open);
  const statement = query.data;
  const { view, blocked } = useRefusalView(
    statement === undefined ? query.error : null,
    words.loadFailed,
  );

  const day = (instant: string) => isolate(dayText(gazaClockOf(new Date(instant)).date, language));
  const time = (instant: string) => clockOf(gazaClockOf(new Date(instant)).minute);

  return {
    toggle: {
      label: open ? words.hide : words.show,
      expanded: open,
      run: () => {
        setOpen(!open);
      },
    },
    state: !open
      ? ('closed' as const)
      : statement !== undefined
        ? ('ready' as const)
        : query.isPending
          ? ('loading' as const)
          : ('failed' as const),
    checkIns: {
      title: words.checkIns,
      columns: words.columns,
      none: words.noCheckIns,
      rows: (statement?.checkIns ?? []).map((checkIn) => ({
        key: String(checkIn.id),
        day: day(checkIn.checkedInAt),
        in: time(checkIn.checkedInAt),
        out: checkIn.checkedOutAt === null ? words.here : time(checkIn.checkedOutAt),
        duration: checkIn.minutes === null ? null : hoursOf(checkIn.minutes),
        auto: checkIn.checkoutMethod === 'AUTO' ? words.auto : null,
      })),
    },
    payments: {
      title: words.payments,
      none: words.noPayments,
      rows: (statement?.payments ?? []).map((payment) => ({
        key: String(payment.id),
        date: day(payment.receivedAt),
        amount: isolate(priceText(payment.amountAgorot, language)),
        method: copy.desk.money.methods[payment.method],
        voided:
          payment.voided === null
            ? null
            : {
                label: words.voided,
                reason: words.voidedReason({ reason: payment.voided.reason }),
              },
        void:
          abilities.void && payment.voided === null && statement !== undefined
            ? ({
                id: payment.id,
                amountAgorot: payment.amountAgorot,
                method: payment.method,
                receivedAt: payment.receivedAt,
                who: statement.customer.name,
              } satisfies VoidTarget)
            : null,
      })),
    },
    renewal:
      statement?.renewal == null
        ? null
        : words.renewal({ date: isolate(dayText(statement.renewal.startsOn, language)) }),
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
  };
}

/** A subscription's statement, ready to render. */
export type StatementView = ReturnType<typeof useStatement>;
