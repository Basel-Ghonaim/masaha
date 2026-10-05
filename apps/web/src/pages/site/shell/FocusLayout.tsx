import { useCopy } from '@shared/copy';
import type { ReactNode } from 'react';
import { Link, Outlet } from 'react-router';
import { SITE_PATHS } from '../navigation';
import { SiteLanguageToggle } from './SiteLanguageToggle';
import { SiteThemeToggle } from './SiteThemeToggle';

/**
 * The shell of the pages that ask for one thing, such as signing in: the short header (the wordmark,
 * and the language and the theme unless the route gives other `actions`) and the page, centred from
 * a tablet up. No footer.
 */
export function FocusLayout({ actions }: { actions?: ReactNode }) {
  const copy = useCopy();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-background">
        <div className="flex h-14 items-center gap-2 px-4 md:px-8">
          <Link to={SITE_PATHS.home} className="text-heading-3 text-primary">
            {copy.site.wordmark}
          </Link>
          <div className="ms-auto flex items-center gap-2">
            {actions ?? (
              <>
                <SiteLanguageToggle />
                <SiteThemeToggle />
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 py-6 md:items-center md:justify-center md:px-8 md:py-16">
        <Outlet />
      </main>
    </div>
  );
}
