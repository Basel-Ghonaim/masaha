import { noteSitePage, takeIntentPath } from '@shared/routing';
import { useSession } from '@shared/session';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

/**
 * Bounds a guest's held favourite and report to their round trip through the sign-in (S14, #129's
 * review): each page the site's shell shows is reported, and a guest landing on a page other than the
 * one they pressed on lets the held actions go, so a later sign-in in the tab saves nothing and opens
 * nothing (`noteSitePage`). Each also lets go by itself after its time. Once a sign-in in this
 * browser has confirmed a held action — pressed in this tab or, before a recovery by email, in
 * another — the shell goes to the page it was pressed on (a replace), where it runs (D9.6).
 */
export function useGuestIntents(): void {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const guest = useSession((state) => state.status === 'anonymous');
  const signedIn = useSession((state) => state.status === 'authenticated');

  useEffect(() => {
    noteSitePage(pathname, guest);
  }, [guest, pathname]);

  useEffect(() => {
    if (!signedIn) return;
    const path = takeIntentPath();
    if (path !== null && path !== pathname) void navigate(path, { replace: true });
  }, [signedIn, pathname, navigate]);
}
