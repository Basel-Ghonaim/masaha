import { updateMeSchema, type MyAccount, type UpdateMeRequest } from '@masaha/shared/users';
import { currentCopy, useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { useServerForm } from '@shared/forms';
import { accountEdited } from '@shared/session';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUsersRepository } from '../../repository/usersRepository';
import { MY_ACCOUNT_KEY } from './useMyAccountQuery';

const repository = createUsersRepository();

type ProfileValues = { name: string };

/**
 * «الملف الشخصي»: the name, by registration's rule (`updateMeSchema`), sent with `PATCH /me`. Saved,
 * the account read is replaced by the answer, the held session takes the name so the account menu
 * shows it at once (`accountEdited`), and the toast says «حُفظت التغييرات».
 */
export function useProfileForm(account: MyAccount) {
  const copy = useCopy();
  const client = useQueryClient();
  const save = useMutation<MyAccount, AppError, UpdateMeRequest>({
    mutationFn: repository.updateMe,
    onSuccess: (edited) => {
      client.setQueryData(MY_ACCOUNT_KEY, edited);
      accountEdited(edited.id, { name: edited.name });
      toast.success(currentCopy().users.settings.profile.saved);
    },
  });
  return useServerForm<ProfileValues, UpdateMeRequest>({
    schema: updateMeSchema,
    defaultValues: { name: account.name },
    fields: ['name'],
    submit: (request) => save.mutateAsync({ name: request.name }),
    failureTitle: copy.users.settings.profile.failed,
    fieldLines: { name: copy.auth.fieldErrors.name },
  });
}
