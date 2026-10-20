import { Badge } from '@shared/design-system';
import type { UserRowView } from '../../types/UserRowView';
import { OwnerSpaces } from '../owners-list/OwnerSpaces';

/**
 * A person's spaces, as a column of groups: «مالك» and the spaces they own (or, for an owner whose
 * every space is deleted, the line that leads to the deleted spaces), then «استقبال» and the spaces
 * whose front desk they work, a neutral badge each, its name marked with its language when it is
 * not the interface's. With neither, a dash, read as «لا مساحات».
 */
export function UserSpaces({
  row,
  words,
  allSpacesDeleted,
  deletedSpacesLink,
}: {
  row: UserRowView;
  words: { owned: string; desk: string; none: string };
  /** The line of an owner whose every space is deleted. */
  allSpacesDeleted: string;
  /** The deleted spaces' list, as the page gives it. */
  deletedSpacesLink: string;
}) {
  const owns = row.spaces.length > 0 || row.allSpacesDeleted;
  const desks = row.receptionSpaces.length > 0;

  if (!owns && !desks) {
    return (
      <>
        <span aria-hidden="true">—</span>
        <span className="sr-only">{words.none}</span>
      </>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {owns && (
        <div className="flex flex-col gap-1">
          <span className="text-caption text-muted-foreground">{words.owned}</span>
          <OwnerSpaces
            row={row}
            allSpacesDeleted={allSpacesDeleted}
            deletedSpacesLink={deletedSpacesLink}
          />
        </div>
      )}
      {desks && (
        <div className="flex flex-col gap-1">
          <span className="text-caption text-muted-foreground">{words.desk}</span>
          <span className="flex flex-wrap gap-2">
            {row.receptionSpaces.map((space, index) => (
              // Two spaces may share a name, so each keeps its place in the list.
              <Badge key={index} variant="neutral" lang={space.lang} dir={space.dir}>
                {space.text}
              </Badge>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
