import { AmenityChecklist, AreaSelect } from '@features/lookups';
import { SpaceEditor, type AmenitiesField, type AreaField } from '@features/spaces';
import { NotFoundState, parseSpaceId, publicSpacePath } from '@shared/routing';
import { useParams } from 'react-router';
import { spacePagePath } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

/** The area field, from `lookups`' public catalogue, made once so the form keeps it from render to render. */
const areaField: AreaField = (props) => <AreaSelect source="public" {...props} />;

/** The amenities to tick, from `lookups`' public catalogue, made once as the area field is. */
const amenitiesField: AmenitiesField = (props) => <AmenityChecklist source="public" {...props} />;

/**
 * The owner's «ملف المساحة»: the editor of `spaces` on the owner's place, its calls on the managed
 * routes, with the public lists of `lookups` (an owner is refused the admin's), and its prices a row
 * that leads to Packages & prices. The guard has checked the space's id and the owner's role.
 */
export function ProfilePage() {
  const spaceId = parseSpaceId(useParams().spaceId);

  return (
    <>
      <PageHeader />
      {spaceId === undefined ? (
        <NotFoundState />
      ) : (
        // Another space is another editor: nothing typed for one carries over to the next.
        <SpaceEditor
          key={spaceId}
          spaceId={spaceId}
          place={{ kind: 'owner', pricesLink: spacePagePath(spaceId, 'packages') }}
          areaField={areaField}
          amenitiesField={amenitiesField}
          publicLink={publicSpacePath}
        />
      )}
    </>
  );
}
