import type { AdminUserRow } from '@masaha/shared/space-links';
import { useUserLinkActions, type UserLinkDialogState } from '@features/space-links';
import { useAccountActions, type AccountDialogState, type AccountPerson } from '@features/users';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EllipsisVerticalIcon,
} from '@shared/design-system';
import type { Ref } from 'react';
import { ADMIN_DELETED_SPACES_PATH, adminOwnersSearchPath } from '../navigation';
import { MenuActionItem } from './MenuActionItem';

/** `users`' own facts of the person, never `space-links`' row. */
function accountPersonOf(row: AdminUserRow): AccountPerson {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    isSuspended: row.isSuspended,
    hasPassword: row.signIn.password,
    // An owner whose every space is deleted has none left to stay verified.
    ownsSpaces: row.spaces.length > 0,
    atDesk: row.receptionSpaces.length > 0,
  };
}

/**
 * A person's row menu on the users page, composed here from the capabilities that own its actions:
 * `space-links`' role change (first, with its way out when it is held) and link to a space, and
 * `users`' temporary password, which asks first; then, after a separator, `users`' suspension
 * (destructive, asking first) or restore (at once). A held
 * owner's role leads to the owners page searched by their email, where their unlinks are, or to the
 * deleted spaces.
 *
 * An item's dialog opens where the page holds it (`openLink`, `openAccount`), not in the row, so it
 * outlives the closed menu and the row; the menu's button is the page's to find again
 * (`triggerRef`), where the focus returns once the dialog closes.
 */
export function UserActionsMenu({
  row,
  openLink,
  openAccount,
  triggerRef,
}: {
  row: AdminUserRow;
  openLink: (dialog: UserLinkDialogState) => void;
  openAccount: (dialog: AccountDialogState) => void;
  triggerRef: Ref<HTMLButtonElement>;
}) {
  const links = useUserLinkActions(row, {
    ownersLink: adminOwnersSearchPath(row.email),
    deletedSpacesLink: ADMIN_DELETED_SPACES_PATH,
    open: openLink,
  });
  const account = useAccountActions(accountPersonOf(row), { open: openAccount });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="ghost" size="icon" aria-label={links.trigger.label}>
          <EllipsisVerticalIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <MenuActionItem item={links.role} />
        <MenuActionItem item={links.link} />
        <MenuActionItem item={account.issue} />
        <DropdownMenuSeparator />
        <MenuActionItem item={account.state} destructive={account.state.destructive} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
