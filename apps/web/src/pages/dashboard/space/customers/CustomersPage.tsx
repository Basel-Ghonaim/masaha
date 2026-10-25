import { CustomersList } from '@features/desk';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useSession } from '@shared/session';
import { useCallback } from 'react';
import { useParams } from 'react-router';
import { spaceCustomerPath } from '../../navigation';
import { PageHeader } from '../../shell/PageHeader';

/**
 * «الزبائن», the owner's and reception's: `desk`'s customers list, each name a link to the
 * customer's file below this page. Whether the list offers «مؤرشف» is read from the session's link
 * at the space in the address (S5); the server decides. The guard has checked the space's id and
 * the role.
 */
export function CustomersPage() {
  const spaceId = parseSpaceId(useParams().spaceId);
  const owner = useSession(
    (session) => session.user?.spaces.find((link) => link.spaceId === spaceId)?.role === 'OWNER',
  );
  // Made once per space: a new one would draw every row of the table anew.
  const fileLink = useCallback(
    (customerId: number) => spaceCustomerPath(spaceId ?? 0, customerId),
    [spaceId],
  );

  return (
    <>
      <PageHeader />
      {spaceId === undefined ? (
        <NotFoundState />
      ) : (
        // Another space is another list: nothing typed for one carries over to the next.
        <CustomersList key={spaceId} spaceId={spaceId} owner={owner} fileLink={fileLink} />
      )}
    </>
  );
}
