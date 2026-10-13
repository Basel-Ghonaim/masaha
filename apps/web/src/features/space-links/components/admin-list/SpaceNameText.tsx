import { Link } from 'react-router';
import type { SpaceNameView } from '../../types/AdminSpaceRowView';

/**
 * A space's name, marked with its language and direction when it is not the interface's, as a link
 * to the space's page (`to`, the page's path).
 */
export function SpaceNameText({ name, to }: { name: SpaceNameView; to: string }) {
  return (
    <Link
      to={to}
      lang={name.lang}
      dir={name.dir}
      className="text-label text-foreground underline-offset-4 hover:underline"
    >
      {name.text}
    </Link>
  );
}
