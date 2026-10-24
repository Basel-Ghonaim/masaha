import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import { RouteErrorState } from '@shared/routing';
import { Link } from 'react-router';
import { SITE_PATHS } from '../navigation';

/** The site's error boundary: offline or the general error, with «الرئيسية» after the retry. */
export function SiteRouteError() {
  const copy = useCopy();

  return (
    <RouteErrorState>
      <Button asChild variant="outline">
        <Link to={SITE_PATHS.home}>{copy.site.links.home}</Link>
      </Button>
    </RouteErrorState>
  );
}
