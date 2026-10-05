import type {
  ForgotPasswordRequest,
  RecoveryPosition,
  ResetCheckRequest,
  ResetPasswordRequest,
} from '@masaha/shared/auth';
import { api } from '@shared/api';

/**
 * The recovery's server calls (docs/api/api-contract.md §5 › The forgotten password). The recovery
 * is found by its cookie, which the browser carries and the web never reads.
 */
export interface RecoveryRepository {
  /** Asks for a reset link; the recovery is then at `sent`, whatever the address. */
  requestLink: (request: ForgotPasswordRequest) => Promise<RecoveryPosition>;
  /** Asks the recovery for another link, without an email. */
  resendLink: () => Promise<RecoveryPosition>;
  /** Where the recovery stands; `request` when there is none. */
  position: () => Promise<RecoveryPosition>;
  /** Checks a link's token, which binds the link to the recovery: the last time the web holds it. */
  checkLink: (request: ResetCheckRequest) => Promise<RecoveryPosition>;
  /** Sets the new password with the link the recovery holds, and ends the recovery. */
  resetPassword: (request: ResetPasswordRequest) => Promise<void>;
}

/** The recovery's calls, through the app's one client. */
export function createRecoveryRepository(): RecoveryRepository {
  return {
    requestLink: (request) => api.post<RecoveryPosition>('/auth/password/forgot', request),
    resendLink: () => api.post<RecoveryPosition>('/auth/password/resend'),
    position: () => api.get<RecoveryPosition>('/auth/password/recovery'),
    checkLink: (request) => api.post<RecoveryPosition>('/auth/password/reset/check', request),
    resetPassword: async (request) => {
      await api.post<undefined>('/auth/password/reset', request);
    },
  };
}
