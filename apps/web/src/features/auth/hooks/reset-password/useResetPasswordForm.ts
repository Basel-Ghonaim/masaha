import { resetPasswordSchema, type ResetPasswordRequest } from '@masaha/shared/auth';
import { useCopy } from '@shared/copy';
import { usePasswordRules, useServerForm } from '@shared/forms';
import { useWatch } from 'react-hook-form';
import { useResetPassword } from './useResetPassword';

type ResetPasswordValues = { password: string };

/**
 * The new password: the contract's `resetPasswordSchema`, the password alone, since the link is the
 * recovery's, and the reset as its server call; `saved` once the server set it. It returns what
 * `ResetPasswordForm` renders, with the password's rules as they tick.
 */
export function useResetPasswordForm(saved: () => void) {
  const copy = useCopy();
  const reset = useResetPassword();
  const { field, submit, isPending, blocked, errors, failure, form } = useServerForm<
    ResetPasswordValues,
    ResetPasswordRequest
  >({
    schema: resetPasswordSchema,
    defaultValues: { password: '' },
    fields: ['password'],
    submit: async (request) => {
      await reset.mutateAsync(request);
      saved();
    },
    failureTitle: copy.auth.resetPassword.failed,
    fieldLines: { password: copy.auth.fieldErrors.newPassword },
  });
  const password = useWatch({ control: form.control, name: 'password' });
  const passwordRules = usePasswordRules(password, errors.password !== undefined);

  return { field, submit, isPending, blocked, errors, failure, passwordRules };
}
