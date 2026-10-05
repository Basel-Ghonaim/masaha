import { useCopy } from '@shared/copy';
import { isolated } from '@shared/forms';
import { useState } from 'react';
import { forgotPasswordScreen } from '../../services/forgotPasswordScreen';
import { useRecoveryPositionQuery } from '../useRecoveryPositionQuery';

/**
 * The forgotten password's page: the screen of where the recovery stands, ready to render. The
 * reader may choose to enter the email again; the choice holds while the recovery stays where it was
 * made, so the position a new request answers ends it.
 */
export function useForgotPasswordFlow() {
  const copy = useCopy();
  const query = useRecoveryPositionQuery();
  const position = query.data;
  // Where the recovery stands, as far as the choice is concerned: a refetch that only counts the
  // window down leaves it where it was.
  const standing: string | undefined =
    position?.step === 'sent' ? `sent:${String(position.canResend)}` : position?.step;
  const [restartedAt, setRestartedAt] = useState<string | undefined>(undefined);
  if (restartedAt !== undefined && restartedAt !== standing) {
    setRestartedAt(undefined);
  }
  const screen = forgotPasswordScreen({
    position,
    failure: query.error,
    fetching: query.isFetching,
    restarting: restartedAt !== undefined && restartedAt === standing,
  });
  const enterEmailAgain = () => {
    setRestartedAt(standing);
  };

  switch (screen.kind) {
    case 'unreachable':
      return {
        ...screen,
        retry: () => {
          void query.refetch();
        },
      };
    case 'sent':
      return {
        kind: screen.kind,
        sentTo: copy.auth.forgotPassword.sentTo({ email: isolated(screen.email) }),
        canResend: screen.canResend,
        enterEmailAgain,
      };
    case 'linkOpen':
      return {
        kind: screen.kind,
        description: copy.auth.forgotPassword.linkOpenDescription({
          email: isolated(screen.email),
        }),
        enterEmailAgain,
      };
    default:
      return screen;
  }
}
