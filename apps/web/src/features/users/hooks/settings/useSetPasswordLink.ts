import type { RecoveryPosition } from '@masaha/shared/auth';
import { currentCopy, useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createUsersRepository } from '../../repository/usersRepository';

const repository = createUsersRepository();

/**
 * A Google-only account's first password (C1): «أرسل رابط تعيين كلمة المرور» asks the reset email for
 * the account's own address (`POST /auth/password/forgot`); once asked, the card says the link was
 * sent, valid for an hour. A failure is a toast with «إعادة المحاولة».
 */
export function useSetPasswordLink(email: string) {
  const words = useCopy().users.settings.signIn;
  const send = useMutation<RecoveryPosition, AppError, string>({
    mutationFn: repository.requestPasswordLink,
    onError: () => {
      const copy = currentCopy();
      toast.error(copy.users.settings.signIn.linkFailed, {
        action: {
          label: copy.status.retry,
          onClick: () => {
            send.mutate(email);
          },
        },
      });
    },
  });

  return {
    label: words.sendLink,
    pending: send.isPending,
    sent: send.isSuccess ? words.linkSent : null,
    send: () => {
      send.mutate(email);
    },
  };
}
