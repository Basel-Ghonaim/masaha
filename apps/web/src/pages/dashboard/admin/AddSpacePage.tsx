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
import { ADMIN_SPACES_PATH } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

/** The form's area field, from `lookups`, made once so the form keeps it from render to render. */
const areaField: AreaField = (props) => <AreaSelect {...props} />;

/**
 * The admin adds a space: the page's title in the top bar, the trail back to the spaces list, and
 * the form of `spaces` with the area field of `lookups`. Once the space is added, the list again.
 */
export function AddSpacePage() {
  const copy = useCopy();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title={copy.dashboard.addSpace.title} />
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
          onCreated={() => {
            void navigate(ADMIN_SPACES_PATH);
          }}
        />
      </div>
    </>
  );
}
