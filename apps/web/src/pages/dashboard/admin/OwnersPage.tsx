import { AddOwner, OwnersList, type TemporaryPasswordSlot } from '@features/space-links';
import { recordAdminHandover, TemporaryPasswordDialog } from '@features/users';
import { ADMIN_DELETED_SPACES_PATH } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

/**
 * The admin's space owners: the page's title, then the owners list of `space-links`, an owner whose
 * every space is deleted leading to the deleted spaces, where the restore begins. Adding an owner
 * sits above the list, at its end.
 */
const temporaryPassword: TemporaryPasswordSlot = (added, done, returnFocus) => (
  <TemporaryPasswordDialog
    kind="created"
    returnFocus={returnFocus}
    person={{ userId: added.userId, name: added.name, email: added.email }}
    password={added.temporaryPassword}
    recordHandover={recordAdminHandover}
    onDone={done}
  />
);

export function OwnersPage() {
  return (
    <>
      <PageHeader />
      <div className="flex justify-end">
        <AddOwner temporaryPassword={temporaryPassword} />
      </div>
      <OwnersList deletedSpacesLink={ADMIN_DELETED_SPACES_PATH} />
    </>
  );
}
