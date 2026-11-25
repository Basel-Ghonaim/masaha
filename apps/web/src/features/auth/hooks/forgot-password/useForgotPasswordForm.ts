import { forgotPasswordSchema, type ForgotPasswordRequest } from '@masaha/shared/auth';
import { useCopy } from '@shared/copy';
import { useServerForm } from '@shared/forms';
import { useWatch } from 'react-hook-form';
import { useEmailReport } from '../useEmailReport';
import { useRequestLink } from './useRequestLink';

type ForgotPasswordValues = { email: string };

export type ForgotPasswordFormOptions = {
  /** The email the form opens with, carried from where the person typed it. */
  defaultEmail?: string;
  /** Hears the email as it changes, so it can be carried on. */
  onEmailChange?: (email: string) => void;
  /** Hears the link asked for, once the server has answered. */
  onRequested?: () => void;
};

/**
 * The request for a reset link: the contract's `forgotPasswordSchema`, the email, and the request as
 * its server call. It returns what `ForgotPasswordForm` renders.
 */
export function useForgotPasswordForm({
  defaultEmail = '',
  onEmailChange,
  onRequested,
}: ForgotPasswordFormOptions = {}) {
  const copy = useCopy();
  const requestLink = useRequestLink();
  const { field, submit, isPending, blocked, errors, failure, form } = useServerForm<
    ForgotPasswordValues,
    ForgotPasswordRequest
  >({
    schema: forgotPasswordSchema,
    defaultValues: { email: defaultEmail },
    fields: ['email'],
    submit: async (request) => {
      await requestLink.mutateAsync(request);
      onRequested?.();
    },
    failureTitle: copy.auth.forgotPassword.failed,
    fieldLines: { email: copy.auth.fieldErrors.email },
  });
  useEmailReport(useWatch({ control: form.control, name: 'email' }), onEmailChange);
  return { field, submit, isPending, blocked, errors, failure };
}
