import { ResetPasswordCard, SignInForm } from '@features/auth';
import { useCopy } from '@shared/copy';
import { Alert, AlertDescription, Button, LogInIcon } from '@shared/design-system';
import { isolate } from '@shared/localisation';
import { heldIntentPreview, landingPath, noteRecoveryDone, takeIntentPath } from '@shared/routing';
import { useSession } from '@shared/session';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { SITE_PATHS } from '../navigation';
import { nextSearch } from './nextSearch';

/**
 * The reset link: the recovery's card, with the site's ways on: a new link when this one can no
 * longer be used, and back to sign in until the password is set — each carrying `next`. The password
 * set, it marks the recovery done, so the sign-in after it may run a guest's held action (finding
 * 168), and that sign-in is on the card itself, the email to type, its field focused (ADR 0021,
 * point 4: never a sign-in by itself). Signed in there, the page lands as a page lands: on the held
 * action's page when this browser holds one, which the card says it returns to, else on `next`, else
 * by role. A session still held once the password is set (another account's) keeps the link to sign
 * in.
 */
export function ResetPasswordPage() {
  const copy = useCopy();
  const words = copy.auth.resetPassword;
  const { search } = useLocation();
  const navigate = useNavigate();
  const signIn = `${SITE_PATHS.signIn}${nextSearch(search)}`;
  // The guest's action this browser holds: where the sign-in will return. Read as the page opens,
  // and again once the password is set, so the line never promises an action let go meanwhile.
  const [held, setHeld] = useState(heldIntentPreview);
  const returnTo = held?.name === undefined ? undefined : isolate(held.name.text);
  const session = useSession((state) => state);
  // Whether the page was a guest's, so the sign-in on the card was offered: only a session it opened
  // lands from here; one held before (another account's) stays where it is.
  const [offered, setOffered] = useState(false);
  const guest = session.status === 'anonymous';
  if (guest && !offered) {
    setOffered(true);
  }

  useEffect(() => {
    if (!offered || session.status !== 'authenticated') return;
    const intentPath = takeIntentPath();
    const landing =
      intentPath === null ? search : `?${new URLSearchParams({ next: intentPath }).toString()}`;
    void navigate(landingPath(session.user, landing), { replace: true });
  }, [offered, session, search, navigate]);

  return (
    <ResetPasswordCard
      // The sign-in that follows is the recovery's round trip: it may run a guest's held action.
      onPasswordSet={() => {
        noteRecoveryDone();
        setHeld(heldIntentPreview());
      }}
      returnNote={
        held !== null &&
        returnTo !== undefined && (
          <Alert>
            <AlertDescription>{words.returnNote[held.kind]({ space: returnTo })}</AlertDescription>
          </Alert>
        )
      }
      doneDescription={
        held !== null && returnTo !== undefined
          ? words.doneReturn[held.kind]({ space: returnTo })
          : undefined
      }
      requestLinkLink={
        <Button asChild variant="main" className="w-full">
          <Link to={`${SITE_PATHS.forgotPassword}${nextSearch(search)}`}>
            {words.requestNewLink}
          </Link>
        </Button>
      }
      backLink={
        <Button asChild variant="link" size="sm">
          <Link to={signIn}>{copy.auth.forgotPassword.backToSignIn}</Link>
        </Button>
      }
      signIn={
        guest ? (
          <SignInForm focus="email" />
        ) : (
          <Button asChild variant="main" className="w-full">
            <Link to={signIn}>
              <LogInIcon aria-hidden />
              {words.signIn}
            </Link>
          </Button>
        )
      }
    />
  );
}
