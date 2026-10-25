import type { LeaveToCustomerRequest } from '@masaha/shared/desk';
import type { DeskVisit } from '@masaha/shared/visits';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/**
 * «تسجيل دين»: leaves a visit's unpaid rest to a phone's customer. It carries no key — the same phone
 * again writes nothing — so it is sent once (S3); the space is read again once done.
 */
export function useLeaveToCustomer(spaceId: number, visitId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<DeskVisit, AppError, LeaveToCustomerRequest>({
    mutationFn: (body) => repository.leaveToCustomer(spaceId, visitId, body),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
