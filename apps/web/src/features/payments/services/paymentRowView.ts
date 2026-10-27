import { gazaClockOf } from '@masaha/shared/core';
import type { PaymentRow } from '@masaha/shared/payments';
import type { Catalogue, Language } from '@shared/copy';
import { clockOf, dayWord, priceText } from '@shared/lib';
import { isolate } from '@shared/localisation';
import type { PaymentRowView } from '../types/PaymentRowView';

/**
 * A payment as its row says it: the day and the time on Gaza's clock; who — the customer, else the
 * visitor, else «زائر»; the item; the amount in ₪ and its method; who recorded it; and, voided, its
 * badge and who voided it and why (DI-6).
 */
export function paymentRowView(
  row: PaymentRow,
  { language, now, copy }: { language: Language; now: Date; copy: Catalogue },
): PaymentRowView {
  const words = copy.payments.ledger;
  const who =
    row.customer?.name ?? (row.item.kind === 'VISIT' ? row.item.visitorName : null) ?? words.noName;
  return {
    key: String(row.id),
    day: dayWord(row.receivedAt, now, language, copy.desk.uncollected),
    time: clockOf(gazaClockOf(new Date(row.receivedAt)).minute),
    who,
    customerId: row.customer?.id ?? null,
    item: row.item.kind === 'VISIT' ? words.visit : row.item.name,
    amount: isolate(priceText(row.amountAgorot, language)),
    method: copy.desk.money.methods[row.method],
    recorder: row.recordedBy.name,
    voided:
      row.voided === null
        ? null
        : {
            label: words.voided.badge,
            line: words.voided.line({
              name: isolate(row.voided.by.name),
              reason: isolate(row.voided.reason),
            }),
          },
    payment: {
      id: row.id,
      amountAgorot: row.amountAgorot,
      method: row.method,
      receivedAt: row.receivedAt,
      who,
      voided: row.voided !== null,
    },
  };
}
