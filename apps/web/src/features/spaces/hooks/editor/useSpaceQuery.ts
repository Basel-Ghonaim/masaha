import type { AdminSpace } from '@masaha/shared/spaces';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createSpacesRepository } from '../../repository/spacesRepository';
import { spacesKeys } from '../queryKeys';

const repository = createSpacesRepository();

/** One space, whole, as the admin edits it: its profile, its facts and their freshness. */
export function useSpaceQuery(spaceId: number) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<AdminSpace, AppError>({
    queryKey: spacesKeys.space(spaceId),
    queryFn: () => repository.get(spaceId),
  });
}
