import type { AdminSpace } from '@masaha/shared/spaces';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createSpaceLinksRepository } from '../../repository/spaceLinksRepository';
import { spaceLinksKeys } from '../queryKeys';

const repository = createSpaceLinksRepository();

/**
 * A space's owners as the server reads them, read again each time an unlink asks: a row's spaces
 * cannot tell whether this is the last owner, and the editor's copy may be stale.
 */
export function useSpaceOwnersQuery(spaceId: number) {
  return useQuery<AdminSpace['owners'], AppError>({
    queryKey: spaceLinksKeys.spaceOwners(spaceId),
    queryFn: () => repository.spaceOwners(spaceId),
    refetchOnMount: 'always',
  });
}
