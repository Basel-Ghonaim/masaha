import { SpacePricesEditor } from '@features/spaces';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useParams } from 'react-router';
import { spacePagePath } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

/**
 * The owner's «الباقات والأسعار»: the space's published prices, `spaces`' section on a page of its
 * own, whose line for a space with no shift leads to the opening hours on the profile. The guard has
 * checked the space's id and the owner's role.
 */
export function PackagesPage() {
  const spaceId = parseSpaceId(useParams().spaceId);

  return (
    <>
      <PageHeader />
      {spaceId === undefined ? (
        <NotFoundState />
      ) : (
        // Another space is another form: nothing typed for one carries over to the next.
        <SpacePricesEditor
          key={spaceId}
          spaceId={spaceId}
          hoursLink={`${spacePagePath(spaceId, 'profile')}#hours`}
        />
      )}
    </>
  );
}
