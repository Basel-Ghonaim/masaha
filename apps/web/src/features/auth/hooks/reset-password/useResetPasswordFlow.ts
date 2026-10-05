import { useCopy } from '@shared/copy';
import { isolated, useRefusalView, type Refusal } from '@shared/forms';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { readFailure } from '../../services/readFailure';
import { resetPasswordScreen } from '../../services/resetPasswordScreen';
import { resetTokenOf } from '../../services/resetTokenOf';
import { takeResetToken } from '../../services/takeResetToken';
import type { LinkCheck } from '../../types/LinkCheck';
import { useCheckResetLink } from './useCheckResetLink';
import { useRecoveryPositionQuery } from '../useRecoveryPositionQuery';

/**
 * The reset page (docs/architecture/decisions/0017): the screen of the link's check and of where the
 * recovery stands, ready to render.
 * - A link in the address, on arrival or opened later on the page already showing, is taken out of
 *   it before anything is sent, then checked, which binds it to the recovery. Until the server
 *   answers, the check alone holds the token, so a check that got no answer can be sent again; once
 *   it is answered, the token is dropped, and the page keeps only what the answer says.
 * - The position is read once no link waits for its check, so a reload, which carries no link,
 *   shows the step the server holds.
 * - Once the password is set, the page says so, whatever the recovery's position is then.
 */
export function useResetPasswordFlow() {
  const copy = useCopy();
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  // A link waits for its check: one the address carries on arrival, or one opened later.
  const [linkPending, setLinkPending] = useState(() => resetTokenOf(hash) !== null);
  const check = useCheckResetLink();
  const { mutate: sendCheck, reset: dropCheck } = check;
  // The server's answer to the check: the link bound, or what the page shows of a refusal; never the
  // error itself, whose request still carries the token.
  const [answered, setAnswered] = useState<'bound' | Refusal | null>(null);
  const [done, setDone] = useState(false);
  // A link opened on the page already showing changes only the fragment: the page waits for its
  // check, with nothing left of the last link's. Set while rendering, as the fragment changes.
  const [seenHash, setSeenHash] = useState(hash);
  if (hash !== seenHash) {
    setSeenHash(hash);
    if (resetTokenOf(hash) !== null) {
      setLinkPending(true);
      setAnswered(null);
      setDone(false);
    }
  }
  const query = useRecoveryPositionQuery({ enabled: !linkPending });
  const refused = answered === 'bound' ? null : answered;
  const refusal = useRefusalView(refused, copy.auth.resetPassword.checkFailedTitle);

  const send = useCallback(
    (token: string) => {
      sendCheck(
        { token },
        {
          onSuccess: () => {
            setAnswered('bound');
            setLinkPending(false);
            dropCheck();
          },
          onError: (error) => {
            if (readFailure(error) === 'error') {
              const { type, code, requestId, retryAfterSeconds } = error;
              setAnswered({ type, code, requestId, retryAfterSeconds });
              setLinkPending(false);
              dropCheck();
            }
          },
        },
      );
    },
    [sendCheck, dropCheck],
  );

  // Runs again whenever the address's fragment changes, so a link opened on the page already showing
  // is taken out of the address and checked too.
  useEffect(() => {
    const token = takeResetToken();
    if (token === null) return;
    // The router's own copy of the address loses the link too.
    void navigate({ pathname, search }, { replace: true });
    send(token);
  }, [navigate, pathname, search, hash, send]);

  let linkCheck: LinkCheck = { status: 'none' };
  if (refused !== null) {
    linkCheck = { status: 'failed', error: refused };
  } else if (check.error !== null) {
    linkCheck = { status: 'failed', error: check.error };
  } else if (linkPending) {
    linkCheck = { status: 'pending' };
  }
  const screen = resetPasswordScreen({
    done,
    check: linkCheck,
    position: query.data,
    failure: query.error,
    fetching: query.isFetching,
  });

  switch (screen.kind) {
    case 'unreachable': {
      const held = check.variables?.token;
      return {
        ...screen,
        retry: () => {
          if (held === undefined) void query.refetch();
          else send(held);
        },
      };
    }
    case 'checkFailed':
      return { kind: screen.kind, failure: refusal.view };
    case 'form':
      return {
        kind: screen.kind,
        forAccount: copy.auth.resetPassword.forAccount({ email: isolated(screen.email) }),
        saved: () => {
          setDone(true);
        },
      };
    default:
      return screen;
  }
}
