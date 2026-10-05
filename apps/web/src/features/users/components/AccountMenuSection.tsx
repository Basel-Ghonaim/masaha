import { Button, LogOutIcon } from '@shared/design-system';
import type { SessionUser } from '@shared/session';
import { useAccount } from '../hooks/useAccount';
import { SignOutFailure } from './SignOutFailure';

/** The signed-in user in a phone menu: the name, and sign-out with its pending and error states. */
export function AccountMenuSection({ user }: { user: SessionUser }) {
  const account = useAccount(user);

  return (
    <div
      role="group"
      aria-label={account.sectionLabel}
      className="flex flex-col gap-1 border-t border-border pt-4"
    >
      <p className="px-3 pb-2 text-label">
        <bdi>{account.name}</bdi>
      </p>
      <Button
        variant="ghost"
        className="w-full justify-start"
        loading={account.isPending}
        onClick={account.signOut}
      >
        {!account.isPending && <LogOutIcon aria-hidden />}
        {account.signOutLabel}
      </Button>
      {account.failure && (
        <div className="px-3">
          <SignOutFailure failure={account.failure} />
        </div>
      )}
    </div>
  );
}
