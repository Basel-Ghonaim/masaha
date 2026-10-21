import { useMySpacesQuery } from '@features/space-links';
import { SpaceSettingsCards } from '@features/space-settings';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useParams } from 'react-router';
import { spacePagePath } from '../navigation';
import { PageHeader } from '../shell/PageHeader';
import { AttendanceCard } from './settings/AttendanceCard';

/**
 * The owner's «الإعدادات»: first the attendance card, composed here from `occupancy`'s capacity and
 * `space-settings`' check-out settings, then the cards of `space-settings` in one column, visit
 * pricing leading to Packages & prices, where the prices it works from are, and the reminder's
 * preview naming the space as `space-links` lists it, by its Arabic name when it has one. The guard
 * has checked the space's id and the owner's role.
 */
export function SettingsPage() {
  const spaceId = parseSpaceId(useParams().spaceId);
  const space = useMySpacesQuery().data?.find((one) => one.spaceId === spaceId);
  const spaceName = space === undefined ? '' : (space.nameAr ?? space.nameEn);

  return (
    <>
      <PageHeader />
      {spaceId === undefined ? (
        <NotFoundState />
      ) : (
        // Another space is another page: nothing typed for one carries over to the next.
        <div key={spaceId} className="flex max-w-3xl flex-col gap-6">
          <AttendanceCard spaceId={spaceId} />
          <SpaceSettingsCards
            spaceId={spaceId}
            pricesLink={spacePagePath(spaceId, 'packages')}
            spaceName={spaceName}
          />
        </div>
      )}
    </>
  );
}
