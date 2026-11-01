import { Link } from 'react-router';
import type { PresentRowView } from '../types/PresentRowView';

/** A present person's name, in its own direction: a link to their file when they are a customer's. */
export function PresentName({
  row,
  fileLink,
}: {
  row: PresentRowView;
  fileLink: ((customerId: number) => string) | undefined;
}) {
  return row.customerId === null || fileLink === undefined ? (
    <span className="text-label" dir="auto">
      {row.name}
    </span>
  ) : (
    <Link
      to={fileLink(row.customerId)}
      dir="auto"
      className="text-label text-foreground underline-offset-4 hover:underline"
    >
      {row.name}
    </Link>
  );
}
