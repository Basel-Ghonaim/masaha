import { SpaceSettingsCards } from '@features/space-settings';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useParams } from 'react-router';
import { spacePagePath } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

/**
 * The owner's «الإعدادات»: the space's settings, the cards of `space-settings` in one column, visit
 * pricing leading to Packages & prices, where the prices it works from are. The guard has checked
 * the space's id and the owner's role.
 */
export function SettingsPage() {
  const spaceId = parseSpaceId(useParams().spaceId);

  return (
    <>
      <PageHeader />
      {spaceId === undefined ? (
        <NotFoundState />
      ) : (
        // Another space is another page: nothing typed for one carries over to the next.
        <div key={spaceId} className="flex max-w-3xl flex-col gap-6">
          <SpaceSettingsCards spaceId={spaceId} pricesLink={spacePagePath(spaceId, 'packages')} />
        </div>
      )}
    </>
  );
}
