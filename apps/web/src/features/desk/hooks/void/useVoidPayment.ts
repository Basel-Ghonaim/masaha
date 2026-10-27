import type { PaymentRow, VoidPaymentRequest } from '@masaha/shared/payments';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/**
 * The owner's void of a payment. No key: a second void answers the payment as it is, so it is sent
 * once and never again by itself (S4); the space is read again — the ledger, «دفعاتي اليوم», the file
 * and its statements.
 */
export function useVoidPayment(spaceId: number, paymentId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<PaymentRow, AppError, VoidPaymentRequest>({
    mutationFn: (body) => repository.voidPayment(spaceId, paymentId, body),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
