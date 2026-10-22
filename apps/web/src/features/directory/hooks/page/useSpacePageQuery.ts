import type { PublicSpace } from '@masaha/shared/directory';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createDirectoryRepository } from '../../repository/directoryRepository';
import { directoryKeys } from '../queryKeys';

const repository = createDirectoryRepository();

/**
 * A space's page, by its slug, with the app's defaults: fetched again on returning to the window once
 * stale, never polled. A hidden, deleted or unknown space fails as a 404.
 */
export function useSpacePageQuery(slug: string) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<PublicSpace, AppError>({
    queryKey: directoryKeys.space(slug),
    queryFn: () => repository.space(slug),
  });
}
