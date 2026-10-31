import { useCopy } from '@shared/copy';
import { useAdminUsersList } from '../users-list/useAdminUsersList';

/**
 * The admin's owners page, ready to render: the users list with its role fixed to the owners, in
 * the owners list's words, with the line above it, its columns' names and the line of an owner
 * whose every space is deleted.
 */
export function useOwnersList() {
  const copy = useCopy();
  const lines = copy.spaceLinks.ownersList;

  return {
    ...useAdminUsersList({ fixedRole: 'owner', words: lines }),
    intro: lines.intro,
    columns: lines.columns,
    /** The empty list's way on: «إضافة مالك», the add sheet's own words (D6.11). */
    addOwner: copy.spaceLinks.addOwner.open,
    /** The line of an owner whose every space is deleted, which leads to the deleted spaces. */
    allSpacesDeleted: lines.allSpacesDeleted,
  };
}
