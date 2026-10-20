import type { StaffMember } from '@masaha/shared/space-links';
import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { isolate } from '@shared/localisation';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { staffKeys } from '../queryKeys';
import { useReissue } from './useReissue';

/**
 * The re-issue's confirmation, ready to render: its title names the person, and its line says that
 * the previous temporary password ends, and their sessions with it. Issued, it closes and the new
 * password goes to `issued`, the mutation reset so no cache holds it. A refusal is worded in the
 * dialog, in the owner's words, and it stays open; a password no longer pending, or a person no
 * longer on the staff (404), also reads the list again, so the row shows why.
 */
export function useReissueDialog(
  spaceId: number,
  member: StaffMember,
  { issued, close }: { issued: (password: string) => void; close: () => void },
) {
  const copy = useCopy().staff;
  const words = copy.reissue;
  const client = useQueryClient();
  const reissue = useReissue(spaceId);
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const { view: failure, blocked } = useRefusalView(refusal, words.failed, copy.refusals);

  return {
    title: words.title({ name: isolate(member.name) }),
    description: words.description,
    confirm: {
      label: words.confirm,
      busy: reissue.isPending,
      blocked,
      run: async () => {
        setRefusal(null);
        try {
          const answer = await reissue.mutateAsync(member.userId);
          reissue.reset();
          close();
          issued(answer.temporaryPassword);
        } catch (error) {
          const refused = toAppError(error);
          if (refused.code === 'TEMPORARY_PASSWORD_NOT_PENDING' || refused.status === 404) {
            void client.invalidateQueries({ queryKey: staffKeys.list(spaceId) });
          }
          setRefusal(refused);
        }
      },
    },
    cancelLabel: words.cancel,
    failure,
  };
}
