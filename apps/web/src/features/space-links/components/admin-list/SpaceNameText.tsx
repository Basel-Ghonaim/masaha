import { Link } from 'react-router';
import type { SpaceNameView } from '../../types/AdminSpaceRowView';

/**
 * A space's name, marked with its language and direction when it is not the interface's, as a link
 * to the space's page (`to`, the page's path). A deleted space's name (`muted`) is muted text and
 * leads nowhere: its editor would only say that it is gone.
 */
export function SpaceNameText({
  name,
  to,
  muted = false,
}: {
  name: SpaceNameView;
  to: string;
  muted?: boolean;
}) {
  if (muted) {
    return (
      <span lang={name.lang} dir={name.dir} className="text-label text-muted-foreground">
        {name.text}
      </span>
    );
  }

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
