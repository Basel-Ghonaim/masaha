import { useCopy } from '@shared/copy';
import { Card, CardContent, CardFooter } from '@shared/design-system';
import { useState, type ReactNode } from 'react';
import { useForgotPasswordFlow } from '../../hooks/forgot-password/useForgotPasswordFlow';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { LinkOpen } from './LinkOpen';
import { LinkSent } from './LinkSent';
import { RecoveryLoading } from '../RecoveryLoading';
import { RecoveryRetry } from '../RecoveryRetry';
import { StepHeader } from '../StepHeader';

export type ForgotPasswordCardProps = {
  /** Back to sign in, at the card's foot. */
  signInLink: ReactNode;
  /** Masaha's contact, for someone who cannot reach their email. */
  contactLink: ReactNode;
  /** On to the new password, once a link is open in this browser. */
  resetPasswordLink: ReactNode;
};

/**
 * The forgotten password: the step the server holds, from `useForgotPasswordFlow` (the email form, the
 * link sent with its resend, or a link already open), and the ways out at its foot.
 */
export function ForgotPasswordCard({
  signInLink,
  contactLink,
  resetPasswordLink,
}: ForgotPasswordCardProps) {
  const copy = useCopy();
  const words = copy.auth.forgotPassword;
  const view = useForgotPasswordFlow();
  // Whether the reader chose to enter an email again: the form then opens with its field focused.
  const [focusEmail, setFocusEmail] = useState(false);
  const enterEmailAgain = (again: () => void) => () => {
    setFocusEmail(true);
    again();
  };

  return (
    <Card className="w-full md:max-w-md">
      {view.kind === 'loading' && (
        <>
          <StepHeader title={words.title} />
          <RecoveryLoading />
        </>
      )}
      {view.kind === 'unreachable' && (
        <>
          <StepHeader title={words.title} />
          <RecoveryRetry reason={view.reason} retry={view.retry} />
        </>
      )}
      {view.kind === 'request' && (
        <>
          <StepHeader title={words.title} description={words.description} />
          <CardContent>
            <ForgotPasswordForm focusEmail={focusEmail} />
          </CardContent>
        </>
      )}
      {view.kind === 'sent' && (
        <>
          <StepHeader title={words.sentTitle} />
          <LinkSent
            sentTo={view.sentTo}
            canResend={view.canResend}
            enterEmailAgain={enterEmailAgain(view.enterEmailAgain)}
          />
        </>
      )}
      {view.kind === 'linkOpen' && (
        <>
          <StepHeader title={words.linkOpenTitle} description={view.description} />
          <LinkOpen
            resetPasswordLink={resetPasswordLink}
            enterEmailAgain={enterEmailAgain(view.enterEmailAgain)}
          />
        </>
      )}
      <CardFooter className="flex-col gap-2">
        <p className="flex flex-wrap items-center justify-center gap-1 text-caption text-muted-foreground">
          {words.noEmailAccess}
          {contactLink}
        </p>
        {signInLink}
      </CardFooter>
    </Card>
  );
}
