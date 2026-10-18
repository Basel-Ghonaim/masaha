import { OwnersList } from '@features/space-links';
import { ADMIN_DELETED_SPACES_PATH } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

/**
 * The admin's space owners: the page's title, then the owners list of `space-links`, an owner whose
 * every space is deleted leading to the deleted spaces, where the restore begins.
 */
export function OwnersPage() {
  return (
    <>
      <PageHeader />
      <OwnersList deletedSpacesLink={ADMIN_DELETED_SPACES_PATH} />
    </>
  );
}
