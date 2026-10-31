import { ResetPasswordCard } from '@features/auth';
import { useCopy } from '@shared/copy';
import { Button, LogInIcon } from '@shared/design-system';
import { Link } from 'react-router';
import { SITE_PATHS } from '../navigation';

/**
 * The reset link: the recovery's card, with the site's ways on: a new link when this one can no
 * longer be used, sign-in once the password is set, and back to sign in until then.
 */
export function ResetPasswordPage() {
  const copy = useCopy();
  const words = copy.auth.resetPassword;

  return (
    <ResetPasswordCard
      requestLinkLink={
        <Button asChild className="w-full">
          <Link to={SITE_PATHS.forgotPassword}>{words.requestNewLink}</Link>
        </Button>
      }
      backLink={
        <Button asChild variant="link" size="sm">
          <Link to={SITE_PATHS.signIn}>{copy.auth.forgotPassword.backToSignIn}</Link>
        </Button>
      }
      signInLink={
        <Button asChild className="w-full">
          <Link to={SITE_PATHS.signIn}>
            <LogInIcon aria-hidden />
            {words.signIn}
          </Link>
        </Button>
      }
    />
  );
}
