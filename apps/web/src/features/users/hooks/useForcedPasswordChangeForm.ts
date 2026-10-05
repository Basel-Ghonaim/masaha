import { changePasswordSchema, type ChangePasswordRequest } from '@masaha/shared/users';
import { useCopy } from '@shared/copy';
import { usePasswordRules, useServerForm } from '@shared/forms';
import { useWatch } from 'react-hook-form';
import { useChangePassword } from './useChangePassword';

type ForcedPasswordChangeValues = { password: string };

/**
 * The forced change of a temporary password: the contract's `changePasswordSchema`, the new
 * password only (a pending change needs no current one), and the change as its server call. It
 * returns what `ForcedPasswordChangeForm` renders, with the password's rules as they tick.
 */
export function useForcedPasswordChangeForm() {
  const copy = useCopy();
  const change = useChangePassword();
  const { field, submit, isPending, blocked, errors, failure, form } = useServerForm<
    ForcedPasswordChangeValues,
    ChangePasswordRequest
  >({
    schema: changePasswordSchema,
    defaultValues: { password: '' },
    fields: ['password'],
    submit: (request) => change.mutateAsync(request),
    failureTitle: copy.users.passwordChange.failed,
    fieldLines: { password: copy.auth.fieldErrors.newPassword },
  });
  const password = useWatch({ control: form.control, name: 'password' });
  const passwordRules = usePasswordRules(password, errors.password !== undefined);

  return { field, submit, isPending, blocked, errors, failure, passwordRules };
}
