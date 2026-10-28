import { AnnouncementsList } from '@features/announcements';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useSession } from '@shared/session';
import { useParams } from 'react-router';
import { PageHeader } from '../../shell/PageHeader';

/**
 * «الإعلانات», the owner's and reception's: `announcements`' list of the space's announcements by
 * state. Whether it is the owner's is read from the session's link at the space in the address (S5);
 * the server decides every write. The guard has checked the space's id and the role.
 */
export function AnnouncementsPage() {
  const spaceId = parseSpaceId(useParams().spaceId);
  const owner = useSession(
    (session) => session.user?.spaces.find((link) => link.spaceId === spaceId)?.role === 'OWNER',
  );

  return (
    <>
      <PageHeader />
      {spaceId === undefined ? (
        <NotFoundState />
      ) : (
        // Another space is another list: nothing shown for one carries over to the next.
        <AnnouncementsList key={spaceId} spaceId={spaceId} owner={owner} />
      )}
    </>
  );
}
