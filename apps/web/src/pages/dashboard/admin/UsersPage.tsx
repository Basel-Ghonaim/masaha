import { UserLinkDialog, UsersList, useUserLinkDialog } from '@features/space-links';
import { useCallback, type ComponentProps } from 'react';
import { ADMIN_DELETED_SPACES_PATH } from '../navigation';
import { PageHeader } from '../shell/PageHeader';
import { UserActionsMenu } from './UserActionsMenu';
import { useRowTriggers } from './useRowTriggers';

type RowActions = ComponentProps<typeof UsersList>['actions'];

/**
 * The admin's users: the page's title, then the users list of `space-links`, each row's menu
 * composed here, and an owner whose every space is deleted leading to the deleted spaces.
 *
 * The page holds the dialog a row's menu opens, above the list: a row is drawn again when the
 * admin's views arrive after an action, and a card becomes a table row when the width crosses
 * 1024 px, and neither may close an open dialog. Closed, the focus returns to the person's menu
 * button as it is then.
 */
export function UsersPage() {
  const links = useUserLinkDialog();
  const triggers = useRowTriggers();
  const openLink = links.open;

  // The rows' menus, made once: the list keeps its rows from one render to the next.
  const userActions = useCallback<RowActions>(
    (row) => (
      <UserActionsMenu row={row} openLink={openLink} triggerRef={triggers.register(row.id)} />
    ),
    [openLink, triggers],
  );

  return (
    <>
      <PageHeader />
      <UsersList actions={userActions} deletedSpacesLink={ADMIN_DELETED_SPACES_PATH} />
      {links.dialog !== null && (
        <UserLinkDialog
          dialog={links.dialog}
          onClose={links.close}
          returnFocus={triggers.focusOf(links.dialog.personId)}
        />
      )}
    </>
  );
}
