import { Badge } from '@shared/design-system';
import { Link } from 'react-router';
import type { UserRowView } from '../../types/UserRowView';

/**
 * An owner's spaces, a neutral badge each, its name marked with its language when it is not the
 * interface's; or, for an owner whose every space is deleted, the line that says so, the whole line a
 * link to the deleted spaces, where the restore begins the way out (finding 50).
 */
export function OwnerSpaces({
  row,
  allSpacesDeleted,
  deletedSpacesLink,
}: {
  row: UserRowView;
  /** The line of an owner whose every space is deleted. */
  allSpacesDeleted: string;
  /** The deleted spaces' list, as the page gives it. */
  deletedSpacesLink: string;
}) {
  if (row.allSpacesDeleted) {
    return (
      <Link
        to={deletedSpacesLink}
        className="text-body-sm text-muted-foreground underline underline-offset-4"
      >
        {allSpacesDeleted}
      </Link>
    );
  }
  if (row.spaces.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-2">
      {row.spaces.map((space, index) => (
        // Two spaces may share a name, so each keeps its place in the list.
        <Badge key={index} variant="neutral" lang={space.lang} dir={space.dir}>
          {space.text}
        </Badge>
      ))}
    </span>
  );
}
