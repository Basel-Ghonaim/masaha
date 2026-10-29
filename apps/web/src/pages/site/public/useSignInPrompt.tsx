import { useState } from 'react';
import { SignInPrompt, type SignInReason } from './SignInPrompt';

/**
 * A page's sign-in for a guest's action: `signIn` shows it for a reason, with what lets the held
 * action go should the guest close it without going on; `prompt` is the dialog to draw.
 */
export function useSignInPrompt() {
  const [asked, setAsked] = useState<{ reason: SignInReason; cancel: () => void } | null>(null);

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
