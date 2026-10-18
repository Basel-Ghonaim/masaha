import { AddOwner, OwnersList, type AddedOwnerView } from '@features/space-links';
import { TemporaryPasswordDialog } from '@features/users';
import { ADMIN_DELETED_SPACES_PATH } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

/**
 * The admin's space owners: the page's title, then the owners list of `space-links`, an owner whose
 * every space is deleted leading to the deleted spaces, where the restore begins. Adding an owner
 * sits above the list, at its end.
 */
const temporaryPassword = (added: AddedOwnerView, done: () => void) => (
  <TemporaryPasswordDialog
    person={{ userId: added.userId, name: added.name, email: added.email }}
    password={added.temporaryPassword}
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
