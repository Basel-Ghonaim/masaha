import type { CustomerFile } from '@masaha/shared/desk';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { deskKeys } from '../queryKeys';

const repository = createDeskRepository();

/**
 * A customer's file, read when `customerId` is given and again after any desk write (S2); nothing
 * while it is `null`.
 */
export function useCustomerFileQuery(spaceId: number, customerId: number | null) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<CustomerFile, AppError>({
    queryKey: deskKeys.file(spaceId, customerId ?? 0),
    queryFn: () => repository.file(spaceId, customerId ?? 0),
    enabled: customerId !== null,
  });
}
