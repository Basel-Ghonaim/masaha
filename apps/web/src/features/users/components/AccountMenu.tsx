import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
} from '@shared/design-system';
import type { SessionUser } from '@shared/session';
import { useAccount, type AccountMenuLink } from '../hooks/useAccount';
import { AccountMenuContent } from './AccountMenuContent';

/**
 * The signed-in user in a desktop header: the avatar and the first name, opening the account menu
 * (`AccountMenuContent`). `dashboardPath` is where its way into the dashboard leads; `links`, the
 * account's pages the shell offers.
 */
export function AccountMenu({
  user,
  dashboardPath,
  links,
  className,
}: {
  user: SessionUser;
  dashboardPath: string;
  links?: readonly AccountMenuLink[];
  className?: string;
}) {
  const account = useAccount(user, links);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={className} aria-label={account.menuLabel}>
          <Avatar size="sm" aria-hidden>
            <AvatarFallback>{account.initial}</AvatarFallback>
          </Avatar>
          <bdi>{account.firstName}</bdi>
        </Button>
      </DropdownMenuTrigger>
      <AccountMenuContent account={account} dashboardPath={dashboardPath} />
    </DropdownMenu>
  );
}
