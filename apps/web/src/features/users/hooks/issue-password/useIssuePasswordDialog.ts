import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { isolate } from '@shared/localisation';
import { useState } from 'react';
import type { AccountPerson } from '../../types/AccountPerson';
import { useIssueTemporaryPassword } from './useIssueTemporaryPassword';

/**
 * The temporary password's issue, ready to render: first a confirm whose title names the person and
 * whose line says what follows — their password stops working, their sessions end, and they change
 * it at the next sign-in; then, issued, the password itself (`issued`), held here alone, the
 * mutation reset, for the one-time dialog. A refusal is worded in the confirm, which stays open.
 * `done` forgets the password and closes (`close`).
 */
export function useIssuePasswordDialog(person: AccountPerson, close: () => void) {
  const lines = useCopy().users.issuePassword;
  const issue = useIssueTemporaryPassword();
  const [issued, setIssued] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const { view: failure, blocked } = useRefusalView(refusal, lines.failed, lines.refusals);

  return {
    title: lines.title({ name: isolate(person.name) }),
    line: lines.line,
    confirm: {
      label: lines.confirm,
      busy: issue.isPending,
      blocked,
      run: async () => {
        setRefusal(null);
        try {
          const answer = await issue.mutateAsync(person.id);
          setIssued(answer.temporaryPassword);
          issue.reset();
        } catch (error) {
          setRefusal(toAppError(error));
        }
      },
    },
    cancelLabel: lines.cancel,
    failure,
    issued,
    done: () => {
      setIssued(null);
      close();
    },
  };
}
