import { useCopy } from '@shared/copy';
import { Button, Field, Input, LogInIcon } from '@shared/design-system';
import { FormFailure, PasswordInput } from '@shared/forms';
import type { ReactNode } from 'react';
import { useSignInForm } from '../../hooks/sign-in/useSignInForm';

export type SignInFormProps = {
  /** The way to a forgotten password, under the password field. */
  forgotPasswordLink?: ReactNode;
};

/**
 * Sign-in by email and password: the fields, the submit, and why a sign-in failed, all from
 * `useSignInForm`. The session it opens is held as a sign-in.
 */
export function SignInForm({ forgotPasswordLink }: SignInFormProps) {
  const copy = useCopy();
  const { field, submit, isPending, blocked, errors, failure } = useSignInForm();

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
      <div className="flex flex-col gap-1">
        <Field label={copy.auth.fields.password} error={errors.password}>
          <PasswordInput autoComplete="current-password" {...field('password')} />
        </Field>
        {forgotPasswordLink !== undefined && <div className="self-end">{forgotPasswordLink}</div>}
      </div>
      <Button type="submit" className="w-full" loading={isPending} disabled={blocked}>
        <LogInIcon aria-hidden />
        {copy.auth.signIn.submit}
      </Button>
    </form>
  );
}
