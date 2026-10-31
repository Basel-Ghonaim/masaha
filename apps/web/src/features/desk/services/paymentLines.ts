import type { ItemPayment } from '@masaha/shared/payments';
import { isolate } from '@shared/localisation';

/**
 * Who recorded a payment, «سجّلها {name}», and, voided, who voided it and why, «ألغاها {name}:
 * {reason}» (finding 162), the names isolated.
 */
export function paymentLines(
  payment: ItemPayment,
  words: {
    recordedBy: (values: { name: string }) => string;
    voidedBy: (values: { name: string; reason: string }) => string;
  },
): { recordedBy: string; voided: string | null } {
  return {
    recordedBy: words.recordedBy({ name: isolate(payment.recordedBy.name) }),
    voided:
      payment.voided === null
        ? null
        : words.voidedBy({ name: isolate(payment.voided.by.name), reason: payment.voided.reason }),
  };
}
