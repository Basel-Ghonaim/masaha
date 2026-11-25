import { useCopy } from '@shared/copy';
import { Alert, AlertDescription, AlertTitle, CircleCheckIcon } from '@shared/design-system';

/**
 * Over the sign-in once a reset completed in another tab of this browser (A1): the password was
 * changed, every device signed out, and the new password is what to sign in with.
 */
export function ChangedNotice() {
  const words = useCopy().site.signInPrompt.changed;

  return (
    <Alert icon={<CircleCheckIcon aria-hidden className="text-success" />}>
      <AlertTitle>{words.title}</AlertTitle>
      <AlertDescription>{words.text}</AlertDescription>
    </Alert>
  );
}
