import { AreaName, AreaSelect } from '@features/lookups';
import { SpaceEditor, useSpaceName, type AreaField } from '@features/spaces';
import { useCopy } from '@shared/copy';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@shared/design-system';
import { NotFoundState, parseSpaceId, publicSpacePath, useRecordTitle } from '@shared/routing';
import { Link, useParams } from 'react-router';
import { ADMIN_SPACES_PATH } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

/** The editor's area field, from `lookups`, made once so the form keeps it from render to render. */
const areaField: AreaField = (props) => <AreaSelect {...props} />;

/** A space's area named, from `lookups`, for a verified space's read-only page. */
const areaName = (areaId: number) => <AreaName areaId={areaId} />;

/**
 * The admin edits a space: titled by its name once it has loaded, with the trail back to the spaces
 * list, then the editor of `spaces` with the fields of `lookups`. An id that names no space shows
 * the 404.
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
          areaField={areaField}
          areaName={areaName}
          publicLink={publicSpacePath}
        />
      </div>
    </>
  );
}
