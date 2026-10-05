import type { RecoveryPosition } from '@masaha/shared/auth';

/** The masked email a recovery answers with. */
export const MASKED_EMAIL = 's•••@example.com';

/** A recovery at `sent`, as the server answers it; `position` overrides its fields. */
export function sentPosition(
  position: Partial<{ email: string; resendInSeconds: number; canResend: boolean }> = {},
): RecoveryPosition {
  return { step: 'sent', email: MASKED_EMAIL, resendInSeconds: 60, canResend: true, ...position };
}
