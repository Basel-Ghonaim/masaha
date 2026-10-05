import { ForgotPasswordCard } from '@features/auth';
import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import { Link } from 'react-router';
import { SITE_PATHS } from '../navigation';

/**
 * The forgotten password: the recovery's card, with the site's ways out: back to sign in, the
 * contact for someone who cannot reach their email.
 */
export function ForgotPasswordPage() {
  const copy = useCopy();
  const words = copy.auth.forgotPassword;

  return (
    <ForgotPasswordCard
      signInLink={
        <Button asChild variant="link" size="sm">
          <Link to={SITE_PATHS.signIn}>{words.backToSignIn}</Link>
        </Button>
      }
      contactLink={
        <Button asChild variant="link" size="sm" className="px-0">
          <Link to={SITE_PATHS.contact}>{words.contactUs}</Link>
        </Button>
      }
    />
  );
}
