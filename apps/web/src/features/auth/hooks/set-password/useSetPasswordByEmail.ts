import { forgotPasswordSchema, type ForgotPasswordRequest } from '@masaha/shared/auth';
import { useCopy } from '@shared/copy';
import { isolated, useServerForm } from '@shared/forms';
import { useRequestLink } from '../forgot-password/useRequestLink';
import { useRecoveryPositionQuery } from '../useRecoveryPositionQuery';

/**
 * A signed-in account's first password, by email (screen 9, D9.2): a form with no field that asks the
 * reset link for the account's own address (`email`), so a refusal shows as every form's does — a
 * 429 counted down with the button held. Once sent, the link sent as the forgotten password's says
 * it: the masked address the server answered, and another link while the recovery may ask for one.
 */
export function useSetPasswordByEmail(email: string) {
  const copy = useCopy();
  const requestLink = useRequestLink();
  const answered = requestLink.data;
  // Read only once a link was asked for here: the resend counts its wait from where it stands.
  const position = useRecoveryPositionQuery({ enabled: answered !== undefined }).data ?? answered;
  const { submit, isPending, blocked, failure } = useServerForm<
    ForgotPasswordRequest,
    ForgotPasswordRequest
  >({
    schema: forgotPasswordSchema,
    defaultValues: { email },
    fields: [],
    submit: requestLink.mutateAsync,
    failureTitle: copy.auth.setPassword.failed,
  });

  return {
    submit,
    isPending,
    blocked,
    failure,
    label: copy.auth.setPassword.send,
    sent:
      answered?.step === 'sent'
        ? {
            message: copy.auth.setPassword.sent,
            sentTo: copy.auth.forgotPassword.sentTo({ email: isolated(answered.email) }),
            canResend: position?.step === 'sent' && position.canResend,
          }
        : null,
  };
}
