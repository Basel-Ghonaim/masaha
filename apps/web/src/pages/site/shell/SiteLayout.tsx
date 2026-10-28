import { ResumeFavorite } from '@features/favorites';
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { SITE_PATHS } from '../navigation';
import type { SiteOutletContext } from './footerRoom';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import { SkipLink } from './SkipLink';
import { useGuestIntents } from './useGuestIntents';
import { useMainFocus } from './useMainFocus';

/**
 * The site's shell: the skip link, the full header and the footer around the page, whose `main`
 * takes the focus when another page opens. A page with a bar fixed at its foot reserves the
 * footer's room under it (`useFooterRoom`). A guest's favourite, held while they signed in, is saved
 * once they are back (`ResumeFavorite`), whatever page they land on; a guest's held favourite and
 * report are let go once they land on another page of the site (`useGuestIntents`).
 */
export function SiteLayout() {
  useMainFocus();
  useGuestIntents();
  const navigate = useNavigate();
  const [footerRoom, reserveFooterRoom] = useState(false);
  const context: SiteOutletContext = { reserveFooterRoom };

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <Outlet context={context} />
      </main>
      <SiteFooter barRoom={footerRoom} />
      <ResumeFavorite
        manage={() => {
          void navigate(SITE_PATHS.myFavorites);
        }}
      />
    </div>
  );
}
