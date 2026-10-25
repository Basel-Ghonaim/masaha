import { gazaClockOf } from '@masaha/shared/core';
import type { SubscriptionWithMoney } from '@masaha/shared/desk';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { clockOf, priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { balanceView } from '../../services/balanceView';
import { dayText } from '../../services/dayText';
import { dayWord } from '../../services/dayWord';
import { payStatus } from '../../services/payStatus';
import { progressLines } from '../../services/progressLines';
import { statusView } from '../../services/statusView';
import { termsLine } from '../../services/termsLine';
import type { PayTarget } from '../pay/usePayDialog';
import { useCustomerFileQuery } from './useCustomerFileQuery';

/**
 * The subscription the header's status speaks of: the one running, else the next, else the latest
 * (the file lists them the latest started first), as the customers list's row reads its current one.
 */
function currentOf(subscriptions: SubscriptionWithMoney[]) {
  return (
    subscriptions.find(({ status }) => status === 'ACTIVE' || status === 'ENDING_SOON') ??
    subscriptions.find(({ status }) => status === 'UPCOMING') ??
    subscriptions[0] ??
    null
  );
}

/**
 * A customer's file (screen 15), ready to render: the header — the phone, who is here now, the
 * current subscription's status, the balance from the one badge (DI-40), the archive —; the unpaid
 * visits, each as «غير محصّل» says a row (DI-24), «تحصيل» opening the payment on it; and each
 * subscription's card (DI-42): its name and «سعر يدوي», its dates, its terms in one line, its status
 * and payment badges, its progress, its due, paid and left — the server's, never computed —, and
 * «استلام المتبقي» while it owes (DI-44). A customer the space does not hold is its own state. One
 * payment dialog at a time, opened on the item the control named.
 */
export function useCustomerFile(spaceId: number, customerId: number) {
  const copy = useCopy();
  const words = copy.desk.file;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const query = useCustomerFileQuery(spaceId, customerId);
  const file = query.data;
  const { view, blocked } = useRefusalView(
    file === undefined ? query.error : null,
    words.loadFailed,
  );
  // The payment dialog: closed, or the item it opens on; each opening a new intent (S4).
  const [pay, setPay] = useState<PayTarget | null>(null);
  const [payOpening, setPayOpening] = useState(0);
  const receive = (itemKey: string) => {
    setPay({ customerId, itemKey });
    setPayOpening((count) => count + 1);
  };

  const price = (agorot: number) => isolate(priceText(agorot, language));
  const day = (date: string) => isolate(dayText(date, language));
  const timeOf = (instant: string) => clockOf(gazaClockOf(new Date(instant)).minute);
  const now = new Date();
  const current = file === undefined ? null : currentOf(file.subscriptions);

  return {
    state:
      file !== undefined
        ? ('ready' as const)
        : query.isPending
          ? ('loading' as const)
          : query.error.status === 404
            ? ('notFound' as const)
            : ('failed' as const),
    header:
      file === undefined
        ? null
        : {
            /** The customer and what they owe, for their actions. */
            customer: file.customer,
            debtAgorot: file.debtAgorot,
            name: file.customer.name,
            phone:
              file.customer.phone === null
                ? { text: copy.desk.customer.noPhone, number: false }
                : { text: file.customer.phone, number: true },
            here: file.present === null ? null : words.here,
            status:
              current === null ? null : statusView(current.status, copy.desk.customer.statuses),
            balance: {
              label: words.balance,
              view: balanceView(file, copy.desk.customer, price),
            },
            archived: file.customer.archivedAt === null ? null : words.archived,
          },
    unpaid:
      file === undefined || file.unpaidVisits.length === 0
        ? null
        : {
            title: words.unpaid.title,
            rows: file.unpaidVisits.map(({ visit, balanceAgorot }) => {
              const closed = visit.checkedOutAt ?? visit.checkedInAt;
              const when = {
                day: dayWord(closed, now, language, copy.desk.uncollected),
                range: isolate(`${timeOf(visit.checkedInAt)}–${timeOf(closed)}`),
              };
              const key = `visit-${String(visit.id)}`;
              return {
                key,
                name: copy.desk.pay.itemVisit({ day: when.day }),
                how:
                  visit.checkoutMethod === 'AUTO'
                    ? copy.desk.uncollected.how(when)
                    : copy.desk.uncollected.howManual(when),
                amount: balanceAgorot === null ? words.unpaid.unpriced : price(balanceAgorot),
                collect:
                  balanceAgorot === null
                    ? null
                    : {
                        label: copy.desk.uncollected.collect,
                        run: () => {
                          receive(key);
                        },
                      },
                debt: null,
                more: null,
              };
            }),
          },
    subscriptions: {
      title: words.subscriptions.title,
      none:
        file !== undefined && file.subscriptions.length === 0
          ? { title: words.subscriptions.none, text: words.subscriptions.onlyVisits }
          : null,
      cards: (file?.subscriptions ?? []).map((subscription) => {
        const { startsOn, endsOn } = subscription;
        const pay = payStatus(subscription);
        const key = `subscription-${String(subscription.id)}`;
        return {
          key,
          /** The subscription as the file answers it, for its statement and its end. */
          subscription,
          title: {
            name: subscription.name,
            typed: subscription.priceTyped === null ? null : words.card.typed,
          },
          dates:
            startsOn === null
              ? null
              : words.card.dates({
                  from: day(startsOn),
                  to: endsOn === null ? copy.desk.customer.noEnd : day(endsOn),
                }),
          terms: termsLine(subscription, words.card.terms),
          badges: {
            status: statusView(subscription.status, copy.desk.customer.statuses),
            pay: { label: words.card.pay[pay.key], tone: pay.tone },
          },
          money: {
            dueLabel: subscription.billing === 'FIXED' ? words.card.due : words.card.dueSoFar,
            due: price(subscription.dueAgorot),
            paidLabel: words.card.paid,
            paid: price(subscription.paidAgorot),
            leftLabel: words.card.left,
            // The server's balance; below zero a usage-based one holds credit, and nothing is left.
            left: price(Math.max(0, subscription.balanceAgorot)),
          },
          progress: progressLines(subscription, copy.desk.subscriber.progress, {
            price,
            day,
          }),
          receive:
            subscription.balanceAgorot > 0
              ? {
                  label: words.card.receiveLeft,
                  run: () => {
                    receive(key);
                  },
                }
              : null,
        };
      }),
    },
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
    notFound: { title: words.notFound.title, text: words.notFound.text },
    /** The payment dialog's item, while it is open, and its opening's count (a new intent each). */
    pay,
    payOpening,
    closePay: () => {
      setPay(null);
    },
  };
}

/** A customer's file, ready to render. */
export type CustomerFileView = ReturnType<typeof useCustomerFile>;
/** One subscription's card in the file. */
export type SubscriptionCardView = CustomerFileView['subscriptions']['cards'][number];
