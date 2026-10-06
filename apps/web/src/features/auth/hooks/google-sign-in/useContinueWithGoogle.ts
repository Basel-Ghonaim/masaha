import { usePreferences } from '@shared/preferences';
import { useGoogleButton } from './useGoogleButton';
import { useGoogleFailure } from './useGoogleFailure';
import { useGoogleSignIn } from './useGoogleSignIn';

/**
 * Google sign-in, ready for `ContinueWithGoogle` to render: whether it is offered, the element Google
 * draws its button into, whether to show it, why it failed, and whether it is busy (a sign-in under
 * way, or the wait after too many attempts). The ID token Google returns is sent with the interface
 * language, so an account it creates starts in it.
 */
export function useContinueWithGoogle() {
  const language = usePreferences((preferences) => preferences.language);
  const signIn = useGoogleSignIn();
  const button = useGoogleButton((idToken) => {
    signIn.mutate({ idToken, language });
  });
  const failure = useGoogleFailure(signIn.error, button.status === 'failed');

  return {
    available: button.available,
    buttonRef: button.ref,
    showButton: button.status !== 'failed',
    failure: failure.view,
    busy: signIn.isPending || failure.blocked,
  };
}
