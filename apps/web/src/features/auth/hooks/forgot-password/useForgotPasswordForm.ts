import { forgotPasswordSchema, type ForgotPasswordRequest } from '@masaha/shared/auth';
import { useCopy } from '@shared/copy';
import { useServerForm } from '@shared/forms';
import { useRequestLink } from './useRequestLink';

type ForgotPasswordValues = { email: string };

/**
 * The request for a reset link: the contract's `forgotPasswordSchema`, the email, and the request as
 * its server call. It returns what `ForgotPasswordForm` renders.
 */
export function useForgotPasswordForm() {
  const copy = useCopy();
  const requestLink = useRequestLink();
  const { field, submit, isPending, blocked, errors, failure } = useServerForm<
    ForgotPasswordValues,
    ForgotPasswordRequest
  >({
    schema: forgotPasswordSchema,
    defaultValues: { email: '' },
    fields: ['email'],
    submit: requestLink.mutateAsync,
    failureTitle: copy.auth.forgotPassword.failed,
    fieldLines: { email: copy.auth.fieldErrors.email },
  });
  return { field, submit, isPending, blocked, errors, failure };
}
