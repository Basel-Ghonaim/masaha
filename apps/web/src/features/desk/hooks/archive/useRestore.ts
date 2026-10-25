import type { Customer } from '@masaha/shared/customers';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/**
 * The owner's restore of an archived customer. No key: a second restore answers the customer as
 * they are, so it is sent once and never again by itself (S3); the space is read again.
 */
export function useRestore(spaceId: number, customerId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<Customer, AppError>({
    mutationFn: () => repository.restoreCustomer(spaceId, customerId),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
