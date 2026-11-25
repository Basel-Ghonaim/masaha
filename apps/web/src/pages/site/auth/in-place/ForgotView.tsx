import { ForgotPasswordSteps } from '@features/auth';
import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import { renewHeldIntent } from '@shared/routing';
import { Link } from 'react-router';
import type { ForgotStep, SignInReason } from '../../public/signInView';
import { SITE_PATHS } from '../../navigation';
import { SentNote } from './SentNote';

/**
 * The request for a reset link over the page: the forgotten password's steps, the email carried
 * from the sign-in. A link asked for, or asked again, starts the held action's life again, so the
 * round trip through the email does not outlast it; the link sent says what completes after the
 * reset. A link already open in this browser leads on to the reset page in a new tab, this page
 * and its held action kept.
 */
export function ForgotView({
  reason,
  email,
  onEmailChange,
  onStep,
}: {
  reason: SignInReason;
  email: string;
  onEmailChange: (email: string) => void;
  onStep: (step: ForgotStep) => void;
}) {
  const copy = useCopy();

  return (
    <ForgotPasswordSteps
      defaultEmail={email}
      onEmailChange={onEmailChange}
      onStep={onStep}
      onRequested={renewHeldIntent}
      sentNote={<SentNote reason={reason} />}
      resetPasswordLink={
        <Button asChild className="w-full">
          <Link to={SITE_PATHS.resetPassword} target="_blank" rel="noopener">
            {copy.auth.forgotPassword.continue}{' '}
            <span className="sr-only">{copy.site.signInPrompt.newTab}</span>
          </Link>
        </Button>
      }
    />
  );
}
