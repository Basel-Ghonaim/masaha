import { GovernorateAreaSelect } from '@features/lookups';
import { AdminSpacesList } from '@features/space-links';
import { SpaceActionsHold, SpaceActionsMenu } from '@features/spaces';
import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { ADMIN_ADD_SPACE_PATH } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

type ListSlots = ComponentProps<typeof AdminSpacesList>;

// The list's two slots, filled from other capabilities. Each is made once, here, so the list keeps
// its rows from one render to the next.

/** A row's menu, from `spaces`, for the space the row of `space-links`' list shows. */
const spaceActions: ListSlots['actions'] = (row) => <SpaceActionsMenu space={row} />;

/** The list's "Governorate / area" field, from `lookups`. */
const placeField: ListSlots['placeField'] = ({ value, onChange }) => (
  <GovernorateAreaSelect value={value} onValueChange={onChange} />
);

/**
 * The admin's spaces: the page's title, then the way to add a space, then the list of
 * `space-links` with each row's menu from `spaces` and the place field from `lookups`, and above it
 * the wait while a 429 holds the menus.
 */
export function SpacesPage() {
  const copy = useCopy();

  return (
    <>
      <PageHeader title={copy.dashboard.pages.spaces} />
      <div className="flex flex-col gap-4">
        {/* The way to the add page, above the list at its end, at every width. */}
        <div className="flex justify-end">
          <Button asChild>
            <Link to={ADMIN_ADD_SPACE_PATH}>{copy.dashboard.addSpace.title}</Link>
          </Button>
        </div>
        <SpaceActionsHold />
        <AdminSpacesList actions={spaceActions} placeField={placeField} />
      </div>
    </>
  );
}
