import type { DeskVisit, WriteOffVisitRequest } from '@masaha/shared/visits';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/**
 * The owner's write-off of what a visit still owes. No key: a second write-off answers the visit as
 * it is, so it is sent once and never again by itself (S3, finding 115); the space is read again.
 */
export function useWriteOff(spaceId: number, visitId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<DeskVisit, AppError, WriteOffVisitRequest>({
    mutationFn: (body) => repository.writeOff(spaceId, visitId, body),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
