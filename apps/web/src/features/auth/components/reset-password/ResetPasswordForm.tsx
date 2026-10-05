import { useCopy } from '@shared/copy';
import { Button, Field } from '@shared/design-system';
import { FormFailure, PasswordInput, PasswordRules } from '@shared/forms';
import { useId } from 'react';
import { useResetPasswordForm } from '../../hooks/reset-password/useResetPasswordForm';

/**
 * The new password: the field, its rules ticking as the user types, the submit, and why the reset
 * failed, all from `useResetPasswordForm`. `saved` once the server has set it.
 */
export function ResetPasswordForm({ saved }: { saved: () => void }) {
  const copy = useCopy();
  const rulesId = useId();
  const { field, submit, isPending, blocked, errors, failure, passwordRules } =
    useResetPasswordForm(saved);

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {failure && <FormFailure view={failure} />}
      <div className="flex flex-col gap-2">
        <Field label={copy.auth.resetPassword.newPassword} error={errors.password}>
          <PasswordInput
            autoComplete="new-password"
            aria-describedby={rulesId}
            {...field('password')}
          />
        </Field>
        <PasswordRules id={rulesId} view={passwordRules} />
      </div>
      <Button type="submit" className="w-full" loading={isPending} disabled={blocked}>
        {copy.auth.resetPassword.submit}
      </Button>
    </form>
  );
}
