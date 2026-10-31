import { gazaClockOf } from '@masaha/shared/core';
import { fillReminder } from '@masaha/shared/space-settings';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { clockOf, dayText, dayWord, priceText, whatsappLink } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { balanceView } from '../../services/balanceView';
import { currentOf } from '../../services/currentOf';
import { paymentLines } from '../../services/paymentLines';
import { payStatus } from '../../services/payStatus';
import { progressLines } from '../../services/progressLines';
import { statusView } from '../../services/statusView';
import { termsLine } from '../../services/termsLine';
import type { UncollectedItem } from '../../types/UncollectedItem';
import type { PayTarget } from '../pay/usePayDialog';
import { useCustomerFileQuery } from './useCustomerFileQuery';

/**
 * A customer's file (screen 15), ready to render: the header — the phone, who is here now, the
 * current subscription's status, the balance from the one badge (DI-40), the archive —; the unpaid
 * visits, each as «غير محصّل» says a row (DI-24), «تحصيل» opening the payment on it; and each
 * subscription's card (DI-42): its name and «سعر يدوي», its dates, its terms in one line, its status
 * and payment badges, its progress, its due, paid and left — the server's, never computed —, and
 * «استلام المتبقي» while it owes (DI-44). A customer the space does not hold is its own state. One
 * payment dialog at a time, opened on the item the control named. While they owe and have a phone,
 * «تذكير على واتساب» — a link to WhatsApp with the space's reminder (`reminderTemplate`, else the
 * catalogue's) filled with what they owe, their first name and `spaceName` (D8.2). The owner's
 * unpaid visit offers «لن يُحصَّل…» in its «⋯», the desk's write-off (D8.6).
 */
export function useCustomerFile(
  spaceId: number,
  customerId: number,
  { spaceName, owner }: { spaceName: string; owner: boolean },
) {
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
  // The owner's write-off of an unpaid visit: closed, or the visit it is of.
  const [writeOff, setWriteOff] = useState<UncollectedItem | null>(null);
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
            here:
              file.present === null
                ? null
                : words.hereSince({ time: isolate(timeOf(file.present.since)) }),
            status:
              current === null ? null : statusView(current.status, copy.desk.customer.statuses),
            balance: {
              label: words.balance,
              view: balanceView(file, copy.desk.customer, price),
            },
            archived: file.customer.archivedAt === null ? null : words.archived,
            reminder:
              file.debtAgorot > 0 && file.customer.phone !== null
                ? {
                    label: words.reminder.label,
                    caption: words.reminder.caption,
                    href: whatsappLink(
                      file.customer.phone,
                      fillReminder(
                        file.reminderTemplate ?? copy.spaceSettings.reminder.defaultText,
                        {
                          // The customer is greeted by their first name.
                          name: file.customer.name.trim().split(/\s+/u)[0] ?? file.customer.name,
                          amount: priceText(file.debtAgorot, language),
                          space: spaceName,
                        },
                      ),
                    ),
                  }
                : null,
          },
    unpaid:
      file === undefined || file.unpaidVisits.length === 0
        ? null
        : {
            title: words.unpaid.title,
            description: words.unpaid.counts,
            rows: file.unpaidVisits.map((unpaidVisit) => {
              const { visit, balanceAgorot, payments } = unpaidVisit;
              const closed = visit.checkedOutAt ?? visit.checkedInAt;
              const when = {
                day: dayWord(closed, now, language, copy.desk.uncollected),
                range: isolate(`${timeOf(visit.checkedInAt)}–${timeOf(closed)}`),
              };
              const key = `visit-${String(visit.id)}`;
              return {
                key,
                name: copy.desk.pay.itemVisit({ day: when.day }),
                // The file is theirs already: the row names the visit, not a way to the file.
                customerId: null,
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
                // The write-off is of a priced visit's rest, the owner's (S5: the server decides).
                more:
                  owner && balanceAgorot !== null
                    ? {
                        label: copy.desk.uncollected.more({
                          name: isolate(`${file.customer.name} · ${when.day}`),
                        }),
                        writeOff: {
                          label: copy.desk.uncollected.writeOff,
                          run: () => {
                            setWriteOff({
                              uncollected: unpaidVisit,
                              name: file.customer.name,
                              day: when.day,
                            });
                          },
                        },
                      }
                    : null,
                /** What was paid on it, each by whom, and a void by whom and why (finding 162). */
                payments: payments.map((payment) => ({
                  key: String(payment.id),
                  amount: price(payment.amountAgorot),
                  method: copy.desk.money.methods[payment.method],
                  ...paymentLines(payment, {
                    recordedBy: copy.desk.statement.recordedBy,
                    voidedBy: copy.payments.ledger.voided.line,
                  }),
                })),
              };
            }),
          },
    subscriptions: {
      title: words.subscriptions.title,
      none:
        file !== undefined && file.subscriptions.length === 0
          ? {
              title: words.subscriptions.none,
              // Only visits: said only while none of them is left unpaid (G15.5).
              text: file.unpaidVisits.length === 0 ? words.subscriptions.onlyVisits : null,
            }
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
    /** The owner's write-off, while it is open: the visit it is of. */
    writeOff,
    closeWriteOff: () => {
      setWriteOff(null);
    },
  };
}

/** A customer's file, ready to render. */
export type CustomerFileView = ReturnType<typeof useCustomerFile>;
/** One subscription's card in the file. */
export type SubscriptionCardView = CustomerFileView['subscriptions']['cards'][number];
