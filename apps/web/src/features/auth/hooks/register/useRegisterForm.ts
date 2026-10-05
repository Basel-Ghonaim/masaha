import { registerSchema, type RegisterRequest } from '@masaha/shared/auth';
import { useCopy } from '@shared/copy';
import { usePasswordRules, useServerForm } from '@shared/forms';
import { usePreferences } from '@shared/preferences';
import { useWatch } from 'react-hook-form';
import { useRegister } from './useRegister';

type RegisterValues = { name: string; email: string; password: string };

/**
 * The register form: the contract's `registerSchema`, the name, the email and the password, and the
 * registration as its server call, sent with the interface language so the account starts in it. It
 * returns what `RegisterForm` renders, with the password's rules as they tick, and whether the
 * email already has an account (the server's `EMAIL_TAKEN`, as the email's `not_unique`).
 */
export function useRegisterForm() {
  const copy = useCopy();
  const language = usePreferences((preferences) => preferences.language);
  const register = useRegister();
  const { field, submit, isPending, blocked, errors, failure, codes, form } = useServerForm<
    RegisterValues,
    RegisterRequest
  >({
    schema: registerSchema,
    defaultValues: { name: '', email: '', password: '' },
    fields: ['name', 'email', 'password'],
    submit: (request) => register.mutateAsync({ ...request, language }),
    failureTitle: copy.auth.register.failed,
    fieldLines: {
      name: copy.auth.fieldErrors.name,
      email: { ...copy.auth.fieldErrors.email, not_unique: copy.errors.EMAIL_TAKEN },
      password: copy.auth.fieldErrors.newPassword,
    },
  });
  const password = useWatch({ control: form.control, name: 'password' });
  const passwordRules = usePasswordRules(password, errors.password !== undefined);

  return {
    field,
    submit,
    isPending,
    blocked,
    errors,
    failure,
    passwordRules,
    emailTaken: codes.email === 'not_unique',
  };
}
