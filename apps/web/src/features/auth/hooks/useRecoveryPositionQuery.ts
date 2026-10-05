import type { RecoveryPosition } from '@masaha/shared/auth';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createRecoveryRepository } from '../repository/recoveryRepository';
import { authKeys } from './queryKeys';

const repository = createRecoveryRepository();

/** Where this browser's password recovery stands, read from the server: it holds the step. */
export function useRecoveryPositionQuery() {
  return useQuery<RecoveryPosition, AppError>({
    queryKey: authKeys.recovery,
    queryFn: repository.position,
  });
}
