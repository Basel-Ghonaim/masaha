import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
} from '@shared/design-system';
import type { SessionUser } from '@shared/session';
import { useAccount } from '../hooks/useAccount';
import { AccountMenuContent } from './AccountMenuContent';

/**
 * The signed-in user in a desktop header: the avatar and the first name, opening the account menu
 * (`AccountMenuContent`). `dashboardPath` is where its way into the dashboard leads.
 */
export function AccountMenu({
  user,
  dashboardPath,
  className,
}: {
  user: SessionUser;
  dashboardPath: string;
  className?: string;
}) {
  const account = useAccount(user);

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
