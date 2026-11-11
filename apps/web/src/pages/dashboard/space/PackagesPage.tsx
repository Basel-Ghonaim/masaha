import { ReportNotice, reportIdOf, useReportNotice } from '@features/data-reports';
import { PackagesSection } from '@features/packages';
import { useCopy } from '@shared/copy';
import { SpacePricesCard, useSpaceShifts } from '@features/spaces';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useParams, useSearchParams } from 'react-router';
import { spacePagePath } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

/**
 * The owner's «الباقات والأسعار»: at its top, that the desk sells the week and month prices too
 * (G21.1); the space's published prices, read-only, edited in the profile only (R1, `spaces`' card),
 * then its private packages, `packages`' section, offered the space's shifts as `spaces` reads them;
 * its line for a space with no shift opens the profile's shifts. A prices report the address names
 * (`?report=`) shows its notice above the prices (D6.8). The guard has checked the space's id and the
 * owner's role.
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
  const profile = spacePagePath(spaceId, 'profile');
  const shiftsLink = `${profile}?sheet=shifts#shifts`;
  const shifts = useSpaceShifts('owner', spaceId);

  const copy = useCopy();
  const [params] = useSearchParams();
  const notice = useReportNotice(
    { audience: 'owner', spaceId, reportsPath: spacePagePath(spaceId, 'dataReports') },
    reportIdOf(params.get('report')),
  );

  return (
    <div className="flex flex-col gap-8">
      <p className="text-body-sm text-muted-foreground">{copy.packages.pageLine}</p>
      {notice?.section === 'prices' && <ReportNotice view={notice} />}
      <SpacePricesCard spaceId={spaceId} editLink={`${profile}?sheet=prices#prices`} />
      <PackagesSection spaceId={spaceId} shifts={shifts} hoursLink={shiftsLink} />
    </div>
  );
}
