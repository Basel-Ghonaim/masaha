import { useCopy } from '@shared/copy';
import { Link } from 'react-router';
import { SITE_PATHS } from '../navigation';

/** The site's footer: the tagline, and the links to about and to the contact section. */
export function SiteFooter() {
  const copy = useCopy();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-body-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
        <p>{copy.site.tagline}</p>
        <div className="flex flex-wrap gap-4">
          <Link to={SITE_PATHS.about} className="text-primary">
            {copy.site.links.about}
          </Link>
          <Link to={SITE_PATHS.contact} className="text-primary">
            {copy.site.contact}
          </Link>
        </div>
      </div>
    </footer>
  );
}
