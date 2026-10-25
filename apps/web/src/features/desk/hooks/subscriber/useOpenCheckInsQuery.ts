import type { DeskCheckIn } from '@masaha/shared/subscriptions';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { createDeskRepository } from '../../repository/deskRepository';
import { deskKeys } from '../queryKeys';

const repository = createDeskRepository();

/**
 * Every open subscriber check-in, with its customer's phone and its subscription's progress: read
 * on arrival, and again whenever the state now's check-ins (`ids`, the page's from `occupancy`)
 * change — never polled itself (S2).
 */
export function useOpenCheckInsQuery(spaceId: number, ids: readonly number[]) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const query = useQuery<DeskCheckIn[], AppError>({
    queryKey: deskKeys.openCheckIns(spaceId),
    queryFn: () => repository.openCheckIns(spaceId),
  });
  const { refetch } = query;
  const idsKey = [...ids].sort((a, b) => a - b).join(' ');
  const seen = useRef(idsKey);
  useEffect(() => {
    if (seen.current === idsKey) return;
    seen.current = idsKey;
    void refetch();
  }, [idsKey, refetch]);
  return query;
}
