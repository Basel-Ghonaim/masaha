import { MyPaymentsToday } from '@features/payments';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useParams } from 'react-router';
import { PageHeader } from '../../shell/PageHeader';

/**
 * «دفعاتي اليوم», reception's: `payments`' own payments of today and the handover's figures, as the
 * server answers reception at the space. The guard has checked the space's id and reception's role.
 */
export function MyPaymentsPage() {
  const spaceId = parseSpaceId(useParams().spaceId);

  return (
    <>
      <PageHeader />
      {spaceId === undefined ? (
        <NotFoundState />
      ) : (
        // Another space is another list: nothing shown for one carries over to the next.
        <MyPaymentsToday key={spaceId} spaceId={spaceId} />
      )}
    </>
  );
}
