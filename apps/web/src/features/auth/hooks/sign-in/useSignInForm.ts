import { loginSchema, type LoginRequest } from '@masaha/shared/auth';
import { useCopy } from '@shared/copy';
import { useServerForm } from '@shared/forms';
import { useEffect, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { useEmailReport } from '../useEmailReport';
import { useSignIn } from './useSignIn';

type SignInValues = { email: string; password: string };

export type SignInFormOptions = {
  /** The email the form opens with, carried from where the person typed it. */
  defaultEmail?: string;
  /** Hears the email as it changes, so it can be carried on. */
  onEmailChange?: (email: string) => void;
  /**
   * The field that takes the focus as the form opens, where the place moves the focus into it: the
   * password when the email is already known, else the email.
   */
  focus?: 'email' | 'password';
};

/**
 * The sign-in form: the contract's `loginSchema`, the email then the password, and the sign-in as
 * its server call. It returns what `SignInForm` renders.
 */
export function useSignInForm({ defaultEmail = '', onEmailChange, focus }: SignInFormOptions = {}) {
  const copy = useCopy();
  const signIn = useSignIn();
  const { field, submit, isPending, blocked, errors, failure, form } = useServerForm<
    SignInValues,
    LoginRequest
  >({
    schema: loginSchema,
    defaultValues: { email: defaultEmail, password: '' },
    fields: ['email', 'password'],
    submit: signIn.mutateAsync,
    failureTitle: copy.auth.signIn.failed,
    fieldLines: {
      email: copy.auth.fieldErrors.email,
      password: copy.auth.fieldErrors.currentPassword,
    },
  });
  useEmailReport(useWatch({ control: form.control, name: 'email' }), onEmailChange);
  // Once, as the form opens: a later render never takes the focus from where the person put it.
  const [focusOnOpen] = useState(focus);
  useEffect(() => {
    if (focusOnOpen !== undefined) form.setFocus(focusOnOpen);
  }, [form, focusOnOpen]);

  return { field, submit, isPending, blocked, errors, failure };
}
