import type { AdminSpaceRow } from '@masaha/shared/space-links';
import type { Page } from '@shared/api';
import type { AppError } from '@shared/errors';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createSpaceLinksRepository } from '../../repository/spaceLinksRepository';
import type { AdminSpacesRequest } from '../../types/AdminSpacesRequest';
import { spaceLinksKeys } from '../queryKeys';

const repository = createSpaceLinksRepository();

/**
 * A page of the admin's spaces list, as the request filters it. While another page or filter loads,
 * the page already shown stays (`isPlaceholderData`), so its rows and its pages keep their place.
 */
export function useAdminSpacesQuery(request: AdminSpacesRequest) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<Page<AdminSpaceRow[]>, AppError>({
    queryKey: spaceLinksKeys.adminSpaces(request),
    queryFn: () => repository.adminSpaces(request),
    placeholderData: keepPreviousData,
  });
}
