import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
} from '@shared/design-system';
import type { SessionUser } from '@shared/session';
import { useAccount } from '../../hooks/account/useAccount';
import { AccountMenuContent } from './AccountMenuContent';

/**
 * The signed-in user in the dashboard's top bar, from 768 px: the avatar alone, named for the account,
 * opening the dashboard's account menu (`AccountMenuContent`), its label naming the `role` the shell
 * passes.
 */
export function CompactAccountMenu({ user, role }: { user: SessionUser; role?: string }) {
  const account = useAccount(user, [], role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={account.menuLabel}>
          <Avatar size="sm" aria-hidden>
            <AvatarFallback>{account.initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <AccountMenuContent account={account} place={{ in: 'dashboard' }} />
    </DropdownMenu>
  );
}
