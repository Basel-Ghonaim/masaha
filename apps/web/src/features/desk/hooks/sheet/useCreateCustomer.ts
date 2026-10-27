import type { CreateCustomerRequest, Customer } from '@masaha/shared/customers';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/** Adds a customer, with the intent's key; the space is read again once done. */
export function useCreateCustomer(spaceId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<Customer, AppError, { body: CreateCustomerRequest; key: string }>({
    mutationFn: ({ body, key }) => repository.createCustomer(spaceId, body, key),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
