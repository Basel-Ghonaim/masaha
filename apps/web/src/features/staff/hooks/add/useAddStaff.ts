import type { AddedStaff, AddStaffRequest } from '@masaha/shared/space-links';
import { useLinkEnded } from '@shared/api';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createStaffRepository } from '../../repository/staffRepository';
import { staffKeys } from '../queryKeys';

const repository = createStaffRepository();

/**
 * Creates a reception account. It stays pending until the list has arrived again, so the sheet
 * closes on the list as the server holds it; its answer, which holds the temporary password, is
 * kept by no cache (`gcTime: 0`), and the caller resets it once handed on. Any failure reads the list
 * again: an answer lost after the server made the account leaves a row the owner can re-issue from.
 */
export function useAddStaff(spaceId: number) {
  const client = useQueryClient();
  const linkEnded = useLinkEnded();
  return useMutation<AddedStaff, AppError, AddStaffRequest>({
    gcTime: 0,
    mutationFn: (request) => repository.add(spaceId, request),
    onSuccess: () => client.invalidateQueries({ queryKey: staffKeys.list(spaceId) }),
    onError: (error) => {
      linkEnded(error);
      void client.invalidateQueries({ queryKey: staffKeys.list(spaceId) });
    },
  });
}
