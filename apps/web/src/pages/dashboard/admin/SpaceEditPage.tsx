import { ReportNotice, reportIdOf, useReportNotice } from '@features/data-reports';
import { AmenityChecklist, AreaCombobox, AreaLine, useAmenityCatalogue } from '@features/lookups';
import { SpaceOwnersActions } from '@features/space-links';
import {
  SpaceEditor,
  useSpaceName,
  type AdminPlace,
  type AmenitiesField,
  type AreaField,
  type AreaLine as AreaLineSlot,
  type SectionId,
} from '@features/spaces';
import { useCopy } from '@shared/copy';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@shared/design-system';
import {
  DASHBOARD_PATHS,
  NotFoundState,
  parseSpaceId,
  publicSpacePath,
  useRecordTitle,
} from '@shared/routing';
import { Link, useParams, useSearchParams } from 'react-router';
import { ADMIN_AMENITIES_PATH, ADMIN_OWNERS_PATH, ADMIN_SPACES_PATH } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

/** The admin's reports list. */
const ADMIN_REPORTS_PATH = `${DASHBOARD_PATHS.admin}/reports`;

/** The profile's area field, searched, from `lookups`, made once so the form keeps it. */
const areaField: AreaField = (props) => <AreaCombobox source="admin" {...props} />;

/** The area with its governorate, from the admin's lists, a hidden area named too. */
const areaLine: AreaLineSlot = (areaId) => <AreaLine areaId={areaId} source="admin" />;

/** The platform's amenities to tick, from `lookups`, made once as the area field is. */
const amenitiesField: AmenitiesField = (props) => <AmenityChecklist source="admin" {...props} />;

/**
 * The admin's place: the space's owners' actions, from `space-links` — the unlink in a verified
 * space's notice, the link in an unverified one's header — the way to the amenities' tab, and to the
 * space's reports, made once as the fields are.
 */
const place: AdminPlace = {
  kind: 'admin',
  // «مالك جديد بلا حساب؟» opens the owners page's add sheet (`?sheet=add`, D6.11).
  ownerActions: (space) => (
    <SpaceOwnersActions space={space} addOwnerLink={`${ADMIN_OWNERS_PATH}?sheet=add`} />
  ),
  amenitiesListLink: ADMIN_AMENITIES_PATH,
  reportsLink: (spaceId) => `${ADMIN_REPORTS_PATH}?space=${String(spaceId)}`,
};

/**
 * The admin's space editor, the space profile on the admin's place (G5): titled by its name once it
 * has loaded, with the trail back to the spaces list, then the profile of `spaces` with the fields of
 * `lookups` and the way to its amenities' tab. An id that names no space shows the 404. The owners'
 * actions of `space-links` unlink a verified space's owners, or link one to an unverified space, a
 * new owner being added on the owners page. A report the address names (`?report=`) shows its notice,
 * from `data-reports`, inside its field's section (D6.8).
 */
export function SpaceEditPage() {
  const spaceId = parseSpaceId(useParams().spaceId);
  // Another space is another editor: nothing typed for one carries over to the next.
  return spaceId === undefined ? <NotFoundState /> : <SpaceEdit key={spaceId} spaceId={spaceId} />;
}

function SpaceEdit({ spaceId }: { spaceId: number }) {
  const copy = useCopy();
  const name = useSpaceName(spaceId);
  useRecordTitle(name);
  const [params] = useSearchParams();
  const notice = useReportNotice(
    { audience: 'admin', spaceId, reportsPath: ADMIN_REPORTS_PATH },
    reportIdOf(params.get('report')),
  );
  const noticeFor = (section: SectionId) =>
    notice?.section === section ? <ReportNotice view={notice} /> : null;
  const catalogue = useAmenityCatalogue('admin');

  return (
    <>
      <PageHeader />
      <div className="flex flex-col gap-4">
        <Breadcrumb label={copy.dashboard.addSpace.trail}>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={ADMIN_SPACES_PATH}>{copy.dashboard.pages.spaces}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage lang={name?.lang} dir={name?.dir}>
                {name?.text ?? copy.dashboard.editSpace.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <SpaceEditor
          spaceId={spaceId}
          place={place}
          areaField={areaField}
          areaLine={areaLine}
          amenitiesField={amenitiesField}
          amenityCatalogue={catalogue}
          publicLink={publicSpacePath}
          noticeFor={noticeFor}
        />
      </div>
    </>
  );
}
