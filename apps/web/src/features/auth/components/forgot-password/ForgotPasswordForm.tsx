import { useCopy } from '@shared/copy';
import { Button, Field, Input } from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useForgotPasswordForm } from '../../hooks/forgot-password/useForgotPasswordForm';

/**
 * The request for a reset link: the email, the submit, and why the request failed, all from
 * `useForgotPasswordForm`. Once it is sent, the recovery is at `sent`, and the page shows it.
 */
export function ForgotPasswordForm() {
  const copy = useCopy();
  const { field, submit, isPending, blocked, errors, failure } = useForgotPasswordForm();

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {failure && <FormFailure view={failure} />}
      <Field label={copy.auth.fields.email} error={errors.email}>
        <Input
          type="email"
          dir="ltr"
          autoComplete="email"
          placeholder={copy.auth.fields.emailExample}
          {...field('email')}
        />
      </Field>
      <Button type="submit" className="w-full" loading={isPending} disabled={blocked}>
        {copy.auth.forgotPassword.submit}
      </Button>
    </form>
  );
}
