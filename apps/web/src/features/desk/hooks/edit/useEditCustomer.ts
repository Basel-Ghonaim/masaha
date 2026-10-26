import type { Customer, UpdateCustomerRequest } from '@masaha/shared/customers';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/**
 * A customer's edit. No key: an edit that changes nothing writes nothing, so it is sent once and
 * never again by itself (S3, finding 123); the space is read again.
 */
export function useEditCustomer(spaceId: number, customerId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<Customer, AppError, UpdateCustomerRequest>({
    mutationFn: (body) => repository.editCustomer(spaceId, customerId, body),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
