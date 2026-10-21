import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import type { RecordHandover } from '../../types/RecordHandover';

/**
 * Records how a temporary password just shown reached its person, through the write the dialog's
 * caller gives (`recordHandover`): the dialog holds only its pending state and its outcome.
 */
export function useHandover(recordHandover: RecordHandover) {
  return useMutation<unknown, AppError, Parameters<RecordHandover>[0]>({
    gcTime: 0,
    mutationFn: (request) => recordHandover(request),
  });
}
