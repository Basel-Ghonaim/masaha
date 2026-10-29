import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  LayoutDashboardIcon,
  LoaderIcon,
  LogOutIcon,
  SettingsIcon,
  StoreIcon,
} from '@shared/design-system';
import { ACCOUNT_SETTINGS_PATH } from '@shared/routing';
import { Link } from 'react-router';
import { ACCOUNT_LINK_ICONS } from './accountLinkIcons';
import type { useAccount } from '../hooks/useAccount';
import { SignOutFailure } from './SignOutFailure';

/** Where the menu is opened: the site's header, or the dashboard's bar and drawer. */
export type AccountMenuPlace = { in: 'site'; dashboardPath: string } | { in: 'dashboard' };

/**
 * The account menu's open panel, whatever its trigger (P4): the name (with the role the dashboard's
 * shell passes) and the email; then, on the site, the way into the dashboard for those who have one
 * and the account's pages the shell passes; in the dashboard, the public site and the account's
 * settings; then sign-out. The menu stays open while the server signs out, so a failure shows in it.
 */
export function AccountMenuContent({
  account,
  place,
}: {
  account: ReturnType<typeof useAccount>;
  place: AccountMenuPlace;
}) {
  return (
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>
        <span className="flex flex-col">
          <span>
            <bdi>{account.label}</bdi>
          </span>
          <span className="text-caption text-muted-foreground">
            <bdi dir="ltr">{account.email}</bdi>
          </span>
        </span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {place.in === 'site' ? (
        <>
          {account.showsDashboard && (
            <DropdownMenuItem asChild>
              <Link to={place.dashboardPath}>
                <LayoutDashboardIcon aria-hidden />
                {account.dashboardLabel}
              </Link>
            </DropdownMenuItem>
          )}
          {account.links.map((link) => {
            const LinkIcon = ACCOUNT_LINK_ICONS[link.key];
            return (
              <DropdownMenuItem key={link.key} asChild>
                <Link to={link.to}>
                  <LinkIcon aria-hidden />
                  {link.label}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </>
      ) : (
        <>
          <DropdownMenuItem asChild>
            <Link to="/">
              <StoreIcon aria-hidden />
              {account.publicSiteLabel}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={ACCOUNT_SETTINGS_PATH}>
              <SettingsIcon aria-hidden />
              {account.settingsLabel}
            </Link>
          </DropdownMenuItem>
        </>
      )}
      <DropdownMenuSeparator />
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
