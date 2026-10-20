import type { StaffMember } from '@masaha/shared/space-links';
import { useLinkEnded } from '@shared/api';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createStaffRepository } from '../../repository/staffRepository';
import { staffKeys } from '../queryKeys';

const repository = createStaffRepository();

/**
 * Deactivates a staff member's link, ending every session of theirs, or re-activates it: the
 * server's answer replaces the person in the list, as the row shows it, with nothing read again.
 */
export function useSetStaffActive(spaceId: number) {
  const client = useQueryClient();
  const linkEnded = useLinkEnded();
  return useMutation<StaffMember, AppError, { userId: number; isActive: boolean }>({
    mutationKey: staffKeys.rowWrite(spaceId),
    mutationFn: ({ userId, isActive }) => repository.setActive(spaceId, userId, { isActive }),
    onSuccess: (answer) => {
      client.setQueryData<StaffMember[]>(staffKeys.list(spaceId), (list) =>
        list?.map((member) => (member.userId === answer.userId ? answer : member)),
      );
    },
    onError: linkEnded,
  });
}
