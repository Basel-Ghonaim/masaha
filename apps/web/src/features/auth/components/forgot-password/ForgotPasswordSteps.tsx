import { useCopy } from '@shared/copy';
import { Button, Spinner } from '@shared/design-system';
import { useEffect, useState, type ReactNode } from 'react';
import { useForgotPasswordFlow } from '../../hooks/forgot-password/useForgotPasswordFlow';
import { RecoveryFailure } from '../RecoveryRetry';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { LinkOpen } from './LinkOpen';
import { LinkSentLines } from './LinkSent';

/** Where the forgotten password stands, as `ForgotPasswordSteps` shows it. */
export type ForgotPasswordStep = 'loading' | 'unreachable' | 'request' | 'sent' | 'linkOpen';

export type ForgotPasswordStepsProps = {
  /** The email the request opens with, typed elsewhere. */
  defaultEmail?: string;
  /** Hears the request's email as it changes. */
  onEmailChange?: (email: string) => void;
  /** Hears where the recovery stands, for the place's title. */
  onStep: (step: ForgotPasswordStep) => void;
  /** Hears a link asked for, or asked again, once the server has answered. */
  onRequested?: () => void;
  /** Said with the link sent, before another link is offered. */
  sentNote?: ReactNode;
  /** On to the new password, once a link is open in this browser. */
  resetPasswordLink: ReactNode;
};

/**
 * The forgotten password's steps without a card, for a place that titles them itself (the sign-in
 * over a page, ADR 0021): the step the server holds, from `useForgotPasswordFlow` — the email form,
 * the link sent with its resend and «استخدم بريدًا آخر», or a link already open — each told to
 * `onStep` so the place can title it. The card of the page is `ForgotPasswordCard`.
 */
export function ForgotPasswordSteps({
  defaultEmail = '',
  onEmailChange,
  onStep,
  onRequested,
  sentNote,
  resetPasswordLink,
}: ForgotPasswordStepsProps) {
  const copy = useCopy();
  const words = copy.auth.forgotPassword;
  const view = useForgotPasswordFlow();
  // Chosen to enter an email again: the form then opens empty, its field focused (C3).
  const [again, setAgain] = useState(false);

  useEffect(() => {
    onStep(view.kind);
  }, [onStep, view.kind]);

  switch (view.kind) {
    case 'loading':
      return (
        <div className="flex justify-center py-6">
          <Spinner label={copy.status.loading} />
        </div>
      );
    case 'unreachable':
      return <RecoveryFailure reason={view.reason} retry={view.retry} />;
    case 'request':
      return (
        <ForgotPasswordForm
          focusEmail={again}
          defaultEmail={again ? '' : defaultEmail}
          onEmailChange={onEmailChange}
          onRequested={onRequested}
        />
      );
    case 'sent':
      return (
        <div className="flex flex-col gap-4">
          <LinkSentLines
            message={words.sentMessage}
            sentTo={view.sentTo}
            canResend={view.canResend}
            note={sentNote}
            onResent={onRequested}
          />
          <Button
            type="button"
            variant="link"
            size="sm"
            className="self-center"
            onClick={() => {
              setAgain(true);
              view.enterEmailAgain();
            }}
          >
            {words.useAnotherEmail}
          </Button>
        </div>
      );
    case 'linkOpen':
      return (
        <div className="flex flex-col gap-4">
          <p className="text-body text-muted-foreground">{view.description}</p>
          <LinkOpen
            resetPasswordLink={resetPasswordLink}
            enterEmailAgain={() => {
              setAgain(true);
              view.enterEmailAgain();
            }}
          />
        </div>
      );
  }
}
