import type { MapPins } from '@masaha/shared/directory';
import type { AppError } from '@shared/errors';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createDirectoryRepository } from '../../repository/directoryRepository';
import type { PinsRequest } from '../../types/PinsRequest';
import { directoryKeys } from '../queryKeys';

const repository = createDirectoryRepository();

/**
 * The map's pins, as the request filters them. While other filters load, the marks shown stay
 * (`isPlaceholderData`). The app's defaults otherwise: never polled; fetched again on returning to
 * the window once stale. Asked only while `enabled`.
 */
export function usePinsQuery(request: PinsRequest, enabled: boolean) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<MapPins, AppError>({
    queryKey: directoryKeys.pins(request),
    queryFn: () => repository.pins(request),
    placeholderData: keepPreviousData,
    enabled,
  });
}
