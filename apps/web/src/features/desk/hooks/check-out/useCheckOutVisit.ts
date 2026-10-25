import type { CheckOutVisitRequest, VisitCheckOut } from '@masaha/shared/desk';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/** Checks a visit out with its payment, with the intent's key; the space is read again once done. */
export function useCheckOutVisit(spaceId: number, visitId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<VisitCheckOut, AppError, { body: CheckOutVisitRequest; key: string }>({
    mutationFn: ({ body, key }) => repository.checkOutVisit(spaceId, visitId, body, key),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
