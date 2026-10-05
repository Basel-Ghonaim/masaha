import type { RecoveryPosition } from '@masaha/shared/auth';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createRecoveryRepository } from '../repository/recoveryRepository';
import { authKeys } from './queryKeys';

const repository = createRecoveryRepository();

/**
 * Where this browser's password recovery stands, read from the server: it holds the step. A page
 * that is about to move the recovery itself, such as a link's check, reads it only once that is
 * answered (`enabled`).
 */
export function useRecoveryPositionQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<RecoveryPosition, AppError>({
    queryKey: authKeys.recovery,
    queryFn: repository.position,
    enabled,
  });
}
