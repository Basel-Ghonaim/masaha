import { ResetPasswordCard } from '@features/auth';
import { useCopy } from '@shared/copy';
import { Button, LogInIcon } from '@shared/design-system';
import { noteRecoveryDone } from '@shared/routing';
import { Link, useLocation } from 'react-router';
import { SITE_PATHS } from '../navigation';
import { nextSearch } from './nextSearch';

/**
 * The reset link: the recovery's card, with the site's ways on: a new link when this one can no
 * longer be used, sign-in once the password is set, and back to sign in until then — each carrying
 * `next`, so the sign-in after a recovery still returns to the page asked for. The password set, it
 * marks the recovery done, so the sign-in after it may run a guest's held action (finding 168).
 */
export function ResetPasswordPage() {
  const copy = useCopy();
  const words = copy.auth.resetPassword;
  const { search } = useLocation();
  const signIn = `${SITE_PATHS.signIn}${nextSearch(search)}`;

  return (
    <ResetPasswordCard
      // The sign-in that follows is the recovery's round trip: it may run a guest's held action.
      onPasswordSet={noteRecoveryDone}
      requestLinkLink={
        <Button asChild className="w-full">
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
      signInLink={
        <Button asChild className="w-full">
          <Link to={signIn}>
            <LogInIcon aria-hidden />
            {words.signIn}
          </Link>
        </Button>
      }
    />
  );
}
