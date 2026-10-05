import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  LoaderIcon,
  LogOutIcon,
} from '@shared/design-system';
import type { SessionUser } from '@shared/session';
import { useAccount } from '../hooks/useAccount';
import { SignOutFailure } from './SignOutFailure';

/**
 * The signed-in user in a desktop header: the avatar and the first name, opening a menu with the
 * name, the email, and sign-out. The menu stays open while the server signs out, so a failure shows
 * in it.
 */
export function AccountMenu({ user, className }: { user: SessionUser; className?: string }) {
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
    </DropdownMenu>
  );
}
