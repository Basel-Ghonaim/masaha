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
 * The signed-in user where room is short, as in the dashboard's top bar: the avatar alone, named for
 * the account, opening the same account menu (`AccountMenuContent`).
 */
export function CompactAccountMenu({
  user,
  dashboardPath,
}: {
  user: SessionUser;
  dashboardPath: string;
}) {
  const account = useAccount(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={account.menuLabel}>
          <Avatar size="sm" aria-hidden>
            <AvatarFallback>{account.initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <AccountMenuContent account={account} dashboardPath={dashboardPath} />
    </DropdownMenu>
  );
}
