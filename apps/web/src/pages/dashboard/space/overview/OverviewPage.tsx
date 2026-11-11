import { LiveStatusControl } from '@features/occupancy';
import { OwnerOverview, type OwnerOverviewLinks } from '@features/overview';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useParams } from 'react-router';
import { ownerGroupLink } from '../../fieldSections';
import { spaceCustomerPath, spacePagePath } from '../../navigation';
import { PageHeader } from '../../shell/PageHeader';

/** Where the owner's overview leads, each the page that acts on what it counts (D5.1). */
function linksOf(spaceId: number): OwnerOverviewLinks {
  const page = (name: Parameters<typeof spacePagePath>[1]) => spacePagePath(spaceId, name);
  return {
    group: (group) => ownerGroupLink(spaceId, group),
    reports: `${page('dataReports')}?status=open`,
    desk: `${page('desk')}#uncollected`,
    deskUnpriced: `${page('desk')}#unpriced`,
    debts: `${page('finance')}?tab=debts`,
    announcements: page('announcements'),
    capacity: `${page('settings')}#attendance`,
    presentNow: page('desk'),
    endingAll: `${page('customers')}?status=ENDING_SOON`,
    customer: (customerId) => spaceCustomerPath(spaceId, customerId),
  };
}

/**
 * «نظرة عامة», the owner's (screen 12): in the top bar, the live status visitors see and its control,
 * as the desk's (P2); then `overview`'s work queue of the space, every link this page's. Reception is
 * refused by the guard (OV3), which has checked the space's id and the role.
 */
export function OverviewPage() {
  const spaceId = parseSpaceId(useParams().spaceId);

  if (spaceId === undefined) {
    return (
      <>
        <PageHeader />
        <NotFoundState />
      </>
    );
  }
  return (
    <>
      <PageHeader>
        <div className="ms-auto flex items-center gap-2">
          <LiveStatusControl spaceId={spaceId} />
        </div>
      </PageHeader>
      {/* Another space is another overview: nothing shown for one carries over to the next. */}
      <OwnerOverview key={spaceId} spaceId={spaceId} links={linksOf(spaceId)} />
    </>
  );
}
