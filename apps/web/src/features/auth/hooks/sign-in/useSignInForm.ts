import { loginSchema, type LoginRequest } from '@masaha/shared/auth';
import { useCopy } from '@shared/copy';
import { useServerForm } from '@shared/forms';
import { useSignIn } from './useSignIn';

type SignInValues = { email: string; password: string };

/**
 * The sign-in form: the contract's `loginSchema`, the email then the password, and the sign-in as
 * its server call. It returns what `SignInForm` renders.
 */
export function useSignInForm() {
  const copy = useCopy();
  const signIn = useSignIn();
  const { field, submit, isPending, blocked, errors, failure } = useServerForm<
    SignInValues,
    LoginRequest
  >({
    schema: loginSchema,
    defaultValues: { email: '', password: '' },
    fields: ['email', 'password'],
    submit: signIn.mutateAsync,
    failureTitle: copy.auth.signIn.failed,
    fieldLines: {
      email: copy.auth.fieldErrors.email,
      password: copy.auth.fieldErrors.currentPassword,
    },
  });
  return { field, submit, isPending, blocked, errors, failure };
}
