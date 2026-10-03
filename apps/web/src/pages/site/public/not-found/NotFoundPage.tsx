import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import { NotFoundState } from '@shared/routing';
import { Link } from 'react-router';
import { SITE_PATHS } from '../../navigation';

/** The site's 404: the way on is home, or the directory. */
export function NotFoundPage() {
  const copy = useCopy();

  return (
    <NotFoundState>
      <Button asChild>
        <Link to={SITE_PATHS.home}>{copy.site.links.home}</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to={SITE_PATHS.spaces}>{copy.site.browseSpaces}</Link>
      </Button>
    </NotFoundState>
  );
}
