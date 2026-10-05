import { Button, LayoutDashboardIcon, LogOutIcon } from '@shared/design-system';
import type { SessionUser } from '@shared/session';
import { Link } from 'react-router';
import { useAccount } from '../hooks/useAccount';
import { SignOutFailure } from './SignOutFailure';

/**
 * The signed-in user in a phone menu: the name, the way into the dashboard (`dashboardPath`) for those
 * who have one, and sign-out with its pending and error states.
 */
export function AccountMenuSection({
  user,
  dashboardPath,
}: {
  user: SessionUser;
  dashboardPath: string;
}) {
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
      {account.showsDashboard && (
        <Button asChild variant="ghost" className="w-full justify-start">
          <Link to={dashboardPath}>
            <LayoutDashboardIcon aria-hidden />
            {account.dashboardLabel}
          </Link>
        </Button>
      )}
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
