import { ContinueWithGoogle, useSignInBusy } from '@features/auth';
import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import { onRecoveryDoneElsewhere } from '@shared/routing';
import { useEffect, useRef } from 'react';
import type { ForgotStep, SignInReason, SignInView, ViewFocus } from '../../public/signInView';
import { OrDivider } from '../OrDivider';
import { ChangedNotice } from './ChangedNotice';
import { ForgotView } from './ForgotView';
import { RegisterView } from './RegisterView';
import { SignInFormView } from './SignInFormView';

export type InPlaceSignInProps = {
  reason: SignInReason;
  view: SignInView;
  /** The view opened by a switch that asked for its form's field, not its title. */
  focusForm: boolean;
  /** Switches the view, the focus then on its title or its form. */
  go: (view: SignInView, focus?: ViewFocus) => void;
  /** The email typed so far, carried between the views. */
  email: string;
  onEmailChange: (email: string) => void;
  /** Hears where the forgotten password stands, which titles it. */
  onStep: (step: ForgotStep) => void;
  /** Hears whether a request is under way, which holds the overlay open. */
  onBusy: (busy: boolean) => void;
};

/**
 * The views of the sign-in over the page (ADR 0021), loaded the first time it opens: the forms of
 * `features/auth`, arranged as the overlay shows them. Google heads the sign-in and register, in one
 * place between them, so its one button and its handler stay as the view switches. While the
 * forgotten password waits, a reset completed in another tab of this browser brings the sign-in
 * back, the email filled and the password focused (A1).
 */
export function InPlaceSignIn({
  reason,
  view,
  focusForm,
  go,
  email,
  onEmailChange,
  onStep,
  onBusy,
}: InPlaceSignInProps) {
  const copy = useCopy();
  const busy = useSignInBusy();
  const switchTo = useRef(go);

  useEffect(() => {
    switchTo.current = go;
  });

  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);
  useEffect(
    () => () => {
      onBusy(false);
    },
    [onBusy],
  );

  useEffect(() => {
    if (view !== 'forgot') return undefined;
    return onRecoveryDoneElsewhere(() => {
      switchTo.current('changed', 'form');
    });
  }, [view]);

  return (
    <div className="flex flex-col gap-4">
      {view === 'signIn' || view === 'register' ? (
        // Held while another sign-in is under way, so two never race (N-1).
        <div inert={busy} className="contents">
          <ContinueWithGoogle
            divider={<OrDivider />}
            linkRefusedAction={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  go('forgot');
                }}
              >
                {copy.auth.signIn.forgotPassword}
              </Button>
            }
          />
        </div>
      ) : null}
      {view === 'changed' ? <ChangedNotice /> : null}
      {view === 'signIn' || view === 'changed' ? (
        <SignInFormView
          // A new form for the sign-in after a reset: the email filled, the password focused.
          key={view}
          email={email}
          onEmailChange={onEmailChange}
          focusPassword={focusForm}
          go={go}
          foot={view === 'signIn'}
          busy={busy}
        />
      ) : null}
      {view === 'register' ? (
        <RegisterView email={email} onEmailChange={onEmailChange} go={go} busy={busy} />
      ) : null}
      {view === 'forgot' ? (
        <ForgotView reason={reason} email={email} onEmailChange={onEmailChange} onStep={onStep} />
      ) : null}
    </div>
  );
}
