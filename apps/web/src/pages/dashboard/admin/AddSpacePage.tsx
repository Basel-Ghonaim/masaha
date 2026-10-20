import { AreaSelect } from '@features/lookups';
import { AddSpaceForm, type AreaField } from '@features/spaces';
import { useCopy } from '@shared/copy';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@shared/design-system';
import { Link, useNavigate } from 'react-router';
import { ADMIN_SPACES_PATH, adminSpacePath } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

/** The form's area field, from `lookups`, made once so the form keeps it from render to render. */
const areaField: AreaField = (props) => <AreaSelect source="admin" {...props} />;

/**
 * The admin adds a space: the page's title in the top bar, the trail back to the spaces list, and
 * the form of `spaces` with the area field of `lookups`. Once the space is added, its editor, where
 * its other facts follow.
 */
export function AddSpacePage() {
  const copy = useCopy();
  const navigate = useNavigate();

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
              <BreadcrumbPage>{copy.dashboard.addSpace.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <AddSpaceForm
          areaField={areaField}
          onCreated={(spaceId) => {
            void navigate(adminSpacePath(spaceId));
          }}
        />
      </div>
    </>
  );
}
