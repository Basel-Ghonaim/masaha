import type { DeskVisit } from '@masaha/shared/visits';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/**
 * Undoes a write-off, from its toast's «تراجع»: no key, sent once and never again by itself (S3,
 * finding 115); the space is read again, so the visit is back in the list.
 */
export function useUndoWriteOff(spaceId: number, visitId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<DeskVisit, AppError>({
    mutationFn: () => repository.undoWriteOff(spaceId, visitId),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
