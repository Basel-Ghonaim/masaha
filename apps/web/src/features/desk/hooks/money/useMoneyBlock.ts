import { PAYMENT_METHODS } from '@masaha/shared/payments';
import { useCopy } from '@shared/copy';
import { agorotOf, priceText, shekelsOf } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { moneyOf } from '../../services/moneyOf';
import type { MoneyBlockView, PaymentMethod } from '../../types/MoneyBlockView';

/**
 * The money block (K2, S7), ready to render, over the server's due: «المستلم الآن» starts at the due
 * and follows it until a figure is typed; the method shows only while something is received; the
 * line under it says one of the four facts — paid in full, the change, the credit (a usage-based
 * subscription, `open`), or what stays owed, by `owesTo` or by a phone's holder before one is named;
 * with `none`, «لم يدفع شيئًا» empties the field and «استلام المبلغ كاملًا» gives the due back. It
 * computes only that line, never a charge.
 */
export function useMoneyBlock({
  due,
  open,
  none,
  owesTo,
}: {
  due: number;
  open: boolean;
  none: boolean;
  owesTo: string | null;
}): MoneyBlockView {
  const words = useCopy().desk.money;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const [typed, setTyped] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('CASH');

  const parsed = typed === null ? due : agorotOf(typed);
  const amount = parsed ?? 0;
  const received = typeof amount === 'number' ? amount : 0;
  const money = moneyOf(due, received, open);
  const price = (agorot: number) => isolate(priceText(agorot, language));

  const line =
    money.change > 0
      ? words.change({ amount: price(money.change) })
      : money.credit > 0
        ? words.credit({ amount: price(money.credit) })
        : money.left > 0
          ? open
            ? words.onSubscription({ amount: price(money.left) })
            : owesTo === null
              ? words.owesPhone({ amount: price(money.left) })
              : words.owes({ amount: price(money.left), name: isolate(owesTo) })
          : due === 0
            ? words.nothingDue
            : words.full;

  return {
    due: { label: words.due, amount: price(due) },
    received: {
      label: words.received,
      text: typed ?? (due === 0 ? '' : shekelsOf(due)),
      change: setTyped,
      error: typeof amount === 'string' ? words.amountInvalid : undefined,
      description: words.prefilled,
    },
    method:
      received > 0
        ? {
            label: words.method,
            value: method,
            options: PAYMENT_METHODS.map((value) => ({ value, label: words.methods[value] })),
            choose: setMethod,
          }
        : null,
    line,
    toggle: none
      ? typed !== null && received === 0
        ? {
            label: words.all,
            run: () => {
              setTyped(null);
            },
          }
        : {
            label: words.none,
            run: () => {
              setTyped('');
            },
          }
      : null,
    amount,
    recorded: money.recorded,
    left: money.left,
    change: money.change,
    credit: money.credit,
    untouched: typed === null,
  };
}
