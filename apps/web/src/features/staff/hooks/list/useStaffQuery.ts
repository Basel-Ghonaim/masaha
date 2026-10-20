import type { StaffMember } from '@masaha/shared/space-links';
import { useLinkEnded } from '@shared/api';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createStaffRepository } from '../../repository/staffRepository';
import { staffKeys } from '../queryKeys';

const repository = createStaffRepository();

/**
 * Every reception link of the space, deactivated ones included, oldest first, whole; a 404 fetches
 * the owner's own spaces again.
 */
export function useStaffQuery(spaceId: number) {
  const linkEnded = useLinkEnded();
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const query = useQuery<StaffMember[], AppError>({
    queryKey: staffKeys.list(spaceId),
    queryFn: () => repository.list(spaceId),
  });
  // A 404 is a link ended meanwhile: the user's own spaces are fetched again.
  useEffect(() => {
    linkEnded(query.error);
  }, [query.error, linkEnded]);
  return query;
}
