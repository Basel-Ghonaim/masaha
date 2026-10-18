import type { AdminUserRow } from '@masaha/shared/space-links';
import type { Page } from '@shared/api';
import type { AppError } from '@shared/errors';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createSpaceLinksRepository } from '../../repository/spaceLinksRepository';
import type { AdminUsersRequest } from '../../types/AdminUsersRequest';
import { spaceLinksKeys } from '../queryKeys';

const repository = createSpaceLinksRepository();

/**
 * A page of the admin's users list, as the request filters it. While another page or filter loads,
 * the page already shown stays (`isPlaceholderData`), so its rows and its pages keep their place.
 */
export function useAdminUsersQuery(request: AdminUsersRequest) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<Page<AdminUserRow[]>, AppError>({
    queryKey: spaceLinksKeys.adminUsers(request),
    queryFn: () => repository.adminUsers(request),
    placeholderData: keepPreviousData,
  });
}
