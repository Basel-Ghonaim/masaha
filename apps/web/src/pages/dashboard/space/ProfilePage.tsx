import { ReportNotice, reportIdOf, useReportNotice } from '@features/data-reports';
import { AmenityChecklist, AreaCombobox, AreaLine, useAmenityCatalogue } from '@features/lookups';
import { usePackageShiftIds } from '@features/packages';
import {
  SpaceEditor,
  type AmenitiesField,
  type AreaField,
  type AreaLine as AreaLineSlot,
  type SectionId,
} from '@features/spaces';
import { NotFoundState, parseSpaceId, publicSpacePath } from '@shared/routing';
import { useParams, useSearchParams } from 'react-router';
import { spacePagePath } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

/** The area field, searched, from `lookups`' public catalogue, made once so the form keeps it. */
const areaField: AreaField = (props) => <AreaCombobox source="public" {...props} />;

/** The area with its governorate, from the public catalogue, for the header and «الموقع». */
const areaLine: AreaLineSlot = (areaId) => <AreaLine areaId={areaId} source="public" />;

/** The amenities to tick, from `lookups`' public catalogue, made once as the area field is. */
const amenitiesField: AmenitiesField = (props) => <AmenityChecklist source="public" {...props} />;

/**
 * The owner's «ملف المساحة»: the profile of `spaces` on the owner's place, its calls on the managed
 * routes, with the public lists of `lookups` (an owner is refused the admin's), the way to a closure
 * announcement, and the shifts the space's packages use (`packages`). A report the address names
 * (`?report=`) shows its notice, from `data-reports`, inside the section its field is edited in. The
 * guard has checked the space's id and the owner's role.
 */
export function ProfilePage() {
  const spaceId = parseSpaceId(useParams().spaceId);

  return (
    <>
      <PageHeader />
      {spaceId === undefined ? (
        <NotFoundState />
      ) : (
        // Another space is another profile: nothing typed for one carries over to the next.
        <Profile key={spaceId} spaceId={spaceId} />
      )}
    </>
  );
}

/** One space's profile, with the notice of the report the address names. */
function Profile({ spaceId }: { spaceId: number }) {
  const [params] = useSearchParams();
  const notice = useReportNotice(
    { audience: 'owner', spaceId, reportsPath: spacePagePath(spaceId, 'dataReports') },
    reportIdOf(params.get('report')),
  );
  const noticeFor = (section: SectionId) =>
    notice?.section === section ? <ReportNotice view={notice} /> : null;
  const packageShifts = usePackageShiftIds(spaceId);
  const catalogue = useAmenityCatalogue('public');

  return (
    <SpaceEditor
      spaceId={spaceId}
      place={{
        kind: 'owner',
        closureLink: spacePagePath(spaceId, 'announcements'),
        packageShifts,
      }}
      areaField={areaField}
      areaLine={areaLine}
      amenitiesField={amenitiesField}
      amenityCatalogue={catalogue}
      publicLink={publicSpacePath}
      noticeFor={noticeFor}
    />
  );
}
