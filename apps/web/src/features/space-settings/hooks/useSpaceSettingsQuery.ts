import type { SpaceSettings } from '@masaha/shared/space-settings';
import { useLinkEnded } from '@shared/api';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createSpaceSettingsRepository } from '../repository/spaceSettingsRepository';
import { spaceSettingsKeys } from './queryKeys';

const repository = createSpaceSettingsRepository();

/** The space's eight settings, as its owner sees them; a 404 fetches their own spaces again. */
export function useSpaceSettingsQuery(spaceId: number) {
  const linkEnded = useLinkEnded();
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const query = useQuery<SpaceSettings, AppError>({
    queryKey: spaceSettingsKeys.settings(spaceId),
    queryFn: () => repository.get(spaceId),
  });
  // A 404 is a link ended meanwhile: the user's own spaces are fetched again.
  useEffect(() => {
    linkEnded(query.error);
  }, [query.error, linkEnded]);
  return query;
}
