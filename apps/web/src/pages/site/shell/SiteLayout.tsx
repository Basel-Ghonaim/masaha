import { Outlet } from 'react-router';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import { SkipLink } from './SkipLink';
import { useMainFocus } from './useMainFocus';

/**
 * The site's shell: the skip link, the full header and the footer around the page, whose `main`
 * takes the focus when another page opens.
 */
export function SiteLayout() {
  useMainFocus();

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
