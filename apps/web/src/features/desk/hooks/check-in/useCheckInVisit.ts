import type { CheckInVisitRequest } from '@masaha/shared/visits';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository, type CheckedIn } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/** Checks a visitor in, with the intent's key; the space is read again once it is done. */
export function useCheckInVisit(spaceId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<CheckedIn, AppError, { body: CheckInVisitRequest; key: string }>({
    mutationFn: ({ body, key }) => repository.checkInVisit(spaceId, body, key),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
