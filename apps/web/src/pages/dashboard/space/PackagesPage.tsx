import { PackagesSection } from '@features/packages';
import { useCopy } from '@shared/copy';
import { SpacePricesEditor, useSpaceShifts } from '@features/spaces';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useParams } from 'react-router';
import { spacePagePath } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

/**
 * The owner's «الباقات والأسعار»: at its top, that the desk sells the week and month prices too
 * (G21.1); the space's published prices, `spaces`' section on a page of its
 * own, then its private packages, `packages`' section, offered the space's shifts as `spaces` reads
 * them. Both lines for a space with no shift lead to the opening hours on the profile. The guard has
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
        // Another space is another page: nothing typed for one carries over to the next.
        <SpacePages key={spaceId} spaceId={spaceId} />
      )}
    </>
  );
}

/** One space's line, its prices, then its packages, offered the space's saved shifts. */
function SpacePages({ spaceId }: { spaceId: number }) {
  const hoursLink = `${spacePagePath(spaceId, 'profile')}#hours`;
  const shifts = useSpaceShifts('owner', spaceId);

  const copy = useCopy();

  return (
    <div className="flex flex-col gap-8">
      <p className="text-body-sm text-muted-foreground">{copy.packages.pageLine}</p>
      <SpacePricesEditor spaceId={spaceId} hoursLink={hoursLink} />
      <PackagesSection spaceId={spaceId} shifts={shifts} hoursLink={hoursLink} />
    </div>
  );
}
