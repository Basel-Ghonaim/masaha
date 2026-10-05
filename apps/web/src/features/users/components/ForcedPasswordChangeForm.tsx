import { useCopy } from '@shared/copy';
import { Button, Field } from '@shared/design-system';
import { FormFailure, PasswordInput, PasswordRules } from '@shared/forms';
import { useId } from 'react';
import { useForcedPasswordChangeForm } from '../hooks/useForcedPasswordChangeForm';

/**
 * The forced change of a temporary password: the new password, its rules ticking as the user types,
 * the submit, and why the change failed, all from `useForcedPasswordChangeForm`. Once it succeeds the
 * session holds no pending change, and the place the form sits in sends the user on.
 */
export function ForcedPasswordChangeForm() {
  const copy = useCopy();
  const rulesId = useId();
  const { field, submit, isPending, blocked, errors, failure, passwordRules } =
    useForcedPasswordChangeForm();

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {failure && <FormFailure view={failure} />}
      <div className="flex flex-col gap-2">
        <Field label={copy.users.passwordChange.newPassword} error={errors.password}>
          <PasswordInput
            autoComplete="new-password"
            aria-describedby={rulesId}
            {...field('password')}
          />
        </Field>
        <PasswordRules id={rulesId} view={passwordRules} />
      </div>
      <Button type="submit" className="w-full" loading={isPending} disabled={blocked}>
        {copy.users.passwordChange.submit}
      </Button>
    </form>
  );
}
