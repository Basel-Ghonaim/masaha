import { useCopy } from '@shared/copy';
import { Button, CardContent } from '@shared/design-system';
import { ResendLinkForm } from '../resend-link/ResendLinkForm';

/**
 * The link was asked for: what happens next, the masked address, and another link while the
 * recovery may ask for one; once it may not, the way to enter the email again.
 */
export function LinkSent({
  sentTo,
  canResend,
  enterEmailAgain,
}: {
  sentTo: string;
  canResend: boolean;
  enterEmailAgain: () => void;
}) {
  const copy = useCopy();

  return (
    <CardContent className="gap-4">
      <p className="text-body">{copy.auth.forgotPassword.sentMessage}</p>
      <p className="text-body-sm text-muted-foreground">{sentTo}</p>
      {canResend ? (
        <ResendLinkForm />
      ) : (
        <>
          <p className="text-body-sm">{copy.errors.RESEND_LIMIT_REACHED}</p>
          <Button variant="outline" className="w-full" onClick={enterEmailAgain}>
            {copy.auth.forgotPassword.enterEmailAgain}
          </Button>
        </>
      )}
    </CardContent>
  );
}
