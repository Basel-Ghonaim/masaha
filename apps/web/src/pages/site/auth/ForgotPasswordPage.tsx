import { ForgotPasswordCard } from '@features/auth';
import { usePlatformContact } from '@features/platform-settings/public';
import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import { Link, useLocation } from 'react-router';
import { SITE_PATHS } from '../navigation';
import { nextSearch } from './nextSearch';

/**
 * The forgotten password: the recovery's card, with the site's ways out: back to sign in (carrying
 * `next`), the contact for someone who cannot reach their email — the platform's WhatsApp when the
 * admin set one (foundation §13 #7), else the about page's contact — and on to the new password once
 * a link is open (carrying `next` too).
 */
export function ForgotPasswordPage() {
  const copy = useCopy();
  const words = copy.auth.forgotPassword;
  const { search } = useLocation();
  const contact = usePlatformContact();
  const whatsapp =
    contact.state === 'ready'
      ? contact.channels.find((channel) => channel.kind === 'whatsapp')
      : undefined;

  return (
    <ForgotPasswordCard
      signInLink={
        <Button asChild variant="link" size="sm">
          <Link to={`${SITE_PATHS.signIn}${nextSearch(search)}`}>{words.backToSignIn}</Link>
        </Button>
      }
      contactLink={
        <Button asChild variant="link" size="sm" className="px-0">
          {whatsapp ? (
            <a href={whatsapp.href} target="_blank" rel="noopener">
              {words.contactUs}
            </a>
          ) : (
            <Link to={SITE_PATHS.contact}>{words.contactUs}</Link>
          )}
        </Button>
      }
      resetPasswordLink={
        <Button asChild className="w-full">
          <Link to={`${SITE_PATHS.resetPassword}${nextSearch(search)}`}>{words.continue}</Link>
        </Button>
      }
    />
  );
}
