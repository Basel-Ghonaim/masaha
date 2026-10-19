import { Badge } from '@shared/design-system';
import type { UserRowView } from '../../types/UserRowView';
import { OwnerActionsMenu } from '../owner-actions/OwnerActionsMenu';
import { OwnerSpaces } from './OwnerSpaces';

/**
 * An owner as a card, on a phone: their name and email, their state and their actions at the end,
 * and their spaces under them, which wrap.
 */
export function OwnerCard({
  row,
  allSpacesDeleted,
  deletedSpacesLink,
}: {
  row: UserRowView;
  allSpacesDeleted: string;
  deletedSpacesLink: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-label">
            <span dir="auto">{row.name}</span>
          </span>
          <span className="text-caption text-muted-foreground">
            <span dir="ltr">{row.email}</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant={row.state.variant}>{row.state.label}</Badge>
          <OwnerActionsMenu row={row} />
        </div>
      </div>
      <OwnerSpaces
        row={row}
        allSpacesDeleted={allSpacesDeleted}
        deletedSpacesLink={deletedSpacesLink}
      />
    </div>
  );
}
