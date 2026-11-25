import { useCopy } from '@shared/copy';
import { Button, CardContent } from '@shared/design-system';
import type { ReactNode } from 'react';
import { ResendLinkForm } from '../resend-link/ResendLinkForm';

/**
 * What a sent link says, wherever one is asked for: what happens next (`message`), the masked
 * address, the caller's `note`, and another link while the recovery may ask for one, its wait
 * counted down (once it may not, why).
 */
export function LinkSentLines({
  message,
  sentTo,
  canResend,
  note,
  onResent,
}: {
  message: string;
  sentTo: string;
  canResend: boolean;
  /** Said before another link is offered, such as what happens once the password is set. */
  note?: ReactNode;
  /** Hears another link sent. */
  onResent?: () => void;
}) {
  const copy = useCopy();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body">{message}</p>
      <p className="text-body-sm text-muted-foreground">{sentTo}</p>
      {note}
      {canResend ? (
        <ResendLinkForm onResent={onResent} />
      ) : (
        <p className="text-body-sm">{copy.errors.RESEND_LIMIT_REACHED}</p>
      )}
    </div>
  );
}

/**
 * The link was asked for: what happens next, the masked address, another link while the recovery
 * may ask for one (once it may not, why), and always another email under it (C3).
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
      <LinkSentLines
        message={copy.auth.forgotPassword.sentMessage}
        sentTo={sentTo}
        canResend={canResend}
      />
      <Button variant="outline" className="w-full" onClick={enterEmailAgain}>
        {copy.auth.forgotPassword.useAnotherEmail}
      </Button>
    </CardContent>
  );
}
