import type { Customer } from '@masaha/shared/customers';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/**
 * The owner's archive of a customer. No key: a second archive answers the customer as they are, so
 * it is sent once and never again by itself (S3); the space is read again.
 */
export function useArchive(spaceId: number, customerId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<Customer, AppError>({
    mutationFn: () => repository.archiveCustomer(spaceId, customerId),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
