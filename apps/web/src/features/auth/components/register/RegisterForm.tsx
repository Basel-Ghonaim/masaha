import { useCopy } from '@shared/copy';
import { Button, Field, Input } from '@shared/design-system';
import { FormFailure, PasswordInput, PasswordRules } from '@shared/forms';
import { useId, type ReactNode } from 'react';
import { useRegisterForm } from '../../hooks/register/useRegisterForm';

export type RegisterFormProps = {
  /** The way to sign in instead, under the email field when the address already has an account. */
  signInLink?: ReactNode;
};

/**
 * Registration by name, email and password: the fields, the password's rules ticking as the user
 * types, the submit, and why a registration failed, all from `useRegisterForm`. The session it opens
 * is held as a sign-in.
 */
export function RegisterForm({ signInLink }: RegisterFormProps) {
  const copy = useCopy();
  const rulesId = useId();
  const { field, submit, isPending, blocked, errors, failure, passwordRules, emailTaken } =
    useRegisterForm();

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {failure && <FormFailure view={failure} />}
      <Field label={copy.auth.fields.name} error={errors.name}>
        <Input autoComplete="name" {...field('name')} />
      </Field>
      <div className="flex flex-col gap-1">
        <Field label={copy.auth.fields.email} error={errors.email}>
          <Input
            type="email"
            dir="ltr"
            autoComplete="email"
            placeholder={copy.auth.fields.emailExample}
            {...field('email')}
          />
        </Field>
        {emailTaken && signInLink !== undefined && <div className="self-start">{signInLink}</div>}
      </div>
      <div className="flex flex-col gap-2">
        <Field label={copy.auth.fields.password} error={errors.password}>
          <PasswordInput
            autoComplete="new-password"
            aria-describedby={rulesId}
            {...field('password')}
          />
        </Field>
        <PasswordRules id={rulesId} view={passwordRules} />
      </div>
      <Button type="submit" className="w-full" loading={isPending} disabled={blocked}>
        {copy.auth.register.submit}
      </Button>
    </form>
  );
}
