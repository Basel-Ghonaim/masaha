import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  LayoutDashboardIcon,
  LoaderIcon,
  LogOutIcon,
} from '@shared/design-system';
import { Link } from 'react-router';
import type { useAccount } from '../hooks/useAccount';
import { SignOutFailure } from './SignOutFailure';

/**
 * The account menu's open panel, whatever its trigger: the name, the email, the way into the
 * dashboard for those who have one, and sign-out. The menu stays open while the server signs out,
 * so a failure shows in it.
 */
export function AccountMenuContent({
  account,
  dashboardPath,
}: {
  account: ReturnType<typeof useAccount>;
  dashboardPath: string;
}) {
  return (
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>
        <span className="flex flex-col">
          <span>
            <bdi>{account.name}</bdi>
          </span>
          <span className="text-caption text-muted-foreground">
            <bdi dir="ltr">{account.email}</bdi>
          </span>
        </span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {account.showsDashboard && (
        <>
          <DropdownMenuItem asChild>
            <Link to={dashboardPath}>
              <LayoutDashboardIcon aria-hidden />
              {account.dashboardLabel}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuItem
        disabled={account.isPending}
        onSelect={(event) => {
          event.preventDefault();
          account.signOut();
        }}
      >
        {account.isPending ? (
          <LoaderIcon aria-hidden className="motion-safe:animate-spin" />
        ) : (
          <LogOutIcon aria-hidden />
        )}
        {account.signOutLabel}
      </DropdownMenuItem>
      {account.failure && (
        <div className="px-2 py-1.5">
          <SignOutFailure failure={account.failure} />
        </div>
      )}
    </DropdownMenuContent>
  );
}
