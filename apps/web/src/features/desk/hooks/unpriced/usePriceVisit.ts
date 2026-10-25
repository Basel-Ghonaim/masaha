import type { DeskVisit, PriceVisitRequest } from '@masaha/shared/visits';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/**
 * Types an unpriced visit's charge with its reason. No key: a second price is refused
 * (`VISIT_ALREADY_PRICED`), so it is sent once (S3); the space is read again once done.
 */
export function usePriceVisit(spaceId: number, visitId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<DeskVisit, AppError, PriceVisitRequest>({
    mutationFn: (body) => repository.price(spaceId, visitId, body),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
