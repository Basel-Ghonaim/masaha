import type { CustomerRow } from '@masaha/shared/desk';
import { useCopy, type Catalogue } from '@shared/copy';
import { dayText, priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { balanceView } from '../../services/balanceView';
import { limitLines } from '../../services/progressLines';
import { statusView } from '../../services/statusView';

/**
 * A customer's card in the desk's search, ready to render: their name and phone (or that they gave
 * none), their current subscription — the one running, else the next, else the last, the server's —
 * with its status and its end, its progress — each limit and what was used of it, the server's
 * counts (G13.7) —, and their balance as one badge says it everywhere (DI-40); «غير حاضر», since the
 * search lists the people present in its first group and leaves them out of its cards; and «تجديد»
 * while the current subscription ends soon or has expired (G13.8).
 */
export function useCustomerCard(row: CustomerRow) {
  const copy = useCopy();
  const words = copy.desk.customer;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const { current } = row;
  return {
    ...customerCardView(row, words, language),
    progress: current === null ? [] : limitLines(current, copy.desk.subscriber.progress),
    notHere: words.notHere,
    renew:
      current?.status === 'ENDING_SOON' || current?.status === 'EXPIRED'
        ? copy.desk.sheet.entry.renew
        : null,
  };
}

/** A customer's card, worded: the search's card and a row of the customers list say it alike. */
export function customerCardView(
  row: CustomerRow,
  words: Catalogue['desk']['customer'],
  language: 'ar' | 'en',
) {
  const { current } = row;

  return {
    key: String(row.id),
    name: row.name,
    phone:
      row.phone === null
        ? { text: words.noPhone, number: false }
        : { text: row.phone, number: true },
    subscription:
      current === null
        ? null
        : {
            name: current.name,
            status: statusView(current.status, words.statuses),
            until:
              current.endsOn === null
                ? words.noEnd
                : words.until({ date: isolate(dayText(current.endsOn, language)) }),
          },
    noSubscription: words.noSubscription,
    /** «استلام {المبلغ}» while they owe. */
    receive:
      row.debtAgorot > 0
        ? words.receive({ amount: isolate(priceText(row.debtAgorot, language)) })
        : null,
    balance: balanceView(row, words, (agorot) => isolate(priceText(agorot, language))),
  };
}

/** A customer's card, ready to render. */
export type CustomerCardView = ReturnType<typeof customerCardView>;
