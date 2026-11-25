import { useSession } from '@shared/session';
import { useState } from 'react';
import { SignInPrompt, type SignInReason } from './SignInPrompt';

/**
 * A page's sign-in for a guest's action: `signIn` shows it for a reason, with what lets the held
 * action go should the guest close it without signing in; `prompt` is the overlay to draw. Once a
 * session is held — signed in, registered or through Google over the page — it closes, the action
 * kept: the page stays, and the action runs there (ADR 0021, point 2).
 */
export function useSignInPrompt() {
  const [asked, setAsked] = useState<{ reason: SignInReason; cancel: () => void } | null>(null);
  const signedIn = useSession((session) => session.status === 'authenticated');
  // Closed as the session arrives, before the page draws again under it.
  if (signedIn && asked !== null) {
    setAsked(null);
  }

  return {
    signIn: (reason: SignInReason, cancel: () => void) => {
      setAsked({ reason, cancel });
    },
    prompt: (
      <SignInPrompt
        reason={asked?.reason ?? null}
        onClose={() => {
          asked?.cancel();
          setAsked(null);
        }}
      />
    ),
  };
}
