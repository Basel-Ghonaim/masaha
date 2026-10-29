import { noteSitePage } from '@shared/routing';
import { useSession } from '@shared/session';
import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Bounds a guest's held favourite and report to their round trip through the sign-in (S14, #129's
 * review): each page the site's shell shows is reported, and a guest landing on a page other than the
 * one they pressed on lets the held actions go, so a later sign-in in the tab saves nothing and opens
 * nothing (`noteSitePage`). Each also lets go by itself after its time.
 */
export function useGuestIntents(): void {
  const { pathname } = useLocation();
  const guest = useSession((state) => state.status === 'anonymous');

  useEffect(() => {
    noteSitePage(pathname, guest);
  }, [guest, pathname]);
}
