import type { CustomerRow } from '@masaha/shared/desk';
import { useCopy } from '@shared/copy';
import { priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { balanceView } from '../../services/balanceView';
import { dayText } from '../../services/dayText';
import { statusView } from '../../services/statusView';

/**
 * A customer's card in the desk's search, ready to render: their name and phone (or that they gave
 * none), their current subscription — the one running, else the next, else the last, the server's —
 * with its status and its end, and their balance as one badge says it everywhere (DI-40).
 */
export function useCustomerCard(row: CustomerRow) {
  const words = useCopy().desk.customer;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
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
    balance: balanceView(row, words, (agorot) => isolate(priceText(agorot, language))),
  };
}

/** A customer's card, ready to render. */
export type CustomerCardView = ReturnType<typeof useCustomerCard>;
