import { useCopy } from '@shared/copy';
import { Card, CardContent, CircleCheckIcon } from '@shared/design-system';
import type { ReactNode } from 'react';
import { useResetPasswordFlow } from '../../hooks/reset-password/useResetPasswordFlow';
import { CheckFailed } from './CheckFailed';
import { RecoveryLoading } from '../RecoveryLoading';
import { RecoveryRetry } from '../RecoveryRetry';
import { ResetPasswordForm } from './ResetPasswordForm';
import { StepHeader } from '../StepHeader';

export type ResetPasswordCardProps = {
  /** To ask for a new link, when this one can no longer be used. */
  requestLinkLink: ReactNode;
  /** To sign in, once the password is set. */
  signInLink: ReactNode;
};

/**
 * The reset link, from `useResetPasswordFlow`: the new password once the link is open in this
 * browser, the link no longer valid, or the password set, and the way on from each.
 */
export function ResetPasswordCard({ requestLinkLink, signInLink }: ResetPasswordCardProps) {
  const copy = useCopy();
  const words = copy.auth.resetPassword;
  const view = useResetPasswordFlow();

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
      {view.kind === 'checkFailed' && (
        <>
          <StepHeader title={words.title} />
          <CheckFailed failure={view.failure} />
        </>
      )}
      {view.kind === 'form' && (
        <>
          <StepHeader title={words.title} description={view.forAccount} />
          <CardContent>
            <ResetPasswordForm saved={view.saved} />
          </CardContent>
        </>
      )}
      {view.kind === 'invalid' && (
        <>
          <StepHeader title={words.invalidTitle} description={words.invalidDescription} />
          <CardContent>{requestLinkLink}</CardContent>
        </>
      )}
      {view.kind === 'done' && (
        <>
          <StepHeader
            icon={<CircleCheckIcon aria-hidden className="size-6 text-success" />}
            title={words.doneTitle}
            description={words.doneDescription}
          />
          <CardContent>{signInLink}</CardContent>
        </>
      )}
    </Card>
  );
}
