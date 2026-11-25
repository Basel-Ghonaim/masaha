import { useCopy } from '@shared/copy';
import { Button, Field } from '@shared/design-system';
import { FormFailure, PasswordInput, PasswordRules } from '@shared/forms';
import { useId, type ReactNode } from 'react';
import { useResetPasswordForm } from '../../hooks/reset-password/useResetPasswordForm';

/**
 * The new password: the field, its condition as one line under it, the submit, and why the reset
 * failed, all from `useResetPasswordForm`, and the page's `note` before the submit. `saved` once
 * the server has set it.
 */
export function ResetPasswordForm({ saved, note }: { saved: () => void; note?: ReactNode }) {
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
      {note}
      <Button type="submit" className="w-full" loading={isPending} disabled={blocked}>
        {copy.auth.resetPassword.submit}
      </Button>
    </form>
  );
}
