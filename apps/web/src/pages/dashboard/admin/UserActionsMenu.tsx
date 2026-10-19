import type { AdminUserRow } from '@masaha/shared/space-links';
import { useUserLinkActions, type UserLinkDialogState } from '@features/space-links';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  EllipsisVerticalIcon,
} from '@shared/design-system';
import type { Ref } from 'react';
import { MenuActionItem } from './MenuActionItem';

/**
 * A person's row menu on the users page, composed here from the capabilities that own its actions:
 * `space-links`' link to a space. An item's dialog opens where the page holds it (`openLink`), not
 * in the row, so it outlives the closed menu and the row; the menu's button is the page's to find
 * again (`triggerRef`), where the focus returns once the dialog closes.
 */
export function UserActionsMenu({
  row,
  openLink,
  triggerRef,
}: {
  row: AdminUserRow;
  openLink: (dialog: UserLinkDialogState) => void;
  triggerRef: Ref<HTMLButtonElement>;
}) {
  const links = useUserLinkActions(row, { open: openLink });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="ghost" size="icon" aria-label={links.trigger.label}>
          <EllipsisVerticalIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <MenuActionItem item={links.link} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
