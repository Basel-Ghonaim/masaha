import { resendLinkSchema } from '@masaha/shared/auth';
import { useCopy } from '@shared/copy';
import { clock, useServerForm } from '@shared/forms';
import { useRecoveryPositionQuery } from '../useRecoveryPositionQuery';
import { useResendCountdown } from './useResendCountdown';
import { useResendLink } from './useResendLink';

/**
 * Another link, asked for by the recovery alone: a form with no field, so a refusal shows as every
 * form's does. The submit waits out the server's window, counted as a clock on its label.
 */
export function useResendLinkForm() {
  const copy = useCopy();
  const resend = useResendLink();
  const { data, dataUpdatedAt } = useRecoveryPositionQuery();
  const wait = data?.step === 'sent' ? data.resendInSeconds : 0;
  const left = useResendCountdown(wait, dataUpdatedAt);
  const { submit, isPending, blocked, failure } = useServerForm({
    schema: resendLinkSchema,
    defaultValues: {},
    fields: [],
    submit: () => resend.mutateAsync(),
    failureTitle: copy.auth.forgotPassword.resendFailed,
  });

  return {
    submit,
    isPending,
    disabled: blocked || left > 0,
    label:
      left > 0
        ? copy.auth.forgotPassword.resendIn({ wait: clock(left) })
        : copy.auth.forgotPassword.resend,
    failure,
  };
}
