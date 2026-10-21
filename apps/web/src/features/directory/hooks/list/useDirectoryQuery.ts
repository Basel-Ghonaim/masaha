import type { DirectorySpace } from '@masaha/shared/directory';
import type { Page } from '@shared/api';
import type { AppError } from '@shared/errors';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createDirectoryRepository } from '../../repository/directoryRepository';
import type { DirectoryRequest } from '../../types/DirectoryRequest';
import type { NearPoint } from '../../types/NearState';
import { directoryKeys } from '../queryKeys';

const repository = createDirectoryRepository();

/**
 * A page of the directory, as the request filters and orders it. While another page or filter
 * loads, the page already shown stays (`isPlaceholderData`), so the list never blanks between two.
 * The app's defaults otherwise: never polled; fetched again on returning to the window once stale.
 * Ordered by distance, the rounded point is part of the key and travels in its header.
 */
export function useDirectoryQuery(request: DirectoryRequest, near: NearPoint | null) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<Page<DirectorySpace[]>, AppError>({
    queryKey: directoryKeys.list(request, near),
    queryFn: () => repository.list(request, near),
    placeholderData: keepPreviousData,
  });
}
