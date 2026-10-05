import { Button, LogOutIcon } from '@shared/design-system';
import { useSignOutAction } from '../hooks/useSignOutAction';
import { SignOutFailure } from './SignOutFailure';

/**
 * Sign-out on its own, for a shell that offers nothing else of the account, such as the forced
 * password change's header: the button with its pending state, and why it failed beneath it.
 */
export function SignOutButton() {
  const { signOutLabel, signOut, isPending, failure } = useSignOutAction();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="ghost" size="sm" loading={isPending} onClick={signOut}>
        {!isPending && <LogOutIcon aria-hidden />}
        {signOutLabel}
      </Button>
      {failure && <SignOutFailure failure={failure} />}
    </div>
  );
}
