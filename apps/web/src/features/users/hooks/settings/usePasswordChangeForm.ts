import {
  changePasswordSchema,
  type ChangePasswordRequest,
  type PasswordChanged,
} from '@masaha/shared/users';
import { currentCopy, useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { usePasswordRules, useServerForm } from '@shared/forms';
import { getSession, passwordChanged } from '@shared/session';
import { useMutation } from '@tanstack/react-query';
import { useWatch } from 'react-hook-form';
import { createUsersRepository } from '../../repository/usersRepository';

const repository = createUsersRepository();

type PasswordChangeValues = { currentPassword: string; password: string };

/**
 * The settings' password change (C2): the current password and the new one (the rules' checklist),
 * sent with `POST /me/password`. Saved, the session goes on with the renewed token
 * (`passwordChanged`), the toast says the other devices were signed out, and `done` closes the form.
 * A wrong current password is said with the errors' line (`CURRENT_PASSWORD_INCORRECT`); too many
 * tries count down. The passwords are the mutation's variables, so the cache keeps none (`gcTime: 0`).
 */
export function usePasswordChangeForm({ done }: { done: () => void }) {
  const copy = useCopy();
  const change = useMutation<PasswordChanged, AppError, ChangePasswordRequest, { userId?: number }>(
    {
      mutationFn: repository.changePassword,
      gcTime: 0,
      onMutate: () => ({ userId: getSession().user?.id }),
      onSuccess: ({ accessToken }, _request, started) => {
        if (started.userId !== undefined) passwordChanged(started.userId, accessToken);
        toast.success(currentCopy().users.settings.passwordForm.saved);
        done();
      },
    },
  );
  const form = useServerForm<PasswordChangeValues, ChangePasswordRequest>({
    schema: changePasswordSchema,
    defaultValues: { currentPassword: '', password: '' },
    fields: ['currentPassword', 'password'],
    submit: (request) => change.mutateAsync(request),
    failureTitle: copy.users.settings.passwordForm.failed,
    fieldLines: {
      currentPassword: copy.auth.fieldErrors.currentPassword,
      password: copy.auth.fieldErrors.newPassword,
    },
  });
  const password = useWatch({ control: form.form.control, name: 'password' });
  const passwordRules = usePasswordRules(password, form.errors.password !== undefined);

  return { ...form, passwordRules };
}
