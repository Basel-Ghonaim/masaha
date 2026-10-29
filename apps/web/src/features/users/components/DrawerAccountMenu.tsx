import {
  Avatar,
  AvatarFallback,
  Button,
  ChevronsUpDownIcon,
  DropdownMenu,
  DropdownMenuTrigger,
} from '@shared/design-system';
import type { SessionUser } from '@shared/session';
import { useAccount } from '../hooks/useAccount';
import { AccountMenuContent } from './AccountMenuContent';

/**
 * The signed-in user at the head of the dashboard's drawer on a phone (DI-10): a full-width row — the
 * avatar, the name and the `role` on one line, the email under it — opening the dashboard's account
 * menu. The theme and the language are the drawer's foot's.
 */
export function DrawerAccountMenu({ user, role }: { user: SessionUser; role?: string }) {
  const account = useAccount(user, [], role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-3 px-2 py-2 text-start"
          aria-label={account.menuLabel}
        >
          <Avatar size="sm" aria-hidden>
            <AvatarFallback>{account.initial}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-label">
              <bdi>{account.label}</bdi>
            </span>
            <span className="truncate text-caption text-muted-foreground">
              <bdi dir="ltr">{account.email}</bdi>
            </span>
          </span>
          <ChevronsUpDownIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <AccountMenuContent account={account} place={{ in: 'dashboard' }} />
    </DropdownMenu>
  );
}
