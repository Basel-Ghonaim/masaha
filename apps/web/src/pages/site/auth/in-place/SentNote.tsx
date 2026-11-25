import { useCopy } from '@shared/copy';
import { Alert, AlertDescription } from '@shared/design-system';
import { isolate } from '@shared/localisation';
import { heldIntentPreview } from '@shared/routing';
import { useState } from 'react';
import type { SignInReason } from '../../public/signInView';

/**
 * With the link sent: once the new password is set, the guest is brought back to the space and its
 * action completes. Said only while this browser holds the action, which is what keeps the promise;
 * without it (storage blocked, its life over), nothing is promised.
 */
export function SentNote({ reason }: { reason: SignInReason }) {
  const words = useCopy().site.signInPrompt.sentNote;
  // This tab's own action, as the note shows: one another tab held over it is not this guest's.
  const [held] = useState(() => heldIntentPreview('tab'));

  if (held?.kind !== reason || held.name === undefined) return null;
  const space = isolate(held.name.text);

  return (
    <Alert>
      <AlertDescription>{words[reason]({ space })}</AlertDescription>
    </Alert>
  );
}
