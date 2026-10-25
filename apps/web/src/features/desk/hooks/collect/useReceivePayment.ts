import type { ReceivedPayment, ReceivePaymentRequest } from '@masaha/shared/desk';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/** Records a payment on one item, with the intent's key; the space is read again once done. */
export function useReceivePayment(spaceId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<ReceivedPayment, AppError, { body: ReceivePaymentRequest; key: string }>({
    mutationFn: ({ body, key }) => repository.receivePayment(spaceId, body, key),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
